<script setup lang="ts">
import * as THREE from 'three/webgpu'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DEBUG_MODE } from './const.ts'
import { MarkRenderer } from './renderer/marks.ts'
import { DisplayRange } from './renderer/types.ts'
import { fromDefaultCameraData, SceneController } from './scene/controller.ts'
import { Store } from './store/store.ts'
import { TextureManager } from './store/texture.ts'

const props = defineProps<{
  blocks: string[]
  structure: string
  marks: string[]

  cameraPosData: string[]
  orthographicDefault: boolean
  animatedTextureDefault: boolean
  showInvisibleBlocksDefault: boolean
  displayMarksDefault: boolean
  backgroundColorDefault: string
  backgroundAlphaDefault: number
}>()

const { t } = useI18n()
const backgroundColor = ref(props.backgroundColorDefault)
const backgroundAlpha = ref(props.backgroundAlphaDefault)

const renderTarget = useTemplateRef('render-target')

// Worker Setup ------------------------------------------------------------------------------------
const worker = new Worker('./compiler/worker.ts')
const store = new Store(worker)
const textureMgr = new TextureManager(store, worker)

// Three.js Renderer Setup -------------------------------------------------------------------------

let renderer: THREE.WebGPURenderer | null = null
async function getRenderer() {
  if (renderer) return renderer
  renderer = new THREE.WebGPURenderer({
    alpha: true,
    antialias: false,
    forceWebGL: false,
  }) // Do not enable antialiasing: it makes block edges black
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.domElement.tabIndex = 0
  await renderer.init()
  return renderer
}

function updateDisplay(renderer: THREE.WebGPURenderer, controller: SceneController) {
  const rect = renderTarget.value?.getBoundingClientRect() ?? new DOMRect()
  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  controller.onResize(width, height)
  renderer.setSize(width, height)
}

function onAnimateLoop(
  renderer: THREE.WebGPURenderer,
  scene: THREE.Scene,
  controller: SceneController,
) {
  requestAnimationFrame(() => onAnimateLoop(renderer, scene, controller))
  controller.onAnimateLoop()
  renderer.render(scene, controller.camera)
}

function doTickLoop() {
  textureMgr.onTickLoop()
}

function recompile(scene: THREE.Scene) {
  const markRenderer = new MarkRenderer(3, [
    '1,1,1#114514',
    '0,1,1#191981',
    '1,1,0#114514',
    '1,0,0#191981',
  ])
  markRenderer.onDisplayRangeChanged(scene, new DisplayRange(2, 0))
}

onMounted(async () => {
  if (renderTarget.value) {
    const renderer = await getRenderer()
    const scene = new THREE.Scene()
    renderTarget.value.appendChild(renderer.domElement)
    const controller = new SceneController(
      {
        fov: 60,
        zoom: 1,
        ...fromDefaultCameraData(props.cameraPosData ?? []),
      },
      renderer.domElement,
    )

    updateDisplay(renderer, controller)
    new ResizeObserver(() => updateDisplay(renderer, controller)).observe(renderTarget.value)
    recompile(scene)
    setInterval(doTickLoop, 1000 / 20)
    onAnimateLoop(renderer, scene, controller)

    if (DEBUG_MODE) {
      renderTarget.value.appendChild(textureMgr.canvas)
    }
  }
})

// watch -------------------------------------------------------------------------------------------
watch([backgroundAlpha], async () =>
  (await getRenderer()).setClearAlpha(backgroundAlpha.value / 255),
)
watch([backgroundColor], async () => (await getRenderer()).setClearColor(backgroundColor.value))
</script>

<template>
  <div
    :style="{
      height: '60vw',
      width: 'max(60%, 60vw)',
      position: 'relative',
    }"
  >
    <div
      ref="render-target"
      class="renderer-component"
      tabindex="0"
      :style="{
        width: '100%',
        height: '100%',
        position: 'relative',
      }"
    />
  </div>
</template>
