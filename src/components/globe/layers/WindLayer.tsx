import * as THREE from 'three'
import { latLonToVector3 } from '@/lib/geo/coordinates'
import type { WindPoint } from '@/store/types'
import type { EnvLayerManager } from './types'

const PARTICLE_COUNT = 500
const WIND_COLOR = new THREE.Color('#00d4ff')
const TRAIL_OFFSET = 0.3 // degrees behind head for trail

interface Particle {
  lat: number
  lon: number
  windDir: number   // degrees, direction wind blows TO
  windSpeed: number // m/s
  age: number       // seconds alive
  maxAge: number    // seconds before reset
  phase: number     // random phase for staggered start
}

/** Find the nearest wind data point for a given lat/lon */
function findNearestWind(
  data: WindPoint[],
  lat: number,
  lon: number
): { direction: number; speed: number } {
  if (data.length === 0) return { direction: Math.random() * 360, speed: 2 }

  let bestDist = Infinity
  let bestPoint = data[0]

  for (const p of data) {
    const dLat = p.lat - lat
    const dLon = p.lon - lon
    const dist = dLat * dLat + dLon * dLon
    if (dist < bestDist) {
      bestDist = dist
      bestPoint = p
    }
  }

  return { direction: bestPoint.direction, speed: bestPoint.speed }
}

/**
 * Creates an animated wind particle layer on the globe surface.
 * 500 particles rendered as line segments flowing along wind directions.
 * Color: cyan (#00d4ff), opacity scales with wind speed.
 * Speed formula: particles complete path in 3000ms / (windSpeed / 5) ms.
 */
export function createWindLayer(
  data: WindPoint[],
  radius: number
): EnvLayerManager {
  const group = new THREE.Group()
  group.name = 'wind-layer'

  if (data.length === 0) {
    return { group, update() {}, dispose() {} }
  }

  // Initialize particle state
  const particles: Particle[] = []
  const positions = new Float32Array(PARTICLE_COUNT * 6) // 2 vertices × 3 coords per particle
  const colors = new Float32Array(PARTICLE_COUNT * 6)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const lat = Math.random() * 160 - 80 // avoid poles
    const lon = Math.random() * 360 - 180
    const wind = findNearestWind(data, lat, lon)

    const maxAge = (15000 / Math.max(wind.speed, 1)) / 1000 // convert ms formula to seconds

    particles.push({
      lat,
      lon,
      windDir: wind.direction,
      windSpeed: wind.speed,
      age: Math.random() * maxAge, // stagger start
      maxAge,
      phase: Math.random() * Math.PI * 2,
    })

    // Initialize head and tail at same position
    const pos = latLonToVector3(lat, lon, radius + 0.03)
    const idx = i * 6
    positions[idx] = pos.x
    positions[idx + 1] = pos.y
    positions[idx + 2] = pos.z
    positions[idx + 3] = pos.x
    positions[idx + 4] = pos.y
    positions[idx + 5] = pos.z

    // Color: cyan with brightness based on wind speed
    const speedNorm = Math.min(wind.speed / 15, 1)
    const brightness = 0.3 + speedNorm * 0.7
    colors[idx] = WIND_COLOR.r * brightness
    colors[idx + 1] = WIND_COLOR.g * brightness
    colors[idx + 2] = WIND_COLOR.b * brightness
    colors[idx + 3] = WIND_COLOR.r * brightness * 0.3 // tail is dimmer
    colors[idx + 4] = WIND_COLOR.g * brightness * 0.3
    colors[idx + 5] = WIND_COLOR.b * brightness * 0.3
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    linewidth: 1,
  })

  const lineSegments = new THREE.LineSegments(geometry, material)
  group.add(lineSegments)

  let lastTime = 0

  return {
    group,

    update(elapsed: number) {
      const dt = lastTime === 0 ? 0.016 : Math.min(elapsed - lastTime, 0.05)
      lastTime = elapsed

      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
      const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute
      const posArr = posAttr.array as Float32Array
      const colArr = colAttr.array as Float32Array

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i]
        p.age += dt

        // Reset particle when it exceeds max age
        if (p.age >= p.maxAge) {
          p.lat = Math.random() * 160 - 80
          p.lon = Math.random() * 360 - 180
          const wind = findNearestWind(data, p.lat, p.lon)
          p.windDir = wind.direction
          p.windSpeed = wind.speed
          p.maxAge = (15000 / Math.max(wind.speed, 1)) / 1000
          p.age = 0
          p.phase = Math.random() * Math.PI * 2
        }

        // Move particle along wind direction
        // Wind direction: meteorological degrees (0=N, 90=E, 180=S, 270=W)
        const dirRad = ((p.windDir + 180) % 360) * (Math.PI / 180) // direction wind blows TO
        const speedFactor = p.windSpeed * 0.15 * dt // degrees per second

        p.lat += Math.cos(dirRad) * speedFactor
        p.lon += (Math.sin(dirRad) * speedFactor) / Math.max(Math.cos(p.lat * Math.PI / 180), 0.1)

        // Wrap coordinates
        if (p.lat > 85) { p.lat = 85; p.age = p.maxAge } // reset at poles
        if (p.lat < -85) { p.lat = -85; p.age = p.maxAge }
        if (p.lon > 180) p.lon -= 360
        if (p.lon < -180) p.lon += 360

        // Compute head position
        const head = latLonToVector3(p.lat, p.lon, radius + 0.03)

        // Compute tail position (behind the head along wind direction)
        const tailLat = p.lat - Math.cos(dirRad) * TRAIL_OFFSET
        const tailLon = p.lon - (Math.sin(dirRad) * TRAIL_OFFSET) / Math.max(Math.cos(p.lat * Math.PI / 180), 0.1)
        const tail = latLonToVector3(tailLat, tailLon, radius + 0.03)

        // Fade in/out based on lifecycle
        const lifeFraction = p.age / p.maxAge
        const fadeFactor = lifeFraction < 0.1
          ? lifeFraction / 0.1    // fade in
          : lifeFraction > 0.85
            ? (1 - lifeFraction) / 0.15 // fade out
            : 1.0

        const speedNorm = Math.min(p.windSpeed / 15, 1)
        const brightness = (0.3 + speedNorm * 0.7) * fadeFactor

        const idx = i * 6
        posArr[idx] = head.x
        posArr[idx + 1] = head.y
        posArr[idx + 2] = head.z
        posArr[idx + 3] = tail.x
        posArr[idx + 4] = tail.y
        posArr[idx + 5] = tail.z

        colArr[idx] = WIND_COLOR.r * brightness
        colArr[idx + 1] = WIND_COLOR.g * brightness
        colArr[idx + 2] = WIND_COLOR.b * brightness
        colArr[idx + 3] = WIND_COLOR.r * brightness * 0.2
        colArr[idx + 4] = WIND_COLOR.g * brightness * 0.2
        colArr[idx + 5] = WIND_COLOR.b * brightness * 0.2
      }

      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
    },

    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}
