// MAIN THREAD ALGORITHM

import type { Ref } from 'vue'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import * as THREE from 'three/webgpu'
import { ref, watch } from 'vue'
import { VECTOR_X_ONE } from '../const.ts'

type NumberRef = Ref<number, number>

const MOVING_KEYS = ['a', 'd', 'w', 's', ' ', 'shift']

export interface ControllerInit {
  // perspective
  fov: number
  // orthographic
  zoom: number
  // init position and angle
  position: THREE.Vector3
  angle: THREE.Euler
}

function parsePosition(value?: string) {
  if (value) {
    const pos = value.split(',')
    const x = Number.parseFloat(pos[0].trim())
    const y = Number.parseFloat(pos[1].trim())
    const z = Number.parseFloat(pos[2].trim())
    if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) return [x, y, z]
  }
}

function parseRotation(value?: string): [number, number] | undefined {
  if (value) {
    const pos = value.split(',')
    const x = Number.parseFloat(pos[0].trim())
    const y = Number.parseFloat(pos[1].trim())
    if (!Number.isNaN(x) && !Number.isNaN(y)) return [x, y]
  }
}

export function fromDefaultCameraData(data: string[]) {
  return {
    position: new THREE.Vector3(...(parsePosition(data[0]) ?? [-3, 0, 0])),
    angle: new THREE.Euler(...(parseRotation(data[1]) ?? [0, 0]), 0, 'YXZ'),
  }
}

export class SceneController {
  private readonly perspectiveCamera = new THREE.PerspectiveCamera()
  private readonly orthographicCamera = new THREE.OrthographicCamera()
  private readonly domElement: HTMLElement

  private isPerspective: boolean = true
  private control: OrbitControls

  constructor(init: ControllerInit, domElement: HTMLElement) {
    this.domElement = domElement
    domElement.addEventListener('keydown', this._listenKeyEvent(true))
    domElement.addEventListener('keyup', this._listenKeyEvent(false))
    domElement.addEventListener('wheel', this._listenWheelEvent)

    this.perspectiveCamera.fov = init.fov
    this.perspectiveCamera.position.set(init.position.x, init.position.y, init.position.z)
    this.perspectiveCamera.setRotationFromEuler(init.angle)
    this.perspectiveCamera.updateProjectionMatrix()
    this.orthographicCamera.zoom = init.zoom
    this.orthographicCamera.position.set(init.position.x, init.position.y, init.position.z)
    this.orthographicCamera.setRotationFromEuler(init.angle)
    this.orthographicCamera.updateProjectionMatrix()

    this.control = new OrbitControls(this.perspectiveCamera, domElement)
    this.control.target = init.position
      .clone()
      .addScaledVector(VECTOR_X_ONE.applyEuler(init.angle), init.position.length())
    this.control.enableZoom = false
    this.control.update()
    this.control.addEventListener('change', this._listenControl)

    this.cameraX = ref(init.position.x)
    this.cameraY = ref(init.position.y)
    this.cameraZ = ref(init.position.z)
    this.pitch = ref(init.angle.x)
    this.yaw = ref(init.angle.y)
    this.zoom = ref(init.zoom)
    this.fov = ref(init.fov)

    watch([this.cameraX, this.cameraY, this.cameraZ], this._listenCameraPos)
    watch([this.yaw, this.pitch], this._listenCameraAngle)
    watch([this.zoom], this._listenCameraZoom)
    watch([this.fov], this._listenCameraFOV)
  }

  get camera() {
    return this.isPerspective ? this.perspectiveCamera : this.orthographicCamera
  }

  switchControl(isPerspective: boolean) {
    this.control.dispose()
    this.isPerspective = isPerspective
    this.camera.updateProjectionMatrix()
    this.control = new OrbitControls(this.camera, this.domElement)
    this.control.target = this.camera.position.addScaledVector(
      VECTOR_X_ONE.applyEuler(this.camera.rotation),
      this.camera.position.length(),
    )
    this.control.enableZoom = false
    this.control.update()
    this.control.addEventListener('change', this._listenControl)
  }

  onResize(width: number, height: number) {
    this.perspectiveCamera.aspect = width / height
    this.perspectiveCamera.updateProjectionMatrix()
    this.orthographicCamera.left = -width / height / 2
    this.orthographicCamera.right = width / height / 2
    this.orthographicCamera.top = -1 / 2
    this.orthographicCamera.bottom = 1 / 2
    this.orthographicCamera.updateProjectionMatrix()
    this.control.update()
  }

  // Reactive arguments ----------------------------------------------------------------------------

  public readonly cameraX: NumberRef
  public readonly cameraY: NumberRef
  public readonly cameraZ: NumberRef
  public readonly pitch: NumberRef
  public readonly yaw: NumberRef
  public readonly zoom: NumberRef
  public readonly fov: NumberRef

  public readonly manualMode = ref(false)

  _listenControl = () => {
    if (this.manualMode.value) return
    ;[this.cameraX.value, this.cameraY.value, this.cameraZ.value] = this.camera.position
    const euler = this.camera.rotation.reorder('YXZ')
    this.pitch.value = (euler.x * 180) / Math.PI
    this.yaw.value = (euler.y * 180) / Math.PI
    this.camera.updateProjectionMatrix()
  }

  _listenCameraPos = () => {
    if (!this.manualMode.value) return
    this.camera.position.set(this.cameraX.value, this.cameraY.value, this.cameraZ.value)
    this.control.update()
    this.camera.updateProjectionMatrix()
  }

  _listenCameraAngle = () => {
    if (!this.manualMode.value) return
    this.control.target = this.camera.position.addScaledVector(
      VECTOR_X_ONE.applyEuler(
        new THREE.Euler(
          (this.pitch.value * Math.PI) / 180,
          (this.yaw.value * Math.PI) / 180,
          0,
          'YXZ',
        ),
      ),
      this.control.target.add(this.camera.position.negate()).length(),
    )
    this.control.update()
    this.camera.updateProjectionMatrix()
  }

  _listenCameraZoom = () => {
    this.orthographicCamera.zoom = this.zoom.value
    this.orthographicCamera.updateProjectionMatrix()
  }

  _listenCameraFOV = () => {
    this.perspectiveCamera.fov = this.fov.value
    this.perspectiveCamera.updateProjectionMatrix()
  }

  _listenKeyEvent(press: boolean) {
    return (event: KeyboardEvent) => {
      event.preventDefault()
      const index = MOVING_KEYS.indexOf(event.key.toLowerCase())
      if (index === -1) return
      this.moving[index].value = press
    }
  }

  _listenWheelEvent = (event: WheelEvent) => {
    event.preventDefault()
    if (this.isPerspective) {
      this.fov.value = Math.min(110, Math.max(30, this.fov.value + event.deltaY * 0.01))
    } else {
      this.zoom.value = Math.max(0.1, this.zoom.value - event.deltaY * 0.0001)
    }
  }

  // Move control ----------------------------------------------------------------------------------
  private readonly lastTime = ref(Date.now())
  private readonly isLeftMoving = ref(false)
  private readonly isRightMoving = ref(false)
  private readonly isForwardMoving = ref(false)
  private readonly isBackwardMoving = ref(false)
  private readonly isUpMoving = ref(false)
  private readonly isDownMoving = ref(false)
  private readonly moving = [
    this.isLeftMoving,
    this.isRightMoving,
    this.isForwardMoving,
    this.isBackwardMoving,
    this.isUpMoving,
    this.isDownMoving,
  ]

  onAnimateLoop() {
    const delta = (Date.now() - this.lastTime.value) / 1000
    this.lastTime.value = Date.now()
    const moveSpeed = 5 * delta
    let x = 0
    let y = 0
    let z = 0
    if (this.isForwardMoving.value) z += moveSpeed
    if (this.isBackwardMoving.value) z -= moveSpeed
    if (this.isLeftMoving.value) x -= moveSpeed
    if (this.isRightMoving.value) x += moveSpeed
    if (this.isUpMoving.value) y += moveSpeed
    if (this.isDownMoving.value) y -= moveSpeed

    const moveVector = [0, 0, 0]
    if (x || z) {
      const forward = new THREE.Vector3()
      this.camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()
      const right = new THREE.Vector3()
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0))
      moveVector[0] = x * right.x + z * forward.x
      moveVector[2] = x * right.z + z * forward.z
    }
    if (y) {
      moveVector[1] = y
    }

    if (moveVector.some((n) => n !== 0)) {
      const newX = (this.cameraX.value += moveVector[0])
      const newY = (this.cameraY.value += moveVector[1])
      const newZ = (this.cameraZ.value += moveVector[2])
      this.control.target.add(new THREE.Vector3(...moveVector))
      this.camera.position.set(newX, newY, newZ)
      this.camera.updateProjectionMatrix()
      this.control.update()
    }
  }
}
