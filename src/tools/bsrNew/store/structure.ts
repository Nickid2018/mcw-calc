import type { BlockState } from './types.ts'

const REPLACE_SPACES = /\s/

export const AIR_KEY = '+'
export const STRUCTURE_VOID_KEY = '-'
export const AIR_STATE: BlockState = { name: 'air', properties: {} }
export const STRUCTURE_VOID_STATE: BlockState = { name: 'structure_void', properties: {} }

function strToState(state: string): [string[], BlockState] {
  let tintData: string[]
  if (state.includes('!')) {
    const tintSplitPoint = state.indexOf('!')
    tintData = state.substring(tintSplitPoint + 1).split(',')
    state = state.substring(0, tintSplitPoint)
  } else {
    tintData = []
  }

  const splitPoint = state.indexOf('[')
  if (splitPoint === -1) {
    return [tintData, { name: state, properties: {} }]
  } else {
    const name = state.substring(0, splitPoint)
    const propertiesStr = state.substring(splitPoint + 1, state.length - 1).split(',')
    const properties: Record<string, string> = {}
    propertiesStr.forEach((property) => {
      const [key, value] = property.split('=')
      properties[key] = value
    })
    return [tintData, { name, properties }]
  }
}

export class BlockStructure {
  readonly structure: BlockState[][][] // yzx

  readonly x: number
  readonly y: number
  readonly z: number

  constructor(structureStr: string, blocks: string[]) {
    const splitHeightLines = structureStr.split(';')
    let maxX = 0
    let maxZ = 0
    const maxY = splitHeightLines.length
    for (let y = 0; y < splitHeightLines.length; y++) {
      const splitLines = splitHeightLines[y].replace(REPLACE_SPACES, '').split(',')
      if (splitLines.length > maxZ) maxZ = splitLines.length
      for (let z = 0; z < splitLines.length; z++) {
        const line = splitLines[z]
        if (line.length > maxX) maxX = line.length
      }
    }

    this.x = maxX
    this.y = maxY
    this.z = maxZ

    const unmappedStructure = Array.from({ length: maxY }, () =>
      Array.from({ length: maxZ }, () => Array.from<string>({ length: maxX }).fill(AIR_KEY)),
    )
    for (let y = 0; y < splitHeightLines.length; y++) {
      const splitLines = splitHeightLines[y].replace(REPLACE_SPACES, '').split(',')
      for (let z = 0; z < splitLines.length; z++) {
        const line = splitLines[z]
        for (let x = 0; x < line.length; x++) {
          unmappedStructure[y][z][x] = line[x]
        }
      }
    }

    const nameStateMapping: Record<string, BlockState> = {}
    blocks.forEach((blockPair) => {
      const splitPoint = blockPair.indexOf('=')
      const blockName = blockPair.substring(0, splitPoint)
      const blockData = blockPair.substring(splitPoint + 1)
      const [tint, state] = strToState(blockData)
      nameStateMapping[blockName] = state
    })

    if (nameStateMapping[AIR_KEY]) {
      console.warn('Block key "+" is reserved for air, please do not use it in the block mapping')
    } else {
      nameStateMapping[AIR_KEY] = AIR_STATE
    }
    if (nameStateMapping[STRUCTURE_VOID_KEY]) {
      console.warn(
        'Block key "-" is reserved for structure void, please do not use it in the block mapping',
      )
    } else {
      nameStateMapping[STRUCTURE_VOID_KEY] = STRUCTURE_VOID_STATE
    }

    this.structure = unmappedStructure.map((v1) =>
      v1.map((v2) =>
        v2.map(
          (s) =>
            nameStateMapping[s] ??
            (console.warn(`No name mapping for block key '${s}', using default air (+)`),
            AIR_STATE),
        ),
      ),
    )
  }
}
