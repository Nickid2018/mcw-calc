import type { BlockData, BlockModel, BlockState } from '../store/types.ts'
import * as THREE from 'three/webgpu'

export interface LightPayload {
  type: 'light'
  structures: BlockState[][][] // yzx, full structure
}

export interface StructurePayload {
  type: 'chunk'
  origin: THREE.Vector3
  version: number
  structure: BlockState[][][] // yzx, padding = 1
}

export type CompilePayload = LightPayload | StructurePayload

export class TransferableGeometry {
  readonly buffers: ArrayBufferLike[] = []
  readonly shallowGeometry: THREE.BufferGeometry

  constructor(geometry: THREE.BufferGeometry) {
    this.shallowGeometry = geometry
    for (const attributeName of Object.keys(geometry.attributes)) {
      this.buffers.push(geometry.attributes[attributeName].array.buffer)
    }
  }
}

export function recover(transferable: TransferableGeometry) {
  const geometry = new THREE.BufferGeometry()
  for (const name of Object.keys(transferable.shallowGeometry.attributes)) {
    const shallow = transferable.shallowGeometry.attributes[name]
    const attr = new THREE.BufferAttribute(shallow.array, shallow.itemSize, shallow.normalized)
    geometry.setAttribute(name, attr)
  }
  geometry.index = transferable.shallowGeometry.index
  return geometry
}

export interface WorkerQueryImpl<
  T extends 'block' | 'model' | 'texture',
  K extends string | number,
> {
  id: string
  type: T
  keys: K[]
}
export type WorkerBlockQuery = WorkerQueryImpl<'block', string>
export type WorkerModelQuery = WorkerQueryImpl<'model', number>
export type WorkerTextureQuery = WorkerQueryImpl<'texture', number>
export type WorkerQuery = WorkerBlockQuery | WorkerModelQuery | WorkerTextureQuery

export type WorkerResponse = WorkerLightResponse | WorkerChunkResponse

export interface WorkerLightResponse {
  type: 'light'
  lights: number[][][]
}

export interface WorkerChunkResponse {
  type: 'chunk'
  version: number
  origin: THREE.Vector3
  chunk: Record<TranslucentLevel, TransferableGeometry>
}

export interface WorkerQueryResponseImpl<
  T extends 'block' | 'model' | 'texture',
  E,
  I extends string | number,
> {
  id: string
  type: T
  data: Record<I, E>
}

export type TextureRange = number[] & { length: 4 }
export type TranslucentLevel = 'solid' | 'transparent' | 'translucent'

export type WorkerBlockQueryResponse = WorkerQueryResponseImpl<'block', BlockData, string>
export type WorkerModelQueryResponse = WorkerQueryResponseImpl<'model', BlockModel, number>
export type WorkerTextureQueryResponse = WorkerQueryResponseImpl<'texture', TextureRange, number>
export type WorkerQueryResponse =
  | WorkerBlockQueryResponse
  | WorkerModelQueryResponse
  | WorkerTextureQueryResponse

export function isSameTextureRange(t1: TextureRange, t2: TextureRange) {
  return t1[0] === t2[0] && t1[1] === t2[1] && t1[2] === t2[2] && t1[3] === t2[3]
}
