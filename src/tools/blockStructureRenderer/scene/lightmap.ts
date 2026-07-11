// lightmap.fsh
// MAIN THREAD ALGORITHM

import * as THREE from 'three/webgpu'
import { VECTOR_ONE, VECTOR_ZERO } from '../const.ts'

export interface LightmapInfo {
  SkyFactor: number
  BlockFactor: number
  NightVisionFactor: number
  DarknessScale: number
  BossOverlayWorldDarkeningFactor: number
  BrightnessFactor: number
  BlockLightTint: THREE.Vector3
  SkyLightColor: THREE.Vector3
  AmbientColor: THREE.Vector3
  NightVisionColor: THREE.Vector3
}

// Shader ------------------------------------------------------------------------------------------

function getBrightness(level: number) {
  return level / (4.0 - 3.0 * level)
}

function notGamma(color: THREE.Vector3): THREE.Vector3 {
  const maxComponent = Math.max(color.x, color.y, color.z)
  const maxInverted = 1.0 - maxComponent
  const maxScaled = 1.0 - maxInverted * maxInverted * maxInverted * maxInverted
  return color.multiplyScalar(maxScaled / maxComponent)
}

function parabolicMixFactor(level: number) {
  return (2.0 * level - 1.0) * (2.0 * level - 1.0)
}
const VECTOR_BOSS_OVERLAY_MULTIPLIER = new THREE.Vector3(0.7, 0.6, 0.6)

export function generateLightmap(info: LightmapInfo): THREE.Texture {
  const array = new Float32Array(4 * 16 * 16)

  const nightVisionColor = info.NightVisionColor.clone().multiplyScalar(info.NightVisionFactor)

  for (let skyLevel = 0; skyLevel < 16; skyLevel++) {
    for (let blockLevel = 0; blockLevel < 16; blockLevel++) {
      const blockBrightness = getBrightness(blockLevel / 15) * info.BlockFactor
      const skyBrightness = getBrightness(skyLevel / 15) * info.SkyFactor

      let color = info.AmbientColor.clone().max(nightVisionColor)
      color = color.addScaledVector(info.SkyLightColor, skyBrightness)

      const blockLightColor = info.BlockLightTint.clone().lerp(
        VECTOR_ONE,
        0.9 * parabolicMixFactor(blockLevel / 15),
      )
      color = color.addScaledVector(blockLightColor, blockBrightness)

      color = color.lerp(
        color.multiply(VECTOR_BOSS_OVERLAY_MULTIPLIER),
        info.BossOverlayWorldDarkeningFactor,
      )

      color = color.addScaledVector(VECTOR_ONE, -info.DarknessScale)

      color = color.clamp(VECTOR_ZERO, VECTOR_ONE)

      const notGammaColor = notGamma(color)
      color = color.lerp(notGammaColor, info.BrightnessFactor)

      array.set([color.x, color.y, color.z, 1], skyLevel * 16 * 4 + blockLevel * 4)
    }
  }

  const texture = new THREE.DataTexture(array, 16, 16, THREE.RGBAFormat, THREE.FloatType)
  texture.needsUpdate = true
  return texture
}
