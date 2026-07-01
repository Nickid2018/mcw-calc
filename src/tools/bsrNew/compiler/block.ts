// Single Block Model Algorithm
// WORKER THREAD ALGORITHM
import type {
  AndCondition,
  BlockState,
  DirectionName,
  ModelElement,
  ModelReference,
  ModelReferenceWithWeight,
  ModelRotation,
  OrCondition,
} from '../store/types.ts'
import type { Rotation } from './math.ts'
import type { TranslucentLevel } from './types.ts'
import * as THREE from 'three/webgpu'
import {
  ATLAS_SIZE,
  MATRIX_IDENTITY,
  MATRIX_TRANS_TO_CENTER,
  MATRIX_TRANS_TO_CORNER,
  MATRIX_X_ROT_90,
  MATRIX_X_ROT_270,
  MATRIX_Y_ROT_90,
  MATRIX_Y_ROT_180,
  MATRIX_Y_ROT_270,
  VECTOR_HALF,
  VECTOR_ONE,
  VECTOR_X_ONE,
  VECTOR_XY_ONE,
  VECTOR_XZ_ONE,
  VECTOR_Y_ONE,
  VECTOR_YZ_ONE,
  VECTOR_Z_ONE,
  VECTOR_ZERO,
} from '../const.ts'
import { stateToKey } from '../store/types.ts'
import { findNearestDirection, IDENTITY_ROTATION } from './math.ts'
import { queryBlock, queryModel, queryTexture } from './worker.ts'

export interface GeometryElement {
  element: THREE.PlaneGeometry
  lightDirection: DirectionName
  tintIndex?: number
  lightEmission?: number
  shade: boolean
}

export interface GeometryModel {
  rotation: {
    rotation: string
    nonCullFaces: Record<TranslucentLevel, GeometryElement[]>
    cullFaces: Partial<Record<DirectionName, Record<string, GeometryElement[]>>>
  }[]
  definition?: ModelReference
}

export interface GeometryModelGroup {
  models: GeometryModel[]
  weights: number[]
  totalWeight: number
}

export type GeometryCollection = (GeometryModel | GeometryModelGroup)[]

const CACHED_BLOCK_STATES = new Map<string, Promise<GeometryCollection>>()

export function getOrCreateModelCollection(blockState: BlockState) {
  const key = stateToKey(blockState)
  if (!CACHED_BLOCK_STATES.has(key)) {
    CACHED_BLOCK_STATES.set(key, _createModelCollection(blockState))
  }
  return CACHED_BLOCK_STATES.get(key)!
}

async function _createModelCollection(blockState: BlockState): Promise<GeometryCollection> {
  const collection = await _chooseModel(blockState)
  const finalCollection: GeometryCollection = []
  collection.forEach((item) => {
    if (Array.isArray(item)) {
      const models: GeometryModel[] = item.map((i) => ({
        rotation: [],
        definition: i,
      }))
      const weights = item.map((i) => i.weight ?? 1)
      finalCollection.push({ models, weights, totalWeight: weights.reduce((a, b) => a + b, 0) })
    } else {
      finalCollection.push({ rotation: [], definition: item })
    }
  })
  return finalCollection
}

export async function validateGeometryModel(model: GeometryModel, rotation: Rotation) {
  let rotationName = rotation.toStringKey()
  if (!model.definition)
    return (
      model.rotation.find((d) => d.rotation === rotationName) ||
      model.rotation.find((d) => d.rotation === 'global')
    )

  const definition = model.definition
  if (!definition.uvlock) {
    model.definition = undefined
    rotationName = 'global'
    rotation = IDENTITY_ROTATION
  }

  const data = await queryModel([definition.model])
  if (!data[definition.model]) return

  const finalModel = {
    rotation: rotationName,
    nonCullFaces: {},
    cullFaces: {},
  } as GeometryModel['rotation'][number]

  for (const element of data[definition.model]?.elements ?? []) {
    const from = new THREE.Vector3(...element.from)
    const to = new THREE.Vector3(...element.to)
    const initialShape = [from.y / 16, to.y / 16, from.z / 16, to.z / 16, from.x / 16, to.x / 16]

    // Compute the element rotation
    const elementRotation = element.rotation
    const [elementRotationMatrix, origin, scaleVector] = elementRotation
      ? computeElementRotation(elementRotation)
      : [MATRIX_IDENTITY, VECTOR_ZERO, VECTOR_ONE]

    for (const [faceName, face] of Object.entries(element.faces)) {
      if (!face) continue
      const faceDirection = faceName as DirectionName

      const [planeHeight, planeWidth] = computePlaneHeightAndWidth(initialShape, faceDirection)
      if (planeHeight === 0 || planeWidth === 0) continue

      let blockFaceUV = new BlockFaceUV(
        face.uv ?? completeMissingUV(element, faceDirection),
        face.rotation ?? 0,
      )
      if (definition.uvlock) {
        blockFaceUV = recomputeUVs(blockFaceUV, rotation, faceDirection)
      }

      const forceTransparency = face.texture.endsWith('^translucent')
      const textureId = Number.parseInt(
        forceTransparency ? face.texture.substring(0, face.texture.length - 12) : face.texture,
      )
      const [spriteData, spriteTLevel] = (await queryTexture([textureId]))[textureId]
      blockFaceUV.uvs[0] = spriteData[0] + blockFaceUV.uvs[0] / ATLAS_SIZE
      blockFaceUV.uvs[2] = spriteData[0] + blockFaceUV.uvs[2] / ATLAS_SIZE
      blockFaceUV.uvs[1] = 1 - spriteData[1] - blockFaceUV.uvs[1] / ATLAS_SIZE
      blockFaceUV.uvs[3] = 1 - spriteData[1] - blockFaceUV.uvs[3] / ATLAS_SIZE
      const tLevel = forceTransparency ? 'translucent' : spriteTLevel

      const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
      rotatePlaneGeometry(planeGeometry, faceDirection)
      translatePlaneGeometry(planeGeometry, initialShape, faceDirection)
      if (elementRotation) {
        applyPlaneTransformations(planeGeometry, origin, elementRotationMatrix, scaleVector)
      }
      if (!rotation.isIdentity()) {
        applyPlaneTransformations(planeGeometry, VECTOR_HALF, rotation.asMatrix(), VECTOR_ONE)
      }

      planeGeometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(
          blockFaceUV.vertex().map((i) => blockFaceUV.uvs[i]),
          2,
        ),
      )

      const v1 = new THREE.Vector3(...planeGeometry.getAttribute('position').array.slice(0, 3))
      const v2 = new THREE.Vector3(...planeGeometry.getAttribute('position').array.slice(3, 6))
      const v3 = new THREE.Vector3(...planeGeometry.getAttribute('position').array.slice(6, 9))
      const normal = new THREE.Vector3().crossVectors(v2.sub(v1), v1.sub(v3))
      const direction = findNearestDirection(normal, false)

      if (face.cullface) {
        const faceData = (finalModel.cullFaces[face.cullface] ??= {})
        faceData[tLevel] ??= []
        faceData[tLevel].push({
          element: planeGeometry,
          lightDirection: direction,
          shade: element.shade ?? true,
          lightEmission: element.light_emission,
          tintIndex: face.tintindex,
        })
      } else {
        finalModel.nonCullFaces[tLevel] ??= []
        finalModel.nonCullFaces[tLevel].push({
          element: planeGeometry,
          lightDirection: direction,
          shade: element.shade ?? true,
          lightEmission: element.light_emission,
          tintIndex: face.tintindex,
        })
      }
    }
  }

  model.rotation.push(finalModel)
  return finalModel
}

// Model Selection Algorithm -----------------------------------------------------------------------

function _conditionMatch(
  condition: Record<string, string> | AndCondition | OrCondition,
  blockProperties: Record<string, string>,
): boolean {
  if ('AND' in condition) {
    return (condition as AndCondition).AND.every(
      (part: Record<string, string> | AndCondition | OrCondition) =>
        _conditionMatch(part, blockProperties),
    )
  } else if ('OR' in condition) {
    return (condition as OrCondition).OR.some(
      (part: Record<string, string> | AndCondition | OrCondition) =>
        _conditionMatch(part, blockProperties),
    )
  } else {
    return Object.entries(condition).every(([key, value]) => {
      const reversed = value.startsWith('!')
      if (reversed) value = value.slice(1)
      return value.split('|').includes(blockProperties[key]) !== reversed
    })
  }
}

async function _chooseModel(
  blockState: BlockState,
): Promise<(ModelReference | ModelReferenceWithWeight[])[]> {
  const blockData = await queryBlock([blockState.name])
  const modelCollection = blockData[blockState.name]?.state

  if (!modelCollection) return []
  if (!modelCollection.variants && !modelCollection.multipart) return []

  const blockProperties = blockState.properties ?? {}
  if (modelCollection.variants) {
    for (const [key, value] of Object.entries(modelCollection.variants)) {
      const stateCondition = key.split(',')
      let match = true
      for (const condition of stateCondition) {
        const [key, value] = condition.split('=')
        if (blockProperties[key] !== value) {
          match = false
          break
        }
      }
      if (match) return [value]
    }
  } else {
    const matchingPart = modelCollection.multipart!.filter((part) =>
      _conditionMatch(part.when ?? {}, blockProperties),
    )
    if (matchingPart.length === 0) return []
    return matchingPart.map((part) => part.apply)
  }

  return []
}

// Bake Block Face UV Functions --------------------------------------------------------------------

class BlockFaceUV {
  uvs: number[]
  rotation: number

  constructor(uv: number[], rotation: number) {
    this.uvs = Array.from(uv)
    this.rotation = rotation
  }

  vertex() {
    switch (this.rotation) {
      case 90:
        return [0, 3, 0, 1, 2, 3, 2, 1]
      case 180:
        return [2, 3, 0, 3, 2, 1, 0, 1]
      case 270:
        return [2, 1, 2, 3, 0, 1, 0, 3]
      case 0:
      default:
        return [0, 1, 2, 1, 0, 3, 2, 3]
    }
  }
}

function completeMissingUV(element: ModelElement, direction: DirectionName): number[] {
  switch (direction) {
    case 'down':
      return [element.from[0], 16 - element.to[2], element.to[0], 16 - element.from[2]]
    case 'up':
      return [element.from[0], element.from[2], element.to[0], element.to[2]]
    case 'north':
      return [16 - element.to[0], 16 - element.to[1], 16 - element.from[0], 16 - element.from[1]]
    case 'south':
      return [element.from[0], 16 - element.to[1], element.to[0], 16 - element.from[1]]
    case 'west':
      return [element.from[2], 16 - element.to[1], element.to[2], 16 - element.from[1]]
    case 'east':
      return [16 - element.to[2], 16 - element.to[1], 16 - element.from[2], 16 - element.from[1]]
  }
}

const UV_LOCAL_TO_GLOBAL = {
  south: MATRIX_IDENTITY,
  east: MATRIX_Y_ROT_90,
  west: MATRIX_Y_ROT_270,
  north: MATRIX_Y_ROT_180,
  up: MATRIX_X_ROT_270,
  down: MATRIX_X_ROT_90,
}

const UV_GLOBAL_TO_LOCAL = {
  south: MATRIX_IDENTITY,
  east: MATRIX_Y_ROT_270,
  west: MATRIX_Y_ROT_90,
  north: MATRIX_Y_ROT_180,
  up: MATRIX_X_ROT_90,
  down: MATRIX_X_ROT_270,
}

function recomputeUVs(
  blockUV: BlockFaceUV,
  rotation: Rotation,
  faceDirection: DirectionName,
): BlockFaceUV {
  const makeTransform = new THREE.Matrix4()
    .multiply(MATRIX_TRANS_TO_CORNER)
    .multiply(UV_GLOBAL_TO_LOCAL[faceDirection])
    .multiply(rotation.invert().asMatrix())
    .multiply(UV_LOCAL_TO_GLOBAL[rotation.transformDirection(faceDirection)])
    .multiply(MATRIX_TRANS_TO_CENTER)

  const u1 = blockUV.uvs[0] / 16
  const v1 = blockUV.uvs[1] / 16
  const vector1 = new THREE.Vector4(u1, v1, 0, 1)
  vector1.applyMatrix4(makeTransform)
  const u2 = blockUV.uvs[2] / 16
  const v2 = blockUV.uvs[3] / 16
  const vector2 = new THREE.Vector4(u2, v2, 0, 1)
  vector2.applyMatrix4(makeTransform)

  const transformedU1 = vector1.x * 16
  const transformedU2 = vector2.x * 16
  const transformedV1 = vector1.y * 16
  const transformedV2 = vector2.y * 16

  let correctU1, correctV1, correctU2, correctV2
  if (Math.sign(u2 - u1) === Math.sign(transformedU2 - transformedU1)) {
    correctU1 = transformedU1
    correctU2 = transformedU2
  } else {
    correctU1 = transformedU2
    correctU2 = transformedU1
  }
  if (Math.sign(v2 - v1) === Math.sign(transformedV2 - transformedV1)) {
    correctV1 = transformedV1
    correctV2 = transformedV2
  } else {
    correctV1 = transformedV2
    correctV2 = transformedV1
  }

  const sourceRotation = (blockUV.rotation * Math.PI) / 180
  const rotationVector = new THREE.Vector4(
    Math.cos(sourceRotation),
    Math.sin(sourceRotation),
    0,
    0,
  ).applyMatrix4(makeTransform)
  const rotationAngle =
    (-Math.round((Math.atan2(rotationVector.y, rotationVector.x) / Math.PI) * 2) * 90) % 360
  return new BlockFaceUV([correctU1, correctV1, correctU2, correctV2], (rotationAngle + 360) % 360)
}

// Bake Face Functions -----------------------------------------------------------------------------

const FACE_MIN_Y = 0
const FACE_MAX_Y = 1
const FACE_MIN_Z = 2
const FACE_MAX_Z = 3
const FACE_MIN_X = 4
const FACE_MAX_X = 5

function computePlaneHeightAndWidth(
  initialShape: number[],
  faceDirection: DirectionName,
): [number, number] {
  switch (faceDirection) {
    case 'down':
    case 'up':
      return [
        initialShape[FACE_MAX_Z] - initialShape[FACE_MIN_Z],
        initialShape[FACE_MAX_X] - initialShape[FACE_MIN_X],
      ]
    case 'north':
    case 'south':
      return [
        initialShape[FACE_MAX_Y] - initialShape[FACE_MIN_Y],
        initialShape[FACE_MAX_X] - initialShape[FACE_MIN_X],
      ]
    case 'west':
    case 'east':
      return [
        initialShape[FACE_MAX_Y] - initialShape[FACE_MIN_Y],
        initialShape[FACE_MAX_Z] - initialShape[FACE_MIN_Z],
      ]
  }
}

function rotatePlaneGeometry(planeGeometry: THREE.PlaneGeometry, faceDirection: DirectionName) {
  switch (faceDirection) {
    case 'down':
      planeGeometry.rotateX(Math.PI / 2)
      break
    case 'up':
      planeGeometry.rotateX(-Math.PI / 2)
      break
    case 'north':
      planeGeometry.rotateY(Math.PI)
      break
    case 'south':
      break
    case 'west':
      planeGeometry.rotateY(-Math.PI / 2)
      break
    case 'east':
      planeGeometry.rotateY(Math.PI / 2)
      break
  }
}

function translatePlaneGeometry(
  planeGeometry: THREE.PlaneGeometry,
  initialShape: number[],
  faceDirection: DirectionName,
) {
  const xMean = (initialShape[FACE_MIN_X] + initialShape[FACE_MAX_X]) / 2
  const yMean = (initialShape[FACE_MIN_Y] + initialShape[FACE_MAX_Y]) / 2
  const zMean = (initialShape[FACE_MIN_Z] + initialShape[FACE_MAX_Z]) / 2
  switch (faceDirection) {
    case 'down':
      planeGeometry.translate(xMean, initialShape[FACE_MIN_Y], zMean)
      break
    case 'up':
      planeGeometry.translate(xMean, initialShape[FACE_MAX_Y], zMean)
      break
    case 'north':
      planeGeometry.translate(xMean, yMean, initialShape[FACE_MIN_Z])
      break
    case 'south':
      planeGeometry.translate(xMean, yMean, initialShape[FACE_MAX_Z])
      break
    case 'west':
      planeGeometry.translate(initialShape[FACE_MIN_X], yMean, zMean)
      break
    case 'east':
      planeGeometry.translate(initialShape[FACE_MAX_X], yMean, zMean)
      break
  }
}

function applyPlaneTransformations(
  planeGeometry: THREE.PlaneGeometry,
  origin: THREE.Vector3,
  rotateMatrix: THREE.Matrix4,
  scaleVector: THREE.Vector3,
) {
  planeGeometry.translate(-origin.x, -origin.y, -origin.z)
  planeGeometry.applyMatrix4(rotateMatrix)
  planeGeometry.scale(scaleVector.x, scaleVector.y, scaleVector.z)
  planeGeometry.translate(origin.x, origin.y, origin.z)
}

function computeElementRotation(
  elementRotation: ModelRotation,
): [THREE.Matrix4, THREE.Vector3, THREE.Vector3] {
  let axis, scaleVector
  switch (elementRotation.axis) {
    case 'x':
      axis = VECTOR_X_ONE
      scaleVector = VECTOR_YZ_ONE
      break
    case 'y':
      axis = VECTOR_Y_ONE
      scaleVector = VECTOR_XZ_ONE
      break
    case 'z':
      axis = VECTOR_Z_ONE
      scaleVector = VECTOR_XY_ONE
      break
  }
  const origin = new THREE.Vector3(...elementRotation.origin).multiplyScalar(1 / 16)
  const rotationMatrix = new THREE.Matrix4().makeRotationAxis(
    axis,
    (elementRotation.angle / 180) * Math.PI,
  )
  if (elementRotation.rescale) {
    if (Math.abs(elementRotation.angle) === 22.5) {
      scaleVector.multiplyScalar(1.0 / Math.cos(Math.PI / 8) - 1)
    } else {
      scaleVector.multiplyScalar(1.0 / Math.cos(Math.PI / 4) - 1)
    }
    scaleVector.add(VECTOR_ONE)
  } else {
    scaleVector = VECTOR_ONE
  }
  return [rotationMatrix, origin, scaleVector]
}
