import * as THREE from 'three'
import CustomGLTFLoader from 'Renderer/gltf/CustomGLTFLoader'
import CustomDRACOLoader from 'Renderer/CustomDracoLoader'

import { GLTf } from 'Renderer/gltf/gltf'
import { ERROR_GLB_DOWNLOAD_FAILED } from 'Planner/api_constants'

export class GltfLoader {
  private loader: CustomGLTFLoader

  constructor() {
    this.loader = new CustomGLTFLoader()

    const dracoLoader = new CustomDRACOLoader()
    dracoLoader.setDecoderPath(`//www.gstatic.com/draco/versioned/decoders/1.4.3/`)
    dracoLoader.preload()
    this.loader.setDRACOLoader(dracoLoader)
  }
  
  public parseGltfFromJson(gltfJson: GLTf, baseUrl: string): Promise<THREE.Group> {
    const options = { ignoreTextures: false }
    return this.loader.parseGLTFJson(gltfJson, `${baseUrl}/`, undefined, options)
      .then((resultGltf) => {
        const group = resultGltf.scene
        if (!group.userData) {
          group.userData = {}
        }
        Object.assign(group.userData, resultGltf.userData)
        return group
      })
  }

  public loadGlbFromUrl(glbUrl: string) {
    const loadPromise = this.loader.loadAsync(glbUrl)
      .catch(() => Promise.reject(new Error(ERROR_GLB_DOWNLOAD_FAILED)))
    return loadPromise.then((result) => {
        const group = result.scene
        if (!group.userData) {
          group.userData = {}
        }
        Object.assign(group.userData, result.userData)
        return group
    })
  }
}