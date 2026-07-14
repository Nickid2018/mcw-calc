// net.minecraft.world.level.lighting
// WORKER THREAD ALGORITHM
import type { BlockState, DirectionName, OcclusionFaceData } from '../store/types.ts'
import type { LightPayload, LightPos } from './types.ts'
import { AIR_STATE } from '../store/structure.ts'
import { DIRECTION_ORDINAL, DIRECTIONS, stateToKey } from '../store/types.ts'
import { DIRECTION_REVERSE, isOcclusion } from './math.ts'
import { queryBlock } from './worker.ts'

declare const self: DedicatedWorkerGlobalScope

interface LightRequest {
  from: LightPos
  data: number
}

function packPos(x: number, y: number, z: number): LightPos {
  return { x, y, z }
}

function getX(node: LightPos) {
  return node.x
}

function getY(node: LightPos) {
  return node.y
}

function getZ(node: LightPos) {
  return node.z
}

function moveTowards(node: LightPos, dir: DirectionName): LightPos {
  switch (dir) {
    case 'north':
      return { ...node, z: node.z - 1 }
    case 'south':
      return { ...node, z: node.z + 1 }
    case 'west':
      return { ...node, x: node.x - 1 }
    case 'east':
      return { ...node, x: node.x + 1 }
    case 'down':
      return { ...node, y: node.y - 1 }
    case 'up':
      return { ...node, y: node.y + 1 }
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

// light engine

let BLOCK_ENGINE: BlockLightEngine | null = null
let SKY_ENGINE: SkyLightEngine | null = null
let lastVersionPromise = Promise.resolve()

export function doLight(payload: LightPayload) {
  let resolveVersion = () => {}
  const lastPromise = lastVersionPromise
  lastVersionPromise = new Promise((resolve) => (resolveVersion = resolve))
  internalDoLight(payload, lastPromise, resolveVersion).catch(console.error)
}

async function internalDoLight(payload: LightPayload, promise: Promise<void>, resolve: () => void) {
  await promise
  if (payload.updates && BLOCK_ENGINE && SKY_ENGINE) {
    BLOCK_ENGINE.update(payload.structures, payload.updates)
    SKY_ENGINE.update(payload.structures, payload.updates)
    await SKY_ENGINE.fillLowestSourceY()
  } else {
    BLOCK_ENGINE = new BlockLightEngine(payload.structures)
    SKY_ENGINE = new SkyLightEngine(payload.structures)
    await SKY_ENGINE.fillLowestSourceY()
    await Promise.all([BLOCK_ENGINE.propagateLightSources(), SKY_ENGINE.propagateLightSources()])
  }
  await Promise.all([BLOCK_ENGINE.runUpdates(), SKY_ENGINE.runUpdates()])
  self.postMessage({
    type: 'light',
    block: BLOCK_ENGINE.getLightArray(),
    sky: SKY_ENGINE.getLightArray(),
    version: payload.version,
  })
  resolve()
}

export abstract class LightEngine {
  protected readonly increaseQueue: LightRequest[] = []
  protected readonly decreaseQueue: LightRequest[] = []
  private readonly blockNodesToCheck: LightPos[] = []
  private readonly storedLevels: number[][][]
  private lastStructure: BlockState[][][] | null = null
  private readonly rangeX: number
  private readonly rangeY: number
  private readonly rangeZ: number
  protected levelDefault = 0

  protected constructor(protected structure: BlockState[][][]) {
    this.storedLevels = structure.map((v1) => v1.map((v2) => v2.map((_) => 0)))
    this.rangeX = structure[0][0].length
    this.rangeY = structure.length
    this.rangeZ = structure[0].length
  }

  update(structure: BlockState[][][], checkBlocks: LightPos[]) {
    this.structure = structure
    this.blockNodesToCheck.push(...checkBlocks)
  }

  isOutside(node: LightPos) {
    const x = getX(node)
    const y = getY(node)
    const z = getZ(node)
    return x < 0 || y < 0 || z < 0 || x >= this.rangeX || y >= this.rangeY || z >= this.rangeZ
  }

  getState(node: LightPos): BlockState {
    if (!this.lastStructure) return AIR_STATE
    return this.lastStructure[getY(node)]?.[getZ(node)]?.[getX(node)] ?? AIR_STATE
  }

  async getLightDampening(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    return blockData?.occlusion[stateToKey(state)]?.dampening ?? 0
  }

  async getEmission(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    return blockData?.occlusion[stateToKey(state)]?.emission ?? 0
  }

  async isEmptyShape(state: BlockState) {
    const blockData = (await queryBlock([state.name]))[state.name]
    const occlusionData = blockData?.occlusion[stateToKey(state)]
    return !occlusionData?.can_occlude || !occlusionData?.shape_light_occlusion
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
    const fromIsEmpty = !fromData?.can_occlude || !fromData?.shape_light_occlusion
    const toIsEmpty = !toData?.can_occlude || !toData?.shape_light_occlusion
    return isOcclusion(
      [[0, 0, 1, 1]],
      [
        ...(fromIsEmpty ? [] : (fromData?.[dir] ?? [])),
        ...(toIsEmpty ? [] : (toData?.[DIRECTION_REVERSE[dir]] ?? [])),
      ],
    )
  }

  getStoredLevel(node: LightPos): number {
    return this.storedLevels[getY(node)]?.[getZ(node)]?.[getX(node)] ?? this.levelDefault
  }

  setStoredLevel(node: LightPos, level: number) {
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

  abstract checkNode(node: LightPos): Promise<void>
  abstract propagateLightSources(): Promise<void>
  abstract propagateIncrease(
    fromNode: LightPos,
    increaseData: number,
    fromLevel: number,
  ): Promise<void>
  abstract propagateDecrease(fromNode: LightPos, decreaseData: number): Promise<void>
}

export class BlockLightEngine extends LightEngine {
  constructor(structure: BlockState[][][]) {
    super(structure)
  }

  async checkNode(node: LightPos) {
    if (this.isOutside(node)) return
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

  async propagateDecrease(fromNode: LightPos, decreaseData: number) {
    const oldFromLevel = getFromLevel(decreaseData)
    for (const dir of DIRECTIONS) {
      const toNode = moveTowards(fromNode, dir)
      if (this.isOutside(toNode)) continue
      const toLevel = this.getStoredLevel(toNode)
      if (!shouldPropagateInDirection(decreaseData, dir) || toLevel === 0) continue
      if (toLevel <= oldFromLevel - 1) {
        const toState = this.getState(toNode)
        const toEmission = await this.getEmission(toState)
        this.setStoredLevel(toNode, 0)
        if (toEmission < toLevel)
          this.decreaseQueue.push({
            from: toNode,
            data: decreaseSkipOneDirection(toLevel, DIRECTION_REVERSE[dir]),
          })
        if (toEmission <= 0) continue
        this.increaseQueue.push({
          from: toNode,
          data: increaseLightFromEmission(toEmission, await this.isEmptyShape(toState)),
        })
      }
      this.increaseQueue.push({
        from: toNode,
        data: increaseOnlyOneDirection(toLevel, false, DIRECTION_REVERSE[dir]),
      })
    }
  }

  async propagateIncrease(fromNode: LightPos, increaseData: number, fromLevel: number) {
    const maxPossibleNewToLevel = fromLevel - 1
    const fromState = isFromEmptyShape(increaseData) ? AIR_STATE : this.getState(fromNode)
    for (const dir of DIRECTIONS) {
      const toNode = moveTowards(fromNode, dir)
      if (this.isOutside(toNode)) continue
      const toLevel = this.getStoredLevel(toNode)
      if (!shouldPropagateInDirection(increaseData, dir) || maxPossibleNewToLevel <= toLevel)
        continue
      const toState = this.getState(toNode)
      const newToLevel = fromLevel - (await this.getOpacity(toState))
      if (newToLevel <= toLevel) continue
      if (await this.shapeOccludes(fromState, toState, dir)) continue
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

  async propagateLightSources() {
    await Promise.all(
      this.structure
        .map((v1, y) =>
          v1.map((v2, z) =>
            v2.map(async (state, x) => {
              const emission = await this.getEmission(state)
              if (emission <= 0) return
              this.increaseQueue.push({
                from: packPos(x, y, z),
                data: increaseLightFromEmission(emission, await this.isEmptyShape(state)),
              })
            }),
          ),
        )
        .flat(2),
    )
  }
}

export class SkyLightEngine extends LightEngine {
  private readonly heightmap: number[][] // zx

  constructor(structure: BlockState[][][]) {
    super(structure)
    this.heightmap = structure[0].map((v1) => v1.map((_) => -1))
    this.levelDefault = 15
  }

  async fillLowestSourceY() {
    const blocks = [...new Set(this.structure.flat(3).map((b) => b.name))]
    const blockData = await queryBlock(blocks)
    const blockOcclusion = Object.fromEntries(
      Object.entries(blockData)
        .map(([_, data]) => Object.entries(data.occlusion))
        .flat(),
    )
    const occlusions = this.structure.map((v1) =>
      v1.map((v2) => v2.map((s) => blockOcclusion[stateToKey(s)])),
    )

    await Promise.all(
      this.structure[0]
        .map((v1, z) =>
          v1.map(async (_, x) => {
            this.heightmap[z][x] = await this.findLowestSourceY(
              x,
              z,
              (x, y, z) => occlusions[y][z][x],
            )
          }),
        )
        .flat(),
    )
  }

  async findLowestSourceY(
    x: number,
    z: number,
    occlusionGetter: (x: number, y: number, z: number) => OcclusionFaceData,
  ) {
    for (let y = this.structure.length - 1; y > 0; y--) {
      const state = this.getState(packPos(x, y, z))
      if ((await this.getLightDampening(state)) > 0) return y + 1
      const occlusion = occlusionGetter(x, y, z)
      if (isOcclusion([[0, 0, 1, 1]], [...(occlusion.up ?? []), ...(occlusion.down ?? [])]))
        return y + 1
    }
    return -1
  }

  getLowestSourceY(x: number, z: number, defaultValue: number) {
    const y = this.heightmap[z]?.[x] ?? defaultValue
    if (y === -1) return Number.MIN_SAFE_INTEGER
    return y
  }

  updateSourcesInColumn(x: number, z: number, lowestSourceY: number) {
    this.removeSourcesBelow(x, z, lowestSourceY, 0)
    this.addSourcesAbove(x, z, lowestSourceY, 0)
  }

  removeSourcesBelow(x: number, z: number, lowestSourceY: number, worldBottomY: number) {
    if (lowestSourceY <= worldBottomY) return
    for (let y = lowestSourceY; y >= worldBottomY; y--) {
      const node = packPos(x, y, z)
      if (this.getStoredLevel(node) !== 15) return
      this.setStoredLevel(node, 0)
      this.decreaseQueue.push({
        from: node,
        data:
          y === lowestSourceY - 1 ? decreaseAllDirections(15) : decreaseSkipOneDirection(15, 'up'),
      })
    }
  }

  addSourcesAbove(x: number, z: number, lowestSourceY: number, worldBottomY: number) {
    const neighborLowestSourceY = Math.max(
      this.getLowestSourceY(x - 1, z, Number.MIN_SAFE_INTEGER),
      this.getLowestSourceY(x + 1, z, Number.MIN_SAFE_INTEGER),
      this.getLowestSourceY(x, z - 1, Number.MIN_SAFE_INTEGER),
      this.getLowestSourceY(x, z + 1, Number.MIN_SAFE_INTEGER),
    )
    const startY = Math.max(lowestSourceY, worldBottomY)
    for (let y = startY; y < this.structure.length + 1; y++) {
      const node = packPos(x, y, z)
      if (this.getStoredLevel(node) === 15) return
      if (y >= neighborLowestSourceY && y !== lowestSourceY) continue
      this.increaseQueue.push({ from: node, data: increaseSkipOneDirection(15, false, 'up') })
    }
  }

  async checkNode(node: LightPos) {
    const x = getX(node)
    const z = getZ(node)
    const lowestSourceY = this.isOutside(node)
      ? Number.MAX_SAFE_INTEGER
      : this.getLowestSourceY(x, z, Number.MAX_SAFE_INTEGER)
    if (lowestSourceY !== Number.MAX_SAFE_INTEGER) {
      this.updateSourcesInColumn(x, z, lowestSourceY)
    }
    const isSource = getY(node) >= lowestSourceY
    if (isSource) {
      this.decreaseQueue.push({ from: node, data: decreaseAllDirections(15) })
      this.increaseQueue.push({ from: node, data: increaseSkipOneDirection(15, false, 'up') })
    } else {
      const oldLevel = this.getStoredLevel(node)
      if (oldLevel > 0) {
        this.setStoredLevel(node, 0)
        this.decreaseQueue.push({ from: node, data: decreaseAllDirections(oldLevel) })
      } else this.decreaseQueue.push({ from: node, data: decreaseAllDirections(1) })
    }
  }

  async propagateDecrease(fromNode: LightPos, decreaseData: number) {
    const oldFromLevel = getFromLevel(decreaseData)
    for (const dir of DIRECTIONS) {
      const toNode = moveTowards(fromNode, dir)
      if (this.isOutside(toNode)) continue
      const toLevel = this.getStoredLevel(toNode)
      if (!shouldPropagateInDirection(decreaseData, dir) || toLevel === 0) continue
      if (toLevel <= oldFromLevel - 1) {
        this.setStoredLevel(toNode, 0)
        this.decreaseQueue.push({
          from: toNode,
          data: decreaseSkipOneDirection(toLevel, DIRECTION_REVERSE[dir]),
        })
      }
      this.increaseQueue.push({
        from: toNode,
        data: increaseOnlyOneDirection(toLevel, false, DIRECTION_REVERSE[dir]),
      })
    }
  }

  async propagateIncrease(fromNode: LightPos, increaseData: number, fromLevel: number) {
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
      if (await this.shapeOccludes(fromState, toState, dir)) continue
      this.setStoredLevel(toNode, newToLevel)
      if (newToLevel > 1)
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

  async propagateLightSources() {
    const zRange = this.structure[0].length
    const xRange = this.structure[0][0].length
    for (let z = -1; z <= zRange; z++) {
      for (let x = -1; x <= xRange; x++) {
        const lowestSourceY = this.getLowestSourceY(x, z, Number.MIN_SAFE_INTEGER)
        const northLowestSourceY = this.getLowestSourceY(x, z - 1, Number.MIN_SAFE_INTEGER)
        const southLowestSourceY = this.getLowestSourceY(x, z + 1, Number.MIN_SAFE_INTEGER)
        const westLowestSourceY = this.getLowestSourceY(x - 1, z, Number.MIN_SAFE_INTEGER)
        const eastLowestSourceY = this.getLowestSourceY(x + 1, z, Number.MIN_SAFE_INTEGER)
        const neighborLowestSourceY = Math.max(
          northLowestSourceY,
          southLowestSourceY,
          westLowestSourceY,
          eastLowestSourceY,
        )
        for (let y = this.structure.length + 5; y >= Math.max(0, lowestSourceY); y--) {
          const node = packPos(x, y, z)
          this.setStoredLevel(node, 15)
          if (y !== lowestSourceY && y >= neighborLowestSourceY) continue
          this.increaseQueue.push({
            from: node,
            data: increaseSkySourceInDirections(
              y === lowestSourceY,
              y < northLowestSourceY,
              y < southLowestSourceY,
              y < westLowestSourceY,
              y < eastLowestSourceY,
            ),
          })
        }
      }
    }
  }
}
