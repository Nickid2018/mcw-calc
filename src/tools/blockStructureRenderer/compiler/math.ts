import type { DirectionName } from '../store/types.ts'
import * as THREE from 'three/webgpu'
import {
  MATRIX_IDENTITY,
  VECTOR_X_NEG_ONE,
  VECTOR_X_ONE,
  VECTOR_Y_NEG_ONE,
  VECTOR_Y_ONE,
  VECTOR_Z_NEG_ONE,
  VECTOR_Z_ONE,
} from '../const.ts'
import { DIRECTIONS } from '../store/types.ts'

// Direction and Rotation --------------------------------------------------------------------------
export const DIRECTION_VEC = {
  down: VECTOR_Y_NEG_ONE,
  up: VECTOR_Y_ONE,
  north: VECTOR_Z_NEG_ONE,
  south: VECTOR_Z_ONE,
  west: VECTOR_X_NEG_ONE,
  east: VECTOR_X_ONE,
}

export const DIRECTION_REVERSE: Record<DirectionName, DirectionName> = {
  down: 'up',
  up: 'down',
  north: 'south',
  south: 'north',
  west: 'east',
  east: 'west',
}

export const Y_DIRECTION_PERMUTATION: Record<DirectionName, DirectionName[] & { length: 4 }> = {
  north: ['north', 'east', 'south', 'west'],
  east: ['east', 'south', 'west', 'north'],
  south: ['south', 'west', 'north', 'east'],
  west: ['west', 'north', 'east', 'south'],
  up: ['up', 'up', 'up', 'up'],
  down: ['down', 'down', 'down', 'down'],
}

export const X_DIRECTION_PERMUTATION: Record<DirectionName, DirectionName[] & { length: 4 }> = {
  north: ['north', 'down', 'south', 'up'],
  east: ['east', 'east', 'east', 'east'],
  south: ['south', 'up', 'north', 'down'],
  west: ['west', 'west', 'west', 'west'],
  up: ['up', 'north', 'down', 'south'],
  down: ['down', 'south', 'up', 'north'],
}

export function findNearestDirection(vector: THREE.Vector3, inside: boolean = true) {
  if (!Number.isFinite(vector.length())) return 'up'
  let nearestDirection: DirectionName = 'up'
  let nearestDot = inside ? -Infinity : 0
  for (const direction of DIRECTIONS) {
    const dot = DIRECTION_VEC[direction].dot(vector)
    if (dot > nearestDot) {
      nearestDot = dot
      nearestDirection = direction
    }
  }
  return nearestDirection
}

export function moveTowards(
  x: number,
  y: number,
  z: number,
  dir: DirectionName,
): [number, number, number] {
  switch (dir) {
    case 'north':
      return [x, y, z - 1]
    case 'south':
      return [x, y, z + 1]
    case 'west':
      return [x - 1, y, z]
    case 'east':
      return [x + 1, y, z]
    case 'up':
      return [x, y + 1, z]
    case 'down':
      return [x, y - 1, z]
  }
}

export class Rotation {
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  toStringKey(): string {
    return `[${this.x},${this.y}]`
  }

  invertMatrix() {
    if (this.isIdentity()) return MATRIX_IDENTITY
    const matrix = new THREE.Matrix4()
    matrix.multiply(new THREE.Matrix4().makeRotationX((this.x / 180) * Math.PI))
    matrix.multiply(new THREE.Matrix4().makeRotationY((this.y / 180) * Math.PI))
    return matrix
  }

  asMatrix() {
    if (this.isIdentity()) return MATRIX_IDENTITY
    const matrix = new THREE.Matrix4()
    matrix.multiply(new THREE.Matrix4().makeRotationY((-this.y / 180) * Math.PI))
    matrix.multiply(new THREE.Matrix4().makeRotationX((-this.x / 180) * Math.PI))
    return matrix
  }

  transformDirection(direction: DirectionName) {
    if (this.isIdentity()) return direction
    const xRot = X_DIRECTION_PERMUTATION[direction][Math.round(this.x / 90) % 4]
    return Y_DIRECTION_PERMUTATION[xRot][Math.round(this.y / 90) % 4]
  }

  isIdentity(): boolean {
    return this.x === 0 && this.y === 0
  }
}

export const IDENTITY_ROTATION = new Rotation(0, 0)

export function clamp(value: number, min: number, max: number) {
  if (value < min) return min
  return Math.min(value, max)
}

// Voxel Shape Utility Functions -------------------------------------------------------------------

function pointInsideAABB(point: number[], aabb: number[]) {
  return point[0] > aabb[0] && point[0] < aabb[2] && point[1] > aabb[1] && point[1] < aabb[3]
}

export function isOcclusion(thisFace: number[][], otherFace: number[][]): boolean {
  if (otherFace.length === 0) return false
  if (thisFace.length === 0) return true
  if (
    thisFace.length === otherFace.length &&
    thisFace.every((val, i) => val.every((v, j) => v === otherFace[i][j]))
  ) {
    return true
  }
  for (const thisFaceElement of thisFace) {
    let nonOccludedPart = [thisFaceElement]
    for (const otherFaceElement of otherFace) {
      const computedNonOccludedPart = [] as number[][]
      for (const part of nonOccludedPart) {
        if (
          otherFaceElement[0] <= part[0] &&
          otherFaceElement[1] <= part[1] &&
          otherFaceElement[2] >= part[2] &&
          otherFaceElement[3] >= part[3]
        ) {
          continue
        }
        if (
          part[0] < otherFaceElement[2] &&
          part[2] > otherFaceElement[0] &&
          part[1] < otherFaceElement[3] &&
          part[3] > otherFaceElement[1]
        ) {
          const minMinInside = pointInsideAABB([otherFaceElement[0], otherFaceElement[1]], part)
          const minMaxInside = pointInsideAABB([otherFaceElement[0], otherFaceElement[3]], part)
          const maxMinInside = pointInsideAABB([otherFaceElement[2], otherFaceElement[1]], part)
          const maxMaxInside = pointInsideAABB([otherFaceElement[2], otherFaceElement[3]], part)
          if (minMinInside && minMaxInside && maxMinInside && maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[2], part[1], part[2], part[3]],
              [otherFaceElement[0], part[1], otherFaceElement[2], otherFaceElement[1]],
              [otherFaceElement[0], otherFaceElement[3], otherFaceElement[2], part[3]],
            )
          } else if (minMinInside && minMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], part[2], otherFaceElement[1]],
              [part[0], otherFaceElement[1], otherFaceElement[0], otherFaceElement[3]],
              [part[0], otherFaceElement[3], part[2], part[3]],
            )
          } else if (minMaxInside && maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], otherFaceElement[3], otherFaceElement[2], part[3]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else if (maxMinInside && maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], part[2], otherFaceElement[1]],
              [otherFaceElement[2], otherFaceElement[1], part[2], otherFaceElement[3]],
              [part[0], otherFaceElement[3], part[2], part[3]],
            )
          } else if (maxMinInside && minMinInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], part[1], otherFaceElement[2], otherFaceElement[1]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else if (minMinInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], part[1], part[2], otherFaceElement[1]],
            )
          } else if (minMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], otherFaceElement[3], part[2], part[3]],
            )
          } else if (maxMinInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[2], otherFaceElement[1]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else if (maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], otherFaceElement[3], otherFaceElement[2], part[3]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else {
            const minHorizontalInside =
              otherFaceElement[0] > part[0] && otherFaceElement[0] < part[2]
            const maxHorizontalInside =
              otherFaceElement[2] > part[0] && otherFaceElement[2] < part[2]
            const minVerticalInside = otherFaceElement[1] > part[1] && otherFaceElement[1] < part[3]
            const maxVerticalInside = otherFaceElement[3] > part[1] && otherFaceElement[3] < part[3]
            if (minHorizontalInside) {
              computedNonOccludedPart.push([part[0], part[1], otherFaceElement[0], part[3]])
            }
            if (maxHorizontalInside) {
              computedNonOccludedPart.push([otherFaceElement[2], part[1], part[2], part[3]])
            }
            if (minVerticalInside) {
              computedNonOccludedPart.push([part[0], part[1], part[2], otherFaceElement[1]])
            }
            if (maxVerticalInside) {
              computedNonOccludedPart.push([part[0], otherFaceElement[3], part[2], part[3]])
            }
          }
        } else {
          computedNonOccludedPart.push(part)
        }
      }
      nonOccludedPart = computedNonOccludedPart
    }
    if (nonOccludedPart.length > 0) return false
  }
  return true
}
