import * as THREE from 'three/webgpu'

export class Range {
  constructor(
    readonly rangeYMax: number,
    readonly rangeYMin: number,
  ) {}

  inRange(vec: THREE.Vector3) {
    return vec.y >= this.rangeYMin && vec.y <= this.rangeYMax
  }
}

export interface Updater {
  onDisplayRangeChanged: (scene: THREE.Scene, update: Range, remove: Range) => void
}

export interface Renderer extends Updater {
  onAnimationLoop?: (scene: THREE.Scene) => void
}
