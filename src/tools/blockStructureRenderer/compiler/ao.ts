import type { BlockState, DirectionName } from '../store/types.ts'
import type { GeometryElement } from './block.ts'
import { stateToKey } from '../store/types.ts'
import { getLight } from './light.ts'
import { clamp } from './math.ts'
import { queryBlock } from './worker.ts'

export type CardinalLighting = Record<DirectionName, number>

export const DEFAULT_CARDINAL_LIGHTING: CardinalLighting = {
  down: 0.5,
  up: 1,
  east: 0.6,
  west: 0.6,
  north: 0.8,
  south: 0.8,
}

export function colorApply(data: number[], multi: number[]) {
  for (let i = 0; i < data.length; i++) {
    data[i] = data[i] * multi[i % multi.length]
  }
}

export function applyCardinalLighting(dir: DirectionName, cardinal: CardinalLighting) {
  const gray = cardinal[dir]
  return [gray, gray, gray, 1, gray, gray, gray, 1, gray, gray, gray, 1, gray, gray, gray, 1]
}

// BlockState emissiveRendering
export function emissiveRendering(state: BlockState) {
  return (
    state.name === 'magma_block' ||
    (state.name === 'sculk_sensor' && state.properties.phase === 'active')
  )
}

// LightCoords
export function pack(block: number, sky: number) {
  return (block << 4) | (sky << 20)
}

export function unpackToShader(packed: number) {
  return [
    clamp((packed & 0xffff) / 256 + 0.5 / 16.0, 0.5 / 16, 15.5 / 16),
    clamp(((packed >> 16) & 0xffff) / 256 + 0.5 / 16.0, 0.5 / 16, 15.5 / 16),
  ]
}

// SizeInfo
enum SizeInfo {
  WEST,
  EAST,
  DOWN,
  UP,
  NORTH,
  SOUTH,
  FLIP_WEST,
  FLIP_EAST,
  FLIP_DOWN,
  FLIP_UP,
  FLIP_NORTH,
  FLIP_SOUTH,
}

export class BlockModelLighter {
  async _getEmission(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    return blockData?.occlusion[stateToKey(state)]?.emission ?? 0
  }
  async _getCollisionFull(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    return !!blockData?.occlusion[stateToKey(state)].collision_full
  }

  async getLightCoords(state: BlockState, x: number, y: number, z: number) {
    if (emissiveRendering(state)) return 0xf000f0
    const [block, sky] = await getLight(x, y, z)
    const selfEmission = await this._getEmission(state)
    return pack(Math.max(block, selfEmission), sky)
  }

  async prepareQuadShape(state: BlockState, element: GeometryElement, ao: boolean) {
    const position = element.element.getAttribute('position').array
    const minX = Math.min(32, position[0], position[3], position[6], position[9])
    const maxX = Math.max(-32, position[0], position[3], position[6], position[9])
    const minY = Math.min(32, position[1], position[4], position[7], position[10])
    const maxY = Math.max(-32, position[1], position[4], position[7], position[10])
    const minZ = Math.min(32, position[2], position[5], position[8], position[11])
    const maxZ = Math.max(-32, position[2], position[5], position[8], position[11])
    // prettier-ignore
    const facePartial =
      ((element.dir === 'down'  || element.dir === 'up'   ) && (minX >= 1.0e-4 || minZ >= 1.0e-4 || maxX <= 0.9999 || maxZ <= 0.9999)) ||
      ((element.dir === 'north' || element.dir === 'south') && (minX >= 1.0e-4 || minY >= 1.0e-4 || maxX <= 0.9999 || maxY <= 0.9999)) ||
      ((element.dir === 'west'  || element.dir === 'east' ) && (minY >= 1.0e-4 || minZ >= 1.0e-4 || maxY <= 0.9999 || maxZ <= 0.9999))
    // prettier-ignore
    const faceCubic =
      (element.dir === 'down'  && minY === maxY && (minY < 1.0e-4 || (await this._getCollisionFull(state)))) ||
      (element.dir === 'up'    && minY === maxY && (maxY < 1.0e-4 || (await this._getCollisionFull(state)))) ||
      (element.dir === 'north' && minZ === maxZ && (minZ < 1.0e-4 || (await this._getCollisionFull(state)))) ||
      (element.dir === 'south' && minZ === maxZ && (maxZ < 1.0e-4 || (await this._getCollisionFull(state)))) ||
      (element.dir === 'west'  && minX === maxX && (minX < 1.0e-4 || (await this._getCollisionFull(state)))) ||
      (element.dir === 'east'  && minX === maxX && (maxX < 1.0e-4 || (await this._getCollisionFull(state))))
    if (ao) {
      const faceShape = Array.from<number>({ length: 12 })
      faceShape[SizeInfo.WEST] = minX
      faceShape[SizeInfo.EAST] = maxX
      faceShape[SizeInfo.DOWN] = minY
      faceShape[SizeInfo.UP] = maxY
      faceShape[SizeInfo.NORTH] = minZ
      faceShape[SizeInfo.SOUTH] = maxZ
      faceShape[SizeInfo.FLIP_WEST] = 1.0 - minX
      faceShape[SizeInfo.FLIP_EAST] = 1.0 - maxX
      faceShape[SizeInfo.FLIP_DOWN] = 1.0 - minY
      faceShape[SizeInfo.FLIP_UP] = 1.0 - maxY
      faceShape[SizeInfo.FLIP_NORTH] = 1.0 - minZ
      faceShape[SizeInfo.FLIP_SOUTH] = 1.0 - maxZ
      return { faceCubic, facePartial, faceShape }
    }
    return { faceCubic, facePartial }
  }
}
