import * as THREE from 'three'
import { isMesh } from './rendering_types'

/**
 * Patches a WebGLRenderer to preserve pre-r160 render-target behaviour.
 *
 * In r160, rendering to a WebGLRenderTarget forces toneMapping = NoToneMapping
 * and outputColorSpace = LinearSRGBColorSpace.  Our custom materials
 * (CustomStandardMaterial / LitShadowMaterial) manage tone mapping themselves,
 * so we need tone mapping to stay active.  At the same time we want
 * colorspace_fragment to remain a no-op for RT renders (as it was in r154) so
 * that materials which already output sRGB (via the outputSRGB uniform or
 * manual LinearTosRGB injections) are not double-gamma'd.
 *
 * The approach:
 *   1. Mark every render target as an XR target (isXRRenderTarget) so Three.js
 *      skips both overrides — this preserves tone mapping.
 *   2. In the patched render(), temporarily set the RT's texture.colorSpace to
 *      LinearSRGBColorSpace for the duration of the draw call.  For XR render
 *      targets Three.js reads the color space from the RT texture (not from
 *      renderer.outputColorSpace), so this is what actually controls
 *      colorspace_fragment.  Setting it to linear makes colorspace_fragment a
 *      no-op, matching the r154 behaviour exactly.
 *
 * We tried a custom OutputPass instead of this approach, but the interaction
 * with GTAO, pano-based room compositing, and ground shadow overlay makes a
 * separate output pass overly complex with significant overhead.
 *
 * This workaround can be removed if Three.js lands an official opt-in API for
 * output transforms on render targets:
 * https://github.com/mrdoob/three.js/issues/29429
 */
export function patchRendererForRenderTargets(renderer: THREE.WebGLRenderer | THREE.WebGL1Renderer) {
    // --- setRenderTarget patch: mark all RTs as XR to preserve tone mapping ---
    const origSetRenderTarget = renderer.setRenderTarget.bind(renderer) as (
        target: THREE.WebGLRenderTarget | null,
        ...rest: unknown[]
    ) => void

    renderer.setRenderTarget = function patchedSetRenderTarget(
        target: THREE.WebGLRenderTarget | null,
        ...rest: unknown[]
    ) {
        if (target) {
            const rt = target as THREE.WebGLRenderTarget & { isXRRenderTarget?: boolean }
            if (!rt.isXRRenderTarget) {
                rt.isXRRenderTarget = true
                rt.texture.colorSpace = rt.texture.colorSpace || THREE.LinearSRGBColorSpace
            }
        }
        return origSetRenderTarget(target, ...rest)
    } as typeof renderer.setRenderTarget


    // --- render patch: force LinearSRGBColorSpace on the RT texture ---
    // For XR render targets, Three.js determines the colorspace_fragment
    // behaviour from _currentRenderTarget.texture.colorSpace (not from
    // renderer.outputColorSpace).  We temporarily set the RT texture to
    // LinearSRGBColorSpace so colorspace_fragment is a no-op during the draw,
    // then restore the original value so downstream reads interpret the data
    // correctly.
    const origRender = renderer.render.bind(renderer) as (
        scene: THREE.Object3D,
        camera: THREE.Camera,
    ) => void

    renderer.render = function patchedRender(
        scene: THREE.Object3D,
        camera: THREE.Camera,
    ) {
        const rt = renderer.getRenderTarget()
        if (rt) {
            const savedColorSpace = rt.texture.colorSpace
            rt.texture.colorSpace = THREE.LinearSRGBColorSpace
            origRender(scene, camera)
            rt.texture.colorSpace = savedColorSpace
        } else {
            origRender(scene, camera)
        }
    } as typeof renderer.render

}

/**
 * Check if Object3D is visible in the hierarchy.
 * @param obj Object to check.
 * @returns {boolean} True if the object exists and is actually visible in the scene hierarchy, i.e.
 * the object itself is visible as well as all its parents. False otherwise, i.e. obj is null,
 * or is invisible, or some of its parents is invisible.
 */
export const isObjectVisible = (obj: THREE.Object3D | undefined): boolean => {
    if (!obj) {
      return false
    }

    let objectIsVisible = obj.visible
    if (isMesh(obj) && !Array.isArray(obj.material)) {
      objectIsVisible &&= obj.material.colorWrite 
    }

    if (objectIsVisible && obj.parent) {
      return isObjectVisible(obj.parent)
    }
    return objectIsVisible
}

/**
 * Check if Object3D is already in the scene, either directly, or via one of its parents.
 * @param obj Object to check.
 * @param scene Scene to search in.
 * @returns {boolean} True if the object is already in the scene, false otherwise.
 */
export const isObjectInScene = (obj: THREE.Object3D, scene: THREE.Scene): boolean => {
    let inTheScene = false
    obj.traverseAncestors((parent: THREE.Object3D) => {
        if (parent === scene) {
            inTheScene = true
        }
    })
    return inTheScene
}

export const isObjectNoninteractable = (obj: THREE.Object3D | undefined): boolean => {
    if (!obj) {
        return false
    }
    if (!!obj.userData.isNoninteractable && obj.parent) {
        return isObjectNoninteractable(obj.parent)
    }
    return !!obj.userData.isNoninteractable
}

export const disposeMeshes = (obj: THREE.Object3D | null) => {
  if (!obj) {
    return
  }

  obj.traverse((mesh) => {
    if (!(mesh instanceof THREE.Mesh)) {
      return
    }

    if (mesh.geometry) {
      mesh.geometry.dispose()
    }

    if (mesh.material instanceof THREE.Material) {
      mesh.material.dispose()
    }

    if (Array.isArray(mesh.material)) {
      for (let i = 0; i < mesh.material.length; i += 1){
        mesh.material[i].dispose()
      }
    }
  })
}

// Helper function to set onBeforeCompile() callback to threejs material.
// Note that by default customProgramCacheKey() is set to onBeforeCompile.toString()
// so we need to be careful to not make unnecessary shader variants.
// If material.onBeforeCompile() doesn't modify shader source we should
// redefine material.customProgramCacheKey() to avoid unnecessary shader compilations.
export const setMaterialOnBeforeCompileCallback = (material: THREE.Material,
                                                   onBeforeCompile: THREE.Material["onBeforeCompile"]) => {
  material.onBeforeCompile = onBeforeCompile

  const onBeforeCompileString = onBeforeCompile.toString()
  if (!onBeforeCompileString.includes(".fragmentShader") &&
      !onBeforeCompileString.includes(".vertexShader")) {
    material.customProgramCacheKey = () => ""
  }
}

// Helper class for tracking and disposing render targets based on their internal textures
export class RenderTargetHandler {
  private renderTargets = new Map()

  constructor() {
    this.disposeCallback = this.disposeCallback.bind(this)
  }

  disposeCallback( event: THREE.Event & { type: "dispose"; target: THREE.Texture } ) {
    const texture = event.target
    const renderTarget = this.renderTargets.get(texture.uuid)
    if (renderTarget) {
      this.renderTargets.delete(texture.uuid)
      renderTarget.dispose()
    }
    texture.removeEventListener('dispose', this.disposeCallback)
  }

  public addRenderTarget(renderTarget: THREE.WebGLRenderTarget) {
    renderTarget.texture.addEventListener('dispose', this.disposeCallback)
    this.renderTargets.set(renderTarget.texture.uuid, renderTarget)
  }
}

export class DefaultAssetManager {
  private static whiteTexture: THREE.DataTexture | null = null
  private static defaultNormalMap: THREE.DataTexture | null = null

  static getWhiteTexture() {
    if (!DefaultAssetManager.whiteTexture) {
      // Create default 1x1 white texture
      DefaultAssetManager.whiteTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
      DefaultAssetManager.whiteTexture.needsUpdate = true;
    }

    return DefaultAssetManager.whiteTexture
  }

  static getDefaultNormalMap() {
    if (!DefaultAssetManager.defaultNormalMap) {
      // Create default normal map texture.
      // Normal map vector components are stored in [0 -> 1] range and are transformed to [-1 -> 1]
      // in the fragment shader. Here we want to set a default normal vector {0, 0, 1} and because of
      // this transform it maps to {0.5, 0.5, 1.0} which becomes {127, 127, 255} in uint8.
      DefaultAssetManager.defaultNormalMap = new THREE.DataTexture(new Uint8Array([127, 127, 255, 255]), 1, 1);
      DefaultAssetManager.defaultNormalMap.wrapS = THREE.RepeatWrapping
      DefaultAssetManager.defaultNormalMap.wrapT = THREE.RepeatWrapping
      DefaultAssetManager.defaultNormalMap.needsUpdate = true;
    }

    return DefaultAssetManager.defaultNormalMap
  }

  static cleanup() {
    DefaultAssetManager.whiteTexture?.dispose()
    DefaultAssetManager.whiteTexture = null

    DefaultAssetManager.defaultNormalMap?.dispose()
    DefaultAssetManager.defaultNormalMap = null
  }
}
