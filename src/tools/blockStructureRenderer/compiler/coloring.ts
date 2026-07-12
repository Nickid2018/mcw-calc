import type { BlockState, DirectionName } from '../store/types.ts'

export type CardinalLighting = Record<DirectionName, number>

export const DEFAULT_CARDINAL_LIGHTING: CardinalLighting = {
  down: 0.5,
  up: 1,
  east: 0.6,
  west: 0.6,
  north: 0.8,
  south: 0.8,
}

export const GRASS_LIKE_BLOCK = new Set([
  'large_fern',
  'tall_grass',
  'grass_block',
  'fern',
  'short_grass',
  'potted_fern',
  'pink_petals',
  'sugar_cane',
  'wildflowers',
])

export const FOLIAGE_BLOCK = new Set([
  'oak_leaves',
  'jungle_leaves',
  'acacia_leaves',
  'dark_oak_leaves',
  'vine',
  'mangrove_leaves',
])

export function colorApply(data: number[], multi: number[]) {
  for (let i = 0; i < data.length; i++) {
    data[i] = data[i] * multi[i % multi.length]
  }
}

export function applyCardinalLighting(dir: DirectionName, cardinal: CardinalLighting) {
  const gray = cardinal[dir]
  return [gray, gray, gray, 1, gray, gray, gray, 1, gray, gray, gray, 1, gray, gray, gray, 1]
}

function clamp(value: number, min: number, max: number) {
  if (value < min) return min
  return Math.min(value, max)
}

export function hardcodedBlockTint(
  blockState: BlockState,
  _index: number,
): [number, number, number, number] | null {
  if (blockState.name === 'redstone_wire') {
    const power = blockState.properties.power
    const percent = Number.parseInt(power) / 15
    const red = percent * 0.6 + (percent > 0 ? 0.4 : 0.3)
    const green = clamp(percent * percent * 0.7 - 0.5, 0, 1)
    const blue = clamp(percent * percent * 0.6 - 0.7, 0, 1)
    return [red, green, blue, 1]
  } else if (GRASS_LIKE_BLOCK.has(blockState.name)) {
    return [0x7c / 255, 0xbd / 255, 0x6b / 255, 1]
  } else if (blockState.name === 'spruce_leaves') {
    return [0x61 / 255, 0x99 / 255, 0x61 / 255, 1]
  } else if (blockState.name === 'birch_leaves') {
    return [0x80 / 255, 0xa7 / 255, 0x55 / 255, 1]
  } else if (FOLIAGE_BLOCK.has(blockState.name)) {
    return [0x48 / 255, 0xb5 / 255, 0x18 / 255, 1]
  } else if (blockState.name === 'water_cauldron') {
    return [0x3f / 255, 0x76 / 255, 0xe4 / 255, 1]
  } else if (blockState.name === 'lava_cauldron' || blockState.name === 'powder_snow_cauldron') {
    return [1, 1, 1, 1]
  } else if (
    blockState.name === 'attached_melon_stem' ||
    blockState.name === 'attached_pumpkin_stem'
  ) {
    return [0xe0 / 255, 0xc7 / 255, 0x1c / 255, 1]
  } else if (blockState.name === 'melon_stem' || blockState.name === 'pumpkin_stem') {
    const age = Number.parseInt(blockState.properties.age)
    const red = age * 32
    const green = 255 - age * 8
    const blue = age * 4
    return [red / 255, green / 255, blue / 255, 1]
  } else if (blockState.name === 'lily_pad') {
    return [0x20 / 255, 0x80 / 255, 0x30 / 255, 1]
  }
  return null
}
