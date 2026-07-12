import type { TranslucentLevel, WorkerResponse } from '../compiler/types.ts'
import type { BlockStructure } from '../store/structure.ts'
import type { BlockState } from '../store/types.ts'
import type { Renderer } from './types.ts'
import { attribute, Fn, NodeType, texture } from 'three/tsl'
import * as THREE from 'three/webgpu'
import { computed, ref } from 'vue'
import { recover, TransferableGeometry } from '../compiler/types.ts'
import { VECTOR_ONE } from '../const.ts'
import { generateLightmap } from '../scene/lightmap.ts'
import { AIR_STATE } from '../store/structure.ts'
import { TextureManager } from '../store/texture.ts'
import { DisplayRange } from './types.ts'

const COLOR_NODE = Fn((args: { atlas: THREE.Texture; lightmap: THREE.Texture }) => {
  const texColor = texture(args.atlas, attribute('uv', NodeType.VECTOR2))
  const lightMapColor = texture(args.lightmap, attribute('uv2', NodeType.VECTOR2))
  return texColor.mul(attribute('color', NodeType.VECTOR4).mul(lightMapColor))
})

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
    // Overworld Light at noon
    const lightmap = generateLightmap({
      AmbientColor: new THREE.Vector3(10 / 255, 10 / 255, 10 / 255),
      BlockFactor: 1.42516,
      BlockLightTint: new THREE.Vector3(1, 0.84705, 0.54902),
      BossOverlayWorldDarkeningFactor: 0,
      BrightnessFactor: 1,
      DarknessScale: 0,
      NightVisionColor: new THREE.Vector3(0.6, 0.6, 0.6),
      NightVisionFactor: 0,
      SkyFactor: 1,
      SkyLightColor: VECTOR_ONE,
    })
    this.solidMaterial = new THREE.MeshBasicNodeMaterial({
      colorNode: COLOR_NODE({ atlas: textureMgr.atlas, lightmap }),
      fog: false,
    })
    this.transparentMaterial = new THREE.MeshBasicNodeMaterial({
      colorNode: COLOR_NODE({ atlas: textureMgr.atlas, lightmap }),
      fog: false,
      alphaTest: 0.1,
    })
    this.translucentMaterial = new THREE.MeshBasicNodeMaterial({
      colorNode: COLOR_NODE({ atlas: textureMgr.atlas, lightmap }),
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

          const tensorBlocks: BlockState[][][] = []
          const tensorTints: ([number, number, number, number][] | null)[][][] = []
          const emptyAxis = Array.from<BlockState>({ length: xLimit }).fill(AIR_STATE)
          const emptyPlane = Array.from<BlockState[]>({ length: zLimit }).fill(emptyAxis)
          const emptyAxisT = Array.from<null>({ length: xLimit }).fill(null)
          const emptyPlaneT = Array.from<null[]>({ length: zLimit }).fill(emptyAxisT)

          for (let yNow = -1; yNow < yLimit; yNow++) {
            const ySlice = yNow + origin.y
            if (ySlice < 0 || ySlice >= this.structure.y) {
              tensorBlocks.push(emptyPlane)
              tensorTints.push(emptyPlaneT)
            } else {
              const layer: BlockState[][] = []
              const layerT: (typeof tensorTints)[number] = []
              for (let zNow = -1; zNow < zLimit; zNow++) {
                const zSlice = zNow + origin.z
                if (zSlice < 0 || zSlice >= this.structure.z) {
                  layer.push(emptyAxis)
                  layerT.push(emptyAxisT)
                } else {
                  const axis: BlockState[] = []
                  const axisT: (typeof layerT)[number] = []
                  const sourceAxis = this.structure.structure[ySlice][zSlice]
                  const sourceAxisT = this.structure.tints[ySlice][zSlice]
                  for (let xNow = -1; xNow < xLimit; xNow++) {
                    const xSlice = xNow + origin.x
                    if (xSlice < 0 || xSlice >= this.structure.x) {
                      axis.push(AIR_STATE)
                      axisT.push(null)
                    } else {
                      axis.push(sourceAxis[xSlice])
                      axisT.push(sourceAxisT[xSlice])
                    }
                  }
                  layer.push(axis)
                  layerT.push(axisT)
                }
              }
              tensorBlocks.push(layer)
              tensorTints.push(layerT)
            }
          }

          const key = this._key(origin)
          const version = (this.versions.get(key) ?? 0) + 1
          this.versions.set(key, version)
          this.worker.postMessage({
            type: 'chunk',
            version,
            origin,
            structure: tensorBlocks,
            tints: tensorTints,
          })
        }
      }
    }
  }
}
