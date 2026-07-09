import type { TranslucentLevel, WorkerResponse } from '../compiler/types.ts'
import type { BlockStructure } from '../store/structure.ts'
import type { BlockState } from '../store/types.ts'
import type { Renderer } from './types.ts'
import * as THREE from 'three/webgpu'
import { computed, ref } from 'vue'
import { recover, TransferableGeometry } from '../compiler/types.ts'
import { AIR_STATE } from '../store/structure.ts'
import { TextureManager } from '../store/texture.ts'
import { DisplayRange } from './types.ts'

export class ChunkBlockRenderer implements Renderer {
  private readonly chunks = new Map<number, THREE.Mesh[]>()
  private readonly versions = new Map<number, number>()
  private readonly pendingSet = new Set<number>()

  public readonly pendingSize = ref(0)
  public readonly compiling = computed(() => this.pendingSize.value > 0)

  private pendingScene: THREE.Scene | null = null
  private readonly solidMaterial: THREE.Material
  private readonly transparentMaterial: THREE.Material
  private readonly translucentMaterial: THREE.Material

  constructor(
    private readonly worker: Worker,
    private readonly structure: BlockStructure,
    textureMgr: TextureManager,
  ) {
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === 'chunk')
        this._onWorkerFinished(event.data.origin, event.data.version, event.data.chunk)
    })
    this.solidMaterial = new THREE.MeshBasicMaterial({ map: textureMgr.atlas, fog: false })
    this.transparentMaterial = new THREE.MeshBasicMaterial({
      map: textureMgr.atlas,
      fog: false,
      alphaTest: 0.1,
    })
    this.translucentMaterial = new THREE.MeshBasicMaterial({
      map: textureMgr.atlas,
      fog: false,
      transparent: true,
    })
  }

  _key(origin: THREE.Vector3) {
    return (origin.x >> 4) + ((origin.y >> 4) << 16) + ((origin.z >> 4) << 8)
  }

  _onWorkerFinished(
    origin: THREE.Vector3,
    version: number,
    layers: Record<TranslucentLevel, TransferableGeometry>,
  ): void {
    const key = this._key(origin)
    if (this.versions.get(key) !== version || this.chunks.has(key)) return
    if (!this.pendingScene) return

    const meshes: THREE.Mesh[] = []
    if (layers.solid) {
      const meshSolid = new THREE.Mesh(recover(layers.solid), this.solidMaterial)
      this.pendingScene.add(meshSolid)
      meshes.push(meshSolid)
    }
    if (layers.transparent) {
      const meshTransparent = new THREE.Mesh(recover(layers.transparent), this.transparentMaterial)
      this.pendingScene.add(meshTransparent)
      meshes.push(meshTransparent)
    }
    if (layers.translucent) {
      const meshTranslucent = new THREE.Mesh(recover(layers.translucent), this.translucentMaterial)
      this.pendingScene.add(meshTranslucent)
      meshes.push(meshTranslucent)
    }

    this.chunks.set(key, meshes)
    this.pendingSet.delete(key)
    this.pendingSize.value = this.pendingSet.size
  }

  onDisplayRangeChanged(scene: THREE.Scene, range: DisplayRange): void {
    this.pendingScene = scene

    const yMin = Math.max(0, range.rangeYMin - 1) >> 4
    const yMax = Math.min(this.structure.y, range.rangeYMax + 1) >> 4
    const filteredChunks = [...this.chunks.entries()].filter(
      ([key]) => key >> 16 >= yMin && key >> 16 <= yMax,
    )
    scene.remove(...filteredChunks.map(([_, v]) => v).flat())
    filteredChunks.forEach(([k]) => this.chunks.delete(k))
    filteredChunks.forEach(([k]) => this.pendingSet.add(k))
    this.pendingSize.value = this.pendingSet.size

    for (let y = yMin; y <= yMax; y++) {
      for (let z = 0; z <= this.structure.z >> 4; z++) {
        for (let x = 0; x <= this.structure.x >> 4; x++) {
          const origin = new THREE.Vector3(x << 4, y << 4, z << 4)
          const xLimit = Math.min(2 + this.structure.x - (x << 4), 18)
          const yLimit = Math.min(2 + this.structure.y - (y << 4), 18)
          const zLimit = Math.min(2 + this.structure.z - (z << 4), 18)

          const tensor: BlockState[][][] = []
          const emptyAxis = Array.from<BlockState>({ length: xLimit }).fill(AIR_STATE)
          const emptyPlane = Array.from<BlockState[]>({ length: zLimit }).fill(emptyAxis)

          for (let yNow = -1; yNow < yLimit; yNow++) {
            const ySlice = yNow + origin.y
            if (ySlice < 0 || ySlice >= this.structure.y) {
              tensor.push(emptyPlane)
            } else {
              const layer: BlockState[][] = []
              for (let zNow = -1; zNow < zLimit; zNow++) {
                const zSlice = zNow + origin.z
                if (zSlice < 0 || zSlice >= this.structure.z) {
                  layer.push(emptyAxis)
                } else {
                  const axis: BlockState[] = []
                  const sourceAxis = this.structure.structure[ySlice][zSlice]
                  for (let xNow = -1; xNow < xLimit; xNow++) {
                    const xSlice = xNow + origin.x
                    if (xSlice < 0 || xSlice >= this.structure.x) {
                      axis.push(AIR_STATE)
                    } else {
                      axis.push(sourceAxis[xSlice])
                    }
                  }
                  layer.push(axis)
                }
              }
              tensor.push(layer)
            }
          }

          const key = this._key(origin)
          const version = (this.versions.get(key) ?? 0) + 1
          this.versions.set(key, version)
          this.worker.postMessage({ type: 'chunk', version, origin, structure: tensor })
        }
      }
    }
  }
}
