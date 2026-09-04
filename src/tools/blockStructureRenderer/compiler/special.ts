import type { BlockState } from '../store/types.ts'
import type { FastMergeGeometry } from './structure.ts'
import type { TranslucentLevel } from './types.ts'
import { BUFFER_ATTRIBUTES_MAP } from './structure.ts'

export type HardcodedRenderer = (
  [x, y, z]: number[],
  state: BlockState,
) => Record<TranslucentLevel, FastMergeGeometry<keyof typeof BUFFER_ATTRIBUTES_MAP>> | null

const NOP = () => null

export const HARDCODED_RENDERERS: {
  block: string | RegExp
  renderer: HardcodedRenderer
  model?: boolean
}[] = [
  { block: /.*air$/, renderer: NOP },
  { block: 'structure_void', renderer: NOP },
  { block: 'barrier', renderer: NOP },
  { block: 'light', renderer: NOP },
  { block: 'water', renderer: NOP },
  { block: 'lava', renderer: NOP },
  { block: 'bubble_column', renderer: NOP },
]

export function getHardcodedRenderer(
  state: BlockState,
): (typeof HARDCODED_RENDERERS)[number] | undefined {
  return HARDCODED_RENDERERS.filter((val) =>
    typeof val.block === 'string' ? state.name === val.block : val.block.test(state.name),
  )[0]
}
