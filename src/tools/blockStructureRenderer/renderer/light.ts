import type { WorkerLightResponse } from '../compiler/types.ts'
import type { BlockStructure } from '../store/structure.ts'
import type { BlockState } from '../store/types.ts'
import type { Range, Updater } from './types.ts'
import * as THREE from 'three/webgpu'
import { AIR_STATE } from '../store/structure.ts'

export class LightUpdater implements Updater {
  private blockLight: number[][][] = []
  private skyLight: number[][][] = []
  private lightStructure: BlockState[][][] = []

  private version = 0
  private resolving: Promise<void>
  private resolveLight: () => void = () => {}

  constructor(
    private readonly worker: Worker,
    private readonly structure: BlockStructure,
  ) {
    this.resolving = new Promise((resolve) => (this.resolveLight = resolve))
    this.worker.addEventListener('message', (e: MessageEvent<WorkerLightResponse>) => {
      if (e.data.type === 'light') this._onLightUpdate(e.data)
    })

    const xFinal = this.structure.structure[0][0].length + 2
    const zFinal = this.structure.structure[0].length + 2
    const emptyAxis = Array.from<BlockState>({ length: xFinal }).fill(AIR_STATE)
    const emptyPlane = Array.from<BlockState[]>({ length: zFinal }).fill(emptyAxis)
    this.lightStructure.push(emptyPlane)
    this.structure.structure.forEach((plane) => {
      const pushPlane: BlockState[][] = []
      pushPlane.push(emptyAxis)
      plane.forEach((axis) => pushPlane.push([AIR_STATE, ...axis, AIR_STATE]))
      pushPlane.push(emptyAxis)
      this.lightStructure.push(pushPlane)
    })
    this.lightStructure.push(emptyPlane)

    this.worker.postMessage({
      type: 'light',
      structures: this.lightStructure,
      version: this.version,
    })
  }

  _onLightUpdate(payload: WorkerLightResponse) {
    if (this.version !== payload.version) return
    this.blockLight = payload.block
    this.skyLight = payload.sky
    this.resolveLight()
    console.warn(payload)
  }

  async getBlockLight(x: number, y: number, z: number) {
    await this.resolving
    return this.blockLight[y - 1]?.[z - 1]?.[x - 1] ?? 0
  }

  async getSkyLight(x: number, y: number, z: number) {
    await this.resolving
    return this.skyLight[y - 1]?.[z - 1]?.[x - 1] ?? 0
  }

  onDisplayRangeChanged(scene: THREE.Scene, update: Range, remove: Range): void {}
}
