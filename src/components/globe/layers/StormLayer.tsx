import * as THREE from 'three'
import { latLonToVector3 } from '@/lib/geo/coordinates'
import type { StormEvent } from '@/store/types'
import type { EnvLayerManager } from './types'

const TROPICAL_STORM_COLOR = new THREE.Color('#74b9ff')
const HURRICANE_COLOR = new THREE.Color('#e84393')
const SPIRAL_TURNS = 3
const SPIRAL_POINTS = 60

interface StormMarker {
  spiralGroup: THREE.Group
  rotationSpeed: number
  isHurricane: boolean
}

/**
 * Build a spiral-shaped line from parametric equations.
 * The spiral lies in the XY plane centered at origin, to be positioned later.
 */
function buildSpiralGeometry(
  maxRadius: number,
  turns: number,
  pointCount: number
): THREE.BufferGeometry {
  const positions = new Float32Array(pointCount * 3)

  for (let i = 0; i < pointCount; i++) {
    const t = i / (pointCount - 1) // 0 to 1
    const angle = t * turns * Math.PI * 2
    const r = t * maxRadius

    positions[i * 3] = r * Math.cos(angle)
    positions[i * 3 + 1] = r * Math.sin(angle)
    positions[i * 3 + 2] = 0
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return geometry
}

/**
 * Determines if a storm is hurricane-level based on its category string.
 */
function isHurricaneCategory(category?: string): boolean {
  if (!category) return false
  const lower = category.toLowerCase()
  return (
    lower.includes('hurricane') ||
    lower.includes('typhoon') ||
    lower.includes('cyclone') ||
    lower.includes('category')
  )
}

/**
 * Creates storm tracking layer on the globe.
 * Each storm is a rotating spiral-shaped line icon at its location.
 * Color by intensity: tropical storm = blue (#74b9ff), hurricane = pink (#e84393).
 * Rotation animation makes storms visually spin.
 */
export function createStormLayer(
  data: StormEvent[],
  radius: number
): EnvLayerManager {
  const group = new THREE.Group()
  group.name = 'storm-layer'

  if (data.length === 0) {
    return { group, update() {}, dispose() {} }
  }

  const markers: StormMarker[] = []

  // Limit to 50 storms
  const limitedData = data.slice(0, 50)

  for (const storm of limitedData) {
    const isHurricane = isHurricaneCategory(storm.category)
    const color = isHurricane ? HURRICANE_COLOR : TROPICAL_STORM_COLOR
    const spiralSize = isHurricane ? 0.15 : 0.1

    const position = latLonToVector3(storm.lat, storm.lon, radius + 0.03)

    // Create spiral line
    const spiralGeo = buildSpiralGeometry(spiralSize, SPIRAL_TURNS, SPIRAL_POINTS)
    const spiralMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      linewidth: 1,
    })
    const spiralLine = new THREE.Line(spiralGeo, spiralMat)

    // Create a second spiral arm (rotated 180°) for a more complete storm look
    const spiralGeo2 = buildSpiralGeometry(spiralSize, SPIRAL_TURNS, SPIRAL_POINTS)
    const spiralMat2 = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      linewidth: 1,
    })
    const spiralLine2 = new THREE.Line(spiralGeo2, spiralMat2)
    spiralLine2.rotation.z = Math.PI // offset by 180°

    // Center dot (eye of storm)
    const eyeGeo = new THREE.SphereGeometry(spiralSize * 0.15, 8, 8)
    const eyeMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
    const eye = new THREE.Mesh(eyeGeo, eyeMat)

    // Group everything together
    const spiralGroup = new THREE.Group()
    spiralGroup.add(spiralLine)
    spiralGroup.add(spiralLine2)
    spiralGroup.add(eye)

    // Position on sphere and orient to face outward
    spiralGroup.position.copy(position)
    spiralGroup.lookAt(new THREE.Vector3(0, 0, 0))
    // Rotate to face outward (lookAt points Z toward center, we flip)
    spiralGroup.rotateX(Math.PI)

    spiralGroup.userData = {
      type: 'storm-marker',
      id: storm.id,
      title: storm.title,
      category: storm.category,
      date: storm.date,
    }
    group.add(spiralGroup)

    const rotationSpeed = isHurricane ? 1.5 : 0.8

    markers.push({
      spiralGroup,
      rotationSpeed,
      isHurricane,
    })
  }

  return {
    group,

    update(elapsed: number) {
      for (const marker of markers) {
        // Rotate the spiral around its local Z-axis (outward from globe)
        marker.spiralGroup.children[0].rotation.z = elapsed * marker.rotationSpeed
        marker.spiralGroup.children[1].rotation.z = elapsed * marker.rotationSpeed + Math.PI

        // Subtle scale pulse
        const pulse = 1 + Math.sin(elapsed * 0.5) * 0.08
        marker.spiralGroup.scale.setScalar(pulse)
      }
    },

    dispose() {
      for (const marker of markers) {
        marker.spiralGroup.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            ;(obj.material as THREE.Material).dispose()
          } else if (obj instanceof THREE.Line) {
            obj.geometry.dispose()
            ;(obj.material as THREE.Material).dispose()
          }
        })
      }
    },
  }
}
