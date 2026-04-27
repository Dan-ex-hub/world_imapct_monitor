import * as THREE from 'three'
import { latLonToVector3 } from '@/lib/geo/coordinates'
import type { EarthquakeEvent } from '@/store/types'
import type { EnvLayerManager } from './types'

const QUAKE_COLOR = new THREE.Color('#a29bfe')
const RING_COUNT = 3
const RIPPLE_SPEED = 0.6 // ripple expansion speed
const MAX_RIPPLE_SCALE = 3.0

interface QuakeMarker {
  centerDot: THREE.Mesh
  rings: THREE.Mesh[]
  phases: number[]
  baseRadius: number
  depth: number
  magnitude: number
}

/**
 * Creates earthquake visualization layer on the globe.
 * Each earthquake renders as concentric expanding ring animations (purple).
 * Ring radius scales with magnitude: 0.02 * magnitude * earthRadius.
 * Dot opacity inversely proportional to depth (deeper = more transparent).
 */
export function createEarthquakeLayer(
  data: EarthquakeEvent[],
  radius: number
): EnvLayerManager {
  const group = new THREE.Group()
  group.name = 'earthquake-layer'

  if (data.length === 0) {
    return { group, update() {}, dispose() {} }
  }

  const markers: QuakeMarker[] = []

  // Limit to 100 earthquakes for performance
  const limitedData = data.slice(0, 100)

  for (const quake of limitedData) {
    const position = latLonToVector3(quake.lat, quake.lon, radius + 0.02)
    const baseRadius = 0.02 * quake.magnitude * radius

    // Depth-based opacity: shallower = more opaque (0-700km range)
    const depthNorm = Math.min(quake.depth / 300, 1)
    const depthOpacity = 1 - depthNorm * 0.7 // 0.3 to 1.0

    // Center dot — size proportional to magnitude
    const dotSize = 0.01 + quake.magnitude * 0.005
    const dotGeo = new THREE.SphereGeometry(dotSize, 12, 12)
    const dotMat = new THREE.MeshBasicMaterial({
      color: QUAKE_COLOR,
      transparent: true,
      opacity: depthOpacity * 0.9,
      depthWrite: false,
    })
    const centerDot = new THREE.Mesh(dotGeo, dotMat)
    centerDot.position.copy(position)
    centerDot.userData = {
      type: 'earthquake-marker',
      id: quake.id,
      magnitude: quake.magnitude,
      depth: quake.depth,
      location: quake.location,
      time: quake.time,
      url: quake.url,
    }
    group.add(centerDot)

    // Concentric ripple rings
    const rings: THREE.Mesh[] = []
    const phases: number[] = []

    for (let i = 0; i < RING_COUNT; i++) {
      const innerR = baseRadius * 0.7
      const outerR = baseRadius
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: QUAKE_COLOR,
        transparent: true,
        opacity: depthOpacity * 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.copy(position)
      ring.lookAt(new THREE.Vector3(0, 0, 0)) // face outward from sphere
      group.add(ring)

      rings.push(ring)
      // Stagger ring phases evenly across the cycle
      phases.push((i / RING_COUNT) * Math.PI * 2)
    }

    markers.push({
      centerDot,
      rings,
      phases,
      baseRadius,
      depth: quake.depth,
      magnitude: quake.magnitude,
    })
  }

  return {
    group,

    update(elapsed: number) {
      for (const marker of markers) {
        // Pulse the center dot
        const dotPulse = 0.8 + Math.sin(elapsed * 2) * 0.2
        const dotScale = (0.01 + marker.magnitude * 0.005) * dotPulse
        marker.centerDot.scale.setScalar(dotScale / (0.01 + marker.magnitude * 0.005))

        // Animate concentric rings expanding outward
        for (let i = 0; i < marker.rings.length; i++) {
          const ring = marker.rings[i]
          const phase = marker.phases[i]

          // Normalized cycle position [0, 1)
          const t = ((elapsed * RIPPLE_SPEED + phase) % (Math.PI * 2)) / (Math.PI * 2)

          // Scale ring outward
          const scale = 1 + t * MAX_RIPPLE_SCALE
          ring.scale.set(scale, scale, 1)

          // Fade out as ring expands
          const mat = ring.material as THREE.MeshBasicMaterial
          const depthNorm = Math.min(marker.depth / 300, 1)
          const depthOpacity = 1 - depthNorm * 0.7
          mat.opacity = (1 - t) * 0.5 * depthOpacity
        }
      }
    },

    dispose() {
      for (const marker of markers) {
        marker.centerDot.geometry.dispose()
        ;(marker.centerDot.material as THREE.Material).dispose()
        for (const ring of marker.rings) {
          ring.geometry.dispose()
          ;(ring.material as THREE.Material).dispose()
        }
      }
    },
  }
}
