import type { TextureRange } from '../compiler/types.ts'

export type DirectionName = 'north' | 'south' | 'west' | 'east' | 'up' | 'down'
export const DIRECTIONS: DirectionName[] = ['down', 'up', 'north', 'south', 'west', 'east']
export const DIRECTION_ORDINAL: Record<DirectionName, number> = {
  down: 0,
  up: 1,
  north: 2,
  south: 3,
  west: 4,
  east: 5,
}

export function isHorizontalDirection(direction: DirectionName): boolean {
  return !isVerticalDirection(direction)
}

export function isVerticalDirection(direction: DirectionName): boolean {
  return direction === 'up' || direction === 'down'
}

export function getStepX(direction: DirectionName) {
  if (direction === 'east') return 1
  if (direction === 'west') return -1
  return 0
}

export function getStepZ(direction: DirectionName) {
  if (direction === 'south') return 1
  if (direction === 'north') return -1
  return 0
}

// Block data --------------------------------------------------------------------------------------
export interface BlockData {
  state: BlockStateModelCollection
  liquid: Record<string, LiquidComputationData>
  occlusion: Record<string, OcclusionFaceData>
  special: number[]
}

export interface BlockStateModelCollection {
  variants?: Record<string, ModelReference | ModelReferenceWithWeight[]>
  multipart?: ConditionalPart[]
}

export interface ModelReference {
  model: number
  uvlock?: boolean
  x?: number
  y?: number
}

export interface ModelReferenceWithWeight {
  model: number
  uvlock?: boolean
  x?: number
  y?: number
  weight?: number
}

export interface ConditionalPart {
  apply: ModelReference | ModelReferenceWithWeight[]
  when?: Record<string, string> | AndCondition | OrCondition
}

export interface AndCondition {
  AND: (Record<string, string> | AndCondition | OrCondition)[]
}

export interface OrCondition {
  OR: (Record<string, string> | AndCondition | OrCondition)[]
}

export type OcclusionFaceData = { [Key in DirectionName]?: number[][] } & {
  can_occlude: boolean
  emission?: number
  dampening?: number
  shape_light_occlusion?: boolean
  collision_full?: boolean
  shade_brightness?: number
  solid_render?: boolean
}

export interface LiquidComputationData {
  blocks_motion: boolean
  face_sturdy: string[]
}

// Model -------------------------------------------------------------------------------------------
export interface BlockModel {
  elements?: ModelElement[]
}

export interface ModelElement {
  from: number[]
  to: number[]
  rotation?: ModelRotation
  shade?: boolean
  shade_direction_override?: DirectionName
  light_emission?: number
  faces: Partial<Record<DirectionName, ModelFace>>
}

export interface ModelFace {
  texture: string
  uv?: number[]
  rotation?: number
  tintindex?: number
  cullface?: DirectionName
}

export interface ModelRotation {
  origin: number[]
  axis: 'x' | 'y' | 'z'
  angle: number
  rescale?: boolean
}

// Texture -----------------------------------------------------------------------------------------
export interface AnimatedTexture {
  frames: number[]
  time: number[]
  interpolate?: boolean
}

export type SourceTextureRange = TextureRange

// State -------------------------------------------------------------------------------------------
export interface BlockState {
  name: string
  properties: Record<string, string>
}

export function stateToKey(state: BlockState) {
  return (
    state.name +
    (Object.keys(state.properties).length === 0
      ? ''
      : `[${Object.entries(state.properties)
          .filter(([k1]) => k1 !== 'waterlogged')
          .sort(([k1], [k2]) => k1.localeCompare(k2))
          .map(([k, v]) => `${k}=${v}`)
          .join(',')}]`)
  )
}
