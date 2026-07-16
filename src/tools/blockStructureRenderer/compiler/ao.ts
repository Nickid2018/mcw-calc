import type { BlockState, DirectionName } from '../store/types.ts'
import type { GeometryElement } from './block.ts'
import { stateToKey } from '../store/types.ts'
import { getLight } from './light.ts'
import { clamp, moveTowards } from './math.ts'
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

interface AdjacencyInfo {
  corners: DirectionName[]
  doNonCubicWeight: boolean
  vert0Weights: SizeInfo[]
  vert1Weights: SizeInfo[]
  vert2Weights: SizeInfo[]
  vert3Weights: SizeInfo[]
}

// prettier-ignore
export const ADJACENCY_INFO: Record<DirectionName, AdjacencyInfo> = {
  down: {
    corners: ['west', 'east', 'north', 'south'],
    doNonCubicWeight: true,
    vert0Weights: [SizeInfo.FLIP_WEST, SizeInfo.SOUTH, SizeInfo.FLIP_WEST, SizeInfo.FLIP_SOUTH, SizeInfo.WEST, SizeInfo.FLIP_SOUTH, SizeInfo.WEST, SizeInfo.SOUTH],
    vert1Weights: [SizeInfo.FLIP_WEST, SizeInfo.NORTH, SizeInfo.FLIP_WEST, SizeInfo.FLIP_NORTH, SizeInfo.WEST, SizeInfo.FLIP_NORTH, SizeInfo.WEST, SizeInfo.NORTH],
    vert2Weights: [SizeInfo.FLIP_EAST, SizeInfo.NORTH, SizeInfo.FLIP_EAST, SizeInfo.FLIP_NORTH, SizeInfo.EAST, SizeInfo.FLIP_NORTH, SizeInfo.EAST, SizeInfo.NORTH],
    vert3Weights: [SizeInfo.FLIP_EAST, SizeInfo.SOUTH, SizeInfo.FLIP_EAST, SizeInfo.FLIP_SOUTH, SizeInfo.EAST, SizeInfo.FLIP_SOUTH, SizeInfo.EAST, SizeInfo.SOUTH],
  },
  up: {
    corners: ['east', 'west', 'north', 'south'],
    doNonCubicWeight: true,
    vert0Weights: [SizeInfo.EAST, SizeInfo.SOUTH, SizeInfo.EAST, SizeInfo.FLIP_SOUTH, SizeInfo.FLIP_EAST, SizeInfo.FLIP_SOUTH, SizeInfo.FLIP_EAST, SizeInfo.SOUTH],
    vert1Weights: [SizeInfo.EAST, SizeInfo.NORTH, SizeInfo.EAST, SizeInfo.FLIP_NORTH, SizeInfo.FLIP_EAST, SizeInfo.FLIP_NORTH, SizeInfo.FLIP_EAST, SizeInfo.NORTH],
    vert2Weights: [SizeInfo.WEST, SizeInfo.NORTH, SizeInfo.WEST, SizeInfo.FLIP_NORTH, SizeInfo.FLIP_WEST, SizeInfo.FLIP_NORTH, SizeInfo.FLIP_WEST, SizeInfo.NORTH],
    vert3Weights: [SizeInfo.WEST, SizeInfo.SOUTH, SizeInfo.WEST, SizeInfo.FLIP_SOUTH, SizeInfo.FLIP_WEST, SizeInfo.FLIP_SOUTH, SizeInfo.FLIP_WEST, SizeInfo.SOUTH],
  },
  north: {
    corners: ['up', 'down', 'east', 'west'],
    doNonCubicWeight: true,
    vert0Weights: [SizeInfo.UP, SizeInfo.FLIP_WEST, SizeInfo.UP, SizeInfo.WEST, SizeInfo.FLIP_UP, SizeInfo.WEST, SizeInfo.FLIP_UP, SizeInfo.FLIP_WEST],
    vert1Weights: [SizeInfo.UP, SizeInfo.FLIP_EAST, SizeInfo.UP, SizeInfo.EAST, SizeInfo.FLIP_UP, SizeInfo.EAST, SizeInfo.FLIP_UP, SizeInfo.FLIP_EAST],
    vert2Weights: [SizeInfo.DOWN, SizeInfo.FLIP_EAST, SizeInfo.DOWN, SizeInfo.EAST, SizeInfo.FLIP_DOWN, SizeInfo.EAST, SizeInfo.FLIP_DOWN, SizeInfo.FLIP_EAST],
    vert3Weights: [SizeInfo.DOWN, SizeInfo.FLIP_WEST, SizeInfo.DOWN, SizeInfo.WEST, SizeInfo.FLIP_DOWN, SizeInfo.WEST, SizeInfo.FLIP_DOWN, SizeInfo.FLIP_WEST],
  },
  south: {
    corners: ['west', 'east', 'down', 'up'],
    doNonCubicWeight: true,
    vert0Weights: [SizeInfo.UP, SizeInfo.FLIP_WEST, SizeInfo.FLIP_UP, SizeInfo.FLIP_WEST, SizeInfo.FLIP_UP, SizeInfo.WEST, SizeInfo.UP, SizeInfo.WEST],
    vert1Weights: [SizeInfo.DOWN, SizeInfo.FLIP_WEST, SizeInfo.FLIP_DOWN, SizeInfo.FLIP_WEST, SizeInfo.FLIP_DOWN, SizeInfo.WEST, SizeInfo.DOWN, SizeInfo.WEST],
    vert2Weights: [SizeInfo.DOWN, SizeInfo.FLIP_EAST, SizeInfo.FLIP_DOWN, SizeInfo.FLIP_EAST, SizeInfo.FLIP_DOWN, SizeInfo.EAST, SizeInfo.DOWN, SizeInfo.EAST],
    vert3Weights: [SizeInfo.UP, SizeInfo.FLIP_EAST, SizeInfo.FLIP_UP, SizeInfo.FLIP_EAST, SizeInfo.FLIP_UP, SizeInfo.EAST, SizeInfo.UP, SizeInfo.EAST],
  },
  west: {
    corners: ['up', 'down', 'north', 'south'],
    doNonCubicWeight: true,
    vert0Weights: [SizeInfo.UP, SizeInfo.SOUTH, SizeInfo.UP, SizeInfo.FLIP_SOUTH, SizeInfo.FLIP_UP, SizeInfo.FLIP_SOUTH, SizeInfo.FLIP_UP, SizeInfo.SOUTH],
    vert1Weights: [SizeInfo.UP, SizeInfo.NORTH, SizeInfo.UP, SizeInfo.FLIP_NORTH, SizeInfo.FLIP_UP, SizeInfo.FLIP_NORTH, SizeInfo.FLIP_UP, SizeInfo.NORTH],
    vert2Weights: [SizeInfo.DOWN, SizeInfo.NORTH, SizeInfo.DOWN, SizeInfo.FLIP_NORTH, SizeInfo.FLIP_DOWN, SizeInfo.FLIP_NORTH, SizeInfo.FLIP_DOWN, SizeInfo.NORTH],
    vert3Weights: [SizeInfo.DOWN, SizeInfo.SOUTH, SizeInfo.DOWN, SizeInfo.FLIP_SOUTH, SizeInfo.FLIP_DOWN, SizeInfo.FLIP_SOUTH, SizeInfo.FLIP_DOWN, SizeInfo.SOUTH],
  },
  east: {
    corners: ['down', 'up', 'north', 'south'],
    doNonCubicWeight: true,
    vert0Weights: [SizeInfo.FLIP_DOWN, SizeInfo.SOUTH, SizeInfo.FLIP_DOWN, SizeInfo.FLIP_SOUTH, SizeInfo.DOWN, SizeInfo.FLIP_SOUTH, SizeInfo.DOWN, SizeInfo.SOUTH],
    vert1Weights: [SizeInfo.FLIP_DOWN, SizeInfo.NORTH, SizeInfo.FLIP_DOWN, SizeInfo.FLIP_NORTH, SizeInfo.DOWN, SizeInfo.FLIP_NORTH, SizeInfo.DOWN, SizeInfo.NORTH],
    vert2Weights: [SizeInfo.FLIP_UP, SizeInfo.NORTH, SizeInfo.FLIP_UP, SizeInfo.FLIP_NORTH, SizeInfo.UP, SizeInfo.FLIP_NORTH, SizeInfo.UP, SizeInfo.NORTH],
    vert3Weights: [SizeInfo.FLIP_UP, SizeInfo.SOUTH, SizeInfo.FLIP_UP, SizeInfo.FLIP_SOUTH, SizeInfo.UP, SizeInfo.FLIP_SOUTH, SizeInfo.UP, SizeInfo.SOUTH],
  }
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

  async _getViewBlocking(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    return !!blockData?.occlusion[stateToKey(state)].view_blocking
  }

  async _getShadeBrightness(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    const stateData = blockData?.occlusion[stateToKey(state)]
    const shadeBrightness = stateData.shade_brightness
    return shadeBrightness === undefined ? (stateData?.collision_full ? 0.2 : 1) : shadeBrightness
  }

  async _getLightDampening(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    return blockData?.occlusion[stateToKey(state)]?.dampening ?? 0
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

  async prepareQuadAmbientOcclusion(
    state: BlockState,
    element: GeometryElement,
    [x, y, z]: number[],
    blockGetter: (x: number, y: number, z: number) => BlockState,
  ) {
    const { faceCubic, facePartial, faceShape } = await this.prepareQuadShape(state, element, true)
    const [bx, by, bz] = faceCubic ? moveTowards(x, y, z, element.dir) : [x, y, z]
    const info = ADJACENCY_INFO[element.dir]

    const _fetchNeighbor = async (corner: number): Promise<[BlockState, number, number]> => {
      const [posX, posY, posZ] = moveTowards(bx, by, bz, info.corners[corner])
      const state = blockGetter(posX, posY, posZ)
      const light = await this.getLightCoords(state, posX, posY, posZ)
      const shade = await this._getShadeBrightness(state)
      return [state, light, shade]
    }
    const [
      [state0, light0, shade0],
      [state1, light1, shade1],
      [state2, light2, shade2],
      [state3, light3, shade3],
    ] = await Promise.all([
      _fetchNeighbor(0),
      _fetchNeighbor(1),
      _fetchNeighbor(2),
      _fetchNeighbor(3),
    ])

    const [mx, my, mz] = moveTowards(bx, by, bz, element.dir)
    const _fetchTranslucent = async (corner: number) => {
      const state = blockGetter(...moveTowards(mx, my, mz, info.corners[corner]))
      return !(await this._getViewBlocking(state)) || (await this._getLightDampening(state)) === 0
    }
    const [translucent0, translucent1, translucent2, translucent3] = await Promise.all([
      _fetchTranslucent(0),
      _fetchTranslucent(1),
      _fetchTranslucent(2),
      _fetchTranslucent(3),
    ])

    const _makeCorner = async (corner1: number, corner2: number) => {
      
    }
  }
}
