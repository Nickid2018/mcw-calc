import type { TextureRange, WorkerQuery } from '../compiler/types.ts'
import type { AnimatedTexture, BlockData, BlockModel } from './types.ts'
import { fetchJigsawAPI } from '@/utils/jigsaw.ts'

export class Store {
  private readonly blockCache: Map<string, Promise<BlockData | null>> = new Map()
  private readonly modelCache: Map<number, Promise<BlockModel | null>> = new Map()
  private readonly textureCache: Map<number, Promise<TextureRange | AnimatedTexture | null>> =
    new Map()

  constructor(worker: Worker) {
    worker.addEventListener('message', (event: MessageEvent<WorkerQuery>) => {
      if (event.data.type === 'block') {
        Promise.all(event.data.keys.map(async (b) => [b, await this.getBlock(b)])).then((r) =>
          event.source?.postMessage({
            id: event.data.id,
            type: 'block',
            data: Object.fromEntries(r.filter((d) => !!d[1])),
          }),
        )
      }
      if (event.data.type === 'model') {
        Promise.all(event.data.keys.map(async (b) => [b, await this.getModel(b)])).then((r) =>
          event.source?.postMessage({
            id: event.data.id,
            type: 'model',
            data: Object.fromEntries(r.filter((d) => !!d[1])),
          }),
        )
      }
    })
  }

  async _getCacheOrFetch<T, D>(
    key: T,
    url: string,
    cache: Map<T, Promise<D | null>>,
  ): Promise<D | null> {
    if (cache.has(key)) return await cache.get(key)!
    const promise = (async () => {
      const data = await fetchJigsawAPI(url)
      return data.status === 404 ? null : ((await data.json()) as D)
    })()
    cache.set(key, promise)
    return (await cache.get(key)) || null
  }

  async getBlock(block: string) {
    return this._getCacheOrFetch(block, `/renderer/block/${block}`, this.blockCache)
  }

  async getModel(model: number) {
    return this._getCacheOrFetch(model, `/renderer/model/${model}`, this.modelCache)
  }

  async getTexture(texture: number) {
    return this._getCacheOrFetch(texture, `/renderer/texture/${texture}`, this.textureCache)
  }
}
