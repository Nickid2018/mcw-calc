import type {
  BlockState,
  DirectionName,
  LiquidComputationData,
  OcclusionFaceData,
} from '../store/types.ts'
import type { StructurePayload } from './types.ts'
import * as THREE from 'three/webgpu'
import {
  BUFFER_ATTRIBUTES_MAP,
  FastMergeGeometry,
} from '@/tools/blockStructureRenderer/compiler/structure.ts'
import { AIR_STATE } from '../store/structure.ts'
import { DIRECTIONS, getStepX, getStepZ, isVerticalDirection } from '../store/types.ts'
import { DIRECTION_REVERSE, isOcclusion, moveTowards } from './math.ts'

type FluidState =
  | {
      type: 'water' | 'lava'
      level: number
      falling: boolean
    }
  | { type: 'air' }

export const AIR_FLUID: FluidState = { type: 'air' }
export const WATER_SOURCE_FLUID: FluidState = { type: 'water', level: 0, falling: false }

function computeFluidState(state: BlockState): FluidState {
  if (state.properties.waterlogged === 'true') return WATER_SOURCE_FLUID
  if (state.name === 'water' || state.name === 'lava') {
    if (state.properties.level === undefined) {
      console.error(
        `Block ${state.name} does not have level property, fluid state will be ignored.`,
      )
      return AIR_FLUID
    } else {
      const level = Number.parseInt(state.properties.level)
      if (level === 0) return { type: state.name, level: 0, falling: false }
      else if (level >= 8) return { type: state.name, level: 8, falling: true }
      else return { type: state.name, level: 8 - level, falling: false }
    }
  }
  if (state.name === 'seagrass' || state.name === 'kelp' || state.name === 'bubble_column')
    return WATER_SOURCE_FLUID
  return AIR_FLUID
}

function getFluidHeight(state: FluidState) {
  if (state.type === 'air') return 0
  if (state.level === 0) return 8 / 9
  return state.level / 9
}

function isSameFluid(thisFluidState: FluidState, neighborFluidState: FluidState): boolean {
  return thisFluidState.type === neighborFluidState.type
}

function isFaceOccludedByNeighbor(
  x: number,
  y: number,
  z: number,
  occlusions: OcclusionFaceData[][][],
  height: number,
  direction: DirectionName,
) {
  const [dx, dy, dz] = moveTowards(x, y, z, direction)
  const otherBlock = occlusions[dy][dz][dx]
  return (
    otherBlock.can_occlude &&
    isOcclusion([[0, 0, 1, height]], otherBlock[DIRECTION_REVERSE[direction]] ?? [])
  )
}

function isFaceOccludedBySelf(
  x: number,
  y: number,
  z: number,
  occlusions: OcclusionFaceData[][][],
  direction: DirectionName,
) {
  return isOcclusion(occlusions[y][z][x][direction] ?? [], [[0, 0, 1, 1]])
}

function shouldRenderFace(
  x: number,
  y: number,
  z: number,
  fluids: FluidState[][][],
  occlusions: OcclusionFaceData[][][],
  direction: DirectionName,
) {
  const thisFluidState = fluids[y]?.[z]?.[x] || AIR_FLUID
  const [dx, dy, dz] = moveTowards(x, y, z, direction)
  const otherFluidState = fluids[dy]?.[dz]?.[dx] || AIR_FLUID
  return (
    isFaceOccludedBySelf(x, y, z, occlusions, direction) &&
    !isSameFluid(thisFluidState, otherFluidState)
  )
}

function isBlocksMotion(
  x: number,
  y: number,
  z: number,
  liquidComputations: LiquidComputationData[][][],
) {
  return liquidComputations[y]?.[z]?.[x]?.blocks_motion ?? false
}

function isSolidBlock(
  x: number,
  y: number,
  z: number,
  liquidComputations: LiquidComputationData[][][],
) {
  return liquidComputations[y]?.[z]?.[x]?.blocks_motion ?? false
}

function getHeight(
  [x, y, z]: number[],
  [dx, dy, dz]: number[],
  fluids: FluidState[][][],
  liquidComputations: LiquidComputationData[][][],
) {
  const thisFluidState = fluids[y]?.[z]?.[x] || AIR_FLUID
  const otherFluidState = fluids[dy]?.[dz]?.[dx] || AIR_FLUID
  const otherUpFluidState = fluids[y + 1]?.[z]?.[x] || AIR_FLUID
  if (isSameFluid(thisFluidState, otherFluidState)) {
    if (isSameFluid(thisFluidState, otherUpFluidState)) return 1
    return getFluidHeight(otherFluidState)
  }
  return isSolidBlock(dx, dy, dz, liquidComputations) ? -1 : 0
}

function getAverageHeight(
  [x, y, z]: number[],
  [dx, dy, dz]: number[],
  fluids: FluidState[][][],
  liquidComputations: LiquidComputationData[][][],
  levelHeight: number,
  zAxisHeight: number,
  xAxisHeight: number,
) {
  if (xAxisHeight >= 1 || zAxisHeight >= 1) return 1
  const weightedArray = [0, 0]
  if (xAxisHeight > 0 || zAxisHeight > 0) {
    const cornerHeight = getHeight([x, y, z], [dx, dy, dz], fluids, liquidComputations)
    if (cornerHeight >= 1) return 1
    addWeightedHeight(weightedArray, cornerHeight)
  }
  addWeightedHeight(weightedArray, levelHeight)
  addWeightedHeight(weightedArray, xAxisHeight)
  addWeightedHeight(weightedArray, zAxisHeight)
  return weightedArray[0] / weightedArray[1]
}

function addWeightedHeight(weightedArray: number[], weight: number) {
  if (weight >= 0.8) {
    weightedArray[0] = weightedArray[0] + weight * 10
    weightedArray[1] = weightedArray[1] + 10
  } else if (weight >= 0) {
    weightedArray[0] = weightedArray[0] + weight
    weightedArray[1] = weightedArray[1] + 1
  }
}

function affectsFlow(thisFluidState: FluidState, fluidState: FluidState) {
  return fluidState.type === 'air' || thisFluidState.type === fluidState.type
}

function isSolidFace(
  thisFluidState: FluidState,
  otherFluidState: FluidState,
  otherBlockState: BlockState,
  otherLiquidComputation: LiquidComputationData | undefined,
  direction: DirectionName,
) {
  if (thisFluidState.type === otherFluidState.type) return false
  if (direction === 'up') return true
  if (otherBlockState.name === 'ice' || otherBlockState.name === 'frosted_ice') return false
  return (otherLiquidComputation?.face_sturdy || []).includes(direction)
}

function getFlow(
  x: number,
  y: number,
  z: number,
  fluids: FluidState[][][],
  structure: BlockState[][][],
  liquidComputations: LiquidComputationData[][][],
) {
  const thisFluidState = fluids[y][z][x]
  let xFlow = 0
  let zFlow = 0
  for (const direction of DIRECTIONS) {
    if (isVerticalDirection(direction)) continue
    const [dx, dy, dz] = moveTowards(x, y, z, direction)
    const neighborFluidState = fluids[dy][dz][dx]
    if (!affectsFlow(thisFluidState, neighborFluidState)) continue
    const neighborHeight = getFluidHeight(neighborFluidState)
    let calculatedHeight = 0
    if (neighborHeight === 0) {
      const fluidBelow = fluids[dy - 1]?.[dz]?.[dx] || AIR_FLUID
      if (
        !isBlocksMotion(dx, dy, dz, liquidComputations) &&
        affectsFlow(thisFluidState, fluidBelow) &&
        getFluidHeight(fluidBelow) > 0
      ) {
        calculatedHeight = getFluidHeight(thisFluidState) - (getFluidHeight(fluidBelow) - 8 / 9)
      }
    } else if (neighborHeight > 0) {
      calculatedHeight = getFluidHeight(thisFluidState) - neighborHeight
    }
    if (calculatedHeight === 0) continue
    xFlow += calculatedHeight * getStepX(direction)
    zFlow += calculatedHeight * getStepZ(direction)
  }
  const vector = new THREE.Vector3(xFlow, 0, zFlow)
  if (thisFluidState.type !== 'air' && thisFluidState.falling) {
    for (const direction of DIRECTIONS) {
      if (isVerticalDirection(direction)) continue
      const [dx, dy, dz] = moveTowards(x, y, z, direction)
      const nBlockState = structure[dy][dz][dx]
      const nFluidState = fluids[dy][dz][dx]
      const nUpBlockState = structure[dy + 1]?.[dz]?.[dx] || AIR_STATE
      const nUpFluidState = fluids[dy + 1]?.[dz]?.[dx] || AIR_FLUID
      const nLiquid = liquidComputations[dy + 1]?.[dz]?.[dx]
      const nUpLiquid = liquidComputations[dy + 1]?.[dz]?.[dx]
      if (
        isSolidFace(thisFluidState, nFluidState, nBlockState, nLiquid, direction) ||
        isSolidFace(thisFluidState, nUpFluidState, nUpBlockState, nUpLiquid, direction)
      ) {
        vector.normalize().add(new THREE.Vector3(0, -6, 0))
        break
      }
    }
  }
  return vector.normalize()
}

export async function compileLiquid(
  payload: StructurePayload,
  occlusions: OcclusionFaceData[][][],
  liquidData: LiquidComputationData[][][],
) {
  const { origin, structure } = payload
  const { x: xo, y: yo, z: zo } = origin
  const geometry = new FastMergeGeometry(BUFFER_ATTRIBUTES_MAP)

  const fluidData = payload.structure.map((v1) => v1.map((v2) => v2.map(computeFluidState)))

  for (let y = 1; y < structure.length - 1; y++) {
    const xzPlane = structure[y]
    for (let z = 1; z < xzPlane.length - 1; z++) {
      const xAxis = xzPlane[z]
      for (let x = 1; x < xAxis.length - 1; x++) {
        const fluidState = fluidData[y][z][x]
        if (fluidState.type === 'air') continue
        const thisPos = [x, y, z]

        const fluidColor =
          fluidState.type === 'water'
            ? payload.tints[y][z][x]?.[0] || [0x3f, 0x76, 0xe4, 255]
            : [255, 255, 255, 255]

        const upCanRender = !isSameFluid(fluidState, fluidData[y + 1]?.[z]?.[x] || AIR_FLUID)
        const downCanRender =
          shouldRenderFace(x, y, z, fluidData, occlusions, 'down') &&
          !isFaceOccludedByNeighbor(x, y, z, occlusions, 1, 'down')
        const northCanRender = shouldRenderFace(x, y, z, fluidData, occlusions, 'north')
        const southCanRender = shouldRenderFace(x, y, z, fluidData, occlusions, 'down')
        const westCanRender = shouldRenderFace(x, y, z, fluidData, occlusions, 'west')
        const eastCanRender = shouldRenderFace(x, y, z, fluidData, occlusions, 'east')
        if (
          !upCanRender &&
          !downCanRender &&
          !northCanRender &&
          !southCanRender &&
          !westCanRender &&
          !eastCanRender
        )
          return

        const levelHeight = getHeight(thisPos, thisPos, fluidData, liquidData)
        let southWestHeight, southEastHeight, northWestHeight, northEastHeight
        if (levelHeight >= 1) {
          southWestHeight = 1
          southEastHeight = 1
          northWestHeight = 1
          northEastHeight = 1
        } else {
          const northPos = moveTowards(x, y, z, 'north')
          const southPos = moveTowards(x, y, z, 'south')
          const westPos = moveTowards(x, y, z, 'west')
          const eastPos = moveTowards(x, y, z, 'east')
          const northHeight = getHeight(thisPos, northPos, fluidData, liquidData)
          const southHeight = getHeight(thisPos, southPos, fluidData, liquidData)
          const westHeight = getHeight(thisPos, westPos, fluidData, liquidData)
          const eastHeight = getHeight(thisPos, eastPos, fluidData, liquidData)
          // prettier-ignore
          northWestHeight = getAverageHeight(thisPos, moveTowards(...northPos, 'west'), fluidData, liquidData, levelHeight, northHeight, westHeight)
          // prettier-ignore
          northEastHeight = getAverageHeight(thisPos, moveTowards(...northPos, 'east'), fluidData, liquidData, levelHeight, northHeight, eastHeight)
          // prettier-ignore
          southWestHeight = getAverageHeight(thisPos, moveTowards(...southPos, 'west'), fluidData, liquidData, levelHeight, southHeight, westHeight)
          // prettier-ignore
          southEastHeight = getAverageHeight(thisPos, moveTowards(...southPos, 'east'), fluidData, liquidData, levelHeight, southHeight, eastHeight)
        }

        const renderMinY = downCanRender ? 0.001 : 0
        if (
          upCanRender &&
          (Math.min(southWestHeight, southEastHeight, northWestHeight, northEastHeight) < 1 ||
            !isFaceOccludedByNeighbor(x, y, z, occlusions, 1, 'up'))
        ) {
          southEastHeight -= 0.001
          southWestHeight -= 0.001
          northEastHeight -= 0.001
          northWestHeight -= 0.001
          const flow = getFlow(x, y, z, fluidData, payload.structure, liquidData)
        }
      }
    }
  }
}
