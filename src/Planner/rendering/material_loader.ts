import * as THREE from 'three'
import CustomGLTFLoader from 'Renderer/gltf/CustomGLTFLoader'
import { stoppableTraverse } from 'Renderer/utils/modelUtils'
import { ERROR_MATERIAL_DOWNLOAD_FAILED, ERROR_MATERIAL_PARSE_FAILED,
  ERROR_MATERIAL_NOT_FOUND } from 'Planner/api_constants'
import type { GLTf } from 'Renderer/gltf/gltf'
import { FLOOR_UV_SCALES_BASED_ON_MATERIAL } from 'Planner/planner_constants'

export class MaterialLoader {
  public static loadMaterialFromUrl(url: string): Promise<THREE.MeshStandardMaterial> {
    const loader = new CustomGLTFLoader()
    const loadPromise = loader.loadAsync(url).catch(() => Promise.reject(new Error(ERROR_MATERIAL_DOWNLOAD_FAILED)))
    return loadPromise.then((result) => {
      const material = MaterialLoader.findTheMaterial(result.scene)
      if (!material) {
        return Promise.reject(new Error(ERROR_MATERIAL_NOT_FOUND))
      }
      return material
    })
  }

  public static loadMaterialFromGltfObject(gltf: GLTf, baseUrl: string) {
    const loader = new CustomGLTFLoader()
    const parsePromise = loader.parseGLTFJson(gltf, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
      .catch(() => Promise.reject(new Error(ERROR_MATERIAL_PARSE_FAILED)))
    return parsePromise.then((result) => {
      const material = MaterialLoader.findTheMaterial(result.scene)
      if (!material) {
        return Promise.reject(new Error(ERROR_MATERIAL_NOT_FOUND))
      }
      return material
    })
  }

  // Assuming here that material glbs contain single mesh with MeshStandardMaterial, that is the material we need.
  private static findTheMaterial(result: THREE.Object3D): THREE.MeshStandardMaterial | null {
    let ret: THREE.MeshStandardMaterial | null = null
    stoppableTraverse(result, (obj) => {
      if (obj instanceof THREE.Mesh &&
          'material' in obj &&
          obj.material instanceof THREE.MeshStandardMaterial) {
        ret = obj.material
        const uvScale = MaterialLoader.calcUvScale(obj)
        const repeatFactor = uvScale
        ret.map?.repeat.multiplyScalar(repeatFactor)
        ret.roughnessMap?.repeat.multiplyScalar(repeatFactor)
        ret.metalnessMap?.repeat.multiplyScalar(repeatFactor)
        ret.normalMap?.repeat.multiplyScalar(repeatFactor)
        return false
      }
      return true
    })
    return ret
  }

  private static calcUvScale(mesh: THREE.Mesh) {
    const materialName = (mesh.material as THREE.Material).name as string
    const preSavedUvScale = FLOOR_UV_SCALES_BASED_ON_MATERIAL[materialName]
    if (preSavedUvScale) {
      return preSavedUvScale
    }

    const ret = 1.0
    const posAttribute = mesh.geometry.getAttribute(`position`)
    const uvAttribute = (mesh.geometry.getAttribute(`uv`) ||
      mesh.geometry.getAttribute(`texcoord0`)) as THREE.BufferAttribute
    const indices = mesh.geometry.getIndex()
    if (!posAttribute || !uvAttribute || !indices || indices.count < 3) {
      return ret
    }

    mesh.geometry.computeBoundingSphere()
    if (!mesh.geometry.boundingSphere) {
      return ret
    }

    // Assumptions here:
    // - Material sphere mesh has a circumference of exact meters of the width of material texture image
    // - The returning scaling factor is the same for u and v
    // - The room mesh uv coordinates are set in world units
    const radius = mesh.geometry.boundingSphere.radius
    const metricWidth = 2 * radius * Math.PI

    return 1. / metricWidth
  }
}