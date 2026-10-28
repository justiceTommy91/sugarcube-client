import * as THREE from 'three'
import { gvRenderLibrary } from 'Renderer/foundation/geom_app'
import { setMaterialOnBeforeCompileCallback } from 'Renderer/rendering/rendering_utils'
import { projectEquirectRTfromMipmaps } from './rgbeUtils'

class EnvMapViewer {
  private scene: THREE.Scene
  private camera: THREE.OrthographicCamera

  private cubemapWidth = 768
  private cubemapHeight = 512
  private cubemapMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>

  private equirectWidth = 512
  private equirectHeight = 256
  private equirectRenderTarget: THREE.WebGLRenderTarget | null = null
  private equirectMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>

  private widthRatio = 1
  private screenWidth = 0
  private screenHeight = 0
  private showAsEquirectangular = false

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.scene.add(this.camera)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({
      map: null,
      depthTest: false,
      depthWrite: false
    })

    this.cubemapMesh = new THREE.Mesh(geometry, material)
    this.scene.add(this.cubemapMesh)

    this.equirectMesh = new THREE.Mesh(geometry.clone(), material.clone())
    this.scene.add(this.equirectMesh)
    this.equirectMesh.rotateZ(Math.PI)

    this.setupMaterial()
    this.setShowAsEquirectangular(this.showAsEquirectangular)
  }

  public setEnvMap(map: THREE.Texture | null) {
    if (this.equirectRenderTarget) {
      this.equirectRenderTarget.dispose()
    }

    this.cubemapMesh.material.map = map
    this.cubemapMesh.material.needsUpdate = true

    const threeRenderer = gvRenderLibrary()?.renderer
    if (!threeRenderer || !map) {
      return
    }
    this.equirectRenderTarget = projectEquirectRTfromMipmaps(threeRenderer, map)
    this.equirectMesh.material.map = this.equirectRenderTarget.texture
    this.equirectMesh.material.needsUpdate = true
  }

  public setResolution(resolution: THREE.Vector2) {
    this.screenWidth = resolution.x
    this.screenHeight = resolution.y
    this.refreshTransform()
  }

  public setMagnification(scale: number) {
    this.widthRatio = scale
    this.refreshTransform()
  }

  public setShowAsEquirectangular(state: boolean) {
    this.showAsEquirectangular = state
    this.equirectMesh.visible = state
    this.cubemapMesh.visible = !state
    this.refreshTransform()
  }

  public render(threeRenderer: THREE.WebGLRenderer) {
    if (!this.cubemapMesh.material.map) {
      return
    }

    const prevAutoClear = threeRenderer.autoClear;
    const prevClearAlpha = threeRenderer.getClearAlpha()

    threeRenderer.autoClear = false
    threeRenderer.clearDepth()
    threeRenderer.render(this.scene, this.camera)

    threeRenderer.autoClear = prevAutoClear
    threeRenderer.setClearAlpha(prevClearAlpha)
  }

  public dispose() {
    [this.cubemapMesh, this.equirectMesh].forEach(mesh => {
      mesh.geometry.dispose()
      mesh.material.dispose()
    })
    this.equirectRenderTarget?.dispose()
  }

  private setupMaterial() {
    [this.cubemapMesh.material, this.equirectMesh.material].forEach(material => {
      setMaterialOnBeforeCompileCallback(
        material,
        ( shader: { fragmentShader: string; } ) => {
          // eslint-disable-next-line no-param-reassign
          shader.fragmentShader = shader.fragmentShader.replace(
          `#include <dithering_fragment>`,
          `#include <dithering_fragment>
            gl_FragColor = LinearTosRGB(gl_FragColor);
            gl_FragColor.a = 1.0;
          `
          )
        }
      )
    })

    const uvs = this.cubemapMesh.geometry.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uvs.count; i += 1) {
      const uv = new THREE.Vector2().fromBufferAttribute(uvs, i)
      uvs.setXY(i, uv.x, uv.y * 0.5)
    }
  }

  private refreshTransform() {
    if (!this.screenWidth || !this.screenHeight) {
      return
    }

    const cx = this.screenWidth / 2
    const cy = this.screenHeight / 2
    const ndcX = (cx / this.screenWidth) * 2 - 1
    const ndcY = (cy / this.screenHeight) * 2 - 1

    const aspect = this.showAsEquirectangular
      ? this.equirectHeight / this.equirectWidth
      : this.cubemapHeight / this.cubemapWidth
    const targetWidthPx  = this.screenWidth * this.widthRatio
    const targetHeightPx = targetWidthPx * aspect
    const sx = targetWidthPx / this.screenWidth
    const sy = targetHeightPx / this.screenHeight

    const targetMesh = this.showAsEquirectangular
      ? this.equirectMesh
      : this.cubemapMesh
    targetMesh.position.set(ndcX, ndcY, 0)
    targetMesh.scale.set(sx, sy, 1)
  }
}

export default EnvMapViewer