import * as THREE from 'three'

import CustomOutlinePass from 'Renderer/CustomOutlinePass'
import { ViewerSettings } from 'Renderer/geomviewer/geom_types'
import { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import { BaseRenderEngine } from 'Renderer/rendering/BaseRenderEngine'
import { ImageBasedScene } from 'Renderer/rendering/ImageBasedScene'
import * as constants from 'Renderer/constants'
import generateThumbnailFromPreview from 'utils/generateThumbnailFromPreview'
import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import LitShadowMaterial from 'Renderer/LitShadowMaterial'
import { BakedShadowPlane } from 'Renderer/ShadowBaker'
import type { GeomCamera } from 'Renderer/multiview/geom_camera'
import { gvCameraManager } from 'Renderer/foundation/geom_app'
import PropertyManager from 'Renderer/utils/property_manager'
import {
  ThumbnailGenerationResult,
  isFurnitureObject3D,
  isMeshStandardMaterial,
  isExtendedLight,
  isRugObject3D,
  isMesh,
  type StandardMesh,
} from './rendering_types'
import { isFurnitureItem3D } from './scene_utils'
import { setMaterialOnBeforeCompileCallback } from './rendering_utils'

export class ImageBasedRenderEngine extends BaseRenderEngine<ImageBasedScene> {
  private renderStackableSurfaces = true

  private aoAnalyticsLightsOnApplied = false
  private shadowIntensityApplied = false
  private interItemShadowsApplied = false
  private showEnvmapBackgroundApplied = false

  takeRoomScreenshot(onSuccess: (result: ThumbnailGenerationResult) => void,
    onError: (error: Error) => void): void {
      /*
        This function takes a high quality screenshot of the room with no composer effects
        If the current exact preview is needed; use the generateThumbnailFromPreview directly
      */

      // Set the renderer's state suitable for taking a screenshot
      const forceTAA = this.debugSettings.useTAAforScreenshots
      const currentAA = this.aaType
      this.enableOutline(false)
      this.setRenderStackableSurfaces(false)
      this.setAntiAliasing(forceTAA ? constants.AA_TAA : constants.AA_FXAA)

      // Hide magic eraser segments for clean screenshot
      const segmentsMesh = this.scene?.getSegmentationMesh()
      const wasSegmentsVisible = segmentsMesh?.visible ?? false
      if (segmentsMesh) {
        segmentsMesh.visible = false
      }

      this.scene?.onBeforeScreenshot()
      // Take screenshot and restore the earlier renderer state
      this.scheduleRenderCallback(
        () => {
          generateThumbnailFromPreview()
            .then(onSuccess)
            .catch(onError)
            .finally(() => {
              this.enableOutline(true)
              this.setRenderStackableSurfaces(true)
              if (currentAA) {
                this.setAntiAliasing(currentAA)
              }
              if (segmentsMesh) {
                segmentsMesh.visible = wasSegmentsVisible
              }
              this.scene?.onAfterScreenshot()
            })
        },
        forceTAA ? 32 : 0,
    )
  }

  setScene(scene: ImageBasedScene) {
    if (this.scene) {
      this.scene.onDeactivate()
    }
    this.scene = scene
    this.scene.onActivate()

    // Update passes that depend on curent scene.
    const sceneFront = this.scene?.getSceneFront()
    const sceneOcclusion = this.scene?.getSceneOcclusion()
    this.hoveredOutlinePass?.setScene(sceneFront, sceneOcclusion)
    this.selectedOutlinePass?.setScene(sceneFront, sceneOcclusion)
    this.aoPass?.setOcclusionScene(sceneFront, sceneOcclusion)

    this.setDirty()
  }

  getScene() {
    return this.scene
  }

  setGeomCamera(cam: GeomCamera) {
    super.setGeomCamera(cam)
    const threeCam = cam?.getThreeCamera()
    if (threeCam && this.scene) {
      this.scene.setupCamera(threeCam)
    }
  }

  changeViewerSettings(settings: ViewerSettings): void {
    if (settings) {
      this.settings = {
        ...settings,
      }
    }
    if (this.settings.onOffOptions.disableOutline) {
      this.enableOutline(false)
    }
    if (this.scene) {
      this.scene.setCompositeBackgroundAAEnabled(settings.featureFlags.useWallColorAntialias as boolean)
    }
    if (this.hasRendered) {
      this.setDirty()
    }
  }

  public override renderColorIds() {
    if (!this.scene || !this.threeRenderer) {
      return
    }
    const objectsScene = this.scene.getObjectsScene()
    const threeCamera = this.getCamera()
    const sceneOcclusion = this.scene.getSceneOcclusion()
    if (!objectsScene || !sceneOcclusion) {
      return
    }

    const furnitureColorIdMeshes: StandardMesh[] = []
    const occlusionMeshes: THREE.Mesh<THREE.BufferGeometry, THREE.Material>[] = []
    objectsScene.traverse((object) => {
      if (isMesh(object) && object.userData.isColorIdMesh) {
        furnitureColorIdMeshes.push(object)
      }
    })
    sceneOcclusion.traverse((object) => {
      if (isMesh(object)) {
        occlusionMeshes.push(object)
      }
    })

    const prevLayers = threeCamera.layers.mask
    threeCamera.layers.set(constants.COLOR_ID_SUBOBJECT_LAYER)
    const propertyManager = new PropertyManager()

    // PASS 1
    occlusionMeshes.forEach((mesh) => {
      propertyManager.applyPropertyChange(mesh.material, `colorWrite`, false)
      propertyManager.applyPropertyChange(mesh.material, `depthWrite`, true)

      propertyManager.applyPropertyChange(mesh.material, `stencilWrite`, true)
      propertyManager.applyPropertyChange(mesh.material, `stencilRef`, 1)
      propertyManager.applyPropertyChange(mesh.material, `stencilFunc`, THREE.AlwaysStencilFunc)
      propertyManager.applyPropertyChange(mesh.material, `stencilFail`, THREE.KeepStencilOp)
      propertyManager.applyPropertyChange(mesh.material, `stencilZFail`, THREE.KeepStencilOp)
      propertyManager.applyPropertyChange(mesh.material, `stencilZPass`, THREE.ReplaceStencilOp)
    })
    threeCamera.layers.mask = prevLayers
    this.threeRenderer.render(sceneOcclusion, threeCamera)
    threeCamera.layers.set(constants.COLOR_ID_SUBOBJECT_LAYER)
    furnitureColorIdMeshes.forEach((furnitureObject) => {
      propertyManager.applyPropertyChange(furnitureObject.material, `colorWrite`, false)
      propertyManager.applyPropertyChange(furnitureObject.material, `depthWrite`, true)

      propertyManager.applyPropertyChange(furnitureObject.material, `stencilWrite`, true)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilRef`, 0)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilFunc`, THREE.AlwaysStencilFunc)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilFail`, THREE.KeepStencilOp)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilZFail`, THREE.KeepStencilOp)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilZPass`, THREE.ReplaceStencilOp)
    })
    this.threeRenderer.render(objectsScene, threeCamera)

    // PASS 2
    furnitureColorIdMeshes.forEach((furnitureObject) => {
      propertyManager.applyPropertyChange(furnitureObject.material, `colorWrite`, true)
      propertyManager.applyPropertyChange(furnitureObject.material, `depthWrite`, false)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilWrite`, false)
      propertyManager.applyPropertyChange(furnitureObject.material, `depthFunc`, THREE.EqualDepth)
    })
    this.threeRenderer.render(objectsScene, threeCamera)

    furnitureColorIdMeshes.forEach((furnitureObject) => {
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilWrite`, true)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilRef`, 1)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilFunc`, THREE.EqualStencilFunc)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilFail`, THREE.KeepStencilOp)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilZFail`, THREE.KeepStencilOp)
      propertyManager.applyPropertyChange(furnitureObject.material, `stencilZPass`, THREE.KeepStencilOp)

      propertyManager.applyPropertyChange(furnitureObject.material, `colorWrite`, true)
      propertyManager.applyPropertyChange(furnitureObject.material, `depthWrite`, false)
      propertyManager.applyPropertyChange(furnitureObject.material, `depthFunc`, THREE.GreaterDepth)

      if (furnitureObject.material instanceof THREE.ShaderMaterial) {
        furnitureObject.material.uniforms.diffuse.value.r = 1.0
      }
    })
    this.threeRenderer.render(objectsScene, threeCamera)

    furnitureColorIdMeshes.forEach((furnitureObject) => {
        furnitureObject.layers.enable(constants.COLOR_ID_SUBOBJECT_LAYER)
        if (furnitureObject.material instanceof THREE.ShaderMaterial) {
            furnitureObject.material.uniforms.diffuse.value.copy(furnitureObject.userData.colorIdColor)
        }
    })
    propertyManager.revertChanges()
    threeCamera.layers.mask = prevLayers
  }

  override changeDebugSettings(settings: DebugSettings): void {
    const prevSettings = {
      ...this.debugSettings
    }

    super.changeDebugSettings(settings)

    this.setXRaySettings(this.debugSettings.enableXRay)

    if (!this.aoAnalyticsLightsOnApplied ||
      prevSettings.analyticLightsContribution !== this.debugSettings.analyticLightsContribution) {
      this.aoAnalyticsLightsOnApplied = this.setAnalyticLightsOn(this.debugSettings.analyticLightsContribution)
    }
    if(!this.shadowIntensityApplied ||
      prevSettings.wallFurnitureShadowIntensity !== this.debugSettings.wallFurnitureShadowIntensity) {
      this.shadowIntensityApplied = this.setWallShadowIntensity(this.debugSettings.wallFurnitureShadowIntensity)
    }
    if(!this.interItemShadowsApplied ||
      prevSettings.interItemShadows !== this.debugSettings.interItemShadows) {
      this.interItemShadowsApplied = this.setInterItemShadowsEnabled(this.debugSettings.interItemShadows)
    }
    if (!this.showEnvmapBackgroundApplied ||
      prevSettings.environmentVizBackground !== this.debugSettings.environmentVizBackground) {
      this.showEnvmapBackgroundApplied = this.setEnvmapBackgroundVisible(this.debugSettings.environmentVizBackground)
    }
    if (this.scene) {
      this.scene.setDebugSettings(settings)

      this.scene.setPlanePolygonsDebugObjVisible(this.debugSettings.geometryViz)
      this.scene.setVanishingLinesVisible(this.debugSettings.linesViz)
      this.scene.setDepthVisible(this.debugSettings.depthViz)
      this.scene.setDebugNormalsSegmentationMeshVisible(this.debugSettings.nsViz)
      this.scene.setDebugSemanticSegmentationMeshVisible(this.debugSettings.ssViz)
      this.scene.setFloorShadowPlaneVisibility(
        this.debugSettings.disableDollhouseShadows,
        this.debugSettings.disableSceneOcclusion,
      )
      this.scene.setFrontSideShadows(this.debugSettings.frontSideShadows)
      this.scene.applyPlaceableHintDebugSettings(this.debugSettings.placeableHintAlwaysVisible,
        this.debugSettings.placeableHintPlaneGap, this.debugSettings.placeableHintFurnitureGap)
      this.scene.applyBlockingItemsHidingDebugSettings(this.debugSettings.blockingItemsRaycastCheck,
        this.debugSettings.blockingItemsRaycastDistance, this.debugSettings.blockingItemsWallFacingCheck,
        this.debugSettings.blockingItemsWallFacingCheckInDollhouse)
      this.scene.setPositioningHelperActive(!!this.debugSettings.enablePositioningHelper)
      this.scene.updatePositioningHelper(!!this.debugSettings.posHelperOnFloor, !!this.debugSettings.posHelperOnWall,
        !!this.debugSettings.posHelperOnWallFloorEdge, this.debugSettings.posHelperSizeX || 0.5,
        this.debugSettings.posHelperSizeY || 0.5, this.debugSettings.posHelperSizeZ || 0.5)
    }

    if (this.scene) {
      this.scene.refreshStackableStaticProperties()
    }
    if (this.hasRendered) {
        this.setDirty()
    }
  }

  protected renderScene(): void {
    if (!this.threeRenderer || !this.getCamera() || !this.scene) {
      return
    }

    const visibleStackableSurfaces = this.scene.getVisibleStackableSurfaces()

    // At first glance it might seem like what we want is
    // `s.visible = false,` but we cannot do that because the
    // semantics of Three.JS make children invisible as
    // well. Setting opacity to 0 gets us what we need, the
    // surface becomes invisible but its children still
    // render.
    const originalOpacities = new Map()

    if (!this.renderStackableSurfaces) {
      visibleStackableSurfaces.forEach((s) => {
        if ('opacity' in s.material) {
          originalOpacities.set(s, s.material.opacity)
          // eslint-disable-next-line no-param-reassign
          s.material.opacity = 0
        }
      })
    }

    const sceneFront = this.scene.getSceneFront()
    const sceneBack = this.scene.getSceneBack()
    const sceneOcclusion = this.scene.getSceneOcclusion()

    const rendersCount = this.debugSettings.imitateLowPerformance ? 25 : 1
    for (let i = 0; i < rendersCount; i += 1) {
      this.threeRenderer.clear(true, true, true)
      if (sceneBack && sceneBack.visible) {
        // Disable tone mapping for the background composite scene
        const currentToneMapping = this.threeRenderer.toneMapping
        this.threeRenderer.toneMapping = THREE.NoToneMapping
        this.threeRenderer.render(sceneBack, this.getCamera())
        this.threeRenderer.toneMapping = currentToneMapping
      }
      this.threeRenderer.clearDepth()
      if (!this.settings.onOffOptions.magicEraserMode) {
        this.renderFootprints()
        if (sceneFront && this.scene.getHasRugs() && this.debugSettings.useFloorContactShadows) {
          // Rugs contact shadows require a custom render call to project
          // all the items ontop of the rugs onto a separate render target.
          this.prepareRugsContactShadowsFrameRender()
          const origRenderTarget = this.threeRenderer.getRenderTarget()
          this.threeRenderer.setRenderTarget(this.contactShadowTexRenderTarget)
          this.threeRenderer.clear(true, true, true)
          this.threeRenderer.render(sceneFront, this.contactShadowCamera)
          this.threeRenderer.setRenderTarget(origRenderTarget)
          this.revertContactShadowsCustomPreparations()
        }
      }
      if (sceneOcclusion && sceneOcclusion.visible && !this.debugSettings?.disableSceneOcclusion) {
        this.threeRenderer.render(sceneOcclusion, this.getCamera())
      }
      if (sceneFront && this.scene.getHasWallAnchored() && !this.settings.onOffOptions.magicEraserMode) {
        // Wall placeables are split into a separate Threejs render layer for customized shadow
        // interaction with the surfaces/floor.
        this.getCamera().layers.set(constants.WALL_PLACEABLE_LAYER)
        this.threeRenderer.render(sceneFront, this.getCamera())
        this.getCamera().layers.set(constants.DEFAULT_THREE_NATIVE_LAYER)
      }
      if (sceneFront && !this.settings.onOffOptions.magicEraserMode) {
        this.getCamera().layers.set(constants.DEFAULT_THREE_NATIVE_LAYER)
        this.threeRenderer.render(sceneFront, this.getCamera())
      }
      if (sceneFront && this.scene.getHasStaticStackableSurfaces() 
        && !this.settings.onOffOptions.magicEraserMode) {
        // Static surfaces stackables are split into a separate Threejs render layer for customized
        // shadow interaction with the surfaces/floor. Note the render order required for transparency.
        this.getCamera().layers.set(constants.STATIC_STACKABLES_THREE_NATIVE_LAYER)
        this.threeRenderer.render(sceneFront, this.getCamera())
        this.getCamera().layers.set(constants.DEFAULT_THREE_NATIVE_LAYER)
      }
      if (this.debugSettings.showShadowMap) {
        this.scene.getShadowMapDebugObj()?.render(this.threeRenderer)
      }
      if (this.debugSettings.environmentViz) {
        this.scene.getEnvMapViewer()?.render(this.threeRenderer)
      }
      if (this.debugSettings.geometryViz) {
        const polygonsDebugObj = this.scene.getPlanePolygonsDebugObj()
        if (polygonsDebugObj) {
          this.threeRenderer.clear(false, true, false)
          this.threeRenderer.render(polygonsDebugObj, this.getCamera())  
        }
      }
    }

    if (!this.renderStackableSurfaces) {
        visibleStackableSurfaces.forEach((s) => {
          if ('opacity' in s.material) {
            // eslint-disable-next-line no-param-reassign
            s.material.opacity = originalOpacities.get(s)
          }
        })
    }

    this.threeRenderer.getContext().flush()
    this.threeRenderer.getContext().finish()
  }

  protected createOutlinePass(): CustomOutlinePass {
    const sceneFront = this.scene?.getSceneFront()
    const sceneOcclusion = this.scene?.getSceneOcclusion()

    return new CustomOutlinePass(
      new THREE.Vector2(this.width, this.height),
      sceneFront,
      this.getCamera(),
      [],
      sceneOcclusion,
    )
  }

  private setRenderStackableSurfaces(enable: boolean) {
    this.renderStackableSurfaces = enable
  }

  private renderFootprints() {
    const sceneFront = this.scene?.getSceneFront()
    const footprintMaterial = this.scene?.getFootprintMaterial()
    if (!sceneFront || !footprintMaterial) {
      return
    }

    const prevOverrideMtl = sceneFront.overrideMaterial
    sceneFront.overrideMaterial = footprintMaterial
    sceneFront.children.forEach((child) => {
      if ((isFurnitureObject3D(child) || child instanceof BakedShadowPlane) && !isRugObject3D(child)) {
          child.traverse((furnitureChild) => {
              if (furnitureChild instanceof BakedShadowPlane) {
                furnitureChild.toggleVisibilityOff()
              }
          })
        } else {
            child.userData.wasVisible = child.visible
            child.visible = false
        }
    })

    this.threeRenderer?.render(sceneFront, this.getCamera())

    sceneFront.overrideMaterial = prevOverrideMtl
    sceneFront.children.forEach((child) => {
        if (!isFurnitureObject3D(child) || isRugObject3D(child)) {
            child.visible = child.userData.wasVisible
        }
        child.traverse(sceneChild => {
          if (sceneChild instanceof BakedShadowPlane) {
            sceneChild.toggleVisibilityOn();
          }
        })
    })
  }

  protected switchLUTtoneMapping(useFilmicLUT: boolean): boolean {
    const baseApplied = super.switchLUTtoneMapping(useFilmicLUT)

    let thisApplied = false
    const sceneFront = this.scene?.getSceneFront()
    if (sceneFront) {
      sceneFront.traverse((obj) => {
        if (obj instanceof THREE.Mesh && isMeshStandardMaterial(obj.material as THREE.Material)
          && !(obj.material instanceof LitShadowMaterial)) {
            const currentMaterial = obj.material as THREE.MeshStandardMaterial
            // eslint-disable-next-line no-param-reassign
            obj.material = (useFilmicLUT ? new CustomStandardMaterial() : new THREE.MeshStandardMaterial()).copy(
                currentMaterial,
            )
            if(!useFilmicLUT) {
              setMaterialOnBeforeCompileCallback(
                obj.material,
                ( shader: { fragmentShader: string } ) => {
                  // eslint-disable-next-line no-param-reassign
                  shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <dithering_fragment>`,
                    `#include <dithering_fragment>
                    
                    gl_FragColor = LinearTosRGB( gl_FragColor );
                  
                    `
                  )
                }
              )
            }
            currentMaterial.dispose()
          }
      })
      thisApplied = true
    }

    return baseApplied && thisApplied
  }

  protected setXRaySettings(enableXRay = false) {
    const sceneFront = this.scene?.getSceneFront()
    if (sceneFront) {
      sceneFront.traverse((obj) => {
        if (obj instanceof THREE.Mesh && isMeshStandardMaterial(obj.material as THREE.ShaderMaterial)) {
            const currentMaterial = obj.material
            if (currentMaterial.uniforms?.enableXRay){
              currentMaterial.uniforms.enableXRay.value = enableXRay
            }
        }
      })
    }
  }

  private setAnalyticLightsOn(enable: boolean) {
    const sceneFront = this.scene?.getSceneFront()
    if (!sceneFront) {
      return false
    }
    sceneFront.traverse((child) => {
      if (isExtendedLight(child)) {
          // eslint-disable-next-line no-param-reassign
          child.color = enable ? child.originalColor : new THREE.Color(0.0, 0.0, 0.0)
        }
    })
    return true
  }

  private setWallShadowIntensity(wallShadowIntensity: number) {
    const renderItems = this.scene?.getRenderItems()
    if (renderItems) {
      Array.from(renderItems)
        .forEach((renderItem) => {
          if (isFurnitureItem3D(renderItem)) {
            const contactShadowPlanes = renderItem.getContactShadowPlanes()
            if (contactShadowPlanes?.backward) {
              (<THREE.Material>contactShadowPlanes.backward.material).opacity = wallShadowIntensity
            }
          }
        })
      return true
    }
    return false
  }

  private setInterItemShadowsEnabled(enabled: boolean) {
    const renderItems = this.scene?.getRenderItems()
    if (!renderItems) {
      return false
    }

    Array.from(renderItems).forEach((item) => {
      if (isFurnitureItem3D(item)) {
        const renderObject = item.getObject()
        if (renderObject) {
          renderObject.traverse(obj => { obj.receiveShadow = enabled })
        }
      }
    })
    return true
  }

  // eslint-disable-next-line class-methods-use-this
  private setEnvmapBackgroundVisible(enabled: boolean) {
    return !!gvCameraManager()?.setCameraMode({ mode: enabled ? `orbit` : `default` })
  }
}
