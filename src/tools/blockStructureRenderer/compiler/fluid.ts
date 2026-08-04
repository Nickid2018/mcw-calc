import type {
  BlockState,
  DirectionName,
  LiquidComputationData,
  OcclusionFaceData,
} from '../store/types.ts'
import type { StructurePayload, TextureRange } from './types.ts'
import { lerp } from 'three/src/math/MathUtils.js'
import * as THREE from 'three/webgpu'
import { AIR_STATE } from '../store/structure.ts'
import { DIRECTIONS, getStepX, getStepZ, isVerticalDirection } from '../store/types.ts'
import {
  BlockModelLighter,
  DEFAULT_CARDINAL_LIGHTING,
  multiplyCardinalLighting,
  unpackToShader,
} from './ao.ts'
import { DIRECTION_REVERSE, isOcclusion, moveTowards } from './math.ts'
import { checkNameInSet, HALF_TRANSPARENT_BLOCKS, LEAVES_BLOCKS } from './occludes.ts'
import { BUFFER_ATTRIBUTES_MAP, FastMergeGeometry } from './structure.ts'
import { queryBlock, queryTexture } from './worker.ts'

type FluidState =
  | {
      type: 'water' | 'lava'
      level: number
      falling: boolean
    }
  | { type: 'air' }

export const AIR_FLUID: FluidState = { type: 'air' }
export const WATER_SOURCE_FLUID: FluidState = { type: 'water', level: 0, falling: false }
export const FLUID_INDEX_ARRAY = [0, 1, 2, 2, 3, 0]

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
  const lighter = new BlockModelLighter()

  const fluidData = payload.structure.map((v1) => v1.map((v2) => v2.map(computeFluidState)))
  const fluids = new Set(fluidData.flat(2).map((f) => f.type))
  fluids.delete('air')
  const texture = Object.fromEntries(
    await Promise.all(
      Object.entries(await queryBlock([...fluids]))
        .filter(([_, data]) => !!data.special)
        .map(async ([k, data]) => {
          const special = data.special
          const textures = await queryTexture(special)
          return [k, special.map((s) => textures[s][0])] as [string, TextureRange[]]
        }),
    ),
  )

  for (let y = 1; y < structure.length - 1; y++) {
    const xzPlane = structure[y]
    for (let z = 1; z < xzPlane.length - 1; z++) {
      const xAxis = xzPlane[z]
      for (let x = 1; x < xAxis.length - 1; x++) {
        const fluidState = fluidData[y][z][x]
        if (fluidState.type === 'air') continue
        const blockState = structure[y][z][x]
        const thisPos = [x, y, z]

        const fluidColor =
          fluidState.type === 'water'
            ? payload.tints[y][z][x]?.[0] || [0x3f / 255, 0x76 / 255, 0xe4 / 255, 1]
            : [1, 1, 1, 1]

        const upCanRender = !isSameFluid(fluidState, fluidData[y + 1]?.[z]?.[x] || AIR_FLUID)
        const downCanRender =
          shouldRenderFace(x, y, z, fluidData, occlusions, 'down') &&
          !isFaceOccludedByNeighbor(x, y, z, occlusions, 1, 'down')
        const northCanRender = shouldRenderFace(x, y, z, fluidData, occlusions, 'north')
        const southCanRender = shouldRenderFace(x, y, z, fluidData, occlusions, 'south')
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
          continue

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

        const _addFace = (
          [se, sw, ne, nw]: number[],
          [seu, sev, swu, swv, neu, nev, nwu, nwv]: number[],
          lightCoord: number,
          colorSource: number[],
          backward: boolean,
        ) => {
          const lc = unpackToShader(lightCoord)
          const uv2 = [...lc, ...lc, ...lc, ...lc]
          // prettier-ignore
          const position = [
            xo + x - 1, yo + y + nw - 1, zo + z - 1, xo + x    , yo + y + ne - 1, zo + z - 1, // NW NE
            xo + x    , yo + y + se - 1, zo + z    , xo + x - 1, yo + y + sw - 1, zo + z    , // SE SW
          ]
          const uv = [nwu, nwv, neu, nev, seu, sev, swu, swv]
          const color = [...colorSource, ...colorSource, ...colorSource, ...colorSource]
          geometry.pushFace({ position, uv, uv2, color }, FLUID_INDEX_ARRAY)
          if (backward) {
            // prettier-ignore
            const positionB = [
              xo + x - 1, yo + y + nw - 1, zo + z - 1, xo + x - 1, yo + y + sw - 1, zo + z    , // NW SW
              xo + x    , yo + y + se - 1, zo + z    , xo + x    , yo + y + ne - 1, zo + z - 1, // SE NE
            ]
            const uvB = [nwu, nwv, swu, swv, seu, sev, neu, nev]
            geometry.pushFace({ position: positionB, uv: uvB, uv2, color }, FLUID_INDEX_ARRAY)
          }
        }

        const renderMinY = downCanRender ? 0.001 : 0
        const sideLightCoords = await lighter.getLightCoords(blockState, x + xo - 1, y + yo - 1, z + zo - 1)
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

          let northWestU, northEastU, southWestU, southEastU
          let northWestV, northEastV, southWestV, southEastV

          if (flow.x === 0 && flow.z === 0) {
            const stillTexture = texture[fluidState.type][0]
            northWestU = stillTexture[0]
            northWestV = 1 - stillTexture[1]
            southWestU = northWestU
            southWestV = 1 - stillTexture[3]
            southEastU = stillTexture[2]
            southEastV = southWestV
            northEastU = southEastU
            northEastV = northWestV
          } else {
            const angle = Math.atan2(flow.z, flow.x) - Math.PI / 2
            const sinAngle = Math.sin(angle) * 0.25
            const cosAngle = Math.cos(angle) * 0.25
            const flowTexture = texture[fluidState.type][1]
            northWestU = lerp(flowTexture[0], flowTexture[2], 0.5 - cosAngle - sinAngle)
            northWestV = 1 - lerp(flowTexture[1], flowTexture[3], 0.5 - cosAngle + sinAngle)
            southWestU = lerp(flowTexture[0], flowTexture[2], 0.5 - cosAngle + sinAngle)
            southWestV = 1 - lerp(flowTexture[1], flowTexture[3], 0.5 + cosAngle + sinAngle)
            southEastU = lerp(flowTexture[0], flowTexture[2], 0.5 + cosAngle + sinAngle)
            southEastV = 1 - lerp(flowTexture[1], flowTexture[3], 0.5 + cosAngle - sinAngle)
            northEastU = lerp(flowTexture[0], flowTexture[2], 0.5 + cosAngle - sinAngle)
            northEastV = 1 - lerp(flowTexture[1], flowTexture[3], 0.5 - cosAngle - sinAngle)
          }

          let shouldRenderBackward = false
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              if (isSameFluid(fluidState, fluidData[x + i]?.[y + 1]?.[z + j] || AIR_FLUID)) continue
              const occlusion = occlusions[x + i]?.[y + 1]?.[z + j]
              if (
                occlusion &&
                DIRECTIONS.map((d) => occlusion[d] || [[0, 0, 0, 0]]).every((f) =>
                  isOcclusion([[0, 0, 1, 1]], f),
                )
              )
                continue
              shouldRenderBackward = true
              break
            }
          }

          // prettier-ignore
          _addFace(
            [southEastHeight, southWestHeight, northEastHeight, northWestHeight],
            [southEastU, southEastV, southWestU, southWestV, northEastU, northEastV, northWestU, northWestV],
            sideLightCoords,
            multiplyCardinalLighting(fluidColor, 'up', DEFAULT_CARDINAL_LIGHTING),
            shouldRenderBackward,
          )
        }

        if (downCanRender) {
          const u0 = texture[fluidState.type][0][0]
          const v0 = 1 - texture[fluidState.type][0][1]
          const u1 = texture[fluidState.type][0][2]
          const v1 = 1 - texture[fluidState.type][0][3]
          _addFace(
            [renderMinY, renderMinY, renderMinY, renderMinY],
            [u1, v1, u0, v1, u1, v0, u0, v0],
            await lighter.getLightCoords(blockState, x + xo - 1, y + yo - 2, z + zo - 1),
            multiplyCardinalLighting(fluidColor, 'down', DEFAULT_CARDINAL_LIGHTING),
            false,
          )
        }

        const lc = unpackToShader(sideLightCoords)
        const uv2 = [...lc, ...lc, ...lc, ...lc]
        for (const [directionStr, [canRender, data]] of Object.entries<[boolean, number[]]>({
          north: [northCanRender, [northWestHeight, northEastHeight, 0, 1, 0.001, 0.001]],
          south: [southCanRender, [southEastHeight, southWestHeight, 1, 0, 0.999, 0.999]],
          west: [westCanRender, [southWestHeight, northWestHeight, 0.001, 0.001, 1, 0]],
          east: [eastCanRender, [northEastHeight, southEastHeight, 0.999, 0.999, 0, 1]],
        })) {
          if (!canRender) continue
          const direction = directionStr as DirectionName
          if (isFaceOccludedByNeighbor(x, y, z, occlusions, Math.max(data[0], data[1]), direction))
            continue
          const [dx, dy, dz] = moveTowards(x, y, z, direction)
          const faceState = structure[dy]?.[dz]?.[dx] || AIR_STATE
          const overlay =
            !!texture[fluidState.type][2] &&
            (checkNameInSet(faceState.name, HALF_TRANSPARENT_BLOCKS) ||
              checkNameInSet(faceState.name, LEAVES_BLOCKS))
          const baseUV = texture[fluidState.type][overlay ? 2 : 1]
          const u0 = baseUV[0]
          const u1 = lerp(baseUV[0], baseUV[2], 0.5)
          const v01 = 1 - lerp(baseUV[1], baseUV[3], 0.5 * (1 - data[0]))
          const v02 = 1 - lerp(baseUV[1], baseUV[3], 0.5 * (1 - data[1]))
          const v1 = 1 - lerp(baseUV[1], baseUV[3], 0.5)
          const faceColor = multiplyCardinalLighting(
            multiplyCardinalLighting(fluidColor, direction, DEFAULT_CARDINAL_LIGHTING),
            'up',
            DEFAULT_CARDINAL_LIGHTING,
          )
          // prettier-ignore
          const position = [
            xo + x + data[2] - 1, yo + y + data[0]    - 1, zo + z + data[4] - 1, xo + x + data[3] - 1, yo + y +    data[1] - 1, zo + z + data[5] - 1,
            xo + x + data[3] - 1, yo + y + renderMinY - 1, zo + z + data[5] - 1, xo + x + data[2] - 1, yo + y + renderMinY - 1, zo + z + data[4] - 1,
          ]
          const uv = [u0, v01, u1, v02, u1, v1, u0, v1]
          const color = [...faceColor, ...faceColor, ...faceColor, ...faceColor]
          geometry.pushFace({ position, uv, uv2, color }, FLUID_INDEX_ARRAY)
          if (!overlay) {
            // prettier-ignore
            const positionB = [
              xo + x + data[2] - 1, yo + y + data[0]    - 1, zo + z + data[4] - 1, xo + x + data[2] - 1, yo + y + renderMinY - 1, zo + z + data[4] - 1,
              xo + x + data[3] - 1, yo + y + renderMinY - 1, zo + z + data[5] - 1, xo + x + data[3] - 1, yo + y + data[1]    - 1, zo + z + data[5] - 1,
            ]
            const uvB = [u0, v01, u0, v1, u1, v1, u1, v02]
            geometry.pushFace({ position: positionB, uv: uvB, uv2, color }, FLUID_INDEX_ARRAY)
          }
        }
      }
    }
  }
  return geometry
}
