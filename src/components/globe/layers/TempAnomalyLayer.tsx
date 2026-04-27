import * as THREE from 'three'
import type { TempAnomalyPoint } from '@/store/types'
import type { EnvLayerManager } from './types'

// d3 imports for diverging color scale
import { scaleLinear } from 'd3-scale'
import { interpolateRgb } from 'd3-interpolate'

const CANVAS_WIDTH = 360
const CANVAS_HEIGHT = 180
const OVERLAY_OPACITY = 0.6

// Diverging color scale: blue (cold anomaly) → white (neutral) → red (hot anomaly)
const COLD_COLOR = '#3742fa'  // deep blue for -3°C
const NEUTRAL_COLOR = '#2f3542' // very dark neutral (blends with globe)
const HOT_COLOR = '#ff4757'   // bright red for +3°C

/**
 * Inverse distance weighting interpolation.
 * Given a lat/lon, interpolates anomaly value from sparse data points.
 * Returns 0 if no data points exist.
 */
function idwInterpolate(
  lat: number,
  lon: number,
  data: TempAnomalyPoint[],
  power: number = 2
): number {
  if (data.length === 0) return 0

  let weightedSum = 0
  let weightSum = 0

  for (const point of data) {
    const dLat = point.lat - lat
    const dLon = point.lon - lon
    const dist = Math.sqrt(dLat * dLat + dLon * dLon)

    if (dist < 0.01) return point.anomalyC // exact match

    const weight = 1 / Math.pow(dist, power)
    weightedSum += point.anomalyC * weight
    weightSum += weight
  }

  return weightSum > 0 ? weightedSum / weightSum : 0
}

/**
 * Creates temperature anomaly overlay layer on the globe.
 * Generates a canvas texture with d3 diverging color scale:
 * blue = -3°C below baseline → red = +3°C above baseline.
 * Rendered as a slightly larger sphere blended over the earth at 60% opacity.
 */
export function createTempAnomalyLayer(
  data: TempAnomalyPoint[],
  radius: number
): EnvLayerManager {
  const group = new THREE.Group()
  group.name = 'temp-anomaly-layer'

  if (data.length === 0) {
    return { group, update() {}, dispose() {} }
  }

  // Build diverging color scale using d3
  const colorScale = scaleLinear<string>()
    .domain([-3, 0, 3])
    .range([COLD_COLOR, NEUTRAL_COLOR, HOT_COLOR])
    .interpolate(interpolateRgb)
    .clamp(true)

  // Generate canvas texture
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')!

  // Render anomaly grid to canvas
  // Each pixel maps to 1° of lat/lon
  const imageData = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT)

  for (let y = 0; y < CANVAS_HEIGHT; y++) {
    const lat = 90 - y // 90 (top) to -89 (bottom)
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      const lon = x - 180 // -180 (left) to 179 (right)

      const anomaly = idwInterpolate(lat, lon, data)
      const color = colorScale(anomaly)

      // Parse CSS color string to RGB
      const parsed = parseCSSColor(color)
      const pixelIdx = (y * CANVAS_WIDTH + x) * 4
      imageData.data[pixelIdx] = parsed.r
      imageData.data[pixelIdx + 1] = parsed.g
      imageData.data[pixelIdx + 2] = parsed.b

      // Alpha based on absolute anomaly magnitude (stronger anomaly = more visible)
      const magnitude = Math.min(Math.abs(anomaly) / 3, 1)
      imageData.data[pixelIdx + 3] = Math.floor(magnitude * 200) // 0-200 alpha range
    }
  }

  ctx.putImageData(imageData, 0, 0)

  // Apply Gaussian-like blur by drawing scaled down/up
  const blurCanvas = document.createElement('canvas')
  blurCanvas.width = CANVAS_WIDTH
  blurCanvas.height = CANVAS_HEIGHT
  const blurCtx = blurCanvas.getContext('2d')!
  // Scale down
  blurCtx.drawImage(canvas, 0, 0, CANVAS_WIDTH / 4, CANVAS_HEIGHT / 4)
  // Scale back up (creates blur effect)
  blurCtx.drawImage(
    blurCanvas,
    0, 0, CANVAS_WIDTH / 4, CANVAS_HEIGHT / 4,
    0, 0, CANVAS_WIDTH, CANVAS_HEIGHT
  )

  // Create Three.js texture from blurred canvas
  const texture = new THREE.CanvasTexture(blurCanvas)
  texture.needsUpdate = true
  texture.colorSpace = THREE.SRGBColorSpace

  // Create overlay sphere slightly above earth surface
  const geometry = new THREE.SphereGeometry(radius + 0.015, 64, 64)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: OVERLAY_OPACITY,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.FrontSide,
  })

  const overlaySphere = new THREE.Mesh(geometry, material)
  group.add(overlaySphere)

  return {
    group,

    update(_elapsed: number) {
      // Temperature anomaly layer is static — no per-frame animation needed
      // The canvas texture is generated once from the data
    },

    dispose() {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}

/**
 * Parse a CSS color string (hex or rgb()) to {r, g, b} values (0-255).
 */
function parseCSSColor(color: string): { r: number; g: number; b: number } {
  // Handle hex format
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      }
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }

  // Handle rgb(r, g, b) format
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    }
  }

  return { r: 47, g: 53, b: 66 } // fallback to neutral dark
}
