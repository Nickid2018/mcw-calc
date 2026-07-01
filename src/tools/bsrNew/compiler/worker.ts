/// <reference lib="webworker" />
import type { BlockData, BlockModel } from '../store/types.ts'
import type {
  CompilePayload,
  LightPayload,
  RenderLayer,
  StructurePayload,
  TextureRange,
  TranslucentLevel,
  WorkerQueryResponse,
} from './types.ts'

declare const self: DedicatedWorkerGlobalScope

const QUERY_PROMISE = new Map<string, (data: any) => void>()

self.addEventListener('message', (event: MessageEvent<CompilePayload | WorkerQueryResponse>) => {
  if (event.data.type === 'chunk') {
    const result = doStructure(event.data)
    self.postMessage(
      { type: 'chunk', chunk: result },
      result.flatMap((r) => r.buffer.buffers),
    )
  } else if (event.data.type === 'light') {
    const result = doLight(event.data)
    self.postMessage({ type: 'light', lights: result })
  } else if (['block', 'model', 'texture'].includes(event.data.type)) {
    QUERY_PROMISE.get(event.data.id)?.(event.data.data)
    QUERY_PROMISE.delete(event.data.id)
  }
})

export function queryBlock(keys: string[]): Promise<Record<string, BlockData>> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).substring(0, 16)
    QUERY_PROMISE.set(id, resolve)
    self.postMessage({ type: 'block', keys, id })
  })
}

export function queryModel(keys: number[]): Promise<Record<string, BlockModel>> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).substring(0, 16)
    QUERY_PROMISE.set(id, resolve)
    self.postMessage({ type: 'model', keys, id })
  })
}

export function queryTexture(keys: number[]): Promise<Record<string, [TextureRange, TranslucentLevel]>> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).substring(0, 16)
    QUERY_PROMISE.set(id, resolve)
    self.postMessage({ type: 'texture', keys, id })
  })
}

function doStructure(payload: StructurePayload): RenderLayer[] {
  return []
}

function doLight(payload: LightPayload): number[][][] {
  return []
}
