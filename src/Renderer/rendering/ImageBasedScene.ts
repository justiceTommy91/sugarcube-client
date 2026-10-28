/* eslint-disable class-methods-use-this */

import * as THREE from 'three'

import { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'
import type CompositeBackground from 'Renderer/CompositeBackground'
import { NOTIFY_VIEWER_STATE_UPDATE } from 'Renderer/geomviewer/geom_constants'
import type { ColorRepresentation } from 'Renderer/geomviewer/geom_types'
import { gvViewManager } from 'Renderer/foundation/geom_app'
import { GrandCentral } from 'Renderer/GrandCentral'
import { NotificationInfo, ViewerStateUpdateNotification } from 'Renderer/geomviewer/geom_notifications'
import FootprintMaterial from 'Renderer/FootprintMaterial'
import {
  wattsToLumens,
  LIGHT_DIRECTIONAL,
  LIGHT_POINT,
  LIGHT_SPOT,
  LIGHT_AREA
} from 'utils/lightUtils'

import { InitialPosInfo } from 'Renderer/positioning/positioning_types'
import { FloorPlacer } from 'Renderer/FloorPlacer'
import { RenderItem3D } from 'Renderer/model/RenderItem3D'
import { disposeMeshes } from './rendering_utils'
import { isShaderMaterial } from './rendering_types'

export abstract class ImageBasedScene extends GeomBaseScene {
  private sceneFront: THREE.Scene | null = null
  private sceneBack: THREE.Scene | null = null
  private sceneOcclusion: THREE.Scene | null = null

  private compositeBackground: CompositeBackground | null = null
  private compositeBackgroundInpaint: CompositeBackground | null = null
  private backgroundInpaintMesh: THREE.Mesh | null = null
  private occlusionMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial | THREE.MeshBasicMaterial> | null = null
  private occlusionInpaintMesh: THREE.Mesh | null = null
  private segmentationMesh: THREE.Mesh | null = null
  private shadowPlane: THREE.Mesh | null = null
  private footprintMaterial: FootprintMaterial | null = null

  private vanishingLinesDebugObjects: THREE.Object3D[] = []
  private debugNormalsSegmentationMesh: THREE.Mesh | null = null
  private debugSemanticSegmentationMesh: THREE.Mesh | null = null
  private planePolygonsDebugObj: THREE.Group | null = null
  private texturedPolygonsObj: THREE.Group | null = null
  private placeHighlightMesh: THREE.Mesh | null = null

  // Empty objects that represent camera transform for this scene, also, they are used as parent objects for all
  // "Fullscreen quad" meshes in the back and occlusion scene respectively, e.g. pano background, occlusion mesh, etc.
  private rootNodeBackground: THREE.Group = new THREE.Group()
  private rootNodeOcclusion: THREE.Group = new THREE.Group()

  protected floorPlacer: FloorPlacer | null = null

  constructor() {
    super()
    this.rootNodeBackground.matrixAutoUpdate = false
    this.rootNodeOcclusion.matrixAutoUpdate = false
    this.onCameraStateChange = this.onCameraStateChange.bind(this)
  }

  onItemLoadedAndPositioned(renderItemId: string) {
    const renderItem = this.getRenderItem(renderItemId)
    const isMultiview = gvViewManager()?.isMultiview()
    if (renderItem && isMultiview && this.isItemShouldBeHidden(renderItem)) {
      this.hideViewBlockingItem(renderItem)
    }
  }

  override insertRenderItems(renderItems: RenderItem3D[], hideViewBlockingItems: boolean): void {
    super.insertRenderItems(renderItems, hideViewBlockingItems)
    this.refreshViewBlockingItemsVisibility(hideViewBlockingItems)
  }

  dispose() {
    this.compositeBackground?.dispose()
    this.compositeBackgroundInpaint?.dispose()

    disposeMeshes(this.sceneBack)
    disposeMeshes(this.sceneFront)
    disposeMeshes(this.sceneOcclusion)

    disposeMeshes(this.planePolygonsDebugObj)
    disposeMeshes(this.texturedPolygonsObj)

    this.sceneFront = null
    this.sceneBack = null
    this.sceneOcclusion = null
    this.compositeBackground = null
    this.compositeBackgroundInpaint = null
    this.backgroundInpaintMesh = null
    this.occlusionMesh = null
    this.occlusionInpaintMesh = null
    this.segmentationMesh = null
    this.shadowPlane = null
    this.vanishingLinesDebugObjects = []
    this.debugNormalsSegmentationMesh = null
    this.debugSemanticSegmentationMesh = null
    this.planePolygonsDebugObj = null
    this.footprintMaterial = null
    this.texturedPolygonsObj = null
    this.shadowMapDebugObj = null
    this.placeHighlightMesh = null
    this.floorPlacer = null
    this.rootNodeBackground = new THREE.Group()
    this.rootNodeOcclusion = new THREE.Group()

    super.dispose()
  }

  setSceneBack(scene: THREE.Scene) {
    this.sceneBack = scene
    this.sceneBack.add(this.rootNodeBackground)
  }

  getSceneBack() {
    return this.sceneBack
  }

  getCameraNode() {
    return this.rootNodeBackground
  }

  setSceneFront(scene: THREE.Scene) {
    this.sceneFront = scene
  }

  getSceneFront() {
    return this.sceneFront
  }

  getObjectsScene() {
    return this.getSceneFront()
  }

  setSceneOcclusion(scene: THREE.Scene) {
    this.sceneOcclusion = scene
    this.sceneOcclusion.add(this.rootNodeOcclusion)
  }

  getSceneOcclusion() {
    return this.sceneOcclusion
  }

  setOcclusionMesh(mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial | THREE.MeshBasicMaterial>) {
    if (this.occlusionMesh) {
      this.rootNodeOcclusion?.remove(this.occlusionMesh)
      disposeMeshes(this.occlusionMesh)
      this.occlusionMesh = null
    }
    this.occlusionMesh = mesh
    this.addToOcclusionRoot(mesh)
  }

  setPanoBackgroundMesh(mesh: THREE.Mesh) {
    this.addToBackgroundRoot((mesh))
  }

  getOcclusionMesh() {
    return this.occlusionMesh
  }

  setOcclusionInpaintMesh(mesh: THREE.Mesh) {
    if (this.occlusionInpaintMesh) {
      this.rootNodeOcclusion?.remove(this.occlusionInpaintMesh)
      disposeMeshes(this.occlusionInpaintMesh)
      this.occlusionInpaintMesh = null
    }
    this.occlusionInpaintMesh = mesh
    this.addToOcclusionRoot(mesh)
  }

  getOcclusionInpaintMesh() {
    return this.occlusionInpaintMesh
  }

  setBackgroundInpaintMesh(mesh: THREE.Mesh) {
    if (this.backgroundInpaintMesh) {
      this.rootNodeBackground.remove(this.backgroundInpaintMesh)
      disposeMeshes(this.backgroundInpaintMesh)
      this.backgroundInpaintMesh = null
    }
    this.backgroundInpaintMesh = mesh
    this.addToBackgroundRoot(mesh)
  }

  getBackgroundInpaintMesh() {
    return this.backgroundInpaintMesh
  }

  setSegmentationMesh(mesh: THREE.Mesh) {
    if (this.segmentationMesh) {
      this.rootNodeBackground.remove(this.segmentationMesh)
      disposeMeshes(this.segmentationMesh)
      this.segmentationMesh = null
    }
    this.segmentationMesh = mesh
    this.addToBackgroundRoot(mesh)
  }

  getSegmentationMesh() {
    return this.segmentationMesh
  }

  setPlaceHighlightMesh(mesh: THREE.Mesh) {
    if (this.placeHighlightMesh) {
      this.rootNodeBackground.remove(this.placeHighlightMesh)
      disposeMeshes(this.segmentationMesh)
      this.placeHighlightMesh = null
    }
    this.placeHighlightMesh = mesh
    this.addToBackgroundRoot(mesh)
  }

  getPlaceHighlightMesh() {
    return this.placeHighlightMesh
  }

  setFootprintMaterial(footprintMaterial: FootprintMaterial) {
    this.footprintMaterial = footprintMaterial
  }

  getFootprintMaterial() {
    return this.footprintMaterial
  }

  setShadowPlane(mesh: THREE.Mesh) {
    if (this.shadowPlane) {
      this.sceneFront?.remove(this.shadowPlane)
      disposeMeshes(this.shadowPlane)
      this.shadowPlane = null
    }
    this.shadowPlane = mesh
    this.sceneFront?.add(mesh)
  }

  getShadowPlane() {
    return this.shadowPlane
  }

  setDebugNormalsSegmentationMesh(mesh: THREE.Mesh) {
    if (this.debugNormalsSegmentationMesh) {
      this.rootNodeBackground.remove(this.debugNormalsSegmentationMesh)
      disposeMeshes(this.debugNormalsSegmentationMesh)
      this.debugNormalsSegmentationMesh = null
    }
    this.debugNormalsSegmentationMesh = mesh
    this.addToBackgroundRoot(mesh)
  }

  setDebugSemanticSegmentationMesh(mesh: THREE.Mesh) {
    if (this.debugSemanticSegmentationMesh) {
      this.rootNodeBackground.remove(this.debugSemanticSegmentationMesh)
      disposeMeshes(this.debugSemanticSegmentationMesh)
      this.debugSemanticSegmentationMesh = null
    }
    this.debugSemanticSegmentationMesh = mesh
    this.addToBackgroundRoot(mesh)
  }

  setVanishingLinesDebugObj(objects: THREE.Object3D[]) {
    this.vanishingLinesDebugObjects.forEach((obj) => {
      this.rootNodeBackground.remove(obj)
    })
    this.vanishingLinesDebugObjects.length = 0
    objects.forEach((obj) => {
      this.rootNodeBackground.add(obj)
      this.vanishingLinesDebugObjects.push(obj)
    })
  }

  setPlanePolygonsDebugObj(object: THREE.Group) {
    this.planePolygonsDebugObj = object
  }

  getPlanePolygonsDebugObj() {
    return this.planePolygonsDebugObj
  }

  setTexturedPolygonsObj(object: THREE.Group) {
    this.texturedPolygonsObj = object
    this.sceneFront?.add(this.texturedPolygonsObj)
    this.refreshStaticBackgroundVisibility()
  }

  getTexturedPolygonsObj() {
    return this.texturedPolygonsObj
  }

  setCompositeBackground(background: CompositeBackground) {
    this.compositeBackground = background
  }

  getCompositeBackground() {
    return this.compositeBackground
  }

  setCompositeBackgroundInpaint(background: CompositeBackground) {
    this.compositeBackgroundInpaint = background
  }

  getCompositeBackgroundInpaint() {
    return this.compositeBackgroundInpaint
  }

  setPlanePolygonsDebugObjVisible(onoff: boolean) {
    if (!this.planePolygonsDebugObj) {
      return
    }
    this.planePolygonsDebugObj.visible = onoff
  }

  setVanishingLinesVisible(onoff: boolean) {
    this.vanishingLinesDebugObjects.forEach((obj) => {
        obj.visible = onoff
    })
  }

  setDepthVisible(onoff: boolean) {
    if (this.occlusionMesh && this.occlusionMesh.material) {
        this.occlusionMesh.material.colorWrite = onoff
    }
  }

  setDebugNormalsSegmentationMeshVisible(onoff: boolean) {
    if (this.debugNormalsSegmentationMesh) {
      this.debugNormalsSegmentationMesh.visible = onoff
    }
  }

  setDebugSemanticSegmentationMeshVisible(onoff: boolean) {
    if (this.debugSemanticSegmentationMesh) {
      this.debugSemanticSegmentationMesh.visible = onoff
    }
  }

  setCompositeBackgroundAAEnabled(enabled: boolean) {
    if (this.compositeBackground) {
      this.compositeBackground.applyAAEnable(enabled)
    }
    if (this.compositeBackgroundInpaint) {
      this.compositeBackgroundInpaint.applyAAEnable(enabled)
    }
  }

  override setFrontSideShadows(shouldUseFrontSideShadows: boolean) {
    const isCameraAboveCeiling = gvViewManager()?.getIsDollhouseView() || gvViewManager()?.getIsTopView()
    super.setFrontSideShadows(shouldUseFrontSideShadows && !isCameraAboveCeiling)
  }

  setFloorShadowPlaneVisibility(disableDollhouseShadows: boolean, disableSceneOcclusion?: boolean) {
    if (!this.shadowPlane) {
      return
    }

    if (disableSceneOcclusion) {
      this.shadowPlane.visible = false
      return
    }

    const isDollhouseView = gvViewManager()?.getIsDollhouseView()
    const isTopView = gvViewManager()?.getIsTopView()
    const isCameraAboveCeiling = isDollhouseView || isTopView || false
    const shouldHideFloorShadows = disableDollhouseShadows && isCameraAboveCeiling
    this.shadowPlane.visible = !shouldHideFloorShadows
  }

  setCameraTransform(transform: THREE.Matrix4) {
    this.rootNodeBackground.matrix.copy(transform)
    this.rootNodeBackground.matrix.decompose(this.rootNodeBackground.position, this.rootNodeBackground.quaternion,
      this.rootNodeBackground.scale)
    this.rootNodeBackground.updateMatrixWorld(true)
    this.rootNodeOcclusion.copy(this.rootNodeBackground)
  }

  setupCamera(camera: THREE.Camera) {
    camera.matrix.copy(this.rootNodeBackground.matrix)
    camera.matrix.decompose(camera.position, camera.quaternion, camera.scale)
    camera.updateMatrixWorld(true)
  }

  // Restore visibility of furniture items that were hidden previously and
  // hide items that may be too close to the camera and block the view.
  public override refreshViewBlockingItemsVisibility(hideViewBlockingItems: boolean) {
    const isMultiview = gvViewManager()?.isMultiview() || false
    super.refreshViewBlockingItemsVisibility(isMultiview && hideViewBlockingItems)
  }

  private addToBackgroundRoot(object: THREE.Object3D) {
    this.rootNodeBackground.add(object)
    this.rootNodeBackground.updateMatrixWorld(true)
  }

  private addToOcclusionRoot(object: THREE.Object3D) {
    this.rootNodeOcclusion.add(object)
    this.rootNodeOcclusion.updateMatrixWorld(true)
  }

  setWallColor(color: ColorRepresentation | undefined | null): void {
    this.compositeBackground?.setColor(color, true)
    this.compositeBackgroundInpaint?.setColor(color, true)
  }

  applyPlaceableHintDebugSettings(visible?: boolean, planeGap?: number, furnitureGap?: number) {
    if (!this.placeableHint) {
      return
    }
    if (visible !== undefined) {
      this.placeableHint.setDebugAlwaysVisible(visible)
    }
    if (planeGap !== undefined) {
      this.placeableHint.setArrowPlaneGap(planeGap)
    }
    if (furnitureGap !== undefined) {
      this.placeableHint.setArrowFurnitureGap(furnitureGap)
    }
  }

  applyBlockingItemsHidingDebugSettings(blockingItemsRaycastCheck?: boolean,
    blockingItemsRaycastDistance?: number,
    blockingItemsWallFacingCheck?: boolean,
    blockingItemsWallFacingCheckInDollhouse?: boolean) {
      if (blockingItemsRaycastCheck !== undefined) {
        this.blockingItemsRaycastCheck = blockingItemsRaycastCheck
      }
      if (blockingItemsRaycastDistance !== undefined) {
        this.blockingItemsRaycastDistance = blockingItemsRaycastDistance
      }
      if (blockingItemsWallFacingCheck !== undefined) {
        this.blockingItemsWallFacingCheck = blockingItemsWallFacingCheck
      }
      if (blockingItemsWallFacingCheckInDollhouse !== undefined) {
        this.blockingItemsWallFacingCheckInDollhouse = blockingItemsWallFacingCheckInDollhouse
      }
      this.refreshViewBlockingItemsVisibility(true)
  }

  override onActivate() {
    super.onActivate()
    GrandCentral.getDispatcher().addObserver(NOTIFY_VIEWER_STATE_UPDATE, this.onCameraStateChange)
    this.refreshStaticBackgroundVisibility()
  }

  override onDeactivate() {
    super.onDeactivate()
    GrandCentral.getDispatcher().removeObserver(this.onCameraStateChange)
  }

  private onCameraStateChange(info: NotificationInfo) {
    const state = info as ViewerStateUpdateNotification
    if (state.payload.stateInfo === 'CameraExitStaticView' ||
      state.payload.stateInfo === 'OrbitModeBegin') {
      this.enableDynamicBackground(true)
    } else if (state.payload.stateInfo === 'CameraEnterStaticView' ||
      state.payload.stateInfo === 'OrbitModeEnd'
    ) {
      this.enableDynamicBackground(false)
    }
  }

  private enableDynamicBackground(enable: boolean) {
    if (this.texturedPolygonsObj) {
      this.texturedPolygonsObj.visible = enable
    }
    this.refreshStaticBackgroundVisibility()
  }

  private refreshStaticBackgroundVisibility() {
    // Since this.texturedPolygonsObj is created lazily, and might not yet be present here,
    // turn off the static background only if the dynamic one is present and visible.
    const dynamicIsVisible = this.texturedPolygonsObj?.visible || false
    if (this.sceneBack) {
      this.rootNodeBackground.visible = !dynamicIsVisible
    }
    if (this.sceneOcclusion) {
      this.sceneOcclusion.visible = !dynamicIsVisible
    }
    this.setIsDirty(true)
  }

  onCanvasResize(screenSize: THREE.Vector2) {
    super.onCanvasResize(screenSize)
    if (this.footprintMaterial) {
      this.footprintMaterial.uniforms.resolution.value = screenSize
    }
    const shadowPlaneMat = this.shadowPlane?.material || null
    if (!Array.isArray(shadowPlaneMat) && isShaderMaterial(shadowPlaneMat)) {
      shadowPlaneMat.uniforms.resolution.value = screenSize
    }
  }

  protected override isFloorItemAgaintWallCheckEnabled() {
    const isCameraAboveCeiling = gvViewManager()?.getIsDollhouseView() || gvViewManager()?.getIsTopView()
    return this.blockingItemsWallFacingCheck && 
      (this.blockingItemsWallFacingCheckInDollhouse || !isCameraAboveCeiling)
  }

  override setDimensions(width: number, height: number) {
    super.setDimensions(width, height)
    this.floorPlacer?.setDimensions(this.height, this.width)
  }

  public findPlaceableFloorPos(): InitialPosInfo | null {
    return this.floorPlacer ? this.floorPlacer.findNewFurniturePosition(this) : null
  }
  
  public setFloorPlacer(floorPlacer: FloorPlacer) {
    this.floorPlacer = floorPlacer
  }

  public getFloorPlacer(): FloorPlacer | null {
    return this.floorPlacer
  }

  public setLightsIntensities(
    directionalLightIntensities: number[],
    pointLightIntensities: number[],
    spotLightIntensities: number[],
    areaLightIntensities: number[],
    usingPBR: boolean,
  ) {
    interface PbrLight extends THREE.Light {
      power?: number
      angle?: number /* spot light only property */
    }
    const setLightIntensityAtIndex = (
      lightIntensities: number[],
      lightType: typeof LIGHT_DIRECTIONAL | typeof LIGHT_POINT | typeof LIGHT_SPOT | typeof LIGHT_AREA,
    ) => {
      // There is no PBR version of directional light in ThreeJS so we always use 'intensity'.
      const intensityKey = usingPBR && lightType !== LIGHT_DIRECTIONAL ? `power` : `intensity`

      return (light: PbrLight, index: number) => {
        const newValue = lightIntensities[index]
        // Make sure the number from the settings arrays are set and valid.
        if (Number.isNaN(newValue) || newValue === undefined) {
          return
        }

        // Convert the provided watts value to lumens in case of PBR lights.
        light[intensityKey] = usingPBR
          ? wattsToLumens(newValue, lightType, { outer_angle: light.angle })
          : newValue
      }
    }

    this.directionalLights?.forEach(setLightIntensityAtIndex(directionalLightIntensities, LIGHT_DIRECTIONAL))
    this.pointLights?.forEach(setLightIntensityAtIndex(pointLightIntensities, LIGHT_POINT))
    this.spotLights?.forEach(setLightIntensityAtIndex(spotLightIntensities, LIGHT_SPOT))
    this.areaLights?.forEach(setLightIntensityAtIndex(areaLightIntensities, LIGHT_AREA))
  }

  protected override hasWallThickness(): boolean {
    return true
  }
}
