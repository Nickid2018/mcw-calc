import type { DirectionName } from '../store/types.ts'
import type {
  GeometryCollection,
  GeometryElement,
  GeometryModel,
  GeometryModelGroup,
} from './block.ts'
import type { StructurePayload, TranslucentLevel } from './types.ts'
import * as THREE from 'three/webgpu'
import { stateToKey } from '../store/types.ts'
import { getOrCreateModelCollection, validateGeometryModel } from './block.ts'
import {
  applyCardinalLighting,
  colorApply,
  DEFAULT_CARDINAL_LIGHTING,
  hardcodedBlockTint,
} from './coloring.ts'
import { DIRECTION_REVERSE, isOcclusion, moveTowards } from './math.ts'
import { hardcodedSkipRendering } from './occludes.ts'
import { TransferableGeometry } from './types.ts'
import { queryBlock } from './worker.ts'

declare const self: DedicatedWorkerGlobalScope

export const BUFFER_ATTRIBUTES_MAP = {
  position: 3,
  uv: 2,
  uv2: 2,
  color: 4,
  normal: 3,
}
export const INDEX_ARRAY = [0, 2, 1, 2, 3, 1]

class FastMergeGeometry<A extends string> {
  private lastIndex = 0
  private readonly buffers: Record<string, number[]>
  private readonly indexArray: number[] = []

  constructor(private readonly attributeMap: Record<A, number>) {
    this.buffers = Object.fromEntries(Object.entries(attributeMap).map(([k]) => [k, []]))
  }

  pushFace(attributes: Record<A, number[] | THREE.TypedArray>) {
    Object.entries<number[] | THREE.TypedArray>(attributes).forEach(([k, v]) =>
      this.buffers[k]?.push(...v),
    )
    this.indexArray.push(...INDEX_ARRAY.map((v) => v + this.lastIndex))
    this.lastIndex += 4
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

export async function compileStructure(payload: StructurePayload) {
  const { origin, structure } = payload
  const { x: xo, y: yo, z: zo } = origin

  const blocks = [...new Set(structure.flat(3).map((b) => b.name))]
  const blockData = await queryBlock(blocks)
  const blockOcclusion = Object.fromEntries(
    Object.entries(blockData)
      .map(([_, data]) => Object.entries(data.occlusion))
      .flat(),
  )

  const transformed = structure.map((v1) => v1.map((v2) => v2.map(stateToKey)))
  const occlusions = structure.map((v1) =>
    v1.map((v2) => v2.map((s) => blockOcclusion[stateToKey(s)])),
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
        const collection = keys.get(transformed[y][z][x])!
        const thisOcclusion = occlusions[y][z][x]
        const models = collection.map((m) =>
          'totalWeight' in m ? _selectGroup(x + xo - 1, y + yo - 1, z + zo - 1, m) : m,
        )
        await Promise.all(models.map(validateGeometryModel))

        models.forEach((model) => {
          const [finalX, finalY, finalZ] = [x + xo - 1, y + yo - 1, z + zo - 1]

          const _pushElements = ([l, elements]: [string, GeometryElement[]]) => {
            elements.forEach((element) => {
              const positionAttr = element.element.getAttribute('position').array
              const color = applyCardinalLighting(element.shade, DEFAULT_CARDINAL_LIGHTING)

              if (element.tintIndex !== undefined) {
                let tint = payload.tints[y][z][x]?.[element.tintIndex] || null
                if (!tint) tint = hardcodedBlockTint(thisState, element.tintIndex)
                if (tint) colorApply(color, tint)
              }

              layers[l as TranslucentLevel].pushFace({
                position: _translatePlane(positionAttr, finalX, finalY, finalZ),
                uv: element.element.getAttribute('uv').array,
                uv2: [1, 0, 1, 0, 1, 0, 1, 0],
                color,
                normal: element.element.getAttribute('normal').array,
              })
            })
          }

          Object.entries(model.nonCullFaces).forEach(_pushElements)
          Object.entries(model.cullFaces).forEach(([d, faces]) => {
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

            Object.entries(faces).forEach(_pushElements)
          })
        })
      }
    }
  }

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

function _selectGroup(x: number, y: number, z: number, group: GeometryModelGroup): GeometryModel {
  let positionRelativeSeed = (x * 3129871) ^ (z * 116129781) ^ y
  positionRelativeSeed =
    positionRelativeSeed * positionRelativeSeed * 42317861 + positionRelativeSeed * 11
  positionRelativeSeed = positionRelativeSeed >> 16

  // Java LCG algorithm
  const seedParsed = (positionRelativeSeed ^ 0x5deece66d) & 0xffffffffffff
  const first = (seedParsed * 25214903917 + 11) & 0xffffffffffff
  const second = (first * 25214903917 + 11) & 0xffffffffffff
  const random = Math.abs(((first >> 16) << 16) + (second >> 16)) % group.totalWeight

  let acc = 0
  for (const [i, weight] of group.weights.entries()) {
    acc += weight
    if (random < acc) return group.models[i]
  }
  return group.models[0]
}
