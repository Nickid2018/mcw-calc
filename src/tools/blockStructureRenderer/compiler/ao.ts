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

export function multiplyCardinalLighting(
  color: number[],
  dir: DirectionName,
  cardinal: CardinalLighting,
) {
  const gray = cardinal[dir]
  return [color[0] * gray, color[1] * gray, color[2] * gray, color[3]]
}

export function cardinalLighting(dir: DirectionName, cardinal: CardinalLighting) {
  return cardinal[dir]
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

export function unpackSky(packed: number) {
  return (packed >> 20) & 0xf
}

export function unpackBlock(packed: number) {
  return (packed >> 4) & 0xf
}

export function smoothBlend(
  neighbor1: number,
  neighbor2: number,
  neighbor3: number,
  center: number,
) {
  if (unpackSky(center) > 2 || unpackBlock(center) > 2) {
    if (neighbor1 === 0) {
      neighbor1 = center
    } else if (unpackSky(neighbor1) === 0) {
      neighbor1 |= center & 0xff0000
    }
    if (neighbor2 === 0) {
      neighbor2 = center
    } else if (unpackSky(neighbor2) === 0) {
      neighbor2 |= center & 0xff0000
    }
    if (neighbor3 === 0) {
      neighbor3 = center
    } else if (unpackSky(neighbor3) === 0) {
      neighbor3 |= center & 0xff0000
    }
  }
  return ((neighbor1 + neighbor2 + neighbor3 + center) >> 2) & 0xff00ff
}

export function smoothPack(block: number, sky: number) {
  return (block & 0xff) | ((sky & 0xff) << 16)
}

export function smoothBlock(packed: number) {
  return packed & 0xff
}

export function smoothSky(packed: number) {
  return (packed >> 16) & 0xff
}

export function smoothWeightedBlend(
  coords1: number,
  coords2: number,
  coords3: number,
  coords4: number,
  weight1: number,
  weight2: number,
  weight3: number,
  weight4: number,
) {
  const sky = Math.floor(
    smoothSky(coords1) * weight1 +
      smoothSky(coords2) * weight2 +
      smoothSky(coords3) * weight3 +
      smoothSky(coords4) * weight4,
  )
  const block = Math.floor(
    smoothBlock(coords1) * weight1 +
      smoothBlock(coords2) * weight2 +
      smoothBlock(coords3) * weight3 +
      smoothBlock(coords4) * weight4,
  )
  return smoothPack(block, sky)
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

export const AMBIENT_VERTEX_REMAP: Record<DirectionName, number[]> = {
  down: [0, 2, 1, 3],
  up: [2, 0, 3, 1],
  north: [3, 1, 0, 2],
  south: [0, 2, 1, 3],
  west: [3, 1, 0, 2],
  east: [1, 3, 2, 0],
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

  async _getSolidRender(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    return !!blockData?.occlusion[stateToKey(state)]?.solid_render
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

    const _fetchNeighbor = async (corner: number): Promise<[number, number]> => {
      const [posX, posY, posZ] = moveTowards(bx, by, bz, info.corners[corner])
      const state = blockGetter(posX, posY, posZ)
      const light = await this.getLightCoords(state, posX, posY, posZ)
      const shade = await this._getShadeBrightness(state)
      return [light, shade]
    }
    const [[light0, shade0], [light1, shade1], [light2, shade2], [light3, shade3]] =
      await Promise.all([
        _fetchNeighbor(0),
        _fetchNeighbor(1),
        _fetchNeighbor(2),
        _fetchNeighbor(3),
      ])

    const [mx, my, mz] = moveTowards(bx, by, bz, element.dir)
    const _fetchTranslucent = async (corner: number) => {
      const state = blockGetter(...moveTowards(mx, my, mz, info.corners[corner]))
      return !(await this._getSolidRender(state)) || (await this._getLightDampening(state)) === 0
    }
    const [translucent0, translucent1, translucent2, translucent3] = await Promise.all([
      _fetchTranslucent(0),
      _fetchTranslucent(1),
      _fetchTranslucent(2),
      _fetchTranslucent(3),
    ])

    let shadeCorner02 = shade0
    let lightCorner02 = light0
    let shadeCorner03 = shade0
    let lightCorner03 = light0
    let shadeCorner12 = shade0
    let lightCorner12 = light0
    let shadeCorner13 = shade0
    let lightCorner13 = light0
    if (translucent2 || translucent0) {
      const pos = moveTowards(...moveTowards(bx, by, bz, info.corners[0]), info.corners[2])
      const state02 = blockGetter(...pos)
      shadeCorner02 = await this._getShadeBrightness(state02)
      lightCorner02 = await this.getLightCoords(state02, ...pos)
    }
    if (translucent3 || translucent0) {
      const pos = moveTowards(...moveTowards(bx, by, bz, info.corners[0]), info.corners[3])
      const state03 = blockGetter(...pos)
      shadeCorner03 = await this._getShadeBrightness(state03)
      lightCorner03 = await this.getLightCoords(state03, ...pos)
    }
    if (translucent2 || translucent1) {
      const pos = moveTowards(...moveTowards(bx, by, bz, info.corners[1]), info.corners[2])
      const state12 = blockGetter(...pos)
      shadeCorner12 = await this._getShadeBrightness(state12)
      lightCorner12 = await this.getLightCoords(state12, ...pos)
    }
    if (translucent3 || translucent1) {
      const pos = moveTowards(...moveTowards(bx, by, bz, info.corners[1]), info.corners[3])
      const state13 = blockGetter(...pos)
      shadeCorner13 = await this._getShadeBrightness(state13)
      lightCorner13 = await this.getLightCoords(state13, ...pos)
    }

    let lightCenter = await this.getLightCoords(state, x, y, z)
    const nextPos = moveTowards(x, y, z, element.dir)
    const nextState = blockGetter(...nextPos)
    if (faceCubic || !(await this._getSolidRender(nextState))) {
      lightCenter = await this.getLightCoords(nextState, ...nextPos)
    }
    const shadeCenter = faceCubic
      ? await this._getShadeBrightness(blockGetter(bx, by, bz))
      : await this._getShadeBrightness(state)

    const remap = AMBIENT_VERTEX_REMAP[element.dir]
    const _remapPush = (...data: number[][]) => {
      const ret: number[] = []
      remap.map((i) => data[i]).forEach((d) => ret.push(...d))
      return ret
    }
    const _remapArray = (...data: number[]) => remap.map((i) => data[i])
    if (!facePartial || !info.doNonCubicWeight) {
      const lightLevel1 = (shade3 + shade0 + shadeCorner03 + shadeCenter) * 0.25
      const lightLevel2 = (shade2 + shade0 + shadeCorner02 + shadeCenter) * 0.25
      const lightLevel3 = (shade2 + shade1 + shadeCorner12 + shadeCenter) * 0.25
      const lightLevel4 = (shade3 + shade1 + shadeCorner13 + shadeCenter) * 0.25
      const lightCoords = _remapArray(
        smoothBlend(light3, light0, lightCorner03, lightCenter),
        smoothBlend(light2, light0, lightCorner02, lightCenter),
        smoothBlend(light2, light1, lightCorner12, lightCenter),
        smoothBlend(light3, light1, lightCorner13, lightCenter),
      )
      const color = _remapPush(
        [lightLevel1, lightLevel1, lightLevel1, 1],
        [lightLevel2, lightLevel2, lightLevel2, 1],
        [lightLevel3, lightLevel3, lightLevel3, 1],
        [lightLevel4, lightLevel4, lightLevel4, 1],
      )
      return { lightCoords, color }
    } else {
      const tempShade1 = (shade3 + shade0 + shadeCorner03 + shadeCenter) * 0.25
      const tempShade2 = (shade2 + shade0 + shadeCorner02 + shadeCenter) * 0.25
      const tempShade3 = (shade2 + shade1 + shadeCorner12 + shadeCenter) * 0.25
      const tempShade4 = (shade3 + shade1 + shadeCorner13 + shadeCenter) * 0.25
      const vert0weight01 = faceShape![info.vert0Weights[0]] * faceShape![info.vert0Weights[1]]
      const vert0weight23 = faceShape![info.vert0Weights[2]] * faceShape![info.vert0Weights[3]]
      const vert0weight45 = faceShape![info.vert0Weights[4]] * faceShape![info.vert0Weights[5]]
      const vert0weight67 = faceShape![info.vert0Weights[6]] * faceShape![info.vert0Weights[7]]
      const vert1weight01 = faceShape![info.vert1Weights[0]] * faceShape![info.vert1Weights[1]]
      const vert1weight23 = faceShape![info.vert1Weights[2]] * faceShape![info.vert1Weights[3]]
      const vert1weight45 = faceShape![info.vert1Weights[4]] * faceShape![info.vert1Weights[5]]
      const vert1weight67 = faceShape![info.vert1Weights[6]] * faceShape![info.vert1Weights[7]]
      const vert2weight01 = faceShape![info.vert2Weights[0]] * faceShape![info.vert2Weights[1]]
      const vert2weight23 = faceShape![info.vert2Weights[2]] * faceShape![info.vert2Weights[3]]
      const vert2weight45 = faceShape![info.vert2Weights[4]] * faceShape![info.vert2Weights[5]]
      const vert2weight67 = faceShape![info.vert2Weights[6]] * faceShape![info.vert2Weights[7]]
      const vert3weight01 = faceShape![info.vert3Weights[0]] * faceShape![info.vert3Weights[1]]
      const vert3weight23 = faceShape![info.vert3Weights[2]] * faceShape![info.vert3Weights[3]]
      const vert3weight45 = faceShape![info.vert3Weights[4]] * faceShape![info.vert3Weights[5]]
      const vert3weight67 = faceShape![info.vert3Weights[6]] * faceShape![info.vert3Weights[7]]
      const _tc1 = smoothBlend(light3, light0, lightCorner03, lightCenter)
      const _tc2 = smoothBlend(light2, light0, lightCorner02, lightCenter)
      const _tc3 = smoothBlend(light2, light1, lightCorner12, lightCenter)
      const _tc4 = smoothBlend(light3, light1, lightCorner13, lightCenter)
      // prettier-ignore
      const _c1 = clamp((tempShade1 * vert0weight01 + tempShade2 * vert0weight23 + tempShade3 * vert0weight45 + tempShade4 * vert0weight67), 0, 1)
      // prettier-ignore
      const _c2 = clamp((tempShade1 * vert1weight01 + tempShade2 * vert1weight23 + tempShade3 * vert1weight45 + tempShade4 * vert1weight67), 0, 1)
      // prettier-ignore
      const _c3 = clamp((tempShade1 * vert2weight01 + tempShade2 * vert2weight23 + tempShade3 * vert2weight45 + tempShade4 * vert2weight67), 0, 1)
      // prettier-ignore
      const _c4 = clamp((tempShade1 * vert3weight01 + tempShade2 * vert3weight23 + tempShade3 * vert3weight45 + tempShade4 * vert3weight67), 0, 1)
      // prettier-ignore
      const lightCoords = _remapArray(
        smoothWeightedBlend(_tc1, _tc2, _tc3, _tc4, vert0weight01, vert0weight23, vert0weight45, vert0weight67),
        smoothWeightedBlend(_tc1, _tc2, _tc3, _tc4, vert1weight01, vert1weight23, vert1weight45, vert1weight67),
        smoothWeightedBlend(_tc1, _tc2, _tc3, _tc4, vert2weight01, vert2weight23, vert2weight45, vert2weight67),
        smoothWeightedBlend(_tc1, _tc2, _tc3, _tc4, vert3weight01, vert3weight23, vert3weight45, vert3weight67),
      )
      const color = _remapPush(
        [_c1, _c1, _c1, 1],
        [_c2, _c2, _c2, 1],
        [_c3, _c3, _c3, 1],
        [_c4, _c4, _c4, 1],
      )
      return { lightCoords, color }
    }
  }
}
