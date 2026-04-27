import * as THREE from 'three'
import { latLonToVector3 } from '@/lib/geo/coordinates'
import type { WildfireEvent } from '@/store/types'
import type { EnvLayerManager } from './types'

const FIRE_COLOR_CORE = new THREE.Color('#ffa502')
const FIRE_COLOR_HOT = new THREE.Color('#ff6348')
const MAX_POINT_LIGHTS = 10

interface FireMarker {
  dot: THREE.Mesh
  glowMesh: THREE.Mesh
  light: THREE.PointLight | null
  phase: number     // random phase for flickering
  flickerRate: number // random flicker speed
}

/**
 * Creates wildfire hotspot layer on the globe.
 * Each fire is an orange/red dot with flickering sine-wave animation.
 * Up to 10 nearest fires get subtle THREE.PointLight for glow effect.
 * Flickering: sine wave on opacity with random phase per fire.
 */
export function createWildfireLayer(
  data: WildfireEvent[],
  radius: number
): EnvLayerManager {
  const group = new THREE.Group()
  group.name = 'wildfire-layer'

  if (data.length === 0) {
    return { group, update() {}, dispose() {} }
  }

  const markers: FireMarker[] = []
  const sharedGeo = new THREE.SphereGeometry(1, 10, 10)
  const glowGeo = new THREE.SphereGeometry(1, 6, 6)

  // Limit to 200 fires for performance
  const limitedData = data.slice(0, 200)

  for (let idx = 0; idx < limitedData.length; idx++) {
    const fire = limitedData[idx]
    const position = latLonToVector3(fire.lat, fire.lon, radius + 0.02)

    // Core fire dot
    const dotMat = new THREE.MeshBasicMaterial({
      color: FIRE_COLOR_CORE,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
    const dot = new THREE.Mesh(sharedGeo, dotMat)
    dot.position.copy(position)
    dot.scale.setScalar(0.025)
    dot.userData = {
      type: 'wildfire-marker',
      id: fire.id,
      title: fire.title,
      date: fire.date,
      source: fire.source,
    }
    group.add(dot)

    // Glow aura
    const glowMat = new THREE.MeshBasicMaterial({
      color: FIRE_COLOR_HOT,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const glowMesh = new THREE.Mesh(glowGeo, glowMat)
    glowMesh.position.copy(position)
    glowMesh.scale.setScalar(0.06)
    group.add(glowMesh)

    // Add point light for the first MAX_POINT_LIGHTS fires (performance guard)
    let light: THREE.PointLight | null = null
    if (idx < MAX_POINT_LIGHTS) {
      light = new THREE.PointLight(0xffa502, 0.3, radius * 0.5) // color, intensity, distance
      light.position.copy(position)
      group.add(light)
    }

    markers.push({
      dot,
      glowMesh,
      light,
      phase: Math.random() * Math.PI * 2,
      flickerRate: 2 + Math.random() * 4, // 2–6 Hz flicker
    })
  }

  return {
    group,

    update(elapsed: number) {
      for (const marker of markers) {
        // Flickering opacity using sine wave with random phase
        const flicker = Math.sin(elapsed * marker.flickerRate + marker.phase)
        const secondaryFlicker = Math.sin(elapsed * marker.flickerRate * 1.7 + marker.phase * 0.5)

        // Combine two sine waves for more organic flickering
        const combined = (flicker * 0.6 + secondaryFlicker * 0.4)
        const opacity = 0.6 + combined * 0.3 // range: 0.3 to 0.9

        const dotMat = marker.dot.material as THREE.MeshBasicMaterial
        dotMat.opacity = opacity

        // Scale flicker
        const scalePulse = 1 + combined * 0.15
        marker.dot.scale.setScalar(0.025 * scalePulse)

        // Glow aura flicker (inverse, slower)
        const glowMat = marker.glowMesh.material as THREE.MeshBasicMaterial
        glowMat.opacity = 0.1 + (1 - combined) * 0.1
        marker.glowMesh.scale.setScalar(0.06 * (1 + combined * 0.2))

        // Alternate core color between orange and red-orange
        const colorMix = (combined + 1) * 0.5 // 0 to 1
        dotMat.color.copy(FIRE_COLOR_CORE).lerp(FIRE_COLOR_HOT, colorMix * 0.4)

        // Point light intensity flicker
        if (marker.light) {
          marker.light.intensity = 0.15 + (combined + 1) * 0.15
        }
      }
    },

    dispose() {
      sharedGeo.dispose()
      glowGeo.dispose()
      for (const marker of markers) {
        ;(marker.dot.material as THREE.Material).dispose()
        ;(marker.glowMesh.material as THREE.Material).dispose()
        if (marker.light) marker.light.dispose()
      }
    },
  }
}
