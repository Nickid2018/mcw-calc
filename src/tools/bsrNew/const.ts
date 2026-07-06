import * as THREE from 'three/webgpu'

export const DEBUG_MODE = true

export const VECTOR_ZERO = new THREE.Vector3(0, 0, 0)
export const VECTOR_ONE = new THREE.Vector3(1, 1, 1)
export const VECTOR_HALF = new THREE.Vector3(0.5, 0.5, 0.5)
export const VECTOR_X_ONE = new THREE.Vector3(1, 0, 0)
export const VECTOR_Y_ONE = new THREE.Vector3(0, 1, 0)
export const VECTOR_Z_ONE = new THREE.Vector3(0, 0, 1)
export const VECTOR_X_NEG_ONE = new THREE.Vector3(-1, 0, 0)
export const VECTOR_Y_NEG_ONE = new THREE.Vector3(0, -1, 0)
export const VECTOR_Z_NEG_ONE = new THREE.Vector3(0, 0, -1)
export const VECTOR_XY_ONE = new THREE.Vector3(1, 1, 0)
export const VECTOR_YZ_ONE = new THREE.Vector3(0, 1, 1)
export const VECTOR_XZ_ONE = new THREE.Vector3(1, 0, 1)

export const MATRIX_IDENTITY = new THREE.Matrix4()
export const MATRIX_Y_ROT_90 = new THREE.Matrix4().makeRotationY(Math.PI / 2)
export const MATRIX_Y_ROT_180 = new THREE.Matrix4().makeRotationY(Math.PI)
export const MATRIX_Y_ROT_270 = new THREE.Matrix4().makeRotationY(-Math.PI / 2)
export const MATRIX_X_ROT_90 = new THREE.Matrix4().makeRotationX(Math.PI / 2)
export const MATRIX_X_ROT_270 = new THREE.Matrix4().makeRotationX(-Math.PI / 2)
export const MATRIX_TRANS_TO_CENTER = new THREE.Matrix4().makeTranslation(-0.5, -0.5, -0.5)
export const MATRIX_TRANS_TO_CORNER = new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5)

export const ATLAS_SIZE = 1024
export const ATLAS_LOCATION = DEBUG_MODE
  ? 'http://localhost:3000/renderer/assets/atlas.png'
  : 'https://zh.minecraft.wiki/images/Block_structure_rendering_atlas.png?format=original'
