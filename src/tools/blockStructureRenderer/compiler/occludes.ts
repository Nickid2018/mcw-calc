// net.minecraft.world.level.block.state.BlockBehaviour
// protected boolean skipRendering(BlockState blockState, BlockState blockState2, Direction direction)
//  default: return false
//  overrides: HalfTransparentBlock, IronBarsBlock, (LiquidBlock), MangroveRootsBlock, PowderSnowBlock
import type { BlockState, DirectionName } from '../store/types.ts'
import { isHorizontalDirection, isVerticalDirection } from '../store/types.ts'
import { DIRECTION_REVERSE } from './math.ts'

function checkNameInSet(name: string, nameSet: (string | RegExp)[]) {
  return nameSet.some((nameTest) =>
    nameTest instanceof RegExp ? nameTest.test(name) : nameTest === name,
  )
}

// Subclasses of net.minecraft.world.level.block.HalfTransparentBlock
export const HALF_TRANSPARENT_BLOCKS = [
  'frosted_ice',
  'ice',
  'honey_block',
  'slime_block',
  /.*copper_grate$/,
  'glass',
  /.*stained_glass$/,
  'tinted_glass',
]

export function hardcodedSkipRendering(
  thisBlock: BlockState,
  otherBlock: BlockState,
  direction: DirectionName,
) {
  if (thisBlock.name === 'powder_snow' && otherBlock.name === 'powder_snow') return true
  if (
    thisBlock.name === 'iron_bars' &&
    otherBlock.name === 'iron_bars' &&
    isHorizontalDirection(direction) &&
    thisBlock.properties[direction] === 'true' &&
    otherBlock.properties[DIRECTION_REVERSE[direction]] === 'true'
  ) {
    return true
  }
  if (
    thisBlock.name === 'mangrove_roots' &&
    otherBlock.name === 'mangrove_roots' &&
    isVerticalDirection(direction)
  ) {
    return true
  }
  return (
    checkNameInSet(thisBlock.name, HALF_TRANSPARENT_BLOCKS) && thisBlock.name === otherBlock.name
  )
}
