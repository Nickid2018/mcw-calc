import type { TextureRange, TranslucentLevel, WorkerQuery } from '../compiler/types.ts'
import type { Store } from './store.ts'
import * as THREE from 'three/webgpu'
import { computed, ref } from 'vue'
import { isSameTextureRange } from '../compiler/types.ts'
import { ATLAS_LOCATION, ATLAS_SIZE } from '../const.ts'

class TextureAtlasNode {
  private left?: TextureAtlasNode
  private right?: TextureAtlasNode
  private occupied: boolean = false

  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  insert(spriteData: number[]): TextureAtlasNode | null {
    if (this.left && this.right) {
      return this.left.insert(spriteData) || this.right.insert(spriteData)
    }
    if (this.occupied) return null
    const spriteDataWidth = spriteData[0]
    const spriteDataHeight = spriteData[1]
    if (this.width < spriteDataWidth || this.height < spriteDataHeight) return null
    if (this.width === spriteDataWidth && this.height === spriteDataHeight) {
      this.occupied = true
      return this
    }
    const dw = this.width - spriteDataWidth
    const dh = this.height - spriteDataHeight
    if (dw > dh) {
      this.left = new TextureAtlasNode(this.x, this.y, spriteDataWidth, this.height)
      this.right = new TextureAtlasNode(this.x + spriteDataWidth + 1, this.y, dw - 1, this.height)
    } else {
      this.left = new TextureAtlasNode(this.x, this.y, this.width, spriteDataHeight)
      this.right = new TextureAtlasNode(this.x, this.y + spriteDataHeight + 1, this.width, dh - 1)
    }
    return this.left.insert(spriteData)
  }

  toRange(): TextureRange {
    return [this.x, this.y, this.x + this.width, this.y + this.height]
  }
}

interface SpriteData {
  range: TextureRange
}

interface AnimatedSpriteData extends SpriteData {
  lastFrameNowTime: number
  lastFrameTime: number
  lastFrameIndex: number
  frames: SpriteData[]
  time: number[]
  interpolate?: boolean
}

export class TextureManager {
  readonly animating = ref(true)
  readonly booting = ref(true)
  readonly shouldAnimate = computed(() => this.animating.value && !this.booting.value)

  private readonly rootNode = new TextureAtlasNode(0, 0, ATLAS_SIZE, ATLAS_SIZE)
  private readonly spriteData = new Map<number, SpriteData | AnimatedSpriteData | null>()
  private readonly translucentLevels = new Map<number, TranslucentLevel>()
  private readonly atlas: THREE.Texture
  private readonly atlasSource: HTMLImageElement
  private readonly atlasReady: Promise<void>
  private readonly missingTextureRange: TextureRange

  readonly canvas: HTMLCanvasElement
  private readonly canvasContext: CanvasRenderingContext2D
  readonly checkCanvas: HTMLCanvasElement
  private readonly checkCanvasContext: CanvasRenderingContext2D

  constructor(
    private store: Store,
    worker: Worker,
  ) {
    this.atlasSource = document.createElement('img')
    this.atlasSource.src = ATLAS_LOCATION
    this.atlasReady = new Promise((resolve) => (this.atlasSource.onload = () => resolve()))

    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = ATLAS_SIZE
    this.checkCanvas = document.createElement('canvas')
    this.checkCanvas.width = this.checkCanvas.height = ATLAS_SIZE
    this.checkCanvasContext = this.checkCanvas.getContext('2d')!

    this.atlas = new THREE.CanvasTexture(this.canvas)
    this.atlas.magFilter = THREE.NearestFilter
    this.atlas.minFilter = THREE.NearestFilter
    this.atlas.wrapS = THREE.RepeatWrapping
    this.atlas.wrapT = THREE.RepeatWrapping
    this.atlas.colorSpace = THREE.SRGBColorSpace
    this.atlas.generateMipmaps = true

    worker.addEventListener('message', (event: MessageEvent<WorkerQuery>) => {
      if (event.data.type === 'texture') {
        Promise.all(
          event.data.keys.map(async (b) => [
            b,
            await this._makeTexture(b),
            this.translucentLevels.get(b) ?? 'solid',
          ]),
        ).then((r) =>
          event.source?.postMessage({
            id: event.data.id,
            type: 'texture',
            data: Object.fromEntries(
              r
                .filter((d) => !!d[1])
                .map(([k, v, l]) => [k, [(v as TextureRange).map((r) => r / ATLAS_SIZE), l]]),
            ),
          }),
        )
      }
    })

    this.missingTextureRange = this.rootNode.insert([0, 0, 16, 16])!.toRange()

    const context = (this.canvasContext = this.canvas.getContext('2d')!)
    context.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE)
    context.fillStyle = '#000000'
    context.fillRect(this.missingTextureRange[0], this.missingTextureRange[1], 8, 8)
    context.fillRect(this.missingTextureRange[0] + 8, this.missingTextureRange[1] + 8, 8, 8)
    context.fillStyle = '#F800F8'
    context.fillRect(this.missingTextureRange[0] + 8, this.missingTextureRange[1], 8, 8)
    context.fillRect(this.missingTextureRange[0], this.missingTextureRange[1] + 8, 8, 8)
    this.atlas.needsUpdate = true
  }

  _blit = (from: TextureRange, to: TextureRange) => {
    // prettier-ignore
    this.canvasContext.drawImage(this.atlasSource, from[0], from[1], from[2]- from[0], from[3] - from[1], to[0], to[1], to[2] - to[0], to[3] - to[1])
  }

  _interpolate = (from1: TextureRange, from2: TextureRange, to: TextureRange, delta: number) => {
    this.canvasContext.globalAlpha = delta
    this._blit(from1, to)
    this.canvasContext.globalAlpha = 1 - delta
    this._blit(from2, to)
    this.canvasContext.globalAlpha = 1
  }

  _computeTranslucentLevel = async (range: TextureRange) => {
    await this.atlasReady
    const w = range[2] - range[0]
    const h = range[3] - range[1]
    this.checkCanvasContext.drawImage(this.atlasSource, range[0], range[1], w, h, 0, 0, w, h)
    const imageData = this.checkCanvasContext.getImageData(0, 0, w, h)
    const alphas = imageData.data.filter((_, i) => i % 4 === 3)

    let level: TranslucentLevel = 'solid'
    for (const alpha of alphas) {
      if (alpha > 0 && alpha < 255) {
        level = 'translucent'
        break
      }
      if (alpha === 0) level = 'transparent'
    }
    return level
  }

  _makeTexture = async (texture: number) => {
    if (this.spriteData.has(texture))
      return this.spriteData.get(texture)?.range || this.missingTextureRange
    const data = await this.store.getTexture(texture)
    if (!data) {
      this.spriteData.set(texture, null)
      this.translucentLevels.set(texture, 'solid')
      return this.missingTextureRange
    }

    let firstRender: TextureRange
    if (Array.isArray(data)) {
      const range = this.rootNode.insert(data)
      if (!range) {
        console.warn('No room for new texture')
        this.spriteData.set(texture, null)
        this.translucentLevels.set(texture, 'solid')
        return this.missingTextureRange
      }
      this.spriteData.set(texture, { range: range.toRange() })
      this.translucentLevels.set(texture, await this._computeTranslucentLevel(range.toRange()))
      firstRender = data
    } else {
      const textures = await Promise.all(
        data.frames.map((d) => this.store.getTexture(d) as Promise<TextureRange | undefined>),
      )
      const size = textures.filter((t) => !!t)[0] as number[]
      const range = this.rootNode.insert(size)
      if (!range) {
        console.warn('No room for new texture')
        this.spriteData.set(texture, null)
        this.translucentLevels.set(texture, 'solid')
        return this.missingTextureRange
      }

      const frames = textures.map((n) => n || this.missingTextureRange)
      this.spriteData.set(texture, {
        range: range.toRange(),
        lastFrameNowTime: 0,
        lastFrameTime: data.time[0],
        lastFrameIndex: 0,
        frames: frames.map((r) => ({ range: r })),
        time: data.time,
        interpolate: data.interpolate,
      })

      const levels = await Promise.all(
        textures.filter((t) => !!t).map((t) => this._computeTranslucentLevel(t)),
      )
      const level = levels.includes('translucent')
        ? 'translucent'
        : levels.includes('transparent')
          ? 'transparent'
          : 'solid'
      this.translucentLevels.set(texture, level)

      firstRender = frames[0]
    }

    const range = this.spriteData.get(texture)
    if (!range) return this.missingTextureRange
    await this.atlasReady
    this._blit(firstRender, range.range)
    this.atlas.needsUpdate = true
    return range.range
  }

  onTickLoop = () => {
    if (!this.shouldAnimate.value) return

    const updates: [TextureRange, TextureRange][] = []
    const interpolates: [TextureRange, TextureRange, TextureRange, number][] = []
    ;[...this.spriteData.values()]
      .filter((d) => !!d && 'time' in d)
      .forEach((d: AnimatedSpriteData) => {
        d.lastFrameNowTime++
        if (d.lastFrameNowTime >= d.lastFrameTime) {
          d.lastFrameNowTime = 0
          const last = d.frames[d.lastFrameIndex]
          d.lastFrameIndex = (d.lastFrameIndex + 1) % d.time.length
          const now = d.frames[d.lastFrameIndex]
          d.lastFrameTime = d.time[d.lastFrameIndex]

          if (isSameTextureRange(last.range, now.range)) return
          updates.push([now.range, d.range])
        } else if (d.interpolate) {
          const delta = 1 - d.lastFrameNowTime / d.lastFrameTime
          const now = d.frames[d.lastFrameIndex]
          const next = d.frames[(d.lastFrameIndex + 1) % d.time.length]

          if (isSameTextureRange(now.range, next.range)) return
          interpolates.push([now.range, next.range, d.range, delta])
        }
      })

    if (updates.length === 0 && interpolates.length === 0) return
    updates.forEach(([from, to]) => this._blit(from, to))
    interpolates.forEach(([from1, from2, to, delta]) => this._interpolate(from1, from2, to, delta))
    this.atlas.needsUpdate = true
  }
}
