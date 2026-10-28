import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

import type { GLTf } from 'Renderer/gltf/gltf'
import { GltfLoader } from 'Planner/rendering/gltf_loader'

export class GltfModelManager {
  private gltfPromises = new Map<string, Promise<THREE.Object3D>>()
  private loadedGltfs = new Map<string, THREE.Object3D>()
  private gltfLoader = new GltfLoader()

  public loadModelGltfJson(gltf: GLTf, baseUrl: string, uuid: string): Promise<THREE.Object3D> {
    let existing = this.gltfPromises.get(uuid)
    if (!existing) {
      existing = this.gltfLoader.parseGltfFromJson(gltf, baseUrl).then((result) => {
        let resultObject: THREE.Object3D = result
        if (resultObject) {
          const worldObject = result.getObjectByName(`Scene`)?.getObjectByName(`world`)
          if (worldObject && worldObject.children.length === 1) {
            resultObject = worldObject.children[0]
          }
          if (resultObject) {
            resultObject.userData.assetUuid = uuid
          }
        }
        this.loadedGltfs.set(uuid, resultObject)
        return resultObject
      })
      this.gltfPromises.set(uuid, existing)
    }
    return existing.then((cachedModel) => SkeletonUtils.clone(cachedModel))
  }

  public loadModelGlbFromUrl(glbUrl: string) {
    let existing = this.gltfPromises.get(glbUrl)
    if (!existing) {
      existing = this.gltfLoader.loadGlbFromUrl(glbUrl).then((result) => {
        let resultObject: THREE.Object3D = result
        if (resultObject) {
          const worldObject = result.getObjectByName(`Scene`)?.getObjectByName(`world`)
          if (worldObject && worldObject.children.length === 1) {
            resultObject = worldObject.children[0]
          }
          if (resultObject) {
            resultObject.userData.glbUrl = glbUrl
          }
        }
        this.loadedGltfs.set(glbUrl, resultObject)
        return resultObject
      })
      this.gltfPromises.set(glbUrl, existing)
    }
    return existing.then((cachedModel) => SkeletonUtils.clone(cachedModel))
  }

  public getModelByUuidOrUrl(uuidOrUrl: string): Promise<THREE.Object3D> {
    const existing = this.gltfPromises.get(uuidOrUrl)
    if (!existing) {
      return Promise.reject(new Error(`Unresolved wall element asset: ${uuidOrUrl}`))
    }
    return existing.then((cachedModel) => SkeletonUtils.clone(cachedModel))
  }

  public cacheProceduralModel(id: string, model: THREE.Object3D) {
    this.loadedGltfs.set(id, model)
  }

  public getLoadedModelByUuidOrUrl(uuidOrUrl: string): THREE.Object3D | undefined {
    const loaded = this.loadedGltfs.get(uuidOrUrl)
    if (!loaded) {
      return undefined
    }
    return SkeletonUtils.clone(loaded)
  }
}