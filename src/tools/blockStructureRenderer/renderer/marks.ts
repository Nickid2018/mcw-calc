// MAIN THREAD ALGORITHM

import type { Range, Renderer } from '../renderer/types.ts'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import { attribute, Fn, uniform, vec4 } from 'three/tsl'
import * as THREE from 'three/webgpu'

export const MARK_OPACITY = uniform(0.2)
export const MARK_MATERIAL = new THREE.MeshBasicNodeMaterial({
  colorNode: Fn(() => vec4(attribute('color', THREE.NodeType.VECTOR3), MARK_OPACITY))(),
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
})

export class MarkRenderer implements Renderer {
  readonly marks: [number, number, THREE.Color][][] // [y]([x, z, color])
  readonly objects: THREE.Mesh[]
  readonly ySize: number

  constructor(ySize: number, markData: string[]) {
    this.ySize = ySize
    this.marks = Array.from({ length: ySize }).map(() => [])
    this.objects = Array.from({ length: ySize })
    markData
      .map((mark) => mark.trim())
      .filter((s) => s !== '')
      .forEach((mark) => {
        mark = mark.trim()
        const splitPointMark = mark.indexOf('#')
        const markColor = mark.substring(splitPointMark + 1)
        const markData = mark.substring(0, splitPointMark).split(',')
        const x = Number.parseInt(markData[0])
        const y = Number.parseInt(markData[1])
        const z = Number.parseInt(markData[2])
        const colorInt = Number.parseInt(markColor, 16)
        if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z) || Number.isNaN(colorInt))
          console.warn(`Invalid mark data: ${markData}`)
        else if (y >= ySize) console.warn(`Invalid mark data (y out of range): ${markData}`)
        else this.marks[y].push([x, z, new THREE.Color(colorInt)])
      })
  }

  _hasMark(y: number, x: number, z: number): THREE.Color | undefined {
    if (y < 0) return undefined
    return this.marks[y]?.find(([ox, oz]) => ox === x && oz === z)?.[2]
  }

  onDisplayRangeChanged(scene: THREE.Scene, update: Range, remove: Range): void {
    const min = Math.max(0, update.rangeYMin - 1)
    const max = Math.min(this.ySize - 1, update.rangeYMax + 1)
    this.objects.slice(min, max + 1).forEach((obj) => scene.remove(obj))
    this.objects.slice(remove.rangeYMin, remove.rangeYMax).forEach((obj) => scene.remove(obj))

    for (let y = min; y <= max; y++) {
      const geometries: THREE.PlaneGeometry[] = []
      this.marks[y].forEach((mark) => {
        const faces: THREE.PlaneGeometry[] = []

        const hexColor = mark[2].getHex()
        // Avoid z-fighting and self-occlusion
        if (this._hasMark(y, mark[0], mark[1] + 1)?.getHex() !== hexColor) {
          const southGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
          southGeometry.translate(0.5, 0.5, 1.00005)
          faces.push(southGeometry)
        }
        if (this._hasMark(y, mark[0], mark[1] - 1)?.getHex() !== hexColor) {
          const northGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
          northGeometry.rotateY(Math.PI)
          northGeometry.translate(0.5, 0.5, -0.00005)
          faces.push(northGeometry)
        }
        if (this._hasMark(y, mark[0] + 1, mark[1])?.getHex() !== hexColor) {
          const eastGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
          eastGeometry.rotateY(Math.PI / 2)
          eastGeometry.translate(1.00005, 0.5, 0.5)
          faces.push(eastGeometry)
        }
        if (this._hasMark(y, mark[0] - 1, mark[1])?.getHex() !== hexColor) {
          const westGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
          westGeometry.rotateY(-Math.PI / 2)
          westGeometry.translate(-0.00005, 0.5, 0.5)
          faces.push(westGeometry)
        }
        if (this._hasMark(y + 1, mark[0], mark[1])?.getHex() !== hexColor) {
          const upGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
          upGeometry.rotateX(-Math.PI / 2)
          upGeometry.translate(0.5, 1.00005, 0.5)
          faces.push(upGeometry)
        }
        if (this._hasMark(y - 1, mark[0], mark[1])?.getHex() !== hexColor) {
          const downGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
          downGeometry.rotateX(Math.PI / 2)
          downGeometry.translate(0.5, -0.00005, 0.5)
          faces.push(downGeometry)
        }

        const attr = new THREE.Float32BufferAttribute(
          Array.from({ length: 4 }).flatMap(() => [mark[2].r, mark[2].g, mark[2].b]),
          3,
        )
        faces.forEach((face) => {
          face.translate(mark[0], y, mark[1])
          face.setAttribute('color', attr)
        })
        geometries.push(...faces)
      })

      if (geometries.length > 0) {
        const bufferCombined = BufferGeometryUtils.mergeGeometries(geometries)
        const obj = new THREE.Mesh(bufferCombined, MARK_MATERIAL)
        scene.add(obj)
        this.objects[y] = obj
      }
    }
  }
}
