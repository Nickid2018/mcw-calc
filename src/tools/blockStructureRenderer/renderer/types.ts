import * as THREE from 'three/webgpu'

export class DisplayRange {
  constructor(readonly rangeYMax: number, readonly rangeYMin: number) {
  }

  inRange(vec: THREE.Vector3) {
    return vec.y >= this.rangeYMin && vec.y <= this.rangeYMax
  }
}

export interface Renderer {
  onDisplayRangeChanged: (scene: THREE.Scene, range: DisplayRange) => void
  onAnimationLoop?: (scene: THREE.Scene) => void
}