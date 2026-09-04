import type { DirectionName } from '../store/types.ts'
import type {
  GeometryCollection,
  GeometryElement,
  GeometryModel,
  GeometryModelGroup,
} from './block.ts'
import type { StructurePayload, TranslucentLevel } from './types.ts'
import * as THREE from 'three/webgpu'
import { AIR_STATE } from '../store/structure.ts'
import { stateToKey } from '../store/types.ts'
import {
  applyCardinalLighting,
  BlockModelLighter,
  cardinalLighting,
  colorApply,
  DEFAULT_CARDINAL_LIGHTING,
  unpackToShader,
} from './ao.ts'
import { getOrCreateModelCollection, validateGeometryModel } from './block.ts'
import { compileLiquid } from './fluid.ts'
import { DIRECTION_REVERSE, isOcclusion, moveTowards } from './math.ts'
import { hardcodedSkipRendering } from './occludes.ts'
import { getHardcodedRenderer } from './special.ts'
import { hardcodedBlockTint } from './tint.ts'
import { TransferableGeometry } from './types.ts'
import { queryBlock } from './worker.ts'

declare const self: DedicatedWorkerGlobalScope

export const BUFFER_ATTRIBUTES_MAP = {
  position: 3,
  uv: 2,
  uv2: 2,
  color: 4,
}
export const INDEX_ARRAY = [0, 2, 1, 2, 3, 1]

export class FastMergeGeometry<A extends string> {
  private lastIndex = 0
  private readonly buffers: Record<string, number[]>
  private readonly indexArray: number[] = []

  constructor(private readonly attributeMap: Record<A, number>) {
    this.buffers = Object.fromEntries(Object.entries(attributeMap).map(([k]) => [k, []]))
  }

  pushFace(attributes: Record<A, number[] | THREE.TypedArray>, indexArray: number[] = INDEX_ARRAY) {
    Object.entries<number[] | THREE.TypedArray>(attributes).forEach(([k, v]) =>
      this.buffers[k]?.push(...v),
    )
    this.indexArray.push(...indexArray.map((v) => v + this.lastIndex))
    this.lastIndex += 4
  }

  merge(other: FastMergeGeometry<A>) {
    Object.entries(other.buffers).forEach(([k, v]) => this.buffers[k].push(...v))
    this.indexArray.push(...other.indexArray.map((i) => i + this.lastIndex))
    this.lastIndex += other.lastIndex
  }

  finalize() {
    const buffer = new THREE.BufferGeometry()
    Object.entries(this.attributeMap).forEach(([k, v]) => {
      buffer.setAttribute(
        k,
        new THREE.BufferAttribute(new Float32Array(this.buffers[k]), v as number),
      )
    })
    buffer.setIndex(this.indexArray)
    return buffer
  }

  notEmpty() {
    return this.lastIndex !== 0
  }
}

export class PositionalRandom {
  private seed: bigint

  constructor(x: number, y: number, z: number) {
    // Mth.getSeed
    let positionRelativeSeed = BigInt((x * 3129871) ^ (z * 116129781) ^ y)
    positionRelativeSeed = positionRelativeSeed ** 2n * 42317861n + positionRelativeSeed * 11n
    positionRelativeSeed = positionRelativeSeed >> 16n
    // LegacyRandomSource.setSeed
    this.seed = (positionRelativeSeed ^ 0x5deece66dn) & 0xffffffffffffn
  }

  // LegacyRandomSource.next
  next(bits: number) {
    const newSeed = (this.seed * 25214903917n + 11n) & 0xffffffffffffn
    this.seed = newSeed
    return newSeed >> BigInt(48 - bits)
  }

  // BitRandomSource.nextInt
  nextInt(bound: number) {
    const boundInt = BigInt(bound)
    if ((boundInt & (boundInt - 1n)) === 0n) {
      return BigInt.asIntN(32, (boundInt * this.next(31)) >> 31n)
    }
    while (true) {
      const sample = this.next(31)
      const modulo = sample % boundInt
      if (sample - modulo + boundInt - 1n < 0n) return BigInt.asIntN(32, modulo)
    }
  }
}

export async function compileStructure(payload: StructurePayload) {
  const { origin, structure } = payload
  const { x: xo, y: yo, z: zo } = origin
  const lighter = new BlockModelLighter()

  // payload.enableAO = true

  const blocks = [...new Set(structure.flat(3).map((b) => b.name))]
  const blockData = await queryBlock(blocks)
  const blockOcclusion = Object.fromEntries(
    Object.entries(blockData)
      .map(([_, data]) => Object.entries(data.occlusion))
      .flat(),
  )
  const blockLiquidData = Object.fromEntries(
    Object.entries(blockData)
      .map(([_, data]) => Object.entries(data.liquid))
      .flat(),
  )

  const transformed = structure.map((v1) => v1.map((v2) => v2.map(stateToKey)))
  const occlusions = structure.map((v1) =>
    v1.map((v2) => v2.map((s) => blockOcclusion[stateToKey(s)])),
  )
  const liquidData = structure.map((v1) =>
    v1.map((v2) => v2.map((s) => blockLiquidData[stateToKey(s)])),
  )
  const keys = new Map(
    await Promise.all(
      structure
        .flat(3)
        .map<
          Promise<[string, GeometryCollection]>
        >(async (b) => [stateToKey(b), await getOrCreateModelCollection(b)]),
    ),
  )
  const blockGetter = (x: number, y: number, z: number) => {
    return structure[y - yo + 1]?.[z - zo + 1]?.[x - xo + 1] ?? AIR_STATE
  }

  const layers: Record<TranslucentLevel, FastMergeGeometry<keyof typeof BUFFER_ATTRIBUTES_MAP>> = {
    solid: new FastMergeGeometry(BUFFER_ATTRIBUTES_MAP),
    transparent: new FastMergeGeometry(BUFFER_ATTRIBUTES_MAP),
    translucent: new FastMergeGeometry(BUFFER_ATTRIBUTES_MAP),
  }
  for (let y = 1; y < structure.length - 1; y++) {
    const xzPlane = structure[y]
    for (let z = 1; z < xzPlane.length - 1; z++) {
      const xAxis = xzPlane[z]
      for (let x = 1; x < xAxis.length - 1; x++) {
        const thisState = structure[y][z][x]
        const [finalX, finalY, finalZ] = [x + xo - 1, y + yo - 1, z + zo - 1]
        const hardcodedData = getHardcodedRenderer(thisState)
        if (hardcodedData) {
          const computedLayers = hardcodedData.renderer([finalX, finalY, finalZ], thisState)
          if (!computedLayers) continue
          layers.solid.merge(computedLayers.solid)
          layers.transparent.merge(computedLayers.transparent)
          layers.translucent.merge(computedLayers.translucent)
          if (!hardcodedData.model) continue
        }

        const collection = keys.get(transformed[y][z][x])!
        const thisOcclusion = occlusions[y][z][x]
        const positionalRandom = new PositionalRandom(finalX, finalY, finalZ)
        const models = collection.map((m) =>
          'totalWeight' in m ? _selectGroup(positionalRandom, m) : m,
        )
        await Promise.all(models.map(validateGeometryModel))

        await Promise.all(
          models.map(async (model) => {

            const _pushElement = (
              l: TranslucentLevel,
              element: GeometryElement,
              lightCoords: number[],
              lightColor: number[],
            ) => {
              const positionAttr = element.element.getAttribute('position').array

              if (element.tintIndex !== undefined) {
                let tint = payload.tints[y][z][x]?.[element.tintIndex] || null
                if (!tint) tint = hardcodedBlockTint(thisState, element.tintIndex)
                if (tint) colorApply(lightColor, tint)
              }

              layers[l as TranslucentLevel].pushFace({
                position: _translatePlane(positionAttr, finalX, finalY, finalZ),
                uv: element.element.getAttribute('uv').array,
                uv2: lightCoords.map(unpackToShader).flat(),
                color: lightColor,
              })
            }

            await Promise.all(
              Object.entries(model.nonCullFaces)
                .map(async ([l, elements]: [string, GeometryElement[]]) =>
                  elements.map(async (element) => {
                    if (payload.enableAO) {
                      const { lightCoords, color } = await lighter.prepareQuadAmbientOcclusion(
                        thisState,
                        element,
                        [finalX, finalY, finalZ],
                        blockGetter,
                      )
                      const cardinal = cardinalLighting(element.shade, DEFAULT_CARDINAL_LIGHTING)
                      colorApply(color, [cardinal, cardinal, cardinal, 1])
                      _pushElement(l as TranslucentLevel, element, lightCoords, color)
                    } else {
                      const { faceCubic } = await lighter.prepareQuadShape(
                        thisState,
                        element,
                        false,
                      )
                      const lightCoords = faceCubic
                        ? await lighter.getLightCoords(
                            thisState,
                            ...moveTowards(finalX, finalY, finalZ, element.dir),
                          )
                        : await lighter.getLightCoords(thisState, finalX, finalY, finalZ)
                      const lightColor = applyCardinalLighting(
                        element.shade,
                        DEFAULT_CARDINAL_LIGHTING,
                      )
                      _pushElement(
                        l as TranslucentLevel,
                        element,
                        Array.from<number>({ length: 4 }).fill(lightCoords),
                        lightColor,
                      )
                    }
                  }),
                )
                .flat(),
            )

            await Promise.all(
              Object.entries(model.cullFaces).map(async ([d, faces]) => {
                const dir = d as DirectionName
                const [dx, dy, dz] = moveTowards(x, y, z, dir)
                const otherState = structure[dy][dz][dx]
                if (hardcodedSkipRendering(thisState, otherState, dir)) return

                const otherOcclusion = occlusions[dy][dz][dx]
                const thisFace = thisOcclusion[dir]
                const otherFace = otherOcclusion[DIRECTION_REVERSE[dir]] ?? []
                const occlusion =
                  thisFace && otherOcclusion.can_occlude && isOcclusion(thisFace, otherFace)
                if (occlusion) return

                await Promise.all(
                  Object.entries(faces)
                    .map(([l, elements]: [string, GeometryElement[]]) =>
                      elements.map(async (element) => {
                        if (payload.enableAO) {
                          const { lightCoords, color } = await lighter.prepareQuadAmbientOcclusion(
                            thisState,
                            element,
                            [finalX, finalY, finalZ],
                            blockGetter,
                          )
                          const cardinal = cardinalLighting(
                            element.shade,
                            DEFAULT_CARDINAL_LIGHTING,
                          )
                          colorApply(color, [cardinal, cardinal, cardinal, 1])
                          _pushElement(l as TranslucentLevel, element, lightCoords, color)
                        } else {
                          const lightCoords = await lighter.getLightCoords(
                            thisState,
                            ...moveTowards(finalX, finalY, finalZ, dir),
                          )
                          const lightColor = applyCardinalLighting(
                            element.shade,
                            DEFAULT_CARDINAL_LIGHTING,
                          )
                          _pushElement(
                            l as TranslucentLevel,
                            element,
                            Array.from<number>({ length: 4 }).fill(lightCoords),
                            lightColor,
                          )
                        }
                      }),
                    )
                    .flat(),
                )
              }),
            )
          }),
        )
      }
    }
  }

  const liquidLayer = await compileLiquid(payload, occlusions, liquidData)
  layers.translucent.merge(liquidLayer)

  const result: [string, TransferableGeometry][] = Object.entries(layers)
    .filter(([_, b]) => b.notEmpty())
    .map(([t, b]) => [t, new TransferableGeometry(b.finalize())])

  self.postMessage(
    {
      type: 'chunk',
      chunk: Object.fromEntries(result),
      origin: payload.origin,
      version: payload.version,
    },
    result.map(([_, r]) => r.buffers).flat(),
  )
}

function _translatePlane(positions: THREE.TypedArray, x: number, y: number, z: number) {
  return positions.map((v, i) => {
    const n = i % 3
    return n === 0 ? v + x : n === 1 ? v + y : v + z
  })
}

function _selectGroup(random: PositionalRandom, group: GeometryModelGroup): GeometryModel {
  const choice = random.nextInt(group.totalWeight)
  let acc = 0
  for (const [i, weight] of group.weights.entries()) {
    acc += weight
    if (choice < acc) return group.models[i]
  }
  return group.models[0]
}
