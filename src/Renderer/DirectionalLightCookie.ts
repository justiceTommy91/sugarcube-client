import * as THREE from 'three'
import { StandardMesh } from './rendering/rendering_types';
import { gvCurrentScene, gvRenderLibrary } from './foundation/geom_app';
import { LIGHT_COOKIE_LAYER } from './constants';

class DirectionalLightCookie {
  
  private directionalLight: THREE.DirectionalLight | null = null
  private windowsProxyObjects: StandardMesh[] | null = null
  private doorsProxyObjects: StandardMesh[] | null = null

  // A matrix to project world points into normalized light coordinates.
  private readonly lightMatrix = new THREE.Matrix4()

  // A bias matrix to transform local projected points from [-1, 1] to [0, 1].
  private readonly biasMatrix = new THREE.Matrix4().set(
    0.5, 0.0, 0.0, 0.5,
    0.0, 0.5, 0.0, 0.5,
    0.0, 0.0, 0.5, 0.5,
    0.0, 0.0, 0.0, 1.0
  )

  private lightCookieRT: THREE.WebGLRenderTarget | null = null

  private isDirty = false

  public setLight(directionalLight: THREE.DirectionalLight) {
    this.directionalLight = directionalLight
    this.isDirty = true
  }

  public setProxyObjects(windows: StandardMesh[], doors: StandardMesh[]) {
    this.windowsProxyObjects = windows
    this.doorsProxyObjects = doors
    this.isDirty = true
  }

  public getLightMatrix() {
    if (this.isDirty || !this.lightCookieRT) {
      this.refreshLightMap()
    }

    return this.lightMatrix
  }

  public getLightCookieMap() {
    if (this.isDirty || !this.lightCookieRT) {
      this.refreshLightMap()
    }

    return this.lightCookieRT?.texture
  }

  public dispose() {
    this.lightCookieRT?.texture.dispose()
    this.lightCookieRT?.dispose()
  }

  private alignLightCamera() {
    if (!this.directionalLight) {
      return
    }
    
    const target = this.directionalLight.target
    const lightCam = this.directionalLight.shadow.camera

    // Ensure shadow camera looks where the light points.
    const tmpTarget = new THREE.Vector3()
    target.updateMatrixWorld(true)
    this.directionalLight.updateMatrixWorld(true)
    lightCam.position.copy(this.directionalLight.position)
    target.getWorldPosition(tmpTarget)
    lightCam.up.set(0, 1, 0)
    lightCam.lookAt(tmpTarget)
    lightCam.updateMatrixWorld(true)
    lightCam.updateProjectionMatrix()
  }

  private refreshLightMap() {
    const threeRenderer = gvRenderLibrary()?.renderer
    const threeScene = gvCurrentScene()?.getObjectsScene()
    const lightCamera = this.directionalLight?.shadow.camera
    if (!threeRenderer || !threeScene || !lightCamera || !this.directionalLight) {
      return
    }

    const size = 1024
    if (!this.lightCookieRT) {
      this.lightCookieRT = DirectionalLightCookie.generateRenderTarget(size)
    }

    this.alignLightCamera()
    this.lightMatrix
      .copy(this.biasMatrix)
      .multiply(this.directionalLight.shadow.camera.projectionMatrix)
      .multiply(this.directionalLight.shadow.camera.matrixWorldInverse)

    const clr = threeRenderer.getClearColor(new THREE.Color())
    const alpha = threeRenderer.getClearAlpha()
    const target = threeRenderer.getRenderTarget()
    const material = threeScene.overrideMaterial
    const layers = lightCamera.layers.mask

    threeRenderer.setRenderTarget(this.lightCookieRT)
    threeRenderer.setClearColor(0x000000, 1)
    threeRenderer.clear(true, true, true)

    const wallsProxyObjects = [...this.windowsProxyObjects || [], ...this.doorsProxyObjects || []]
    wallsProxyObjects?.forEach(proxyObject => {
      proxyObject.layers.enable(LIGHT_COOKIE_LAYER)
      proxyObject.visible = true
  
      // Add a vertical offset to avoid jaggy shadows at glass doors lower edges.
      if (this.doorsProxyObjects?.includes(proxyObject)) {
        proxyObject.scale.y *= 1.05
      }
    })

    lightCamera.layers.set(LIGHT_COOKIE_LAYER)
    threeScene.overrideMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })

    threeRenderer.render(threeScene, lightCamera)

    wallsProxyObjects?.forEach(proxyObject => {
      proxyObject.layers.disable(LIGHT_COOKIE_LAYER)
      proxyObject.visible = false
      if (this.doorsProxyObjects?.includes(proxyObject)) {
        proxyObject.scale.y /= 1.05
      }
    })

    threeScene.overrideMaterial = material
    lightCamera.layers.mask = layers
    threeRenderer.setRenderTarget(target)
    threeRenderer.setClearColor(clr, alpha)

    this.isDirty = false
  }

  static generateRenderTarget(size: number) {
    const renderTarget = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false
    })
    renderTarget.texture.generateMipmaps = false
    renderTarget.texture.wrapS = THREE.ClampToEdgeWrapping
    renderTarget.texture.wrapT = THREE.ClampToEdgeWrapping
    renderTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;

    return renderTarget
  }
}

export default DirectionalLightCookie
