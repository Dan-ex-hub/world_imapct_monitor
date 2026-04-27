import * as THREE from 'three'

/** Common interface for all environmental layer managers */
export interface EnvLayerManager {
  /** Three.js group containing all layer objects — add to scene */
  group: THREE.Group
  /** Called every animation frame with elapsed time in seconds */
  update(elapsed: number): void
  /** Dispose all Three.js resources (geometries, materials, textures) */
  dispose(): void
}
