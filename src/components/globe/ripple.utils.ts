import * as THREE from 'three'
import type { ImpactLevel } from '@/store/types'

/** Impact level → ripple color hex */
export function getRippleColor(level: ImpactLevel): string {
  switch (level) {
    case 'Critical': return '#e24b4a'
    case 'High': return '#ef9f27'
    case 'Medium': return '#1d9e75'
    case 'Low': return '#378add'
  }
}

/** Create ripple ring geometry for an event */
export function createRippleRing(
  radius: number,
  color: string,
  opacity: number
): THREE.Mesh {
  const geometry = new THREE.RingGeometry(radius * 0.8, radius, 64)
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  })
  return new THREE.Mesh(geometry, material)
}

/** Convert lat/lon to position on sphere */
export function latLonToSpherePosition(
  lat: number,
  lon: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}
