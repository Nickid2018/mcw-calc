import type { BlockData, BlockModel, BlockState } from '../store/types.ts'
import * as THREE from 'three/webgpu'

export interface CompilePayloadBase {
  type: 'light' | 'chunk'
  structures: string[][][] // yzx
  mapping: Record<string, BlockState>
}

export interface LightPayload extends CompilePayloadBase {
  type: 'light'
}

export interface StructurePayload extends CompilePayloadBase {
  type: 'chunk'
  origin: THREE.Vector3
}

export type CompilePayload = LightPayload | StructurePayload

export interface RenderLayer {
  name: string
  buffer: TransferableGeometry
}

export class TransferableGeometry {
  readonly buffers: ArrayBufferLike[] = []
  readonly shallowGeometry: THREE.BufferGeometry

  constructor(geometry: THREE.BufferGeometry) {
    this.shallowGeometry = geometry
    for (const attributeName of Object.keys(geometry.attributes)) {
      this.buffers.push(geometry.attributes[attributeName].array.buffer)
    }
  }

  recover() {
    const geometry = new THREE.BufferGeometry()
    for (const name of Object.keys(this.shallowGeometry.attributes)) {
      const shallow = this.shallowGeometry.attributes[name]
      const attr = new THREE.BufferAttribute(shallow.array, shallow.itemSize, false)
      geometry.setAttribute(name, attr)
    }
    return geometry
  }
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

export interface WorkerResponse {
  type: 'light' | 'chunk'
}

export interface WorkerLightResponse extends WorkerResponse {
  type: 'light'
  lights: number[][][]
}

export interface WorkerChunkResponse extends WorkerResponse {
  type: 'chunk'
  chunk: RenderLayer[]
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