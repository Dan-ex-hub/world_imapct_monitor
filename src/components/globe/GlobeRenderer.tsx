'use client'

import { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useGlobeStore } from '@/store/useGlobeStore'
import { latLonToVector3, sunPosition } from '@/lib/geo/coordinates'
import { getRippleColor } from './ripple.utils'
import {
  atmosphereVertexShader,
  atmosphereFragmentShader,
  earthVertexShader,
  earthFragmentShader,
} from './shaders'
import type { GlobeEvent, EnvLayerType, EnvLayerData } from '@/store/types'
import type { EnvLayerManager } from './layers/types'

// Layer factory imports
import { createWindLayer } from './layers/WindLayer'
import { createAQILayer } from './layers/AQILayer'
import { createEarthquakeLayer } from './layers/EarthquakeLayer'
import { createWildfireLayer } from './layers/WildfireLayer'
import { createStormLayer } from './layers/StormLayer'
import { createTempAnomalyLayer } from './layers/TempAnomalyLayer'

// ─── Constants ───────────────────────────────────────────────────────────
const EARTH_RADIUS = 5
const ATMOSPHERE_RADIUS = 5.3
const STAR_COUNT = 2000
const RIPPLE_RING_COUNT = 3
const RIPPLE_SPEED = 0.008
const RIPPLE_MAX_SCALE = 2.5
const AUTO_ROTATE_SPEED = 0.001
const CAMERA_DISTANCE = 14
const CAMERA_MIN = 7
const CAMERA_MAX = 30

// Impact level → ripple base scale
const IMPACT_SCALE: Record<string, number> = {
  Critical: 0.35,
  High: 0.25,
  Medium: 0.18,
  Low: 0.12,
}

// ─── Types ───────────────────────────────────────────────────────────────
interface RippleMarker {
  eventId: string
  group: THREE.Group
  rings: THREE.Mesh[]
  phases: number[]
  baseScale: number
  position: THREE.Vector3
}

// ─── Layer Factory ───────────────────────────────────────────────────────
/** Creates the appropriate EnvLayerManager for a given layer type and data */
function createLayerManager(
  layerType: EnvLayerType,
  data: EnvLayerData
): EnvLayerManager | null {
  switch (layerType) {
    case 'wind':
      return data.wind ? createWindLayer(data.wind, EARTH_RADIUS) : null
    case 'aqi':
      return data.aqi ? createAQILayer(data.aqi, EARTH_RADIUS) : null
    case 'earthquakes':
      return data.earthquakes ? createEarthquakeLayer(data.earthquakes, EARTH_RADIUS) : null
    case 'wildfires':
      return data.wildfires ? createWildfireLayer(data.wildfires, EARTH_RADIUS) : null
    case 'storms':
      return data.storms ? createStormLayer(data.storms, EARTH_RADIUS) : null
    case 'temperature_anomaly':
      return data.tempAnomalies ? createTempAnomalyLayer(data.tempAnomalies, EARTH_RADIUS) : null
    case 'sea_temp':
      // Sea temp uses the same temp anomaly renderer with different data
      return data.tempAnomalies ? createTempAnomalyLayer(data.tempAnomalies, EARTH_RADIUS) : null
    case 'none':
    default:
      return null
  }
}

// ─── Component ───────────────────────────────────────────────────────────
export default function GlobeRenderer() {
  const containerRef = useRef<HTMLDivElement>(null)

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const earthRef = useRef<THREE.Mesh | null>(null)
  const atmosphereRef = useRef<THREE.Mesh | null>(null)
  const markersGroupRef = useRef<THREE.Group | null>(null)
  const envLayerGroupRef = useRef<THREE.Group | null>(null)
  const rippleMarkersRef = useRef<RippleMarker[]>([])
  const frameIdRef = useRef<number>(0)
  const timerRef = useRef(new THREE.Timer())
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2(-999, -999))
  const isAutoRotatingRef = useRef(true)
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Environmental layer manager ref
  const layerManagerRef = useRef<EnvLayerManager | null>(null)

  // Zustand store selectors
  const events = useGlobeStore((s) => s.events)
  const activeEnvLayer = useGlobeStore((s) => s.activeEnvLayer)
  const envLayerData = useGlobeStore((s) => s.envLayerData)
  const setSelectedEvent = useGlobeStore((s) => s.setSelectedEvent)
  const setHoveredEvent = useGlobeStore((s) => s.setHoveredEvent)

  // ─── Create starfield ────────────────────────────────────────────────
  const createStarfield = useCallback((): THREE.Points => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const sizes = new Float32Array(STAR_COUNT)
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 80 + Math.random() * 120
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      sizes[i] = 0.3 + Math.random() * 1.2
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false,
    })
    return new THREE.Points(geometry, material)
  }, [])

  // ─── Create earth sphere ─────────────────────────────────────────────
  const createEarth = useCallback((): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
    const textureLoader = new THREE.TextureLoader()

    // Load earth night texture
    const earthTexture = textureLoader.load(
      '/textures/earth-night.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 4
      },
      undefined,
      () => {
        // Fallback: if texture fails, use a dark solid color
        console.warn('Earth texture failed to load, using fallback')
      }
    )

    const material = new THREE.ShaderMaterial({
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
      uniforms: {
        earthTexture: { value: earthTexture },
        gridOpacity: { value: 0.08 },
        rimColor: { value: new THREE.Color('#1a3a5c') },
        rimPower: { value: 3.0 },
      },
    })

    const mesh = new THREE.Mesh(geometry, material)
    return mesh
  }, [])

  // ─── Create atmosphere glow ───────────────────────────────────────────
  const createAtmosphere = useCallback((): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(ATMOSPHERE_RADIUS, 64, 64)
    const material = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        glowColor: { value: new THREE.Color('#1a6baa') },
        intensity: { value: 0.6 },
        power: { value: 4.0 },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return new THREE.Mesh(geometry, material)
  }, [])

  // ─── Create ripple marker for an event ────────────────────────────────
  const createRippleMarker = useCallback((event: GlobeEvent): RippleMarker => {
    const group = new THREE.Group()
    const color = getRippleColor(event.impactLevel)
    const baseScale = IMPACT_SCALE[event.impactLevel] || 0.15
    const position = latLonToVector3(event.lat, event.lon, EARTH_RADIUS + 0.02)

    const rings: THREE.Mesh[] = []
    const phases: number[] = []

    for (let i = 0; i < RIPPLE_RING_COUNT; i++) {
      const ringGeo = new THREE.RingGeometry(
        baseScale * 0.6,
        baseScale,
        32
      )
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      rings.push(ring)
      group.add(ring)
      phases.push((i / RIPPLE_RING_COUNT) * Math.PI * 2)
    }

    // Center dot (bright core)
    const dotGeo = new THREE.SphereGeometry(baseScale * 0.3, 16, 16)
    const dotMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9,
    })
    const dot = new THREE.Mesh(dotGeo, dotMat)
    group.add(dot)

    // Position and orient the group to face outward from sphere center
    group.position.copy(position)
    group.lookAt(new THREE.Vector3(0, 0, 0))

    // Store event ID in userData for raycasting
    group.userData = { eventId: event.id, type: 'event-marker' }
    rings.forEach((r) => {
      r.userData = { eventId: event.id, type: 'event-marker' }
    })
    dot.userData = { eventId: event.id, type: 'event-marker' }

    return { eventId: event.id, group, rings, phases, baseScale, position }
  }, [])

  // ─── Animate ripple markers ───────────────────────────────────────────
  const animateRipples = useCallback((time: number) => {
    for (const marker of rippleMarkersRef.current) {
      for (let i = 0; i < marker.rings.length; i++) {
        const phase = marker.phases[i]
        const t = ((time * RIPPLE_SPEED + phase) % (Math.PI * 2)) / (Math.PI * 2)
        const scale = 1 + t * RIPPLE_MAX_SCALE
        marker.rings[i].scale.set(scale, scale, 1)
        const mat = marker.rings[i].material as THREE.MeshBasicMaterial
        mat.opacity = (1 - t) * 0.6
      }
    }
  }, [])

  // ─── Sync events to markers ───────────────────────────────────────────
  const syncEventMarkers = useCallback(
    (eventsList: GlobeEvent[]) => {
      const markersGroup = markersGroupRef.current
      if (!markersGroup) return

      const existing = new Set(rippleMarkersRef.current.map((m) => m.eventId))
      const incoming = new Set(eventsList.map((e) => e.id))

      // Remove stale markers
      rippleMarkersRef.current = rippleMarkersRef.current.filter((m) => {
        if (!incoming.has(m.eventId)) {
          markersGroup.remove(m.group)
          m.rings.forEach((r) => {
            r.geometry.dispose()
            ;(r.material as THREE.Material).dispose()
          })
          return false
        }
        return true
      })

      // Add new markers
      for (const event of eventsList) {
        if (!existing.has(event.id)) {
          const marker = createRippleMarker(event)
          markersGroup.add(marker.group)
          rippleMarkersRef.current.push(marker)
        }
      }
    },
    [createRippleMarker]
  )

  // ─── Handle mouse move (raycasting) ───────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    // Pause auto-rotation on user interaction
    isAutoRotatingRef.current = false
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
    interactionTimeoutRef.current = setTimeout(() => {
      isAutoRotatingRef.current = true
    }, 5000)
  }, [])

  // ─── Handle click ─────────────────────────────────────────────────────
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const camera = cameraRef.current
      const markersGroup = markersGroupRef.current
      if (!camera || !markersGroup) return

      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )

      raycasterRef.current.setFromCamera(mouse, camera)
      const intersects = raycasterRef.current.intersectObjects(
        markersGroup.children,
        true
      )

      if (intersects.length > 0) {
        const hit = intersects[0].object
        const eventId = hit.userData?.eventId
        if (eventId) {
          const event = useGlobeStore.getState().events.find((ev) => ev.id === eventId)
          if (event) setSelectedEvent(event)
        }
      } else {
        setSelectedEvent(null)
      }
    },
    [setSelectedEvent]
  )

  // ─── Perform hover raycasting (throttled in animation loop) ──────────
  const performHoverRaycast = useCallback(() => {
    const camera = cameraRef.current
    const markersGroup = markersGroupRef.current
    if (!camera || !markersGroup) return

    raycasterRef.current.setFromCamera(mouseRef.current, camera)
    const intersects = raycasterRef.current.intersectObjects(
      markersGroup.children,
      true
    )

    if (intersects.length > 0) {
      const hit = intersects[0].object
      const eventId = hit.userData?.eventId
      if (eventId) {
        // Project 3D position to screen coordinates for tooltip
        const worldPos = new THREE.Vector3()
        hit.getWorldPosition(worldPos)
        const screen = worldPos.project(camera)
        const container = containerRef.current
        if (container) {
          const rect = container.getBoundingClientRect()
          const x = ((screen.x + 1) / 2) * rect.width
          const y = ((-screen.y + 1) / 2) * rect.height
          setHoveredEvent(eventId, { x, y })
        }
        return
      }
    }
    setHoveredEvent(null)
  }, [setHoveredEvent])

  // ─── INIT ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 2, CAMERA_DISTANCE)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.rotateSpeed = 0.5
    controls.zoomSpeed = 0.8
    controls.minDistance = CAMERA_MIN
    controls.maxDistance = CAMERA_MAX
    controls.enablePan = false
    controlsRef.current = controls

    // Ambient light (subtle fill)
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5)
    scene.add(ambientLight)

    // Directional light (sun position)
    const sun = sunPosition(new Date())
    const sunPos = latLonToVector3(sun.lat, sun.lon, 50)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3)
    dirLight.position.copy(sunPos)
    scene.add(dirLight)

    // Stars
    const stars = createStarfield()
    scene.add(stars)

    // Earth
    const earth = createEarth()
    scene.add(earth)
    earthRef.current = earth

    // Atmosphere
    const atmosphere = createAtmosphere()
    scene.add(atmosphere)
    atmosphereRef.current = atmosphere

    // Markers group (for event ripples)
    const markersGroup = new THREE.Group()
    scene.add(markersGroup)
    markersGroupRef.current = markersGroup

    // Env layer group
    const envGroup = new THREE.Group()
    scene.add(envGroup)
    envLayerGroupRef.current = envGroup

    // Event listeners
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('click', handleClick)

    // Resize handler
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    // Connect timer to document for page visibility handling
    const timer = timerRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (timer as any).connect(document);

    // Animation loop
    let hoverFrameCounter = 0
    const animate = (timestamp: number) => {
      frameIdRef.current = requestAnimationFrame(animate)
      timerRef.current.update(timestamp)
      const elapsed = timerRef.current.getElapsed()

      // Auto-rotate
      if (isAutoRotatingRef.current && earth) {
        earth.rotation.y += AUTO_ROTATE_SPEED
        markersGroup.rotation.y += AUTO_ROTATE_SPEED
        envGroup.rotation.y += AUTO_ROTATE_SPEED
      }

      // Animate ripple markers
      animateRipples(elapsed * 60)

      // Update active environmental layer
      if (layerManagerRef.current) {
        layerManagerRef.current.update(elapsed)
      }

      // Hover raycasting (throttled: every 3 frames)
      hoverFrameCounter++
      if (hoverFrameCounter % 3 === 0) {
        performHoverRaycast()
      }

      // Subtle star twinkle
      const starMat = stars.material as THREE.PointsMaterial
      starMat.opacity = 0.5 + Math.sin(elapsed * 0.5) * 0.1

      controls.update()
      renderer.render(scene, camera)
    }
    animate(performance.now())

    // Cleanup
    return () => {
      cancelAnimationFrame(frameIdRef.current)
      const t = timerRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t as any).disconnect(document);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t as any).dispose();
      resizeObserver.disconnect()
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('click', handleClick)
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)

      // Dispose active env layer
      if (layerManagerRef.current) {
        layerManagerRef.current.dispose()
        layerManagerRef.current = null
      }

      // Dispose Three.js resources
      renderer.dispose()
      controls.dispose()
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [
    createStarfield,
    createEarth,
    createAtmosphere,
    handleMouseMove,
    handleClick,
    animateRipples,
    performHoverRaycast,
  ])

  // ─── Sync events to markers when events change ────────────────────────
  useEffect(() => {
    syncEventMarkers(events)
  }, [events, syncEventMarkers])

  // ─── Manage environmental layer lifecycle ─────────────────────────────
  useEffect(() => {
    const envGroup = envLayerGroupRef.current
    if (!envGroup) return

    // Dispose previous layer manager
    if (layerManagerRef.current) {
      envGroup.remove(layerManagerRef.current.group)
      layerManagerRef.current.dispose()
      layerManagerRef.current = null
    }

    // Create new layer if active and data exists
    if (activeEnvLayer !== 'none' && envLayerData) {
      const manager = createLayerManager(activeEnvLayer, envLayerData)
      if (manager) {
        envGroup.add(manager.group)
        layerManagerRef.current = manager
      }
    }

    // Cleanup on unmount — dispose is handled by the main effect's cleanup
  }, [activeEnvLayer, envLayerData])

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    />
  )
}
