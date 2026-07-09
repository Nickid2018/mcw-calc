// net.minecraft.world.level.lighting
// WORKER THREAD ALGORITHM
import type { BlockState, DirectionName } from '../store/types.ts'
import { AIR_STATE } from '../store/structure.ts'
import { DIRECTION_ORDINAL, DIRECTIONS, stateToKey } from '../store/types.ts'
import { DIRECTION_REVERSE, isOcclusion } from './math.ts'
import { queryBlock } from './worker.ts'

interface LightRequest {
  from: number
  data: number
}

function getX(node: number) {
  return (node >> 24) & 0xfff
}

function getY(node: number) {
  return (node >> 12) & 0xfff
}

function getZ(node: number) {
  return (node >> 0) & 0xfff
}

function moveTowards(node: number, dir: DirectionName) {
  switch (dir) {
    case 'north':
      return (getX(node) << 24) | (getY(node) << 12) | (getZ(node) - 1)
    case 'south':
      return (getX(node) << 24) | (getY(node) << 12) | (getZ(node) + 1)
    case 'west':
      return ((getX(node) - 1) << 24) | (getY(node) << 12) | getZ(node)
    case 'east':
      return ((getX(node) + 1) << 24) | (getY(node) << 12) | getZ(node)
    case 'up':
      return (getX(node) << 24) | ((getY(node) + 1) << 12) | getZ(node)
    case 'down':
      return (getX(node) << 24) | ((getY(node) - 1) << 12) | getZ(node)
  }
}

// QueueEntry

const PULL_LIGHT_IN_ENTRY = decreaseAllDirections(1)

function decreaseSkipOneDirection(oldFromLevel: number, skipDirection: DirectionName) {
  const decreaseData = withoutDirection(1008, skipDirection)
  return withLevel(decreaseData, oldFromLevel)
}

function decreaseAllDirections(oldFromLevel: number) {
  return withLevel(1008, oldFromLevel)
}

function increaseLightFromEmission(newFromLevel: number, fromEmptyShape: boolean) {
  let increaseData = 1008
  increaseData |= 0x800
  if (fromEmptyShape) increaseData |= 0x400
  return withLevel(increaseData, newFromLevel)
}

function increaseSkipOneDirection(
  newFromLevel: number,
  fromEmptyShape: boolean,
  skipDirection: DirectionName,
) {
  let increaseData = withoutDirection(1008, skipDirection)
  if (fromEmptyShape) increaseData |= 0x400
  return withLevel(increaseData, newFromLevel)
}

function increaseOnlyOneDirection(
  newFromLevel: number,
  fromEmptyShape: boolean,
  direction: DirectionName,
) {
  let increaseData = 0
  if (fromEmptyShape) increaseData |= 0x400
  increaseData = withDirection(increaseData, direction)
  return withLevel(increaseData, newFromLevel)
}

function increaseSkySourceInDirections(
  down: boolean,
  north: boolean,
  south: boolean,
  west: boolean,
  east: boolean,
) {
  let increaseData = withLevel(0, 15)
  if (down) increaseData = withDirection(increaseData, 'down')
  if (north) increaseData = withDirection(increaseData, 'north')
  if (south) increaseData = withDirection(increaseData, 'south')
  if (west) increaseData = withDirection(increaseData, 'west')
  if (east) increaseData = withDirection(increaseData, 'east')
  return increaseData
}

function isFromEmptyShape(entry: number) {
  return (entry & 0x400) !== 0
}

function shouldPropagateInDirection(entry: number, direction: DirectionName) {
  return (entry & (1 << (DIRECTION_ORDINAL[direction] + 4))) !== 0
}

function withLevel(entry: number, level: number) {
  return (entry & ~0xf) | (level & 0xf)
}

function withDirection(entry: number, direction: DirectionName) {
  return entry | (1 << (DIRECTION_ORDINAL[direction] + 4))
}

function withoutDirection(entry: number, direction: DirectionName) {
  return entry & ((1 << (DIRECTION_ORDINAL[direction] + 4)) ^ -1)
}

function getFromLevel(data: number) {
  return data & 0xf
}

function isIncreaseFromEmission(entry: number) {
  return (entry & 0x800) !== 0
}

export abstract class LightEngine {
  protected readonly increaseQueue: LightRequest[] = []
  protected readonly decreaseQueue: LightRequest[] = []
  private readonly blockNodesToCheck: number[] = []
  private readonly storedLevels: number[][][]
  private lastStructure: BlockState[][][] | null = null

  protected constructor(private structure: BlockState[][][]) {
    this.storedLevels = structure.map((v1) => v1.map((v2) => v2.map((_) => 0)))
  }

  getState(node: number): BlockState {
    if (!this.lastStructure) return AIR_STATE
    return this.lastStructure[getY(node)]?.[getZ(node)]?.[getX(node)] ?? AIR_STATE
  }

  async getEmission(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    return blockData?.occlusion[stateToKey(state)]?.emission ?? 0
  }

  async isEmptyShape(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    const occlusionData = blockData?.occlusion[stateToKey(state)]
    return !occlusionData?.can_occlude && !occlusionData?.shape_light_occlusion
  }

  async getOpacity(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    const occlusionData = blockData?.occlusion[stateToKey(state)]
    return Math.max(occlusionData?.dampening ?? 0, 1)
  }

  async shapeOccludes(fromState: BlockState, toState: BlockState, dir: DirectionName) {
    const blockDatas = await queryBlock([fromState.name, toState.name])
    const fromData = blockDatas[fromState.name]?.occlusion[stateToKey(fromState)]
    const toData = blockDatas[toState.name]?.occlusion[stateToKey(toState)]
    return isOcclusion(
      [[0, 0, 1, 1]],
      [...(fromData?.[dir] ?? []), ...(toData?.[DIRECTION_REVERSE[dir]] ?? [])],
    )
  }

  getStoredLevel(node: number): number {
    return this.storedLevels[getY(node)]?.[getZ(node)]?.[getX(node)] ?? 0
  }

  setStoredLevel(node: number, level: number) {
    const yPlane = this.storedLevels[getY(node)]
    if (!yPlane) return
    const zAxis = yPlane[getZ(node)]
    if (!zAxis) return
    const x = getX(node)
    if (x < 0 || x >= zAxis.length) return
    zAxis[x] = level
  }

  async runUpdates() {
    this.blockNodesToCheck.forEach((node) => this.checkNode(node))
    this.blockNodesToCheck.splice(0, this.blockNodesToCheck.length)
    while (this.decreaseQueue.length) {
      const data = this.decreaseQueue.shift()!
      await this.propagateDecrease(data.from, data.data)
    }
    this.lastStructure = this.structure
    while (this.increaseQueue.length) {
      const data = this.increaseQueue.shift()!
      let fromLevel = this.getStoredLevel(data.from)
      const fromTargetLevel = getFromLevel(data.data)
      if (isIncreaseFromEmission(data.data) && fromLevel < fromTargetLevel) {
        this.setStoredLevel(data.from, fromTargetLevel)
        fromLevel = fromTargetLevel
      }
      if (fromLevel === fromTargetLevel) {
        await this.propagateIncrease(data.from, data.data, fromLevel)
      }
    }
  }

  getLightArray() {
    return this.storedLevels
  }

  abstract checkNode(node: number): Promise<void>
  abstract propagateLightSources(): Promise<void>
  abstract propagateIncrease(
    fromNode: number,
    increaseData: number,
    fromLevel: number,
  ): Promise<void>
  abstract propagateDecrease(fromNode: number, decreaseData: number): Promise<void>
}

export class BlockLightEngine extends LightEngine {
  constructor(structure: BlockState[][][]) {
    super(structure)
  }

  async checkNode(node: number) {
    const state = this.getState(node)
    const emission = await this.getEmission(state)
    const oldLevel = this.getStoredLevel(node)
    if (emission < oldLevel) {
      this.setStoredLevel(node, 0)
      this.decreaseQueue.push({ from: node, data: decreaseAllDirections(oldLevel) })
    } else {
      this.decreaseQueue.push({ from: node, data: PULL_LIGHT_IN_ENTRY })
    }
    if (emission > 0) {
      this.increaseQueue.push({
        from: node,
        data: increaseLightFromEmission(emission, await this.isEmptyShape(state)),
      })
    }
  }

  async propagateDecrease(fromNode: number, decreaseData: number) {}

  async propagateIncrease(fromNode: number, increaseData: number, fromLevel: number) {
    const maxPossibleNewToLevel = fromLevel - 1
    const fromState = isFromEmptyShape(increaseData) ? AIR_STATE : this.getState(fromNode)
    for (const dir of DIRECTIONS) {
      const toNode = moveTowards(fromNode, dir)
      const toLevel = this.getStoredLevel(toNode)
      if (!shouldPropagateInDirection(increaseData, dir) || maxPossibleNewToLevel <= toLevel)
        continue
      const toState = this.getState(toNode)
      const newToLevel = fromLevel - (await this.getOpacity(toState))
      if (newToLevel <= toLevel) continue
      if (await this.shapeOccludes(fromState, toState, dir)) return
      this.setStoredLevel(toNode, newToLevel)
      if (newToLevel <= 1) continue
      this.increaseQueue.push({
        from: toNode,
        data: increaseSkipOneDirection(
          newToLevel,
          await this.isEmptyShape(toState),
          DIRECTION_REVERSE[dir],
        ),
      })
    }
  }

  async propagateLightSources() {}
}
