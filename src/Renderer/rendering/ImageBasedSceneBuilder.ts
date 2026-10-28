/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as THREE from 'three'
import { ShadowMapViewer } from 'three/examples/jsm/utils/ShadowMapViewer'

import { SceneBuilder, SceneCreateCallback } from 'Renderer/rendering/SceneBuilder'

import { AssetManager } from 'Renderer/assets/AssetManager'
import { PlaneType, ViewerSettings } from 'Renderer/geomviewer/geom_types'

import { ImageBasedScene } from 'Renderer/rendering/ImageBasedScene'
import { ImageBasedRenderEngine } from 'Renderer/rendering/ImageBasedRenderEngine'
import { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import {
  InitializationFailureCallback,
  OnFirstRenderCallback,
  EnvMapsSet,
} from 'Renderer/rendering/rendering_types'

import WallspiceWebgl from 'Renderer/WallspiceWebgl'
import * as constants from 'Renderer/constants'
import isMobile from 'utils/isMobile'
import { FloorLines, PolygonType } from 'Renderer/assets/Types'
import CompositeBackground from 'Renderer/CompositeBackground'
import PCSSShadowMaterial from 'Renderer/PCSSShadowMaterial'
import {
  PLANE_DATA_READY,
  RENDER_DIMENSIONS_READY,
  MASK_DATA_READY,
  BACKGROUND_SCENE_READY,
  OCCLUSION_SCENE_READY,
  ENVIRONMENT_MAP_READY,
  WALL_SNAP_READY,
  FLOOR_PLACER_READY,
} from 'Renderer/StartupWarden'
import { GrandCentral } from 'Renderer/GrandCentral'
import {
  ViewerStateUpdateNotification,
} from 'Renderer/geomviewer/geom_notifications'
import {
  NOTIFY_VIEWER_STATE_UPDATE,
} from 'Renderer/geomviewer/geom_constants'

import * as WallSnap from 'Renderer/WallSnap'
import { AssetsList } from 'Renderer/assets/AssetsList'
import {
  buildSemanticSegmentationMesh,
  buildWallMaskMesh,
  buildPlanePolygonsMesh,
} from 'Renderer/utils/debug_gl_viz'
import { gvStartupWarden, gvViewManager } from 'Renderer/foundation/geom_app'
import { GeomThreeCamera } from 'Renderer/multiview/geom_camera'
import TextureHelper from 'Renderer/TextureHelper'
import FootprintMaterial from 'Renderer/FootprintMaterial'
import { clipOuterEdgesByPlanes } from 'Renderer/geometry/PolygonUtils'
import { extendFloorLines, markPolygonsAsIgnored } from 'Renderer/utils/floorLinesUtils'
import { FloorPlacer } from 'Renderer/FloorPlacer'
import { getFloorPlane } from 'Renderer/utils/sceneUtils'
import { Polygon3 } from 'Renderer/geometry/Polygon3'
import type { MultiSceneViewManager } from 'Renderer/multiview/multiscene_view_manager'
import { BaseRenderEngine } from './BaseRenderEngine'
import { PolyBasedScene } from './PolyBasedScene'
import { MaskBasedScene } from './MaskBasedScene'
import { GeomBaseScene } from './GeomBaseScene'
import { toLegacyIntrinsics, initializeEnvMap } from './scene_builder_utils'

const notifyWallDataReady = (width: number, height: number) => {
  const notification: ViewerStateUpdateNotification = {
    what: NOTIFY_VIEWER_STATE_UPDATE,
    payload: {
      stateInfo: `WallDataReady`,
      wallDataInfo: { width, height },
    }
  }
  GrandCentral.getDispatcher().dispatchNotification(notification);
}

export type ScenePositioningType = 'MaskBased' | 'PolyBased'

export abstract class ImageBasedSceneBuilder implements SceneBuilder<
  ImageBasedScene,
  BaseRenderEngine<ImageBasedScene>
> {
  protected settings: ViewerSettings
  protected debugSettings: DebugSettings
  protected maxTextureSize: number
  private isSoftwareRenderer = false
  private onInitializationFailure: InitializationFailureCallback
  protected cameraIndex = 0
  protected scenePositioningType: ScenePositioningType = `PolyBased`

  constructor(
    settings: ViewerSettings,
    debugSettings: DebugSettings,
    maxTextureSize: number,
    onInitializationFailure: InitializationFailureCallback,
    cameraIndex: number,
  ) {
    this.settings = settings
    this.debugSettings = debugSettings
    this.maxTextureSize = maxTextureSize
    this.onInitializationFailure = onInitializationFailure
    this.cameraIndex = cameraIndex
  }

  buildRenderEngine(canvas: HTMLCanvasElement, onFirstRenderCallback: OnFirstRenderCallback) {
    return new ImageBasedRenderEngine(canvas, this.settings, this.debugSettings,
      this.onInitializationFailure, onFirstRenderCallback)
  }

  buildScene(renderEngine: BaseRenderEngine<GeomBaseScene>, assetsList: AssetsList,
    assetManager: AssetManager, sceneCreateCallback?: SceneCreateCallback<ImageBasedScene>) {
    this.scenePositioningType = this.determineScenePositioningType(assetsList)
    let resultScene: ImageBasedScene
    switch(this.scenePositioningType) {
      case 'PolyBased':
        resultScene = new PolyBasedScene()
        break
      case 'MaskBased':
        resultScene = new MaskBasedScene()
        break
      default:
        resultScene = new MaskBasedScene()
    }

    // Some subsystems, such as postprocessing, require the front scene reference early.
    const frontScene = new THREE.Scene()
    resultScene.setSceneFront(frontScene)
    // renderEngine.setScene(resultScene)

    const threeRenderer = renderEngine.getThreeRenderer()
    const contextInfo = WallspiceWebgl.queryContextInfo(threeRenderer)
    this.isSoftwareRenderer = contextInfo?.software

    if (threeRenderer) {
      // TODO: need to re-evaluate/expand this test for other room types, since
      // PCSS shadows are now embedded into the items standard material directly.
      const { error } = PCSSShadowMaterial.testPCSSMaterial(threeRenderer)
      if (error) {
          this.onInitializationFailure({ error, PCSSfailure: true })
      }
    }

    if (sceneCreateCallback) {
      sceneCreateCallback(resultScene)
    }

    const planeDataPromise = this.buildPlaneAndPolygonData(assetsList, resultScene)
      .then(() => gvStartupWarden()?.markStartupStage(PLANE_DATA_READY))
    return planeDataPromise
      .then(() => this.buildCameraTransform(assetsList, resultScene))
      .then(() => this.buildBackgroundScene(assetsList, assetManager, resultScene, renderEngine))
      .then(({ width, height }) => this.buildOcclusionScene(width, height, assetsList, assetManager, resultScene))  
      .then(() => this.buildFootprintMaterial(assetManager, resultScene, renderEngine))    
      .then(() => this.buildFloorLines(assetsList, resultScene))
      .then(() => this.buildFloorPlacer(assetManager, resultScene))
      .then(() => this.patchPlaneAndPolygonData(assetsList, assetManager, resultScene))  
      .then(() => this.buildSceneFront(assetsList, assetManager, resultScene))
      .then(() => this.buildFloorShadowPlane(assetManager, resultScene))
      .then(() => renderEngine.changeDebugSettings(this.debugSettings))
      .then(() => resultScene)
  }

  protected abstract determineScenePositioningType(assetsList: AssetsList): ScenePositioningType

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  protected buildCameraTransform(assetsList: AssetsList, resultScene: ImageBasedScene): Promise<void> {
    return Promise.resolve()
  }

  protected abstract buildPlaneAndPolygonData(assetsList: AssetsList, resultScene: ImageBasedScene): Promise<void>

  protected buildFloorLines(assetsList: AssetsList, resultScene: ImageBasedScene) {
    const planePolygons = resultScene.getPolygonData()
    const planeOrientation = resultScene.getPlaneData()
    const planeData = planeOrientation?.planeData?.map(plane => plane as PlaneType)
    const polygonData = planePolygons?.plane_polygons?.map(polygon => polygon as PolygonType)
    const intrinsics = assetsList.getCameraIntrinsics(this.cameraIndex)
    const vm = gvViewManager() ? gvViewManager() as MultiSceneViewManager : undefined
    let camera: GeomThreeCamera | undefined
    if (vm) {
      camera = vm.getCameraByIndex(this.cameraIndex)?.getThreeCamera()
    }

    if (planeData && polygonData && camera) {
      const legacyIntrinsics = toLegacyIntrinsics(intrinsics)
      const useOpeningsAsWalls = this.settings.isSyntheticScene
      const floorLines = WallSnap.makeFloorLinesFromPolys(
        planeData, polygonData, legacyIntrinsics, useOpeningsAsWalls, constants.WALL_SHIFT_PANO_ROOMS)
      resultScene.setFloorLines(floorLines, constants.WALL_SHIFT_PANO_ROOMS)

      const viewManager = gvViewManager()
      const floorPlane = getFloorPlane(planeData)
      if (!viewManager || !viewManager.isMultiview()) {
        extendFloorLines(floorLines, floorPlane, camera)
      }

      gvStartupWarden()?.markStartupStage(WALL_SNAP_READY)
    }
  }

  protected buildFloorPlacer(assetManager: AssetManager, resultScene: ImageBasedScene) {
    const sceneSampler = resultScene.getSceneSampler()
    const floorPlacer = new FloorPlacer(sceneSampler)
    const [width, height] = resultScene.getDimensions()
    floorPlacer.setDimensions(height, width)
    resultScene.setFloorPlacer(floorPlacer)

    // Either use the plane data or the occlusion map (legacy) to generate drop locations.
    const hasFloorAndWallPolygons = !!resultScene.getPolygonData()?.plane_polygons
      .filter(polygon => polygon.class !== 'stackable').length
    if (hasFloorAndWallPolygons && this.settings.isSyntheticScene) {
      // Temporarily set the current scene label to the current scene's index.
      // This is a workaround since scene sampler uses the global camera instance
      // and can't be passed an overriding camera instance.
      // TODO: remove when we can pass a camera instance into the scene sampler.
      const currentViewLabel = gvViewManager()?.getCurrentView()
      const viewLabels = gvViewManager()?.getAllViewLabels()
      if (!currentViewLabel || !viewLabels) {
        return Promise.resolve()
      }
      gvViewManager()?.setCurrentViewLabel(viewLabels[this.cameraIndex])
      floorPlacer.genDropLocationsWithPlaneData()

      // Revert the temporary label change.
      gvViewManager()?.setCurrentViewLabel(currentViewLabel)

      gvStartupWarden()?.markStartupStage(FLOOR_PLACER_READY)  
      return Promise.resolve()
    }

    return assetManager.getTexturePixelsOrNull(constants.OCCLUSION_MAP_ASSET_NAME)
      .then((pixelDataRecord) => {
        if (!pixelDataRecord) {
          return Promise.resolve()
        }
        return floorPlacer.configureWithOcclusionMap(pixelDataRecord)
      }).then(() => {
        gvStartupWarden()?.markStartupStage(FLOOR_PLACER_READY)
      })
  }

  protected buildBackgroundScene(assetsList: AssetsList, assetManager: AssetManager,
    resultScene: ImageBasedScene, renderEngine: BaseRenderEngine<GeomBaseScene>) {
    const threeScene = WallspiceWebgl.createScene()
    threeScene.background = new THREE.Color(0xCBCBCB)
    resultScene.setSceneBack(threeScene)

    return assetManager.getTextureOrNull(constants.PANORAMA_ASSET_NAME).then((textureRecord) => {
      const wallTexture = textureRecord?.texture
      if (!wallTexture) {
          return { width: 1, height: 1 }
      }
      resultScene.changeLoadedDataSizeBytes(textureRecord.size)
      const width = wallTexture.image ? wallTexture.image.width : 1
      const height = wallTexture.image ? wallTexture.image.height : 1
      resultScene.setDimensions(width, height)
      renderEngine.initSize(width, height)
      gvStartupWarden()?.markStartupStage(RENDER_DIMENSIONS_READY)

      const planeOrientation = resultScene.getPlaneData()
      const planeData = planeOrientation?.planeData?.map(plane => plane as PlaneType)
      let legacyPlaneData
      if (this.scenePositioningType === `PolyBased`) {
        // Polygons are used to generate a matching version of plane orientations. The legacy
        // orientations (if available) are required as a fallback for older room versions.
        const legacyPlaneOrientation = resultScene.getLegacyPlaneData()
        legacyPlaneData = legacyPlaneOrientation?.planeData?.map(plane => plane as PlaneType)
      }

      const vm = gvViewManager() ? gvViewManager() as MultiSceneViewManager : undefined
      const cam = vm?.getCameraByIndex(this.cameraIndex)
      if (cam) {
        cam.setViewSize(width, height)
      }

      const nomralsSegmentationPromise = this.buildSegmentationMask(assetManager, assetsList,
        resultScene as MaskBasedScene, width, height)
      const panoBgRGBPromise = this.buildPanoBackground(width, height, assetsList,
        assetManager, resultScene, renderEngine, legacyPlaneData || planeData)
      const inpaintBgPromise = this.buildInpaintBackground(assetsList,
        assetManager, resultScene, renderEngine, legacyPlaneData || planeData, width, height)
      const magicEraserHighlightMeshPromise = this.buildMagicEraserHighlightMesh(
        width, height, assetsList, assetManager, resultScene)
      const envMapPromise = this.initializeEnvMap(height, assetsList,
        assetManager, resultScene, renderEngine)

      if (this.settings.onOffOptions.enableDebugControls) {
        this.buildDebugSegmentationMeshes(width, height, assetsList, assetManager, resultScene)
      }

      return Promise.all([panoBgRGBPromise, inpaintBgPromise,
        magicEraserHighlightMeshPromise, nomralsSegmentationPromise, envMapPromise])
      .then(() => ({ width, height }))
    }).then(({ width, height }) => {
      gvStartupWarden()?.markStartupStage(BACKGROUND_SCENE_READY)
      notifyWallDataReady(width, height)
      return { width, height  }
    })
  }

  protected buildSegmentationMask(assetManager: AssetManager, assetsList: AssetsList, resultScene: MaskBasedScene,
    width: number, height: number) {
    const planeOrientation = resultScene.getPlaneData()
    const planeData = planeOrientation?.planeData?.map(plane => plane as PlaneType)

    const isMaskBased = this.scenePositioningType === `MaskBased`
    return (isMaskBased
      ? this.buildWallsMaskLegacy(assetManager, resultScene)
        .then(() => this.buildHighLightMesh(width, height, assetsList, resultScene, planeData))
        .then(() => this.buildFloorLinesLegacy(assetsList, resultScene, planeData))
      : Promise.resolve())
      .then(() => gvStartupWarden()?.markStartupStage(MASK_DATA_READY))
  }

  protected buildWallsMaskLegacy(assetManager: AssetManager, resultScene: MaskBasedScene) {
    return assetManager.getMaskDataPixelsOrNull().then((maskData) => {
      const pixels = maskData?.pixels
      if (!pixels) {
        return
      }
      resultScene.changeLoadedDataSizeBytes(maskData.size)
      resultScene.setWallsMask(pixels)
    })
  }

  protected buildFloorLinesLegacy(assetsList: AssetsList, resultScene: MaskBasedScene,
    planes: PlaneType[] | undefined) {
    if (this.settings.isSyntheticScene) {
      // Note no need to extend since legacy floor lines are already extended to infinity.
      const normalsSegmentationData = resultScene.getWallsMask()
      const intrinsics = toLegacyIntrinsics(assetsList.getCameraIntrinsics(this.cameraIndex))
      if (normalsSegmentationData && planes?.length) {
        const floorLines = WallSnap.makeFloorLines(
          planes, normalsSegmentationData, intrinsics, constants.WALL_SHIFT_PANO_ROOMS)
        resultScene.setFloorLines(floorLines as FloorLines, constants.WALL_SHIFT_PANO_ROOMS)
      }
    }
    gvStartupWarden()?.markStartupStage(WALL_SNAP_READY)
  }

  protected buildWallsMask(width: number, height: number, cam: THREE.PerspectiveCamera,
    assetManager: AssetManager, resultScene: MaskBasedScene, planePolygons: PolygonType[]) {
    // Given plane polygons and (optional) semantic segmentation; generates the walls normals map.
    return assetManager.getTextureOrNull(constants.SEGMENTATION_ASSET_NAME)
    .then((textureRecord) => {
      const textureHelper = new TextureHelper()
      const segmentationTexture = textureRecord?.texture
      const polygonsNoStackingSurfaces = planePolygons.filter(polygon => polygon.class !== 'stackable')
      const wallsMaskTexture = textureHelper.projectPolygonsOnTexture(width, height, cam,
        polygonsNoStackingSurfaces, segmentationTexture)
      if (wallsMaskTexture) {
        const wallsMask = textureHelper.readPixels(wallsMaskTexture, true)
        if (wallsMask) resultScene.setWallsMask(wallsMask)
      }
      textureHelper.dispose()
      assetManager.releaseTexture(constants.SEGMENTATION_ASSET_NAME)
    })
  }

  protected buildPanoBackground(width: number, height: number, assetsList: AssetsList,
    assetManager: AssetManager, resultScene: ImageBasedScene, renderEngine: BaseRenderEngine<GeomBaseScene>,
    planeData: PlaneType[] | undefined) {
    return assetManager.getTextureOrNull(constants.PANORAMA_ASSET_NAME).then((textureRecord) => {
      const wallTexture = textureRecord?.texture
      if (!wallTexture) {
        return
      }
      const disableWallcolor = isMobile() && assetManager.getMobileNoWallColorFlag()
      const isCompositeBg = !disableWallcolor && assetsList.hasWallColorData(this.cameraIndex)
      const intrinsics = toLegacyIntrinsics(assetsList.getCameraIntrinsics(this.cameraIndex))
      let bgMesh: THREE.Mesh | null = null
      if (isCompositeBg) {
        const wallsIndices = planeData?.map((plane, idx) => ({ class: plane.class, planeIdx: idx }))
            .filter((plane) => plane.class === 'wall')
            .map((plane) => plane.planeIdx) || []
        const compositeBg = new CompositeBackground(assetManager, renderEngine, wallsIndices, false,
          this.settings.featureFlags.useWallColorAntialias as boolean, this.cameraIndex)
        compositeBg.createFullscreenQuad(intrinsics, width, height, assetsList, wallTexture)
        bgMesh = compositeBg.getFullScreenQuad()
        resultScene.setCompositeBackground(compositeBg)
      } else {
        bgMesh = WallspiceWebgl.createBackground(intrinsics, width, height, wallTexture)
          if (bgMesh?.material instanceof THREE.MeshStandardMaterial && bgMesh?.material.map) {
            bgMesh.material.map.colorSpace = this.debugSettings.useFilmicLUT
              ? THREE.LinearSRGBColorSpace
              : THREE.SRGBColorSpace
          }
      }
      if (bgMesh) {
        resultScene.setPanoBackgroundMesh(bgMesh)
        bgMesh.visible = true
      }
      assetManager.releaseTexture(constants.PANORAMA_ASSET_NAME)
    })
  }

  protected buildInpaintBackground(assetsList: AssetsList, assetManager: AssetManager,
    resultScene: ImageBasedScene, renderEngine: BaseRenderEngine<GeomBaseScene>, planes: PlaneType[] | undefined,
    width: number, height: number) {
    return assetManager.getTextureOrNull(constants.PANO_INPAINT_ASSET_NAME).then((textureRecord) => {
      const texture = textureRecord?.texture
      if (!texture) {
        return
      }
      resultScene.changeLoadedDataSizeBytes(textureRecord.size)
      const intrinsics = toLegacyIntrinsics(assetsList.getCameraIntrinsics(this.cameraIndex))
      const disableWallcolor = isMobile() && assetManager.getMobileNoWallColorFlag()
      const useCompositeBackground = !disableWallcolor && assetsList.hasWallColorInpaintData(this.cameraIndex)
      let inpaintMesh: THREE.Mesh | null = null
      if (useCompositeBackground) {
          const wallsIndices =
          planes
            ?.map((plane, idx) => ({ class: plane.class, planeIdx: idx }))
            .filter((plane) => plane.class === 'wall')
            .map((plane) => plane.planeIdx) || []
        const compositeBgInpaint = new CompositeBackground(assetManager, renderEngine, wallsIndices, true,
            this.settings.featureFlags.useWallColorAntialias as boolean, this.cameraIndex)
          compositeBgInpaint.createFullscreenQuad(intrinsics, width, height, assetsList, texture)

          inpaintMesh = compositeBgInpaint.getFullScreenQuad()
          resultScene.setCompositeBackgroundInpaint(compositeBgInpaint)
      } else {
        inpaintMesh = WallspiceWebgl.createBackgroundFromTexture(intrinsics, width, height, texture)
        if( inpaintMesh ){  
        if (inpaintMesh.material instanceof THREE.MeshStandardMaterial &&
            inpaintMesh.material.map) {
            inpaintMesh.material.map.colorSpace = this.debugSettings.useFilmicLUT
                ? THREE.LinearSRGBColorSpace
                : THREE.SRGBColorSpace
            }
        }
      }
      if (inpaintMesh) {
        inpaintMesh.visible = false
        resultScene.setBackgroundInpaintMesh(inpaintMesh)
      }
      assetManager.releaseTexture(constants.PANO_INPAINT_ASSET_NAME)
    })
  }

  protected buildMagicEraserHighlightMesh(width: number, height: number, assetsList: AssetsList,
    assetManager: AssetManager, resultScene: ImageBasedScene) {
    const shouldUseSegmentationPixels = assetsList.hasAssetName(constants.SEGMENTATION_ASSET_NAME, this.cameraIndex)
    if (!shouldUseSegmentationPixels || !this.settings.canMagicErase) {
      return Promise.resolve()
    }
    return assetManager.getTexturePixelsOrNull(constants.SEGMENTATION_ASSET_NAME)
      .then((segmentationPixelsRecord) => {
        if (!segmentationPixelsRecord) {
          return
        }
        resultScene.changeLoadedDataSizeBytes(segmentationPixelsRecord.size)
        const intrinsics = toLegacyIntrinsics(assetsList.getCameraIntrinsics(this.cameraIndex))
        const segmentationPixels = segmentationPixelsRecord.pixels
        const segsData = WallspiceWebgl.isolateChannelDataFromImage(segmentationPixels, 2)
        const segsTexture = WallspiceWebgl.createLuminanceTextureFromData(segsData)
        const segmentsMesh = WallspiceWebgl.createSegmentsMesh(intrinsics, width, height,
          segsTexture, 1.0, false)
        if (segmentsMesh) {
            segmentsMesh.renderOrder = constants.ALWAYS_ON_TOP_RENDER_ORDER
            resultScene.setSegmentationMesh(segmentsMesh)
        }
        assetManager.releasePixelData(constants.SEGMENTATION_ASSET_NAME)
    })
  }

  protected buildHighLightMesh(width: number, height: number,
    assetsList: AssetsList, resultScene: MaskBasedScene,
    planes: PlaneType[] | undefined) {
    const maskData = resultScene.getWallsMask()
    if (!planes || !maskData) {
      return
    }
    const intrinsics = toLegacyIntrinsics(assetsList.getCameraIntrinsics(this.cameraIndex))
    const highlightMesh = WallspiceWebgl.createPlaceableOverlay(intrinsics, width, height,
      maskData, planes, 0.2)
    if (highlightMesh) {
      highlightMesh.visible = false
      highlightMesh.renderOrder = constants.ALWAYS_ON_TOP_RENDER_ORDER
      resultScene.setPlaceHighlightMesh(highlightMesh)
    }
  }

  protected buildDebugSegmentationMeshes(width: number, height: number,
    assetsList: AssetsList, assetManager: AssetManager, resultScene: ImageBasedScene) {
    // Create normals segmentation debug mesh, visualizing the normals channel.
    const intrinsics = toLegacyIntrinsics(assetsList.getCameraIntrinsics(this.cameraIndex))
    assetManager!.getMaskDataPixelsOrNull()
      .then((normalsPixelsRecord) => {
        if (!normalsPixelsRecord) {
          return
        }
        const normalsPixels = normalsPixelsRecord?.pixels
        const normalSegData = WallspiceWebgl.isolateChannelDataFromImage(
          normalsPixels, 2 /* BLUE: normals segmentation map */)
        const normalSegTex = WallspiceWebgl.createLuminanceTextureFromData(normalSegData)
        const debugNormalsSegmentationMesh = buildWallMaskMesh(
          intrinsics, width, height, normalSegTex, 1.0)
        if (debugNormalsSegmentationMesh) {
          debugNormalsSegmentationMesh.renderOrder = constants.ALWAYS_ON_TOP_RENDER_ORDER
          resultScene.setDebugNormalsSegmentationMesh(debugNormalsSegmentationMesh)
          debugNormalsSegmentationMesh.visible = false
        }  
      })

    // Create semantic segmentation debug mesh, visualizing the semantics channel.
    assetManager.getTexturePixelsOrNull(constants.SEGMENTATION_ASSET_NAME)
      .then((segmentationPixelsRecord) => {
        if (!segmentationPixelsRecord) {
          return
        }
        const segmentationPixels = segmentationPixelsRecord.pixels
        const semanticSegData = WallspiceWebgl.isolateChannelDataFromImage(
          segmentationPixels, 0 /* RED: semantics segmentation map */)
        const semanticSegTex = WallspiceWebgl.createLuminanceTextureFromData(semanticSegData)
        const semanticSegMesh = buildSemanticSegmentationMesh(
          intrinsics, width, height, semanticSegTex, 1.0)
        if (semanticSegMesh) {
          semanticSegMesh.renderOrder = constants.ALWAYS_ON_TOP_RENDER_ORDER
          resultScene.setDebugSemanticSegmentationMesh(semanticSegMesh)
          semanticSegMesh.visible = false
        }
        assetManager.releasePixelData(constants.SEGMENTATION_ASSET_NAME)
      })
  }

  protected patchPlaneAndPolygonData(assetsList: AssetsList,
    assetManager: AssetManager, resultScene: ImageBasedScene) {
    if (!gvViewManager()?.isMultiview || !this.settings.isSyntheticScene) {
      return Promise.resolve()
    }

    return assetManager.getMaskDataPixelsOrNull().then((maskData) => {
      const pixels = maskData?.pixels
      const vm = gvViewManager() ? gvViewManager() as MultiSceneViewManager : undefined
      const camera = vm?.getCameraByIndex(this.cameraIndex)
      if (!pixels || !camera) {
        return
      }

      const planePolygons = resultScene.getPolygonData()
      const polygonData = planePolygons?.plane_polygons?.map(polygon => polygon as PolygonType)
      const wallPolygons = polygonData?.filter(polygon => polygon.class === "wall")
      const sceneSampler = resultScene.getSceneSampler()
      const isCameraAboveCeiling = !!(vm?.getIsDollhouseView() || vm?.getIsTopView())
      
      markPolygonsAsIgnored(wallPolygons, sceneSampler, camera, pixels, isCameraAboveCeiling)
    })
  }

  protected buildOcclusionScene(width: number, height: number, assetsList: AssetsList,
    assetManager: AssetManager, resultScene: ImageBasedScene) {
    resultScene.setSceneOcclusion(WallspiceWebgl.createScene())

    const hasFragmentDepth = assetManager.getSupportFragmentDepth()
    let promise = null
    if (hasFragmentDepth) {
      promise = this.buildTextureBasedOcclusion(width, height, assetsList, assetManager, resultScene)
    } else {
      promise = this.buildPixelsBasedOcclusion(width, height, assetsList, assetManager, resultScene)
    }
    return promise.then(() => {
      gvStartupWarden()?.markStartupStage(OCCLUSION_SCENE_READY)
    })
  }

  protected buildFootprintMaterial(assetManager: AssetManager, resultScene: ImageBasedScene,
    renderEngine: BaseRenderEngine<GeomBaseScene>) {
    return assetManager.getTextureOrNull(constants.OCCLUSION_MAP_ASSET_NAME).then((textureRecord) => {
      const occlusionTexture = textureRecord?.texture
      if (!occlusionTexture) {
          return
      }
      const planeOrientation = resultScene.getPlaneData()
      const planeData = planeOrientation?.planeData?.map(plane => plane as PlaneType)
      if (!planeData || planeData.length === 0) {
          return
      }
      const floorPlane = getFloorPlane(planeData)
      const threeFloorPlane = new THREE.Plane(new THREE.Vector3(...floorPlane.rot[2]), -floorPlane.d)
      const screenSize = renderEngine.getScreenSize()
      const footprintMaterial = new FootprintMaterial(threeFloorPlane, occlusionTexture, screenSize)
      resultScene.setFootprintMaterial(footprintMaterial)
    })
  }

  protected buildTextureBasedOcclusion(width: number, height: number, assetsList: AssetsList,
    assetManager: AssetManager, resultScene: ImageBasedScene) {
    return assetManager.getTextureOrNull(constants.OCCLUSION_MAP_ASSET_NAME).then((textureRecord) => {
      const occlusionTexture = textureRecord?.texture || null
      if (!occlusionTexture) {
        return null
      }
      resultScene.changeLoadedDataSizeBytes(textureRecord?.size || 0.0)
      assetManager.releaseTexture(constants.OCCLUSION_MAP_ASSET_NAME)
      const intrinsics = toLegacyIntrinsics(assetsList.getCameraIntrinsics(this.cameraIndex))
      const mesh = WallspiceWebgl.createDepthOcclusionFromImage(assetManager, intrinsics, width, height,
        occlusionTexture, 2.0, !this.settings.onOffOptions.magicEraserMode)
      if (mesh !== null) {
        const extra = assetsList.getExtraData()
        const near = extra?.nearValue || 0.2
        const far = extra?.farValue || 30
        mesh.material.colorWrite = this.debugSettings.depthViz
        WallspiceWebgl.setOcclusionNearFar(mesh, near, far)
        resultScene.setOcclusionMesh(mesh)

        // Track newly created material texture for correct disposal
        if (mesh.material.uniforms) {
          resultScene.addTexture(mesh.material.uniforms.map)
        }
      }

      return { occlusionTexture, mesh }
    }).then((data) => {
      if (!data) {
        return Promise.resolve()
      }
      const { occlusionTexture, mesh } = data
      return this.buildDepthOcclusionInpaint(width, height, assetsList, assetManager,
        resultScene, occlusionTexture, mesh)
    })
  }

  protected buildPixelsBasedOcclusion(width: number, height: number, assetsList: AssetsList,
    assetManager: AssetManager, resultScene: ImageBasedScene) {
    return assetManager.getTexturePixelsOrNull(constants.OCCLUSION_MAP_ASSET_NAME).then((pixelsData) => {
      const occlusionPixels = pixelsData?.pixels || null
      if (!occlusionPixels) {
        return
      }
      resultScene.changeLoadedDataSizeBytes(pixelsData?.size || 0.0)
      assetManager.releasePixelData(constants.OCCLUSION_MAP_ASSET_NAME)
      const intrinsics = toLegacyIntrinsics(assetsList.getCameraIntrinsics(this.cameraIndex))
      const mesh = WallspiceWebgl.createMeshOcclusionFromImage(intrinsics, width, height, occlusionPixels,
        !this.settings.onOffOptions.magicEraserMode)
      if (mesh !== null) {
        resultScene.setOcclusionMesh(mesh)
      }
    })
  }

  protected buildDepthOcclusionInpaint(width: number, height: number, assetsList: AssetsList,
    assetManager: AssetManager, resultScene: ImageBasedScene, occlusionTexture: THREE.Texture,
    depthOcclusionMesh: THREE.Mesh) {
    return assetManager.getTextureOrNull(constants.OCCLUSION_INPAINT_MAP_ASSET_NAME)
      .then((occlusionInpaintRecord) => {
        const occlusionInpaintTexture = occlusionInpaintRecord?.texture
        if (!occlusionInpaintTexture) {
          return
        }
        resultScene.changeLoadedDataSizeBytes(occlusionInpaintRecord.size)
        const intrinsics = toLegacyIntrinsics(assetsList.getCameraIntrinsics(this.cameraIndex))
        const zMesh = WallspiceWebgl.createDepthMuxOcclusionFromImages(assetManager, intrinsics, width, height,
          occlusionTexture, occlusionInpaintTexture, 2.0, !this.settings.onOffOptions.magicEraserMode)
        if (zMesh !== null) {
            const extra = assetsList.getExtraData()
            const near = extra?.nearValue || 0.2
            const far = extra?.farValue || 30
            WallspiceWebgl.setOcclusionNearFar(depthOcclusionMesh, near, far)
            resultScene.setOcclusionInpaintMesh(zMesh)

            // Track newly created material textures for correct disposal
            if (zMesh.material.uniforms) {
              resultScene.addTexture(zMesh.material.uniforms.map1)
              resultScene.addTexture(zMesh.material.uniforms.map2)
            }
        }
      })
  }

  protected buildSceneFront(assetsList: AssetsList, assetManager: AssetManager,
    resultScene: ImageBasedScene) {
    return this.getDepthOcclusionMeta(assetsList, assetManager).then((depthOcclusionMetadata) =>
      this.buildLights(assetsList).then((lightObjects) => {
        // Fit directional light shadow map boundaries to fit the front scene.
        const vm = gvViewManager() ? gvViewManager() as MultiSceneViewManager : undefined
        const camera = vm?.getCameraByIndex(this.cameraIndex)?.getThreeCamera()
        const mainLight = lightObjects.directionalLights.find(light => light.castShadow)
        if (mainLight && camera) {
          const planePolygons = resultScene.getPolygonData()
          const polygonData = planePolygons?.plane_polygons?.map(polygon => polygon as PolygonType)

          const cameraNode = resultScene.getCameraNode()
          const frustum = new THREE.Frustum().setFromProjectionMatrix(camera.projectionMatrix)
          const clippingPlanes = frustum.planes.slice(0, 4).map(plane => {
            plane.applyMatrix4(cameraNode.matrix)
            return { n: plane.normal, q: plane.normal.clone().multiplyScalar(-plane.constant) }
          })
          const clippedVertices = polygonData?.map(polygon => {
            const polygon3 = Polygon3.CreateFromManifestPolygon(polygon)
            const clippedEdges = clipOuterEdgesByPlanes(polygon3, clippingPlanes)
            return clippedEdges.map(edge => edge[0])
          }).flat()
          WallspiceWebgl.fitDirectionalLightShadowMap(mainLight, camera,
            depthOcclusionMetadata, clippedVertices)
        }

        // Set the scene lights and light helpers.
        this.initializeDefaultLights(lightObjects, resultScene)
        resultScene.setLights(lightObjects.directionalLights, lightObjects.pointLights,
          lightObjects.spotLights, lightObjects.areaLights)
        if (this.settings.onOffOptions.enableDebugControls) {
          resultScene.setLightHelperObjects(lightObjects.helperObjects)
          lightObjects.helperObjects.forEach((obj) => { obj.visible = this.debugSettings.lightsViz })
          this.buildSceneFrontDebugObjects(assetsList, mainLight, resultScene)
        }
      }))
  }

  protected getDepthOcclusionMeta(assetsList: AssetsList, assetManager: AssetManager) {
    const existingMetadata = assetsList.getDepthOcclusionMetadata()
    if (existingMetadata) {
      return Promise.resolve(existingMetadata)
    }
    const vm = gvViewManager() ? gvViewManager() as MultiSceneViewManager : undefined
    const camera = vm?.getCameraByIndex(this.cameraIndex)?.getThreeCamera()
    return assetManager.getTexturePixelsOrNull(constants.OCCLUSION_MAP_ASSET_NAME).then((pixelsData) => {
      const pixels = pixelsData?.pixels
      let min = 10000
      let max = -10000
      if (!pixels) {
          // If no depth data available, mock the scene limits using the camera's near/far properties
          return { min: camera?.near || min, max: camera?.far || max }
      }
      for (let i = 0; i < pixels.data.length; i += 4) {
          // Equation used from the manifest docs to get depth in meters
          const z = 0.0000390625 * (pixels.data[i] * 65536.0 + pixels.data[i + 1] * 256.0 + pixels.data[i + 2])
          min = Math.min(min, z)
          max = Math.max(max, z)
      }
      return { min, max }
    })
  }

  protected abstract buildLights(assetsList: AssetsList):
    Promise<{
      directionalLights: THREE.DirectionalLight[]
      pointLights: THREE.PointLight[]
      spotLights: THREE.SpotLight[]
      areaLights: THREE.RectAreaLight[]
      helperObjects: THREE.Object3D[]
    }>

  protected buildFloorShadowPlane(assetManager: AssetManager, resultScene: ImageBasedScene) {
    const threeScene = resultScene.getSceneFront()
    const planeOrientation = resultScene.getPlaneData()
    const planeData = planeOrientation?.planeData?.map(plane => plane as PlaneType)
    if (!threeScene || !planeData || planeData.length === 0) {
        return Promise.resolve()
    }

    const isDollhouseView = gvViewManager()?.getIsDollhouseView()
    const isTopView = gvViewManager()?.getIsTopView()
    const isCameraAboveCeiling = isDollhouseView || isTopView || false
    const shouldMaskShadowPlane = this.settings.isSyntheticScene && isCameraAboveCeiling

    return (shouldMaskShadowPlane
      ? assetManager.getTextureOrNull(constants.SEGMENTATION_ASSET_NAME)
      : Promise.resolve(null))
    .then((textureRecord) => {
      const floorPlane = getFloorPlane(planeData)
      const segmentationTexture = textureRecord?.texture
      const shadowobj = WallspiceWebgl.createAppMesh(floorPlane, 0, { segmentationTexture }) as THREE.Mesh
      shadowobj.visible = this.settings.onOffOptions.showShadows
      shadowobj.layers.enable(constants.AO_PANO_LAYER)
      resultScene.setShadowPlane(shadowobj)
      assetManager.releaseTexture(constants.SEGMENTATION_ASSET_NAME)
    })
  }

  protected initializeEnvMap(height: number, assetsList: AssetsList, assetManager: AssetManager,
    resultScene: ImageBasedScene, renderEngine: BaseRenderEngine<GeomBaseScene>): Promise<EnvMapsSet> {
    const empty: EnvMapsSet = {
      roomHasEquirectangular: false,
      roomHasRenderedEquirectangular: false,
      loadedDefault: null,
      generatedDefault: null,
      clamShell: null,
    }
    return assetManager.getTextureOrNull(constants.PANORAMA_ASSET_NAME)
      .then((panoTextureRecord) => {
        const panoTexture = panoTextureRecord?.texture
        if (!panoTexture) {
          return empty
        }
        return initializeEnvMap(height, assetsList, assetManager, resultScene, renderEngine, this.settings, panoTexture)
          .then((envMapsSet) => envMapsSet)
      })
      .then((envMapsSet) => {
        gvStartupWarden()?.markStartupStage(ENVIRONMENT_MAP_READY)
        return envMapsSet
      })
  }

  protected initializeDefaultLights(lightObjects: { areaLights: THREE.Light[], spotLights: THREE.Light[],
    pointLights: THREE.Light[], directionalLights: THREE.Light[] }, resultScene: ImageBasedScene) {
    // Create a fallback directional light if no lights are available.
    const sceneHasLights = lightObjects.areaLights.length
      + lightObjects.directionalLights.length
      + lightObjects.pointLights.length
      + lightObjects.spotLights.length > 0
    if (!sceneHasLights) {
      const defaultDirectionalLight = WallspiceWebgl.createDirectionalColoredLight(
        { color: [255, 255, 255], position: [-1, 1, 1.5], intensity: 0.6, direction: [-1, 1, 1.5] },
        true /* cast shadow */,
        this.maxTextureSize,
        this.settings.onOffOptions.usePBR,
      )
      resultScene.getSceneFront()?.add(defaultDirectionalLight)
    }
  }

  protected buildSceneFrontDebugObjects(_assetsList: AssetsList,
    mainLight: THREE.Light | undefined, resultScene: ImageBasedScene) {
    // Build a shadow map visualizer.
    if (mainLight) {
      const shadowMapDebugObj = new ShadowMapViewer(mainLight)
      shadowMapDebugObj.size.width = 800
      shadowMapDebugObj.size.height = 800
      shadowMapDebugObj.update()
      resultScene.setShadowMapDebugObj(shadowMapDebugObj)
    }

    // Build plane polygons debug object.
    const planePolygons = resultScene.getPolygonData()
    const polygonData = planePolygons?.plane_polygons?.map(polygon => polygon as PolygonType)
    if (polygonData) {
      const planePolygonsMesh = buildPlanePolygonsMesh(polygonData)
      planePolygonsMesh.scale.set(0.3, 0.3, 0.3)
      planePolygonsMesh.updateMatrixWorld(true)

      const bbox = new THREE.Box3().setFromObject(planePolygonsMesh)
      const center = bbox.getCenter(new THREE.Vector3())
      const bsphere = bbox.getBoundingSphere(new THREE.Sphere(center))
      const delta = planePolygonsMesh.position.clone().sub(center)

      const vm = gvViewManager() ? gvViewManager() as MultiSceneViewManager : undefined
      const currentCamera = vm?.getCameraByIndex(this.cameraIndex)
      const currentThreeCamera = currentCamera?.getThreeCamera()
      if (currentCamera && currentThreeCamera) {
        const verticalFov = currentThreeCamera?.fov
        const stepDistance = bsphere.radius / Math.sin(verticalFov)
        const { x, y, z } = currentCamera.getLocation()
        const { dx, dy, dz } = currentCamera.getUnitViewDir()
        planePolygonsMesh.position.set(
          x + dx * stepDistance * 1.5 + delta.x,
          y + dy * stepDistance * 1.5 + delta.y,
          z + dz * stepDistance * 1.5 + delta.z,
        )
        planePolygonsMesh.updateMatrixWorld(true)
      }

      resultScene.setPlanePolygonsDebugObj(planePolygonsMesh)
      planePolygonsMesh.visible = false
    }

    // Initialize vanishing lines debug objects.
    const planeOrientation = resultScene.getPlaneData()
    const planeData = planeOrientation?.planeData?.map(plane => plane as PlaneType)
    if (planeData) {
      const floorPlane = getFloorPlane(planeData)
      const vanishingLinesObjects = [1, 2, 3].map((index) => {
        const obj = WallspiceWebgl.createAppMesh(floorPlane, index)
        obj.visible = this.debugSettings.linesViz
        return obj
      })
      resultScene.setVanishingLinesDebugObj(vanishingLinesObjects)
    }
  }
}
