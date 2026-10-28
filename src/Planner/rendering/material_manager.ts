import * as THREE from 'three'

import { MaterialLoader } from 'Planner/rendering/material_loader'
import type { GLTf } from 'Renderer/gltf/gltf'

export class MaterialManager {
  private materialPromises = new Map<string, Promise<THREE.MeshStandardMaterial>>()
  private loadedMaterials = new Map<string, THREE.MeshStandardMaterial>()

  public loadMaterialFromUrl(uuid: string, url: string): Promise<THREE.MeshStandardMaterial> {
    const existing = this.materialPromises.get(uuid)
    if (existing) {
      return existing
    }
    const materialPromise = MaterialLoader.loadMaterialFromUrl(url)
      .then((material) => {
        this.loadedMaterials.set(uuid, material)
        return material
      })
    this.materialPromises.set(uuid, materialPromise)
    return materialPromise
  }

  public loadMaterialFromGltfObject(uuid: string, gltf: GLTf,
    baseUrl: string): Promise<THREE.MeshStandardMaterial> {
    const materialPromise = MaterialLoader.loadMaterialFromGltfObject(gltf, baseUrl)
      .then((material) => {
        this.loadedMaterials.set(uuid, material)
        return material
      })
    this.materialPromises.set(uuid, materialPromise)
    return materialPromise
  }

  public getMaterialByUuid(uuid: string) {
    const materialPromise = this.materialPromises.get(uuid)
    if (!materialPromise) {
      return Promise.reject(new Error(`Unresolved material: ${uuid}`))
    }
    return materialPromise
  }

  // Get a material that is expected to be loaded at the moment of the call.
  // May return undefined if material is still loading, or not existing.
  public getLoadedMaterialByUuid(uuid: string) {
    return this.loadedMaterials.get(uuid)
  }
}