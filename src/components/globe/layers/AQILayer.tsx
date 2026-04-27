import * as THREE from 'three'
import { latLonToVector3 } from '@/lib/geo/coordinates'
import type { AQIPoint } from '@/store/types'
import type { EnvLayerManager } from './types'

/** AQI category → color mapping per spec */
const AQI_COLORS: Record<AQIPoint['category'], string> = {
  'Good': '#00e676',
  'Moderate': '#ffeb3b',
  'Unhealthy for Sensitive': '#ff9800',
  'Unhealthy': '#ff5722',
  'Very Unhealthy': '#f44336',
  'Hazardous': '#9c27b0',
}

/** AQI category → pulse speed (higher AQI = faster pulse) */
const PULSE_SPEEDS: Record<AQIPoint['category'], number> = {
  'Good': 1.0,
  'Moderate': 1.5,
  'Unhealthy for Sensitive': 2.0,
  'Unhealthy': 2.8,
  'Very Unhealthy': 3.5,
  'Hazardous': 5.0,
}

/** AQI category → base size */
const BASE_SIZES: Record<AQIPoint['category'], number> = {
  'Good': 0.015,
  'Moderate': 0.018,
  'Unhealthy for Sensitive': 0.022,
  'Unhealthy': 0.026,
  'Very Unhealthy': 0.03,
  'Hazardous': 0.035,
}

interface AQIMarker {
  mesh: THREE.Mesh
  glowMesh: THREE.Mesh
  pulseSpeed: number
  baseScale: number
  phase: number // random phase offset for staggered pulsing
}

/**
 * Creates AQI monitoring point layer on the globe.
 * Each AQI station is rendered as a glowing sphere with pulsing animation.
 * Color mapped by EPA AQI category, pulse speed increases with severity.
 */
export function createAQILayer(
  data: AQIPoint[],
  radius: number
): EnvLayerManager {
  const group = new THREE.Group()
  group.name = 'aqi-layer'

  if (data.length === 0) {
    return { group, update() {}, dispose() {} }
  }

  const markers: AQIMarker[] = []
  const sharedGeometry = new THREE.SphereGeometry(1, 12, 12) // unit sphere, scaled per marker
  const glowGeometry = new THREE.SphereGeometry(1, 8, 8)

  // Limit to 500 points max for performance
  const limitedData = data.slice(0, 500)

  for (const point of limitedData) {
    const color = AQI_COLORS[point.category] || '#ff9800'
    const pulseSpeed = PULSE_SPEEDS[point.category] || 2.0
    const baseSize = BASE_SIZES[point.category] || 0.02

    const position = latLonToVector3(point.lat, point.lon, radius + 0.02)

    // Core dot
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(sharedGeometry, material)
    mesh.position.copy(position)
    mesh.scale.setScalar(baseSize)
    mesh.userData = {
      type: 'aqi-marker',
      city: point.city,
      country: point.country,
      aqi: point.aqi,
      pm25: point.pm25,
      category: point.category,
    }
    group.add(mesh)

    // Outer glow
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
    glowMesh.position.copy(position)
    glowMesh.scale.setScalar(baseSize * 2.5)
    group.add(glowMesh)

    markers.push({
      mesh,
      glowMesh,
      pulseSpeed,
      baseScale: baseSize,
      phase: Math.random() * Math.PI * 2,
    })
  }

  return {
    group,

    update(elapsed: number) {
      for (const marker of markers) {
        // Pulsing scale animation
        const pulse = Math.sin(elapsed * marker.pulseSpeed + marker.phase)
        const scaleFactor = 1 + pulse * 0.3 // 0.7x to 1.3x
        marker.mesh.scale.setScalar(marker.baseScale * scaleFactor)

        // Glow pulse: inverse phase, expanding when core contracts
        const glowPulse = Math.sin(elapsed * marker.pulseSpeed + marker.phase + Math.PI)
        const glowScale = 2.5 + glowPulse * 0.5
        marker.glowMesh.scale.setScalar(marker.baseScale * glowScale)

        // Glow opacity also pulses
        const glowMat = marker.glowMesh.material as THREE.MeshBasicMaterial
        glowMat.opacity = 0.15 + (1 + pulse) * 0.05
      }
    },

    dispose() {
      sharedGeometry.dispose()
      glowGeometry.dispose()
      for (const marker of markers) {
        ;(marker.mesh.material as THREE.Material).dispose()
        ;(marker.glowMesh.material as THREE.Material).dispose()
      }
    },
  }
}
