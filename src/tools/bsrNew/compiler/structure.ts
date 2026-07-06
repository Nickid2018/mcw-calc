import type { DirectionName } from '../store/types.ts'
import type { GeometryCollection, GeometryModel, GeometryModelGroup } from './block.ts'
import type { StructurePayload, TranslucentLevel } from './types.ts'
import { BufferGeometry } from 'three'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import { stateToKey } from '../store/types.ts'
import { getOrCreateModelCollection, validateGeometryModel } from './block.ts'
import { DIRECTION_REVERSE, isOcclusion, moveTowards } from './math.ts'
import { TransferableGeometry } from './types.ts'
import { queryBlock } from './worker.ts'

export async function doStructure(
  payload: StructurePayload,
): Promise<Record<TranslucentLevel, TransferableGeometry>> {
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

  const layers: Record<TranslucentLevel, BufferGeometry[]> = {
    solid: [],
    transparent: [],
    translucent: [],
  }
  for (let y = 1; y < structure.length - 1; y++) {
    const xzPlane = structure[y]
    for (let z = 1; z < xzPlane.length - 1; z++) {
      const xAxis = xzPlane[z]
      for (let x = 1; x < xAxis.length - 1; x++) {
        const collection = keys.get(transformed[y][z][x])!
        const thisOcclusion = occlusions[y][z][x]
        const models = collection.map((m) =>
          'totalWeight' in m ? _selectGroup(x + xo - 1, y + yo - 1, z + zo - 1, m) : m,
        )
        await Promise.all(models.map(validateGeometryModel))

        models.forEach((model) => {
          const [finalX, finalY, finalZ] = [x + xo - 1, y + yo - 1, z + zo - 1]
          Object.entries(model.nonCullFaces).forEach(([l, elements]) => {
            elements.forEach((element) => {
              const buffer = element.element.clone().translate(finalX, finalY, finalZ)
              layers[l as TranslucentLevel].push(buffer)
            })
          })
          Object.entries(model.cullFaces).forEach(([d, faces]) => {
            const dir = model.rotation.transformDirection(d as DirectionName)
            const [dx, dy, dz] = moveTowards(x, y, z, dir)
            const otherOcclusion = occlusions[dy][dz][dx]
            const occlusion =
              otherOcclusion.can_occlude &&
              isOcclusion(thisOcclusion[dir] ?? [], otherOcclusion[DIRECTION_REVERSE[dir]] ?? [])
            if (occlusion) return

            Object.entries(faces).forEach(([l, elements]) => {
              elements.forEach((element) => {
                const buffer = element.element.clone().translate(finalX, finalY, finalZ)
                layers[l as TranslucentLevel].push(buffer)
              })
            })
          })
        })
      }
    }
  }

  return Object.fromEntries(
    Object.entries(layers)
      .filter(([_, b]) => b.length > 0)
      .map(([t, b]) => [t, new TransferableGeometry(BufferGeometryUtils.mergeGeometries(b))]),
  ) as Record<TranslucentLevel, TransferableGeometry>
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
