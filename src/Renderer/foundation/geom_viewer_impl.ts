import type { DebugSettings } from 'Renderer/geomviewer/geom_debug';
import { InputState } from 'Renderer/inputhandler/types';
import {
  GvResult,
  GlContextInfo,
  PersistUserData,
  SceneInfo,
  ViewerAction,
  ViewerSettings,
  ViewerStatus,
  ViewerInfo,
  SceneItemParameters,
  ModifyItemParameters,
  CameraModeParameters,
  SceneItemInfo,
  ColorRepresentation,
  RenderingLibraries,
  Composition,
  RenderItemComplete,
  CompositionExport,
  Corners,
  Point2D,
  PointXYZ,
  PlacementFromStrokesResult,
  AdjustedPlacementInfo
} from 'Renderer/geomviewer/geom_types';
import type { GeomViewerType } from 'Renderer/geomviewer/geom_viewer'
import Renderer from 'Renderer/index'
import { getGrandCentral, GrandCentral } from 'Renderer/GrandCentral'
import type {
  ViewerLegacyCallbackNotification,
  ViewerStateUpdateNotification,
  ViewerErrorNotification,
} from 'Renderer/geomviewer/geom_notifications';
import {
  NOTIFY_VIEWER_LEGACY_CALLBACK,
  NOTIFY_VIEWER_STATE_UPDATE,
  NOTIFY_VIEWER_ERROR,
  NOTIFY_GPU_STATS,
} from 'Renderer/geomviewer/geom_constants';
import {
  GpuMemoryStats,
  PerformanceStats,
  RoomDownloadStats,
  SceneItemMetrics,
  SceneLoadingStats
} from 'Renderer/geomviewer/geom_stats';
import { persistUserDataToLegacyUserData } from 'Renderer/geomviewer/legacy'
import { GeomViewerContext } from 'Renderer/foundation/geom_viewer_context'
import { SingleSceneViewManager } from 'Renderer/multiview/singlescene_view_manager';
import { MultiSceneViewManager } from 'Renderer/multiview/multiscene_view_manager';
import { CameraManager } from 'Renderer/multiview/camera_manager';
import { StartupWarden, WASM_LOAD_COMPLETE } from 'Renderer/StartupWarden';
import { InputHandler } from 'Renderer/inputhandler/InputHandler';
import { GeomViewerModel } from 'Renderer/foundation/geom_viewer_model';
import { InitialPosInfo } from 'Renderer/positioning/positioning_types';
import type FurnitureItem3D from "Renderer/model/FurnitureItem3D";
import type { BaseItem } from "Renderer/model/BaseItem";
import type { MeshScene } from 'Renderer/rendering/MeshScene';
import { dropItemsToFloor } from "Renderer/model/StackablesRelocate";
import { allScenesAreStandard3D } from 'models/scenes/utils';
import FlatRenderer from 'Renderer/rendering/FlatRenderer';
import {
  computePlacementFromStrokes,
  adjustPlacement,
  movePlacement,
} from 'Renderer/rendering/placementCalculator';
import { extractPlacementFrom3dCompositionProps, furniturePropsToFurnitureItemParams } from 'utils/geomviewer_utils';
import DecorateEngineFactory, { MainModule as DecorateEngine } from '@geomagical/sugarcube-rendering-shared'
import { 
  SENTRY_BREADCRUMB_CATEGORY,
  NOTIFY_COMPOSITION_LOADING_BEGIN,
  NOTIFY_COMPOSITION_LOADING_END
} from 'Renderer/constants';
import * as Sentry from '@sentry/react'
import { isFurnitureItem3D, isArtItem3D, shouldShowProductDimensions } from 'Renderer/rendering/scene_utils'
import { CachedGPUDetector } from 'Renderer/gpuDetect/CachedGPUDetector';
import { ColorIdRenderer } from 'Renderer/ColorIdRenderer'
import { ForegroundRenderer } from 'Renderer/ForegroundRenderer'
import { PinsManager } from 'Renderer/PinsManager'
import { gvClearPositioningContext, gvInitPositioningContext } from 'Renderer/positioning/positioning_context';
import { GlobalPositioningContext } from 'Renderer/positioning/global_positioning_context';
import { generateHDRfromCubemap } from 'Renderer/rendering/envmap_rendering_utils';
import { SOURCETYPE_CAPTURED } from 'models/scenes/constants';
import { LIST_OF_UNSUPPORTED_SHOWROOMS } from '../../constants/roomDimensions';
import {
  gvClearContext, gvCurrentScene, gvCurrentCamera,
  gvInitContext, gvInitDecorateEngine, gvClearDecorateEngine,
  gvRenderLibrary
} from './geom_app';

// GeomViewerApi is effectively a namespace for the GeomViewer API implementation.
// It's factory function buildGeomViewerApi creates a GeomViewerType object, maps
// each function property to a corresponding internal function and returns it.
class GeomViewerApi {
  // Retain a reference to the API object so that it may be re-used.
  static geomViewerApi?: GeomViewerType;

  // Context data, including objects shared throughout the viewer.
  static geomViewerContext?: GeomViewerContext;

  // Hold on to the GL info received in the onReady Renderer callback for queries.
  static glContextInfo?: GlContextInfo;

  // Keep track of init failure reported through onInitializationFailure Renderer callback.
  static rendererInitFailed = false;

  // Retain a reference to this UI callback, used to persist user data.
  static onUpdateUserProperties?: (userProps: PersistUserData) => void;

  // Returns a GeomViewerType with all the API function populated. This is
  // essentially a factory function.
  static buildGeomViewerApi(): GeomViewerType {
    if (!GeomViewerApi.geomViewerApi) {
      GeomViewerApi.geomViewerApi = {
        getGrandCentral,
        startViewer: GeomViewerApi.startViewer,
        shutdownViewer: GeomViewerApi.shutdownViewer,
        changeViewerSettings: GeomViewerApi.changeViewerSettings,
        changeDebugSettings: GeomViewerApi.changeDebugSettings,
        getViewerStatus: GeomViewerApi.getViewerStatus,
        getGlContextInfo: GeomViewerApi.getGlContextInfo,
        queryViewerInfo: GeomViewerApi.queryViewerInfo,
        queryGpuMemoryUsage: GeomViewerApi.queryGpuMemoryUsage,
        queryPerformanceStats: GeomViewerApi.queryPerformanceStats,
        queryDownloadMetrics: GeomViewerApi.queryDownloadMetrics,
        querySceneLoadingStats: GeomViewerApi.querySceneLoadingStats,
        queryItemMetrics: GeomViewerApi.queryItemMetrics,
        querySceneItemInfo: GeomViewerApi.querySceneItemInfo,
        queryRoomDimensionsInfo: GeomViewerApi.queryRoomDimensionsInfo,
        queryProductDimensionsInfo: GeomViewerApi.queryProductDimensionsInfo,
        queryDynamicMeasurementsInfo: GeomViewerApi.queryDynamicMeasurementsInfo,
        handleUIEvent: GeomViewerApi.handleUIEvent,
        doAction: GeomViewerApi.doAction,
        addSceneItem: GeomViewerApi.addSceneItem,
        deleteSceneItem: GeomViewerApi.deleteSceneItem,
        selectSceneItem: GeomViewerApi.selectSceneItem,
        modifySceneItem: GeomViewerApi.modifySceneItem,
        aboutToSwapItem: GeomViewerApi.aboutToSwapItem,
        setCurrentView: GeomViewerApi.setCurrentView,
        updateViewThumbnail: GeomViewerApi.updateViewThumbnail,
        setCameraMode: GeomViewerApi.setCameraMode,
        forceOrbitModeAllowed: GeomViewerApi.forceOrbitModeAllowed,
        setWallColor: GeomViewerApi.setWallColor,
        setRoomDimensionsEnabled: GeomViewerApi.setRoomDimensionsEnabled,
        setProductDimensionsEnabled: GeomViewerApi.setProductDimensionsEnabled,
        setDynamicMeasurementsEnabled: GeomViewerApi.setDynamicMeasurementsEnabled,
        zoom: GeomViewerApi.zoom,
        setCameraDollyDistance: GeomViewerApi.setCameraDollyDistance,
        setLeftButtonPanningEnabled: GeomViewerApi.setLeftButtonPanningEnabled,
        loadComposition: GeomViewerApi.loadComposition,
        exportComposition: GeomViewerApi.exportComposition,
        exportEnvmap: GeomViewerApi.exportEnvmap,
        signalCompositionLoadingBegin: GeomViewerApi.signalCompositionLoadingBegin,
        signalCompositionLoadingEnd: GeomViewerApi.signalCompositionLoadingEnd,
        requestGPUStats: GeomViewerApi.requestGPUStats,
        queryPlacementFromStrokes: GeomViewerApi.queryPlacementFromStrokes,
        queryAdjustedPlacement: GeomViewerApi.queryAdjustedPlacement,
        queryMovedPlacement: GeomViewerApi.queryMovedPlacement,
        eraseSegmentsFromStrokes: GeomViewerApi.eraseSegmentsFromStrokes,
        getViewportSize: GeomViewerApi.getViewportSize,
        renderFlat: GeomViewerApi.renderFlat,
        computeForegroundRatio: GeomViewerApi.computeForegroundRatio,
      }
    }

    return GeomViewerApi.geomViewerApi;
  }

  // =======================================================================
  // Each of the functions below implements the corresponding API function.
  // =======================================================================

  private static startViewer(
    canvas: HTMLCanvasElement,
    scene: SceneInfo,
    restoredUserData: PersistUserData,
    viewerSettings: ViewerSettings,
    debugSettings: DebugSettings,
    onUpdateUserProperties: (userProps: PersistUserData) => void,): GvResult {

    GeomViewerApi.onUpdateUserProperties = onUpdateUserProperties;


    let viewManager = null;
    const isLegacyRoom = !allScenesAreStandard3D(scene)
    if (isLegacyRoom) {
      // Legacy / image based scenes are handled by the MultiSceneViewManager
      // which contain a new scene for each view. 
      viewManager = new MultiSceneViewManager();
    } else {
      // Whole room scenes, i.e., Standard3D scenes, are handled by the
      // SingleSceneViewManager, which contains a single scene for all views.
      viewManager = new SingleSceneViewManager();
    }

    // Setup the viewer context early. The view manager and startup warden are used during the
    // initialization sequence.
    GeomViewerApi.geomViewerContext = new GeomViewerContext(new StartupWarden(),
      viewManager, new CameraManager(debugSettings, viewerSettings, isLegacyRoom));
    gvInitContext(GeomViewerApi.geomViewerContext);
    gvInitPositioningContext(new GlobalPositioningContext())

    // Initialize the rendering shared 
    DecorateEngineFactory().then((f: DecorateEngine) => { 
      gvInitDecorateEngine(f)
      GeomViewerApi.geomViewerContext?.startupWarden?.markStartupStage(WASM_LOAD_COMPLETE)
    }).catch(reason => {  
      let safeReason;
      try {
        safeReason = JSON.stringify(reason);
      } catch (e) {
        safeReason = String(reason);
      }
      const event = {
          message: `WebAssembly for sugarcube-rendering-shared could not be loaded`,
          breadcrumbs: [
              {
                  type: `error`,
                  category: SENTRY_BREADCRUMB_CATEGORY,
                  data: {
                    reason: safeReason
                  }
              }
          ]
      }
      Sentry.captureEvent(event)
    })

    let renderer = Renderer.getInstance();
    if (!renderer) {
      // Map the API's restored user data into the saveData parameter for the old
      // Renderer interface.
      const saveData = persistUserDataToLegacyUserData(restoredUserData)

      // Likewise, map the API's viewer settings into the previewSettings for the
      // old Renderer interface.
      const {
        maxTextureSize,
        onOffOptions,
        featureFlags,
        mobileFeatures,
        ...leftoverSettings } = viewerSettings;
      const previewSettings = { ...onOffOptions, ...featureFlags, ...leftoverSettings };

      const renderlib = RenderingLibraries.Three
      // Create the Renderer instance. All callback functions are routed to local
      // functions, which will in turn send notifications or invoke an API callback
      // as appropriate.
      Renderer.newInstance({
        renderlib,
        canvas,
        scene,
        debugSettings,
        previewSettings,
        onFirstRender: GeomViewerApi.onFirstRender,
        onReady: GeomViewerApi.onViewerReady,
        saveData,
        onUpdateSaveData: GeomViewerApi.onUpdateSaveData,
        onWallDataReady: GeomViewerApi.onWallDataReady,
        maxTextureSize,
        updateHiddenSurfaces: GeomViewerApi.onUpdateHiddenSurfaces,
        onInitializationFailure: GeomViewerApi.onInitializationFailure,
        mobileFeatures,
        viewerSettings,
        restoredUserData,
      });

      renderer = Renderer.getInstance();
      if (renderer) {
        // Finish setting up the context now that we have a renderer.
        const model = new GeomViewerModel(renderer)
        const colorIdRenderer = new ColorIdRenderer(debugSettings.pinsColorIdInflation,
            debugSettings.pinsColorIdInflationMultiplier, previewSettings.enableDebugControls)
        const pinsManager = new PinsManager(previewSettings.enableDebugControls)
        GeomViewerApi.geomViewerContext.setColorIdRenderer(colorIdRenderer)
        GeomViewerApi.geomViewerContext.setPinsManager(pinsManager)
        GeomViewerApi.geomViewerContext.setInputHandler(new InputHandler(renderer))
        GeomViewerApi.geomViewerContext.setModel(model);

        const isShowroomUnsupported = scene.sceneId && LIST_OF_UNSUPPORTED_SHOWROOMS.includes(scene.sceneId)       
        const isCapturedImageRoom = scene.sourceType === SOURCETYPE_CAPTURED && isLegacyRoom

        if (restoredUserData.measurements && featureFlags) {
          const {roomDimensions, productDimensions, dynamicMeasurements} = restoredUserData.measurements

          if (featureFlags.autoShowProductDimensions === true) {
            GeomViewerApi.geomViewerContext?.model?.storeProductDimensionsEnabled(true)  
          } else {
            GeomViewerApi.geomViewerContext?.model?.storeProductDimensionsEnabled(productDimensions)  
          }

          if (restoredUserData.measurements) {
            GeomViewerApi.geomViewerContext?.model?.storeRoomDimensionsEnabled(roomDimensions)  
            GeomViewerApi.geomViewerContext?.model?.storeDynamicMeasurementsEnabled(dynamicMeasurements)  
          }
        }

        if (isShowroomUnsupported) {
          GeomViewerApi.geomViewerContext?.model?.storeRoomDimensionsEnabled(false)  
        }

        if (isCapturedImageRoom) {
          GeomViewerApi.geomViewerContext?.model?.storeProductDimensionsEnabled(false)  
          GeomViewerApi.geomViewerContext?.model?.storeRoomDimensionsEnabled(false)  
          GeomViewerApi.geomViewerContext?.model?.storeDynamicMeasurementsEnabled(false)  
        }

        if (restoredUserData.wallPaint) {
          // Persisted wall color data contains color values for each wall separately, but currently these values are
          // always the same (different wall colors are not supported), so we can use only the first one, if any.
          const values = Object.values(restoredUserData.wallPaint);
          if (values.length > 0) {
            GeomViewerApi.geomViewerContext?.model?.storeWallColor(values[0]);
          }
        }

        if (viewerSettings.onOffOptions.magicEraserMode) {
          GeomViewerApi.geomViewerContext.inputHandler?.startMagicEraser();
          GeomViewerApi.geomViewerContext?.model?.storeDynamicMeasurementsEnabled(false)  
        }
      }
    }

    return {
      ok: (renderer !== undefined),
      errorMsg: renderer ? undefined : `GeomViewer failed to start`
    }
  }

  private static shutdownViewer() {
    GeomViewerApi.geomViewerContext?.model?.cleanup();
    GeomViewerApi.geomViewerContext?.cameraManager?.cleanup();

    const renderer = Renderer.getInstance();
    renderer?.cleanup();

    GeomViewerApi.geomViewerContext = undefined;
    gvClearPositioningContext()
    gvClearContext()
    gvClearDecorateEngine()
  }

  private static changeViewerSettings(settings: ViewerSettings) {
    const renderer = Renderer.getInstance();
    const {
      maxTextureSize,
      onOffOptions,
      featureFlags,
      mobileFeatures,
      ...leftoverSettings } = settings;
    const flatSettings = { ...onOffOptions, ...featureFlags, ...leftoverSettings };
    renderer?.updateSettings(flatSettings, settings);

    if (settings.onOffOptions.magicEraserMode) {
      GeomViewerApi.geomViewerContext?.inputHandler?.startMagicEraser();
    } else {
      GeomViewerApi.geomViewerContext?.inputHandler?.stopMagicEraser();
    }
  }

  private static changeDebugSettings(debugSettings: DebugSettings) {
    const renderer = Renderer.getInstance();
    renderer?.updateDebugSettings(debugSettings);

    const cameraManager = GeomViewerApi.geomViewerContext?.cameraManager
    cameraManager?.applySettings(debugSettings)
  }

  private static getViewerStatus(): ViewerStatus {
    const renderer = Renderer.getInstance();
    if (renderer) {
      if (!renderer.activeRenderer) {
        return `shutting-down`;
      }
      if (renderer.isWeblGlContextLost()) {
        return `context-lost`;
      }
      if (!renderer.isRendererValid() || GeomViewerApi.rendererInitFailed) {
        return `init-failed`;
      }
      if (renderer.getHasRendered()) {
        return `running`;
      }
      if (renderer.fullyInitialized) {
        return `ready`;
      }

      return `initializing`;
    }

    return `not-started`;
  }

  private static getGlContextInfo(): GlContextInfo | undefined {
    return GeomViewerApi.glContextInfo;
  }

  private static queryViewerInfo(): ViewerInfo {
    const renderer = Renderer.getInstance();
    const viewManager = GeomViewerApi.geomViewerContext?.viewManager;
    const cameraManager = GeomViewerApi.geomViewerContext?.cameraManager
    const scene = viewManager?.getCurrentViewScene()
    const model = GeomViewerApi.geomViewerContext?.model

    return {
      status: GeomViewerApi.getViewerStatus(),
      isMagicEraserScene: renderer ? renderer.hasMagicEraserData() : false,
      erasableItems: renderer ? renderer.getNumErasableSegments() : 0,
      numStaticStackableSurfaces: renderer ? renderer.getNumStaticStackableSurfaces() : 0,
      canonicalView: viewManager?.getCanonicalViewLabel(),
      views: viewManager?.getAllViewLabels(),
      currentView: viewManager?.getCurrentView(),
      dimensions: scene?.getDimensions(),
      cameraState: cameraManager?.getCameraState(),
      roomDimensionsEnabled: scene?.getRoomDimensionsEnabled(),
      productDimensionsEnabled: model?.retrieveProductDimensionsEnabled(),
      dynamicMeasurementsEnabled: model?.retrieveDynamicMeasurementsEnabled(),
    }

  }

  private static queryGpuMemoryUsage(): GpuMemoryStats {
    const renderer = Renderer.getInstance();
    if (renderer) {
      return renderer.queryGpuMemoryUsage();
    }
    return {
      currentBufferMemory: 0,
      currentTextureMemory: 0,
    };
  }

  private static queryPerformanceStats(): PerformanceStats | undefined {
    const renderer = Renderer.getInstance();
    return renderer?.getHistogramStats();
  }

  private static queryDownloadMetrics(): RoomDownloadStats {
    const stats: RoomDownloadStats = {
      modelsCount: 0,
      totalModelsLoadSizeMB: 0,
      sceneAdditionalDataSizeMB: 0,
    }

    const renderer = Renderer.getInstance();
    if (renderer) {
      const glbStats = renderer.getRoomGlbStats();
      const sceneDataSize = renderer.getRoomAdditionalStats();
      stats.modelsCount = glbStats.modelsCount;
      stats.totalModelsLoadSizeMB = glbStats.totalModelsLoadSizeMB;
      stats.sceneAdditionalDataSizeMB = sceneDataSize.sceneAdditionalDataSizeMB;
    }

    return stats;
  }

  private static querySceneLoadingStats(): SceneLoadingStats {
    const stats: SceneLoadingStats = {
      msBuildScene: 0,
      msRenderFirstFrame: 0,
      msParseFurnitureData: 0,
      msUploadFurnitureTextures: 0,
      msUpdateRenderItemsReact: 0,
      msTotalRenderingTime: 0,
    }

    const renderer = Renderer.getInstance();
    if (!renderer) {
      return stats
    }

    const rendererStats = renderer.getLoadingStats()
    stats.msBuildScene = rendererStats.msBuildScene
    stats.msRenderFirstFrame = rendererStats.msFirstFrame
    stats.msTotalRenderingTime = rendererStats.msTotalRenderingTime

    const renderItems = gvCurrentScene()?.getRenderItems()
    if (!renderItems) {
      return stats
    }

    const currentTime = Date.now()

    let furnitureFlushStart = currentTime
    let furnitureDataParsingStart = currentTime

    Array.from(renderItems).forEach((item) => {
      const itemMetrics = item.getMetric()

      stats.msUploadFurnitureTextures += itemMetrics.msEndFlush - itemMetrics.msEndLoad
      stats.msUpdateRenderItemsReact += itemMetrics.msReactUpdateTime

      // Furniture parsing and decompression happens between earliest msStartParsing and earliest msEndLoad
      furnitureFlushStart = Math.min(furnitureFlushStart, itemMetrics.msEndLoad)
      if (itemMetrics.msStartParsing > 0) {
        furnitureDataParsingStart = Math.min(furnitureDataParsingStart, itemMetrics.msStartParsing)
      }
    })

    stats.msParseFurnitureData = furnitureFlushStart - furnitureDataParsingStart

    return stats
  }

  private static queryRoomDimensionsInfo() {
    const dimensions = GeomViewerApi.geomViewerContext?.viewManager?.getCurrentViewScene()?.getVisualRoomDimensions()
    if (!dimensions) {
      return undefined
    }
    return dimensions.getDimensionsInfo()
  }

  private static queryProductDimensionsInfo(itemId: string) {
    const renderItem = GeomViewerApi.geomViewerContext?.viewManager?.getCurrentViewScene()?.getRenderItem(itemId)
    if (!isFurnitureItem3D(renderItem) && !isArtItem3D(renderItem)) {
      return undefined
    }
    if (!shouldShowProductDimensions(renderItem)) {
      return undefined
    }
    const dimensions = renderItem.getProductDimensions()
    return dimensions.getDimensionsInfo()
  }

  private static queryDynamicMeasurementsInfo() {
    const measurements = GeomViewerApi.geomViewerContext?.viewManager?.getCurrentViewScene()?.getDynamicMeasurements()
    if (!measurements) {
      return undefined
    }
    return measurements.getMeasurementsInfo()
  }

  private static handleUIEvent(event: UIEvent, draggingRenderItemId?: number, buttons?: number) {
    const cameraManager = GeomViewerApi.geomViewerContext?.cameraManager;
    const inputHandler = GeomViewerApi.geomViewerContext?.inputHandler;

    switch (event.type) {
      case 'mouseenter':
        if (buttons === 0 && !cameraManager?.onPointerLeave()) {
            inputHandler?.onPointerLeave(event as PointerEvent)
        }
        break;
      case 'mousemove':
      case 'pointermove': {
        // Camera orbiting supports mouse move out of canvas bounds, in which case the target
        // is the whole document. Input handler should ignore that kind of event.
        const isDocumentEvent = event.currentTarget instanceof Document
        if (!cameraManager?.onPointerMove(event as PointerEvent) && !isDocumentEvent) {
          inputHandler?.onPointerMove(event as PointerEvent)
        }
        break;
      }
      case 'mousedown':
      case 'pointerdown':
        if (!cameraManager?.onPointerDown(event as PointerEvent)) {
          inputHandler?.onPointerDown(event as PointerEvent)
        }
        break;
      case 'mouseleave':
      case 'pointerleave':
        if (draggingRenderItemId) {
          break;
        } else if (!cameraManager?.onPointerLeave()) {
          inputHandler?.onPointerLeave(event as PointerEvent)
        }
        break;
      case 'mouseup':
      case 'pointerup':
      case 'pointercancel':
        if (!cameraManager?.onPointerUp(event as PointerEvent)) {
          inputHandler?.onPointerUp(event as PointerEvent)
        }
        break;
      case 'pointerover':
        if (!cameraManager?.onPointerOver(event as PointerEvent)) {
          inputHandler?.onPointerOver(event as PointerEvent)
        }
        break;
      case 'click':
        inputHandler?.onClick(event as MouseEvent)
        break;
      case 'keydown':
        if (!cameraManager?.onKeyDown(event as KeyboardEvent)) {
          inputHandler?.onKeyDown(event as KeyboardEvent)
        }
        break
      case 'keyup':
        cameraManager?.onKeyUp(event as KeyboardEvent)
        break
      case 'wheel':
        cameraManager?.onWheelMove(event as WheelEvent)
        break
      default:
        break;
    }
  }

  private static setCurrentView(view: string) {
    const viewManager = GeomViewerApi.geomViewerContext?.viewManager;
    // If there's a pending placement, cancel that first.
    GeomViewerApi.cancelPlacementMode();
    // Deselect all to not carry any selection on view change.
    GeomViewerApi.geomViewerContext?.inputHandler?.deselectAll()
    viewManager?.setCurrentView(view, true);
  }

  private static updateViewThumbnail(canvas: HTMLCanvasElement, viewId: string) {
    const viewManager = GeomViewerApi.geomViewerContext?.viewManager;
    if (viewManager) {
      viewManager.renderToCanvas(canvas, viewId)
    }
  }

  private static getViewportSize(): { width: number; height: number } | undefined {
    const canvas = GeomViewerApi.geomViewerContext?.viewManager?.getRenderEngine()?.getThreeRenderer()?.domElement
    if (!canvas) return undefined
    return { width: canvas.width, height: canvas.height }
  }

  private static renderFlat(width: number, height: number) : HTMLCanvasElement | undefined {
    const scene = gvCurrentScene()
    const renderEngine = GeomViewerApi.geomViewerContext?.viewManager?.getRenderEngine()
    const camera = gvCurrentCamera()
    const threeCamera = camera?.getThreeCamera()
    if (!scene || !renderEngine || !threeCamera) return undefined

    const flatRenderer = new FlatRenderer(
      (canvas: HTMLCanvasElement) => renderEngine.renderToCanvas(canvas),
      scene,
      renderEngine.getThreeRenderer() as THREE.WebGLRenderer
    )
    const canvas = flatRenderer.render(threeCamera, width, height)
    return canvas
  }

  private static computeForegroundRatio(width: number, height: number): number {
    const foregroundRenderer = 
        new ForegroundRenderer(
          gvCurrentScene()?.getObjectsScene(), 
          gvRenderLibrary()?.renderer, 
          gvCurrentCamera()?.getThreeCamera())

    foregroundRenderer.setSize(width, height)
    return foregroundRenderer.computeForegroundRatio()
  }

  private static setWallColor(color?: ColorRepresentation) {
    const renderer = Renderer.getInstance();
    if (renderer) {
      renderer.setWallColor(color);
    }
    GeomViewerApi.geomViewerContext?.model?.storeWallColor(color);
  }

  private static doAction(action: ViewerAction): GvResult {
    const selectedAction = GeomViewerApi.actionMap[action]

    if (selectedAction.isValid()) {
      selectedAction.doAction()
      return { ok: true }
    }

    return { ok: false, errorMsg: `Action ${action} is not valid in current context.` }
  }

  private static addSceneItem(
    uniqueId: string,
    itemParameters: SceneItemParameters): GvResult {

    const renderer = Renderer.getInstance();
    if (renderer) {
      // If there's a pending placement, cancel that first.
      GeomViewerApi.cancelPlacementMode();

      const check = GeomViewerApi.validateAddSceneItemParameters(uniqueId, itemParameters);
      if (!check.ok) {
        return check
      }

      switch (itemParameters.itemKind) {
        case 'art-item':
          {
            const result = GeomViewerApi.geomViewerContext?.model?.addArtItem(
              uniqueId, itemParameters);
            if (result) {
              return result;
            }
          }
          break;
        case 'furniture-item': {
          const isSmartStackablePlacement =
            (itemParameters.itemOptions.pendingSmartaPlacement || itemParameters.itemOptions.hasSmartaPlacement)

          // If item is stackable and doesn't provide a parent surface nor position, nor smarta placement,
          // we start stackable placement mode via InputHandler.
          if (itemParameters.itemOptions.canStack &&
            !itemParameters.itemOptions.stackOnSurfaceId &&
            !itemParameters.placement &&
            !itemParameters.restoredPosition &&
            !itemParameters.legacyPosition &&
            !itemParameters.itemOptions.isAddedFromDuplicate &&
            !isSmartStackablePlacement) {
            GeomViewerApi.startPlacementMode(uniqueId, itemParameters);
            return { ok: true }
          }

          const result = GeomViewerApi.geomViewerContext?.model?.addFurnitureItem(
            uniqueId, itemParameters);
          if (result) {
            return result;
          }
          break;
        }
        default:
          return { ok: false, errorMsg: `Not implemented` };
      }
    }

    return { ok: false, errorMsg: `Viewer is not started` }
  }

  private static deleteSceneItem(itemId: string): GvResult {
    const renderer = Renderer.getInstance();
    if (renderer) {
      // If there's a pending placement, cancel that first.
      GeomViewerApi.cancelPlacementMode();

      const item = renderer.getRenderItem(itemId);
      if (!item) {
        return { ok: false, errorMsg: `ID ${itemId} is not in the scene` }
      }

      GeomViewerApi.geomViewerContext?.model?.deleteSceneItem(itemId);
      return { ok: true };
    }

    return { ok: false, errorMsg: `Viewer is not started` }
  }

  private static selectSceneItem(itemId: string): GvResult {
    const renderer = Renderer.getInstance();
    if (renderer) {
      // If there's a pending placement, cancel that first.
      GeomViewerApi.cancelPlacementMode();

      const item = renderer.getRenderItem(itemId);
      if (!item) {
        return { ok: false, errorMsg: `ID ${itemId} is not in the scene` }
      }

      GeomViewerApi.geomViewerContext?.inputHandler?.doSelectItem(itemId);
      return { ok: true };
    }

    return { ok: false, errorMsg: `Viewer is not started` }
  }

  private static modifySceneItem(itemId: string, modifyParameters: ModifyItemParameters): GvResult {
    const renderer = Renderer.getInstance();
    if (renderer) {
      // If there's a pending placement, cancel that first.
      GeomViewerApi.cancelPlacementMode();

      const result = GeomViewerApi.geomViewerContext?.model?.modifySceneItem(
        itemId, modifyParameters);
      if (result) {
        return result;
      }
    }

    return { ok: false, errorMsg: `Viewer is not started` }
  }

  private static setCameraMode(parammeters: CameraModeParameters) {
    const cameraManager = GeomViewerApi.geomViewerContext?.cameraManager
    if (cameraManager) {
      cameraManager.setCameraMode(parammeters)
    }
  }

  private static forceOrbitModeAllowed(allowed: boolean) {
    const cameraManager = GeomViewerApi.geomViewerContext?.cameraManager
    if (cameraManager) {
      cameraManager.setCameraMode({ mode: allowed ? `orbit` : `default` })
      cameraManager.setOrbitModeAllowed(allowed)
    }
  }

  private static setCameraDollyDistance(value: number) {
    const cameraManager = GeomViewerApi.geomViewerContext?.cameraManager
    if (cameraManager) {
      cameraManager.setCameraDollyDistance(value)
    }
  }

  private static setLeftButtonPanningEnabled(enabled: boolean) {
    const cameraManager = GeomViewerApi.geomViewerContext?.cameraManager
    if (cameraManager) {
      cameraManager.setLeftButtonPanningEnabled(enabled)
    }
  }

  private static zoom(factor: number) {
    const cameraManager = GeomViewerApi.geomViewerContext?.cameraManager
    const renderer = Renderer.getInstance();
    if (cameraManager && renderer) {
      cameraManager.zoom(factor)
      GeomViewerApi.geomViewerContext?.model?.setRendererIsDirty()
    }
  }

  private static aboutToSwapItem(itemId: string): GvResult {
    const renderer = Renderer.getInstance();
    if (renderer) {
      // If there's a pending placement, cancel that first.
      GeomViewerApi.cancelPlacementMode();

      GeomViewerApi.geomViewerContext?.model?.aboutToSwapItem(itemId);
      return { ok: true }
    }

    return { ok: false, errorMsg: `Viewer is not started` }
  }

  private static queryItemMetrics(itemId: string): GvResult<SceneItemMetrics> {
    const renderer = Renderer.getInstance();
    if (renderer) {
      const item = renderer.getRenderItem(itemId);
      if (item) {
        return { ok: true, retValues: item.getMetric() };
      }
      return { ok: false, errorMsg: `ID ${itemId} is not in the scene` }
    }

    return { ok: false, errorMsg: `Viewer is not started` }
  }

  private static querySceneItemInfo(itemId: string): GvResult<SceneItemInfo> {
    const renderer = Renderer.getInstance();
    if (renderer) {
      const result = GeomViewerApi.geomViewerContext?.model?.querySceneItemInfo(itemId);
      if (result) {
        return result
      }
    }

    return { ok: false, errorMsg: `Viewer is not started` }
  }

  private static queryPlacementFromStrokes(
    strokes: Point2D[][],
    options?: { forceFloorPlacement?: boolean, brushWidth?: number }
  ): GvResult<PlacementFromStrokesResult> {
    const scene = gvCurrentScene()
    const camera = gvCurrentCamera()
    if (!scene || !camera) {
      return { ok: false, errorMsg: `Viewer is not started` }
    }
    const result = computePlacementFromStrokes(
      scene.getSceneSampler(), scene.getDimensions(), camera, strokes, options,
    )
    if (!result) {
      return { ok: false, errorMsg: `No wall or floor surface found under strokes` }
    }
    return { ok: true, retValues: result }
  }

  private static queryAdjustedPlacement(
    prior: PlacementFromStrokesResult,
    newDimensions: { width: number; height: number; depth: number },
    options?: { forceFloorPlacement?: boolean; widthAnchor?: 'min' | 'max'; heightAnchor?: 'min' | 'max' }
  ): GvResult<AdjustedPlacementInfo> {
    const scene = gvCurrentScene()
    const camera = gvCurrentCamera()
    if (!scene || !camera) {
      return { ok: false, errorMsg: `Viewer is not started` }
    }
    const result = adjustPlacement(camera, scene.getDimensions(), prior, newDimensions, options)
    if (!result) {
      return { ok: false, errorMsg: `Failed to adjust placement dimensions` }
    }
    return { ok: true, retValues: result }
  }

  private static queryMovedPlacement(
    prior: PlacementFromStrokesResult,
    worldDelta: PointXYZ,
    options?: { forceFloorPlacement?: boolean }
  ): GvResult<AdjustedPlacementInfo> {
    const scene = gvCurrentScene()
    const camera = gvCurrentCamera()
    if (!scene || !camera) {
      return { ok: false, errorMsg: `Viewer is not started` }
    }
    const result = movePlacement(camera, scene.getDimensions(), prior, worldDelta, options)
    if (!result) {
      return { ok: false, errorMsg: `Failed to move placement` }
    }
    return { ok: true, retValues: result }
  }

  private static eraseSegmentsFromStrokes(
    strokes: Point2D[][],
    options?: {
      brushWidth?: number
      overrides?: { forceErased?: number[]; forceVisible?: number[] }
    }
  ): void {
    Renderer.getInstance()?.eraseSegmentsFromStrokes(strokes, options?.brushWidth, options?.overrides)
  }

  // =======================================================================
  // Non-API functions.
  // =======================================================================

  // Return the GeomViewer context. Maybe undefined if the viewer has not been started
  // or has been shutdown.
  static getContext(): GeomViewerContext | undefined {
    return GeomViewerApi.geomViewerContext;
  }

  // Renderer callback function: map callback to a GrandCentral notification.
  private static onFirstRender() {
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: {
        stateInfo: `FirstRender`,
      }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification);
  }

  // Renderer callback function: map callback to a GrandCentral notification.
  private static onViewerReady(contextInfo: GlContextInfo) {
    GeomViewerApi.glContextInfo = contextInfo;

    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: {
        stateInfo: `ViewerReady`,
        viewerReadyContextInfo: contextInfo,
      }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification);
  }

  // Renderer callback function: map callback to a GrandCentral notification.
  private static onInitializationFailure(
    info: { [key: string]: undefined | boolean | string | object }) {

    // The Renderer may call the onInitializationFailure callback many times,
    // notably for download failures. However, we want to dispatch a single
    // viewer-init error. With the flag below, we'll dispatch only the first
    // fatal init error.
    const shouldDispatchError = !GeomViewerApi.rendererInitFailed;

    // Keep track of init failures, except for TAA, which the Renderer recovers
    // from by switching to FXAA.
    if (!info.taafailure) {
      GeomViewerApi.rendererInitFailed = true;
    }

    if (shouldDispatchError) {
      const notification: ViewerErrorNotification = {
        what: NOTIFY_VIEWER_ERROR,
        payload: {
          error: `InitializationFailure`,
          initializationFailureInfo: info,
        }
      }
      GrandCentral.getDispatcher().dispatchNotification(notification);
    }
  }

  // Renderer callback function: map callback to a GrandCentral notification.
  private static onWallDataReady(wallWidth: number, wallHeight: number) {
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: {
        stateInfo: `WallDataReady`,
        wallDataInfo: { width: wallWidth, height: wallHeight },
      }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification);
  }

  // Renderer callback function: map callback to a GrandCentral notification.
  private static onUpdateHiddenSurfaces(surfaces: number[]) {
    const notification: ViewerLegacyCallbackNotification = {
      what: NOTIFY_VIEWER_LEGACY_CALLBACK,
      payload: {
        legacyCallback: `updateHiddenSurfaces`,
        updateHiddenSurfacesInfo: { surfaces }
      }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification);
  }

  // Renderer callback function onUpdateSaveData maps the data to the new API data
  // format and calls the new API callback function onUpdateUserProperties.
  private static onUpdateSaveData(
    saveData: {
      erasedSegments: number[],
    }
    // Note: trackingInfo is now queried with queryViewerInfo instead of being
    // bundled with the persistence data.
  ) {

    if (GeomViewerApi.onUpdateUserProperties) {
      const updateProp: PersistUserData = {
        magicEraser: {
          saveData,
        }
      }

      GeomViewerApi.onUpdateUserProperties(updateProp);
    }
  }

  private static validateAddSceneItemParameters(
    uniqueId: string,
    parameters: SceneItemParameters): GvResult {

    const renderer = Renderer.getInstance();
    const item = renderer?.getRenderItem(uniqueId);
    if (item) {
      return { ok: false, errorMsg: `ID ${uniqueId} is not unique` }
    }

    const badParam: GvResult = {
      ok: false,
      errorMsg: `Bad SceneItemParameters`,
    }
    switch (parameters.itemKind) {
      case 'art-item': {
        const options = parameters.itemOptions
        if (options === undefined) {
          return badParam
        }

        if (options.frameData === undefined ||
          options.image === undefined ||
          options.size === undefined) {
          return badParam;
        }
        break;
      }
      case 'furniture-item': {
        const options = parameters.itemOptions
        if (!options || !options.modelUrl) {
          return badParam;
        }
        break;
      }
      default:
        return { ok: false, errorMsg: `Unknown item kind` }
    }

    return { ok: true }
  }

  // Map action names to implementation, used by doAction.
  private static actionMap: { [K in ViewerAction]: {
    isValid: () => boolean,
    doAction: () => unknown
  } } = {
      'magic-eraser-show-all': {
        isValid: () => !!Renderer.getInstance()?.getMagicEraserMode(),
        doAction: () => Renderer.getInstance()?.setStaticFurnitureViz(true)
      },
      'magic-eraser-hide-all': {
        isValid: () => !!Renderer.getInstance()?.getMagicEraserMode(),
        doAction: () => Renderer.getInstance()?.setStaticFurnitureViz(false)
      },
      'on-canvas-resized': {
        isValid: () => !!Renderer.getInstance(),
        doAction: () => Renderer.getInstance()?.onCanvasResize()
      },
      'deselect-all': {
        isValid: () => !!GeomViewerApi.geomViewerContext?.inputHandler,
        doAction: () => GeomViewerApi.geomViewerContext?.inputHandler?.deselectAll()
      },
      'request-on-draw-idle': {
        isValid: () => !!Renderer.getInstance(),
        doAction: () => Renderer.getInstance()?.requestNotificationOnDrawIdle()
      },
      'exit-placement-mode': {
        isValid: GeomViewerApi.isInStackablePlacementMode,
        doAction: GeomViewerApi.exitPlacementMode
      },
      'cancel-placement-mode': {
        isValid: GeomViewerApi.isInStackablePlacementMode,
        doAction: GeomViewerApi.cancelPlacementMode
      },
      'enter-placement-mode': {
        isValid: () => !!GeomViewerApi.geomViewerContext?.inputHandler?.getSelectedItemId(),
        doAction: GeomViewerApi.startPlacementModeWithSelectedItem
      },
      'rebake-environment-map': {
        isValid: () => !!Renderer.getInstance(),
        doAction: GeomViewerApi.bakeEnvironmentMap
      }
    }

  private static isInStackablePlacementMode() {
    const inputHandler = GeomViewerApi.geomViewerContext?.inputHandler;
    return inputHandler?.getCurrentState() === InputState.Placing;
  }

  // Removes the selected item from the scene and uses its existing options
  // to enter into stackable placement mode.
  private static startPlacementModeWithSelectedItem() {
    const inputHandler = GeomViewerApi.geomViewerContext?.inputHandler;
    const selectedItemId = inputHandler?.getSelectedItemId()

    if (!selectedItemId) {
      return;
    }

    const viewerModel = GeomViewerApi.geomViewerContext?.model;
    const sceneItemParams = viewerModel?.querySceneItemParameters(selectedItemId);

    // Only stackable furniture items are allowed in stackable placement mode.
    if (sceneItemParams?.ok
      && sceneItemParams.retValues?.itemKind === 'furniture-item'
      && sceneItemParams.retValues?.itemOptions.canStack) {
      GeomViewerApi.startPlacementMode(selectedItemId, sceneItemParams.retValues);
    }
  }

  // Starts stackable placement mode via InputHandler and dispatches viewer notification.
  private static startPlacementMode(uniqueId: string, furnitureData: SceneItemParameters) {
    if (furnitureData.itemKind === "furniture-item") {
      GeomViewerApi.geomViewerContext?.model?.updateGhostItem(furnitureData.itemOptions)
    }

    const inputHandler = GeomViewerApi.geomViewerContext?.inputHandler;
    inputHandler?.startPlacementMode(uniqueId, furnitureData);

    // Dispatch notification so that client is aware of the placement mode state.
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: {
        stateInfo: `PlacementModeStarted`
      }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification);
  }

  // Ends stackable placement mode and puts pending item on the floor.
  private static exitPlacementMode() {
    const inputHandler = GeomViewerApi.geomViewerContext?.inputHandler;
    const pendingStackableItem = inputHandler?.getPendingStackable();

    if (pendingStackableItem?.id
      && pendingStackableItem?.parameters?.itemKind === 'furniture-item') {
      // Find suitable floor position.
      const scene = gvCurrentScene();
      const floorPosition = scene?.findPlaceableFloorPos() as InitialPosInfo;

      // Check if item already in scene.
      const sceneItem = scene?.getRenderItem(pendingStackableItem.id);
      if (!sceneItem) {
        // Item doesn't exists in the scene, so we will create a new item
        // placed on floor.
        pendingStackableItem.parameters.legacyPosition = floorPosition.pos2D;
        GeomViewerApi.geomViewerContext?.model
          ?.addFurnitureItem(pendingStackableItem.id, pendingStackableItem.parameters)
      } else {
        // Item exists, so we drop existing FurnitureItem to floor.
        const isFurnitureItem = (obj: BaseItem): obj is FurnitureItem3D => obj.isFurnitureItem();
        if (isFurnitureItem(sceneItem)) {
          dropItemsToFloor([sceneItem])
        }
      }
    }

    // Called after FurnitureItem setPlane because its there where stackedPlane UI state gets updated.
    // This makes render item have the updated stackedPlane when we exit placement mode so that it can be pulled
    // from the state.
    inputHandler?.stopPlacementMode(false /* not cancelling */);
  }

  // Ends stackable placement mode. If pending item was already in the scene
  // entering the mode, it stays in its original location, otherwise it's discarded.
  private static cancelPlacementMode() {
    const inputHandler = GeomViewerApi.geomViewerContext?.inputHandler;
    inputHandler?.stopPlacementMode(true /* cancelling */);
  }

  // Rebakes the environment map using the current scene state
  private static bakeEnvironmentMap() {
    const scene = GeomViewerApi.geomViewerContext?.viewManager.getCurrentViewScene()
    const meshScene = scene as MeshScene
    meshScene.bakeEnvMap?.()
  }

  private static async loadComposition(composition: Composition) {
    // Load render items one by one
    composition?.renderItems?.forEach((renderItem: RenderItemComplete) => {

      if (renderItem.renderType === 'FURNITURE_ITEM'){
        const furnitureItemParams = furniturePropsToFurnitureItemParams({
          ...renderItem})

        const { x, y,  p3 } = renderItem

        this.addSceneItem(String(renderItem.uniqueId), {
          itemKind: `furniture-item`,
          restoredPosition: p3 && [p3.x, p3.y, p3.z],
          legacyPosition: x !== null && y !== null ? [x, y] : undefined,
          placement: extractPlacementFrom3dCompositionProps({
            ...renderItem,
            parentIdOrSurface: renderItem.parentIdOrSurface
          }),
          currentSnapRotationIndex: renderItem.anchorCombinationIndex as number || 0,
          itemOptions: furnitureItemParams
        })
      } else if(renderItem.renderType === 'ART_ITEM'){
        this.addSceneItem(String(renderItem.uniqueId), {
            itemKind: `art-item`,
            legacyPosition: renderItem.x !== null && renderItem.y !== null ? [renderItem.x, renderItem.y] : undefined,
            itemOptions: {
                image: renderItem.artImageData,
                size: renderItem.size.height,
                frameData: renderItem.frame,
            },
            placement: extractPlacementFrom3dCompositionProps(renderItem),
        })
      }
    })
    
  }

  private static exportComposition(): CompositionExport {
    const scene = GeomViewerApi.geomViewerContext?.viewManager.getCurrentViewScene()
    const items = scene?.getRenderItems()

    const itemData = []

    if (items) {
      for (const item of items) {
        if (item.getId() !== "0"){
          itemData.push({
            ...item,
            itemId: item.getId(),
            itemData: item.getItemPlacementData(),
            corners: item.getCorners() as Corners
          })
        }
      }
    }

    return {
      renderItems: itemData
    }
  }

  private static exportEnvmap(): Blob | null {
    const renderer = Renderer.getInstance()
    const threeRenderer = renderer?.getThreeRenderer()
    const scene = GeomViewerApi.geomViewerContext?.viewManager?.getCurrentViewScene()
    const cubemapTexture = scene?.getEnvMap()
    if (!renderer || !cubemapTexture || !threeRenderer) {
      return null
    }
    const envmapHdrBlob = generateHDRfromCubemap(cubemapTexture, threeRenderer, false)
    renderer.setRenderIsDirty()
    return envmapHdrBlob
  }

  private static setRoomDimensionsEnabled(enabled: boolean) {
    const scene = GeomViewerApi.geomViewerContext?.viewManager?.getCurrentViewScene()
    if (!scene) {
      return
    }
    GeomViewerApi.geomViewerContext?.model?.storeRoomDimensionsEnabled(enabled)
    scene.setRoomDimensionsEnabled(enabled)
    if (enabled) {
      const view = GeomViewerApi.geomViewerContext?.viewManager?.getTopDownViewLabel()
      if (view) {
        GeomViewerApi.setCurrentView(view)
      }
    }
  }

  private static setProductDimensionsEnabled(enabled: boolean) {
    const scene = GeomViewerApi.geomViewerContext?.viewManager?.getCurrentViewScene()
    if (!scene) {
      return
    }
    GeomViewerApi.geomViewerContext?.model?.storeProductDimensionsEnabled(enabled)
    scene.setProductDimensionsEnabled(enabled)
  }

  private static setDynamicMeasurementsEnabled(enabled: boolean) {
    const scene = GeomViewerApi.geomViewerContext?.viewManager?.getCurrentViewScene()
    if (!scene) {
      return
    }
    GeomViewerApi.geomViewerContext?.model?.storeDynamicMeasurementsEnabled(enabled)
    scene.setDynamicMeasurementsEnabled(enabled)
  }

  private static signalCompositionLoadingBegin() {
    GrandCentral.getDispatcher().dispatchNotification({
      what: NOTIFY_COMPOSITION_LOADING_BEGIN
    })
  }

  private static signalCompositionLoadingEnd() {
    GrandCentral.getDispatcher().dispatchNotification({
      what: NOTIFY_COMPOSITION_LOADING_END
    })
  }

  private static requestGPUStats(benchmarksURL?: string) {
    // Determine and log GPU stats
    const gpuDetector = new CachedGPUDetector()
    gpuDetector.fetchGPUStats(benchmarksURL)
        .then((stats) => {
            GrandCentral.getDispatcher().dispatchNotification({
              what: NOTIFY_GPU_STATS,
              payload: {
                stateInfo: `GPUStatsSuccess`,
                stats
              }
            })
        })
        .catch((error) => {
            GrandCentral.getDispatcher().dispatchNotification({
              what: NOTIFY_GPU_STATS,
              payload: {
                stateInfo: `GPUStatsFailed`,
                error
              }
            })
        })
  }
}

// API initialization function.
export function initGeomViewerApi(): GeomViewerType {
  return GeomViewerApi.buildGeomViewerApi();
}

// Return the global geom-viewer context, if available.
export function gvContext(): GeomViewerContext | undefined {
  return GeomViewerApi.getContext();
}
