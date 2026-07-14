/// <reference lib="webworker" />
import type { BlockData, BlockModel } from '../store/types.ts'
import type {
  CompilePayload,
  TextureRange,
  TranslucentLevel,
  WorkerQueryResponse,
} from './types.ts'
import { doLight } from './light.ts'
import { compileStructure } from './structure.ts'

declare const self: DedicatedWorkerGlobalScope

const QUERY_PROMISE = new Map<string, (data: any) => void>()
const BLOCK_CACHE = new Map<string, BlockData>()
const MODEL_CACHE = new Map<number, BlockModel>()
const TEXTURE_CACHE = new Map<number, [TextureRange, TranslucentLevel]>()

self.addEventListener('message', (event: MessageEvent<CompilePayload | WorkerQueryResponse>) => {
  if (event.data.type === 'chunk') {
    compileStructure(event.data).catch(console.error)
  } else if (event.data.type === 'light') {
    doLight(event.data)
  } else if (['block', 'model', 'texture'].includes(event.data.type)) {
    QUERY_PROMISE.get(event.data.id)?.(event.data.data)
    QUERY_PROMISE.delete(event.data.id)
  }
})

export async function queryBlock(keys: string[]) {
  const settled = keys.filter((k) => BLOCK_CACHE.has(k))
  const unsettled = keys.filter((k) => !BLOCK_CACHE.has(k))
  const collected: Record<string, BlockData> =
    unsettled.length > 0
      ? await new Promise((resolve) => {
          const id = Math.random().toString(36).substring(2, 18)
          QUERY_PROMISE.set(id, resolve)
          self.postMessage({ type: 'block', keys, id })
        })
      : {}
  Object.entries(collected).forEach(([k, v]) => BLOCK_CACHE.set(k, v))
  settled.forEach((k) => (collected[k] = BLOCK_CACHE.get(k)!))
  return collected
}

export async function queryModel(keys: number[]) {
  const settled = keys.filter((k) => MODEL_CACHE.has(k))
  const unsettled = keys.filter((k) => !MODEL_CACHE.has(k))
  const collected: Record<string, BlockModel> =
    unsettled.length > 0
      ? await new Promise((resolve) => {
          const id = Math.random().toString(36).substring(2, 18)
          QUERY_PROMISE.set(id, resolve)
          self.postMessage({ type: 'model', keys, id })
        })
      : {}
  Object.entries(collected).forEach(([k, v]) => MODEL_CACHE.set(Number(k), v))
  settled.forEach((k) => (collected[k] = MODEL_CACHE.get(k)!))
  return collected
}

export async function queryTexture(keys: number[]) {
  const settled = keys.filter((k) => TEXTURE_CACHE.has(k))
  const unsettled = keys.filter((k) => !TEXTURE_CACHE.has(k))
  const collected: Record<number, [TextureRange, TranslucentLevel]> =
    unsettled.length > 0
      ? await new Promise((resolve) => {
          const id = Math.random().toString(36).substring(2, 18)
          QUERY_PROMISE.set(id, resolve)
          self.postMessage({ type: 'texture', keys, id })
        })
      : {}
  Object.entries(collected).forEach(([k, v]) => TEXTURE_CACHE.set(Number(k), v))
  settled.forEach((k) => (collected[k] = TEXTURE_CACHE.get(k)!))
  return collected
}
