/* eslint-disable no-plusplus */
/* eslint-disable no-bitwise */

import * as Sentry from '@sentry/react'
import * as THREE from 'three'

import WallspiceWebgl, { DirectionVectorMap } from 'Renderer/WallspiceWebgl'
import TimeMetric from 'utils/timeMetric'
import { checkWebPSupport, isSafari } from 'utils/browser'
import MaskedShadowMaterial from 'Renderer/MaskedShadowMaterial'
import MaskedPCSSShadowMaterial from 'Renderer/MaskedPCSSShadowMaterial'

import * as WallSnap from 'Renderer/WallSnap'

import FurnitureManager from 'Renderer/FurnitureManager'

import { computeEraseRegionGridPoints } from 'Renderer/MagicEraserUtils'

import { allScenesAreStandard3D } from 'models/scenes/utils'

import {
    DEFAULT_MOBILE_TEXTURE_SIZE,
    SENTRY_BREADCRUMB_CATEGORY,
    EVT_FURNITURE_LOAD_BEGIN,
    EVT_FURNITURE_LOAD_END,
    EVT_FURNITURE_GLB_LOAD_END,
    EVT_GLTFLOADER_FILE_LOAD_END,
    EVT_GLTFLOADER_FILE_LOAD_BEGIN,
    EVT_GLTFLOADER_PARSE_BEGIN,
    EVT_GLTFLOADER_PARSE_END,
    SEGMENTATION_ASSET_NAME,
} from 'Renderer/constants'

import isMobile from 'utils/isMobile'
import { createSceneBuilder } from 'Renderer/rendering/SceneBuilderFactory'
import { dropItemsToFloor } from 'Renderer/model/StackablesRelocate'
import { RoomGLTFAssets } from './assets/RoomGLTFAssets'
import { WholeRoomGLTFAssets } from './assets/WholeRoomGLTFAssets'

import './style.scss'
import {
    MASK_DATA_READY,
    WALL_SNAP_READY,
    OCCLUSION_SCENE_READY,
    RENDER_DIMENSIONS_READY,
    FLOOR_PLACER_READY,
    SCENE_BUILD_COMPLETE,
} from './StartupWarden'
import { SceneManifest } from './assets/SceneManifest'
import { GrandCentral } from './GrandCentral'
import { gvContext } from './foundation/geom_viewer_impl'
import { gvStartupWarden, gvCurrentScene, gvRenderLibrary, gvColorIdRenderer, gvPinsManager } from './foundation/geom_app'
import { gvInitRenderLibrary } from './renderingLibrary/gfxGlobal'
import { AssetManager } from './assets/AssetManager'
import ThreejsRenderingLibrary from './renderingLibrary/ThreejsLibrary/ThreejsGraphicsLibrary'
import { RenderingLibraries } from './geomviewer'
import { RendererContextType } from './rendering/Enums'
import { DefaultAssetManager } from './rendering/rendering_utils'

let rendererInstance = null
class Renderer {
    constructor({
        canvas,
        scene: sceneData,
        debugSettings,
        previewSettings: settings,
        onFirstRender,
        onReady,
        onWallDataReady,
        saveData,
        onUpdateSaveData,
        maxTextureSize,
        updateHiddenSurfaces,
        onInitializationFailure,
        mobileFeatures,
        viewerSettings,
        renderlib,
    }) {
        this.loadingStats = {}
        this.loadingStats.msBuildScene = 0
        this.loadingStats.msFirstFrame = 0
        this.loadingStats.msTotalRenderingTime = 0

        this.initRendererTimestamp = Date.now()

        // The renderer might get disposed and recreated; so the current
        // active instance is tracked to avoid race conditions
        if (rendererInstance) {
            rendererInstance.activeRenderer = false
        }
        rendererInstance = this // eslint-disable-line @typescript-eslint/no-this-alias
        this.onReady = onReady
        this.onWallDataReady = onWallDataReady
        this.initStartupWarden()

        // Attach an empty listener to custom events, otherwise Safari Web Inspector
        // won't see them and they won't be included in the timeline recording.
        // TODO: isn't related to renderer behavior; move into GrandCentral?
        this.dummyEventListener = this.dummyEventListener.bind(this)
        const events = [
            EVT_FURNITURE_LOAD_BEGIN,
            EVT_FURNITURE_LOAD_END,
            EVT_FURNITURE_GLB_LOAD_END,
            EVT_GLTFLOADER_FILE_LOAD_END,
            EVT_GLTFLOADER_PARSE_END,
            EVT_GLTFLOADER_FILE_LOAD_BEGIN,
            EVT_GLTFLOADER_PARSE_BEGIN,
        ]
        events.forEach((evt) => document.addEventListener(evt, this.dummyEventListener))

        if (allScenesAreStandard3D(sceneData)) {
            this.assetsList = new WholeRoomGLTFAssets(sceneData.gltfManifest, sceneData.gltfBaseUrl)
        } else {
            this.assetsList = sceneData.gltfManifest
                ? new RoomGLTFAssets(sceneData.gltfManifest, sceneData.gltfBaseUrl)
                : new SceneManifest(sceneData.manifest)
        }

        this.loadedItems = 0
        this.loadedTotalSize = 0
        this.loadingItems = 0
        this.highlightSeg = 1024

        this.activeRenderer = true
        this.fullyInitialized = false

        this.itemsWereLoading = false
        this.magicWindowWasLoading = false

        // Magic eraser related:
        this.segsData = null
        this.segsDataFeather = null
        this.segsTex = null
        this.paintData = null
        this.paintTex = null
        this.paintSet = saveData.erasedSegments ? new Set(saveData.erasedSegments) : new Set()

        // Keep track of IDs for surfaces that have been erased.
        this.erasedSurfaceIds = [];

        this.hasWebPSupport = checkWebPSupport()

        // Save a reference to the passed constructor parameters
        this.canvas = canvas
        this.settings = settings
        this.debugSettings = debugSettings
        this.mobileFeatures = mobileFeatures
        this.maxTextureSize = maxTextureSize || DEFAULT_MOBILE_TEXTURE_SIZE
        this.useFilmicLUT = debugSettings.useFilmicLUT
        this.onUpdateSaveData = onUpdateSaveData
        this.doUpdateHiddenSurfaces = updateHiddenSurfaces
        
        this.frameMetric = new TimeMetric()
        this.frameMetricLoading = new TimeMetric((obj) => ({ title: `loading ${obj.title}`, value: obj.value }))
        this.furnitureManager = new FurnitureManager(GrandCentral.getDispatcher())

        this.onFirstRender = onFirstRender
        this.onFirstRenderHandler = this.onFirstRenderHandler.bind(this)

        this.contextInfo = null
        this.renderEngine = null
        this.buildRenderEngineAndScene(canvas, viewerSettings, onInitializationFailure, renderlib)

        // Initialization behavior
        this.updateDebugSettings(this.debugSettings)
        this.renderEngine.startRenderLoop()
    }

    // eslint-disable-next-line class-methods-use-this
    get scene() {
        return gvContext()?.viewManager.getCurrentViewScene()
    }

    // eslint-disable-next-line class-methods-use-this
    get colorIdRenderer() {
        return gvColorIdRenderer()
    }

    // eslint-disable-next-line class-methods-use-this
    get pinsManager() {
        return gvPinsManager()
    }

    get cubeTex() {
        return this.scene?.getEnvMap()
    }

    get occlusionMesh() {
        return this.scene?.getOcclusionMesh?.() || null
    }

    get segmentsMesh() {
        return this.scene?.getSegmentationMesh?.() || null
    }

    get emptyOcclusionMesh() {
        return this.scene?.getOcclusionInpaintMesh?.() || null
    }

    get emptyRGB() {
        return this.scene?.getBackgroundInpaintMesh?.() || null
    }

    get highlightMesh() {
        return this.scene?.getPlaceHighlightMesh?.() || null
    }

    get intrinsics() {
        const cameraIntrinsics = this.assetsList.getCameraIntrinsics(0)
        return [
            cameraIntrinsics?.focalLengthX || 0,
            cameraIntrinsics?.focalLengthY || 0,
            cameraIntrinsics?.principalPointX || 0,
            cameraIntrinsics?.principalPointY || 0,
        ]
    }

    get planeOrientation() {
        return this.scene?.getPlaneData()
    }

    get polygonData() {
        return this.scene?.getPolygonData()
    }

    // eslint-disable-next-line class-methods-use-this
    get assetManager() {
        return gvContext()?.viewManager.getCurrentViewAssetManager()
    }

    static getInstance() {
        return rendererInstance
    }

    static newInstance(params) {
        rendererInstance = new Renderer(params)
    }

    // Render engine will keep calling this function until it returns true.
    onFirstRenderHandler() {
        if (this.fullyInitialized) {
            // Dispatch the first render as a micro task,
            // so that hasRendered is true when the event is received.
            queueMicrotask(()=>{
                this.onFirstRender()
            })
        }
        return this.fullyInitialized
    }

    // Request that the renderer dispatch a notification the next time the draw loop reaches the idle
    // state. Dispatches immediately if the draw loop is already idle.
    requestNotificationOnDrawIdle() {
        this.renderEngine?.requestNotificationOnDrawIdle()
    }

    isRendererValid() {
        return this.renderEngine?.isValid()
    }

    getThreeRenderer() {
        return this.renderEngine?.getThreeRenderer()
    }

    getCamera() {
        return this.renderEngine?.getCamera()
    }

    getContactShadowTexRenderTarget() {
        return this.renderEngine?.getContactShadowTexRenderTarget()
    }

    getContactShadowCamera() {
        return this.renderEngine?.getContactShadowCamera()
    }

    // eslint-disable-next-line class-methods-use-this
    dummyEventListener() { }

    buildRenderEngineAndScene(canvas, viewerSettings, onInitializationFailure, renderLibrary) {
        const tempCameraIndex = 0
        if(renderLibrary === RenderingLibraries.Three){
            gvInitRenderLibrary(new ThreejsRenderingLibrary())
        }

        const sceneBuilder = createSceneBuilder(this.assetsList, viewerSettings, this.debugSettings, this.maxTextureSize,
            onInitializationFailure, tempCameraIndex)

        this.renderEngine = sceneBuilder.buildRenderEngine(canvas, this.onFirstRenderHandler)

        this.contextInfo = WallspiceWebgl.queryContextInfo(this.getThreeRenderer())
        this.initViewManager(onInitializationFailure, viewerSettings)

        this.renderEngine.registerBeforeRenderHook(() => {
            const itemsAreLoading = this.loadingItems > 0
            if (this.settings.collectFrameMetric && !this.magicWindowWasLoading) {
                const activeFrameMetric =
                    itemsAreLoading || this.itemsWereLoading ? this.frameMetricLoading : this.frameMetric
                this.renderEngine?.setFrameMetric(activeFrameMetric)
            }
            this.itemsWereLoading = itemsAreLoading
        })

        this.renderEngine.registerAfterRenderHook(() => {
            gvColorIdRenderer()?.renderFrame()
            gvPinsManager()?.onAnimationFrame()
            if (this.debugSettings.showColorIdOutput) {
                gvColorIdRenderer()?.debugRender()
            }
            if (this.debugSettings.showPinsManagerOutput) {
                gvPinsManager()?.debugRender()
            }
        })

        this.renderEngine.registerBeforeRenderHook(() => {
            this.beginFrameTimestamp = Date.now()
        })

        this.renderEngine.registerAfterRenderHook(() => {
            const msFrameTime = Date.now() - this.beginFrameTimestamp
            this.loadingStats.msTotalRenderingTime += msFrameTime

            if (!this.renderEngine.getHasRendered()) {
                this.loadingStats.msFirstFrame = msFrameTime
            }
        })

        this.renderEngine.registerOnIdleRenderHook(() => {
            // Always render colorId when render loop becomes idle.
            // This is needed to avoid render items becoming unselectable
            // if for any reason a "camera motion stop" event wasn't fired.
            gvColorIdRenderer()?.forceRenderFrame()
            if (this.debugSettings.showColorIdOutput) {
                gvColorIdRenderer()?.debugRender()
            }
            if (this.debugSettings.showPinsManagerOutput) {
                gvPinsManager()?.debugRender()
            }
        })
    }

    initViewManager(onInitializationFailure, viewerSettings) {
        const options = {
            mobileNoWallColor: this.mobileFeatures.noWallColor,
        }
        const deviceConfig = {
            supportFragmentDepth: this.contextInfo?.hasFragmentDepth || false,
            isMobile: isMobile(),
            hasAlphaPremultBug: isSafari()
                || gvRenderLibrary()?.getRendererContextType() === RendererContextType.WebGL1Context,
        }
        const viewManager = gvContext()?.viewManager
        viewManager?.initialize(this.renderEngine, this.assetsList, options, deviceConfig, onInitializationFailure,
            viewerSettings, this.debugSettings, this.maxTextureSize)
    }

    initStartupWarden() {
        const startupWarden = gvStartupWarden()
        if (startupWarden) {
            this.wallSnapReadyPromise = new Promise((resolve) => {
                // eslint-disable-next-line no-bitwise
                startupWarden.registerCallback(MASK_DATA_READY | WALL_SNAP_READY, () => resolve())
            })

            startupWarden.registerCallback(SCENE_BUILD_COMPLETE, () => {
                this.initMagicEraser().then(() => { 
                    this.fullyInitialized = true
                    this.loadingStats.msBuildScene = Date.now() - this.initRendererTimestamp
                })
            })
            startupWarden.registerCallback(RENDER_DIMENSIONS_READY, () => {
                const [width, height] = this.scene.getDimensions()
                this.onWallDataReady(width, height)
            })
            startupWarden.registerCallback(OCCLUSION_SCENE_READY | FLOOR_PLACER_READY,
                () => { this.onReady(this.contextInfo) })
            // startupWarden.registerCallback(WALL_SNAP_READY, this.initParallaxCubeMapping.bind(this))
        }
    }

    getFeatureFlagByKeyName(key) {
        const val = this.settings[key]
        if (typeof val !== 'boolean' && !(val instanceof Promise)) {
            return false
        }
        return val
    }

    onMouseMove(e) {
        if (this.settings.magicEraserMode) {
            this.updateHighlightFromPosition(e, true)
        }
    }

    onClick(e) {
        if (this.settings.magicEraserMode) {
            this.infillSegmentFromPosition(e)
            this.updateHighlightFromPosition(e, false)
        }
    }

    eraseRegionPlaneIDs(regionID) {
        if (!this.eraseRegionSurfaceCache) this.eraseRegionSurfaceCache = new Map()

        const cachedResult = this.eraseRegionSurfaceCache.get(regionID)

        if (cachedResult) return cachedResult

        const ids = new Set()
        this.eraseRegionSurfaceCache.set(regionID, ids)

        const gridPoints = this.eraseRegionGridPoints.get(regionID)

        if (!gridPoints) return ids

        for (let i = 0; i < gridPoints.length; i++) {
            const p = gridPoints[i]

            const pids = this.getStaticSurfacePlaneIDsAtPoint(p[0], p[1])

            pids.forEach((pid) => {
                ids.add(pid)
            })
        }

        return ids
    }

    getSceneFront() {
        return this.scene?.getSceneFront?.()
    }

    getSceneOcclusion() {
        return this.scene?.getSceneOcclusion?.()
    }

    getStaticSurfacePlaneIDsAtPoint(relX, relY) {
        return this.scene?.getStaticSurfacePlaneIDsAtPoint(relX, relY)
    }

    // Return whether the current scene has magic-eraser segment data.
    hasMagicEraserData() {
        return this.segsData !== undefined
    }

    // Return the number of erasable magic-eraser segments, or 0 for non-magic-eraser scenes.
    getNumErasableSegments() {
        return this.segsData ? this.segsData.numSegments : 0
    }

    // Return the number of static stackable surfaces added to the scene so far.
    getNumStaticStackableSurfaces() {
        return this.staticStackableCount ? this.staticStackableCount : 0
    }

    updateHiddenSurfaces() {
        if (!this.eraseRegionGridPoints || !this.segsData) {
            return
        }

        //
        // This.eraseRegionSurfaceCache is used inside of
        // eraseRegionPlaneIDs(). In scenes with many erase regions
        // eraseRegionPlaneIDs() may need to perform hundreds of ray
        // casts. It does these ray casts just once and caches
        // the results. A few hundreds ray casts only takes 100-200ms,
        // but it can make the "Hide All" button appear to have
        // a slight delay the first time it is pressed. The code in
        // this block warms the cache to prevent this delay. This
        // method triggers when first loading the room, so this cache
        // warming is guaranteed to happen.
        //

        if (!this.eraseRegionSurfaceCache) {
            this.segsData.segments.forEach((segID) => {
                // Calling this method warms its internal
                // cache. We call it but ignore the results.
                this.eraseRegionPlaneIDs(segID)
            })
        }

        const surfs = new Set()

        this.paintSet.forEach((segID) => {
            this.eraseRegionPlaneIDs(segID).forEach((id) => {
                surfs.add(id)
            })
        })

        // When every segment is erased (Hide All, or equivalent manual state),
        // hide every static stackable surface — including ones the per-segment
        // grid-point raycast didn't reach.
        if (this.paintSet.size > 0 && this.paintSet.size === this.segsData.numSegments) {
            this.scene?.getStaticStackableSurfaces().forEach((surf) => {
                surfs.add(surf.id)
            })
        }

        this.erasedSurfaceIds = [...surfs];
        this.doUpdateHiddenSurfaces(this.erasedSurfaceIds)
        
        // Set static surface object visibility for raycasts to consider the surface accordingly.
        this.scene?.getStaticStackableSurfaces().forEach(surf => {
          const renderObject = surf.getObject()
          renderObject.visible = !this.erasedSurfaceIds.includes(surf.id)
        })

        // Drop any item stacked on erased surfaces to the floor.
        const stackedItems = this.getStackedItemsForSurfaces(this.erasedSurfaceIds);
        stackedItems?.forEach(items => {
          dropItemsToFloor(items);
        });
    }

    syncPaintSet() {
        this.updateSaveData()
        this.updateHiddenSurfaces()
    }

    setWallColor(color) {
        this.scene?.setWallColor(color)
    }

    updateSaveData() {
        if (!this.segsData) return

        const saveData = {
            erasedSegments: [...this.paintSet],
        }
        const trackingInfo = {
            EraseableItems: this.segsData.numSegments,
        }

        this.onUpdateSaveData(saveData, trackingInfo)
    }

    incrementLoadedItems(size) {
        this.loadedItems += 1
        this.loadedTotalSize += size
    }

    decrementLoadedItems(size) {
        this.loadedItems -= 1
        this.loadedTotalSize -= size
    }

    incrementLoadingItems() {
        this.loadingItems += 1
    }

    decrementLoadingItems() {
        this.loadingItems -= 1
    }

    shouldUseFrontSideShadows() {
        return this.scene ?
            this.scene.getShouldUseFrontSideShadows()
            : this.debugSettings.frontSideShadows
    }

    shouldUseXRay() {
        return this.debugSettings.enableXRay
    }

    getWallDimensions() {
        return this.scene?.getDimensions() || [1, 1]
    }

    getEnvMapIntensity() {
        return this.debugSettings.environmentIntensity
    }

    getRenderDimensions() {
        if (isMobile()) {
            return this.getWallDimensions()
        }
        const currentScene = gvCurrentScene()
        if (currentScene) {
            return currentScene.getDimensions()
        }
        return null
    }

    get hasRendered() {
        return this.getHasRendered()
    }

    getHasRendered() {
        return this.renderEngine?.getHasRendered()
    }
    /*
        initParallaxCubeMapping() {
            if (!this.isWallSnapSupported()) return
            if (!this.planeOrientation?.planeData) return
            const floor = this.planeOrientation?.planeData
                .filter((p) => p.class === 'floor')
                .reduce((a, b) => (a.d < b.d ? a : b))
            if (!floor) return
    
            const roomBox = new THREE.Box3()
            this.floorLines
                // Use bounded points when available to avoid lines extended to infinity (see WallSnap.)
                .map(line => line.pointsBound || line.points)
                .forEach(line => {
                    roomBox.expandByPoint(new THREE.Vector3(...WallspiceWebgl.planeToWorld(floor, line[0])))
                    roomBox.expandByPoint(new THREE.Vector3(...WallspiceWebgl.planeToWorld(floor, line[1])))
                })
            // TODO implement a smarter way to determine ceiling plane when missing
            const [ceiling] = this.planeOrientation?.planeData.filter((p) => p.class === 'ceiling')
            roomBox.expandByPoint(new THREE.Vector3(0, (Math.abs(ceiling?.d) || 1.2) * 1.2, 0))
    
            WallspiceWebgl.applyParallaxMapCustomShaderChunks(roomBox)
            this.getSceneFront()?.traverse(object => {
                // eslint-disable-next-line no-param-reassign
                if (object.type === 'Mesh') object.material.needsUpdate = true
            })
        }
    */

    onCanvasResize() {
        this.renderEngine?.onCanvasResize()
        gvContext()?.viewManager.onCanvasResize()
        gvColorIdRenderer()?.onCanvasResize()
        gvPinsManager()?.onCanvasResize()
    }

    // Returns whether wall-snapping is supported, i.e. floor lines are available.
    // Note that this function will not return a reliable result until 'checkIsWallSnapReady()'
    // (above) returns true.
    isWallSnapSupported() {
        return this.scene?.floorLines ? this.scene?.floorLines.length > 0 : false
    }

    // if flagPolygonWallSnapPromise resolves to false due to time out, floorLines are built with the mask data
    // but there are no collisions due to this.settings.wallCollisions.
    // TODO: Check remove remove this when feature-flag problem is solved:
    // https://geomagical.atlassian.net/browse/GFX-2294
    checkSupportWallOrFloorItems() {
        return this.scene?.floorLines && this.scene?.floorLines.length > 0 && this.settings.wallCollisions
    }

    // Picks and returns a render item id using relative pointer coords using only
    // the render items 3D bbox. Returns null if the ray doesn't intersect any bbox.
    getObjectIdAtPointUsingBbox(relX, relY, findNearest = true, filterFn) {
        const stringId = this.scene?.getObjectIdAtPointUsingBbox(relX, relY, findNearest, filterFn)
        return stringId ? parseInt(stringId, 10) : null
    }

    getObjectIdAtPoint(relX, relY) {
        const stringId = this.scene?.getRenderItemIDAtPoint(relX, relY)
        return stringId ? parseInt(stringId, 10) : null
    }

    getStackableSurfaceAtPoint(relX, relY, filterIds) {
        const result = this.scene?.getStackableSurfaceAtPoint(relX, relY, filterIds)
        return result || null
    }

    // Returns whether the static surface with the given ID has been erased.
    // Always returns false if surfaceId is undefined.
    getIsSurfaceErased(surfaceId) {
        if (surfaceId) {
            return this.erasedSurfaceIds.includes(surfaceId);
        }
        return false;
    }

    addToScene(renderItem) {
        this.scene?.addRenderItem(renderItem)
    }

    // Return all the furniture items that are stacked on the item with ID parentID,
    // or an empty list if parentId has no stacked children.
    getStackedItemsForParent(parentId /* string */) /* : FurnitureItem[] */ {
        return this.scene?.getStackedItemsForParent(parentId)
    }

    // Given a list of stackable-surfaces IDs, return a map of the furniture items stacked
    // on these surfaces keyed by the surface IDs.
    getStackedItemsForSurfaces(surfaceIds /* string[] */) /* Map<string, FurnitureItem[]> */ {
        return this.scene?.getStackedItemsForSurfaces(surfaceIds)
    }

    addStackingSurface(stackableSurfaceItem) {
        // Keep track of the stack-surf. count, for testing.
        if (!this.staticStackableCount) {
            this.staticStackableCount = 0
        }
        this.staticStackableCount++
        this.scene?.addStackableSurfaceItem(stackableSurfaceItem)
    }

    getRenderItem(itemId) {
        return this.scene?.getRenderItem(itemId?.toString())
    }

    removeFromScene(renderItem) {
        this.scene?.deleteRenderItem(renderItem)
        this.renderEngine?.setDirty()
    }

    mockDepthOcclusionMeta(occlusionMapPixels) {
        let min = 10000
        let max = -10000
        if (!occlusionMapPixels) {
            // If no depth data available, mock the scene limits using the camera's near/far properties
            return { min: this.getCamera().near, max: this.getCamera().far }
        }
        for (let i = 0; i < occlusionMapPixels.data.length; i += 4) {
            // Equation used from the manifest docs to get depth in meters
            const z =
                0.0000390625 *
                (occlusionMapPixels.data[i] * 65536.0 +
                    occlusionMapPixels.data[i + 1] * 256.0 +
                    occlusionMapPixels.data[i + 2])
            min = Math.min(min, z)
            max = Math.max(max, z)
        }
        return { min, max }
    }

    getLightDirectionByIndex(planeIndex) {
        // TODO: there is no metaData anymore!
        const lightData = this.metaData && this.metaData.lightData
        if (lightData && lightData[planeIndex].length) {
            return DirectionVectorMap[lightData[planeIndex][0].direction]
        }
        return DirectionVectorMap.SOUTHEAST
    }

    getRenderItems() {
        return this.scene?.getRenderItems()
    }

    getAllStackableSurfaces() {
        return this.scene?.getAllStackableSurfaces()
    }

    highlightFloorMode(floorMode) {
        if (this.highlightMesh) {
            if (floorMode) {
                WallspiceWebgl.setPlaceableAdjust(this.highlightMesh, -1.0, 0.125)
            } else {
                WallspiceWebgl.setPlaceableAdjust(this.highlightMesh, 1.0, 0.125)
            }
        }
    }

    highlightOn(isFloorMode) {
        if (this.highlightMesh) {
            this.highlightFloorMode(isFloorMode)

            if (this.debugSettings.highlightPlanes) {
                this.highlightMesh.visible = true
            }
        }
    }

    highlightOff() {
        if (this.highlightMesh) {
            this.highlightMesh.visible = false
        }
    }

    initMagicEraser() {
        if (!this.settings.canMagicErase) {
            return Promise.resolve()
        } 
        const assetManager = gvContext()?.viewManager.getCurrentViewAssetManager()
        return assetManager
            ?.getTexturePixelsOrNull(SEGMENTATION_ASSET_NAME)
            .then((segmentationPixelsRecord) => {
                const segmentationPixels = segmentationPixelsRecord?.pixels
                if (!segmentationPixels) {
                    return
                }

                this.segsData = WallspiceWebgl.isolateChannelDataFromImage(segmentationPixels, 2)
                this.eraseRegionGridPoints = computeEraseRegionGridPoints(this.segsData)
                this.syncPaintSet()
                this.segsDataFeather = this.segsData
                this.segsDataFeather = WallspiceWebgl.isolateChannelDataFromImage(segmentationPixels, 3)

                const numSegments = this.segsData.numSegments
                const featherSegments = this.segsDataFeather.numSegments
                const keepDataFeather = numSegments > 0 && numSegments === featherSegments
                if (!keepDataFeather) {
                    this.segsDataFeather = this.segsData
                }

                this.initInfillIfNeeded()
                this.applyEraseMask()

                assetManager.releasePixelData(SEGMENTATION_ASSET_NAME)
            })
    }

    applyEraseMask() {
        const previousPaintTexture = this.paintTex
        this.paintTex = WallspiceWebgl.createLuminanceTextureFromData(this.paintData)
        if (previousPaintTexture) {
            previousPaintTexture.dispose()
        }

        if (this.emptyRGB) {
            WallspiceWebgl.applyMaskTexToMat(this.emptyRGB.material, this.paintTex)
            this.emptyRGB.visible = this.settings.magicEraserMode || this.paintSet.size > 0
        }
        if (this.emptyOcclusionMesh) {
            WallspiceWebgl.applyMaskTexToShader(this.emptyOcclusionMesh.material, this.paintTex)
            this.emptyOcclusionMesh.visible = this.settings.magicEraserMode || this.paintSet.size > 0
        }
        if (this.occlusionMesh) {
            this.occlusionMesh.visible = !(this.settings.magicEraserMode || this.paintSet.size > 0)
        }
        if (this.segmentsMesh) {
            WallspiceWebgl.applyMaskTexToShader(this.segmentsMesh.material, this.paintTex)
            this.segmentsMesh.visible = this.settings.magicEraserMode
        }
        const shadowPlane = this.scene?.getShadowPlane()
        if (shadowPlane &&
            (shadowPlane.material instanceof MaskedPCSSShadowMaterial || shadowPlane.material instanceof MaskedShadowMaterial)) {
            WallspiceWebgl.applyMaskTexToShader(shadowPlane.material, this.paintTex)
        }
        this.setRenderIsDirty()
    }

    updateHighlightFromPosition(pos, highlight) {
        if (this.segsData && this.segmentsMesh) {
            let segment = 512
            if (pos[0] >= 0.0 && pos[0] <= 1.0 && pos[1] >= 0.0 && pos[1] <= 1.0) {
                segment = WallspiceWebgl.getValueAtPos(this.segsData, pos)
                if (!highlight || segment !== this.highlightSeg) {
                    if (segment < 1 || segment > 255) {
                        segment = 512 // no highlight
                    }
                    WallspiceWebgl.setSegmentsHighlightIndex(this.segmentsMesh, highlight ? segment : 512)
                    this.highlightSeg = segment
                    this.setRenderIsDirty()
                }
            }
        }
    }

    initInfillIfNeeded() {
        if (this.segsData && this.segmentsMesh) {
            if (this.paintData == null) {
                this.paintData = WallspiceWebgl.generateMask(this.segsData.w, this.segsData.h, 0)
                this.paintSet.forEach((segment) =>
                    WallspiceWebgl.keyMask(this.paintData, this.segsDataFeather, segment, 255),
                )
                this.applyEraseMask()
            }
            this.setRenderIsDirty()
        }
    }

    infillSegmentFromPosition(pos) {
        if (this.segsData && this.segmentsMesh) {
            this.initInfillIfNeeded()
            if (pos[0] >= 0.0 && pos[0] <= 1.0 && pos[1] >= 0.0 && pos[1] <= 1.0) {
                const segment = WallspiceWebgl.getValueAtPos(this.segsData, pos)
                const fillvalue = WallspiceWebgl.getValueAtPos(this.paintData, pos)
                if (segment > 0) {
                    if (fillvalue < 128) {
                        WallspiceWebgl.keyMask(this.paintData, this.segsDataFeather, segment, 255)
                        this.paintSet.add(segment)
                        this.syncPaintSet()
                    } else {
                        WallspiceWebgl.keyMask(this.paintData, this.segsDataFeather, segment, 0)
                        this.paintSet.delete(segment)
                        this.syncPaintSet()
                    }
                }
                this.applyEraseMask()
                this.setRenderIsDirty()
            }
        }
    }

    setStaticFurnitureViz(onoff) {
        // Disable the behavior if the room doesn't have the proper segmentation information
        if (!this.segsData || !this.segmentsMesh) {
            return
        }

        // Initialize the paintData mask in case it was still not initialized
        this.initInfillIfNeeded()

        // Apply the needed mask to the paintData and paintSet
        if (onoff) {
            this.paintSet.clear()
            this.segsData.segments.forEach((segment) =>
                WallspiceWebgl.keyMask(this.paintData, this.segsDataFeather, segment, 0),
            )
        } else {
            this.segsData.segments.forEach((segment) => {
                this.paintSet.add(segment)
                WallspiceWebgl.keyMask(this.paintData, this.segsDataFeather, segment, 255)
            })
        }

        // Apply the updates to the segmentation mask
        this.syncPaintSet()
        this.applyEraseMask()
    }

    eraseSegmentsFromStrokes(strokes, brushWidth, overrides) {
        if (!this.segsData || !this.segmentsMesh) {
            return
        }

        this.initInfillIfNeeded()

        // Collect unique segments hit by stroke sample points.
        const halfBrush = (brushWidth || 0) / 2
        const segmentsToErase = new Set()

        const sampleAt = (relX, relY) => {
            if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
                const seg = WallspiceWebgl.getValueAtPos(this.segsData, [relX, relY])
                if (seg > 0) segmentsToErase.add(seg)
            }
        }

        strokes.forEach((stroke) => {
            const step = Math.max(1, Math.floor(stroke.length / 20))
            for (let i = 0; i < stroke.length; i += step) {
                const [relX, relY] = stroke[i]
                sampleAt(relX, relY)
                if (halfBrush > 0) {
                    sampleAt(relX - halfBrush, relY)
                    sampleAt(relX + halfBrush, relY)
                    sampleAt(relX, relY - halfBrush)
                    sampleAt(relX, relY + halfBrush)
                }
            }
        })

        // Manual-toggle overrides: forceVisible keeps a segment shown even if
        // strokes hit it; forceErased hides a segment even if strokes missed it.
        if (overrides?.forceVisible) {
            overrides.forceVisible.forEach((segment) => segmentsToErase.delete(segment))
        }
        if (overrides?.forceErased) {
            overrides.forceErased.forEach((segment) => segmentsToErase.add(segment))
        }

        // Reset: unmask all segments (show all)
        this.paintSet.clear()
        this.segsData.segments.forEach((segment) =>
            WallspiceWebgl.keyMask(this.paintData, this.segsDataFeather, segment, 0),
        )

        // Erase segments under strokes
        segmentsToErase.forEach((segment) => {
            WallspiceWebgl.keyMask(this.paintData, this.segsDataFeather, segment, 255)
            this.paintSet.add(segment)
        })

        this.syncPaintSet()
        this.applyEraseMask()
        this.setRenderIsDirty()
    }

    queryGpuMemoryUsage() {
        return this.renderEngine?.queryGpuMemoryUsage()
    }

    updateSettings(settings, groupedSettings) {
        // Note: once wallCollisons has been set to true, we never walk back on it.
        if (settings) {
            this.settings = {
                ...settings,
                wallCollisions: this.settings.wallCollisions || settings.wallCollisions,
            }
        }

        if (this.occlusionMesh) {
            this.occlusionMesh.visible = !this.settings.magicEraserMode && this.paintSet.size === 0
        }

        if (this.emptyOcclusionMesh) {
            if (this.paintSet.size > 0) {
                this.emptyOcclusionMesh.visible = true
            } else {
                this.emptyOcclusionMesh.visible = this.settings.magicEraserMode
            }
        }

        if (this.segmentsMesh) {
            this.segmentsMesh.visible = this.settings.magicEraserMode
        }

        if (this.settings.disableOutline) {
            this.enableOutline(false)
        }

        this.renderEngine?.changeViewerSettings(groupedSettings)
    }

    updateDebugSettings(settings) {
        if (settings) {
            this.debugSettings = settings
        }
        const viewManager = gvContext()?.viewManager
        if (viewManager) {
            viewManager.updateDebugSettings(settings)
        }
        const pinsManager = gvPinsManager()
        if (pinsManager) {
            pinsManager.setDisabled(this.debugSettings.disablePins)
            pinsManager.enableDebugMode(this.debugSettings.showPinsManagerOutput)
            pinsManager.setCandidateRadiusTolerance(this.debugSettings.pinsCandidateRadiusTolerance)
            pinsManager.setMinAcceptableRadius(this.debugSettings.pinsMinAcceptableRadius)
        }
        const colorIdRenderer = gvColorIdRenderer()
        if (colorIdRenderer) {
            const didUpdate = colorIdRenderer.setMeshInflationValues(
                this.debugSettings.pinsColorIdInflation, this.debugSettings.pinsColorIdInflationMultiplier)
            // check if value was indeed changed to prevent unnecessary recomputation
            if (didUpdate && pinsManager) {
                pinsManager.recomputePinPositions()
            }
        }
        this.renderEngine?.changeDebugSettings(this.debugSettings)
    }

    onChildUpdate(oneTimeRenderCallback = null) {
        if (oneTimeRenderCallback) {
            this.renderEngine?.addRenderCallback(oneTimeRenderCallback)
        }
        this.setRenderIsDirty()
    }

    setRenderIsDirty() {
        this.renderEngine?.setDirty()
    }

    getHistogramStats() {
        const stats = {}

        const threeRenderer = this.getThreeRenderer()
        const glMemory = this.queryGpuMemoryUsage()

        stats.gpuFrameStats = {
            totalSceneTriangles: threeRenderer?.info.render.triangles || 0,
            totalCompiledShaders: threeRenderer?.info.programs.length || 0,
            glTextureMemory: glMemory?.currentTextureMemory || 0,
            glBufferMemory: glMemory?.currentBufferMemory || 0
        }

        stats.totalLoadedItems = this.loadedItems
        stats.totalLoadedSize = this.loadedTotalSize
        stats.totalFrames = this.frameMetric.valuesCount + this.frameMetricLoading.valuesCount
        this.frameMetric.bins.forEach((bin, idx) => {
            stats[bin.title] = this.frameMetric.histogram[idx]
        })
        this.frameMetricLoading.bins.forEach((bin, idx) => {
            stats[bin.title] = this.frameMetricLoading.histogram[idx]
        })

        // memory is supported only in chrome
        if (performance.memory) {
            const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = performance.memory

            stats.jsHeapSizeLimit = jsHeapSizeLimit
            stats.totalJSHeapSize = totalJSHeapSize
            stats.usedJSHeapSize = usedJSHeapSize
        }

        return stats
    }

    getRoomGlbStats() {
        let totalModelsLoadSizeMB = 0.0
        let modelsCount = 0
        const renderItems = this.scene?.getRenderItems()
        if (renderItems) {
            Array.from(renderItems).forEach((item) => {
                totalModelsLoadSizeMB += item.metrics.MbFileSizeTransferred
                modelsCount += 1
            })
        }
        return {
            totalModelsLoadSizeMB,
            modelsCount,
        }
    }

    getRoomAdditionalStats() {
        const dataSizeBytes = this.scene?.getLoadedDataSizeBytes() || 0.0
        const sceneAdditionalDataSizeMB = dataSizeBytes / 1024 / 1024
        return {
            sceneAdditionalDataSizeMB,
        }
    }

    isWeblGlContextLost() {
        const threeRenderer = this.getThreeRenderer()
        if (!threeRenderer) return false
        const context = threeRenderer.getContext()
        return context && context.isContextLost()
    }

    getLoadingStats() {
        return this.loadingStats
    }

    getVisibleStackableSurfaces() {
        return this.scene?.getVisibleStackableSurfaces() || []
    }

    takeRoomScreenshot(onSuccess, onError, issuer) {
        /*
            This function takes a high quality screenshot of the room with no composer effects
            If the current exact preview is needed; use the generateThumbnailFromPreview directly
        */
        const wrappedOnSuccess = (thumb) => {
            if (onSuccess) onSuccess(thumb)
            if (thumb.thumbTelemetry.imageIsBlack) {
                Sentry.captureEvent({
                    message: 'Black screenshot',
                    breadcrumbs: [
                        {
                            type: `info`,
                            category: SENTRY_BREADCRUMB_CATEGORY,
                            data: {
                                ...thumb.thumbTelemetry,
                                ...(this.contextInfo || {}),
                                activeRenderer: this.activeRenderer,
                                fullyInitialized: this.fullyInitialized,
                                hasRendered: this.getHasRendered(),
                                issuer,
                            },
                        },
                    ],
                })
            }
        }
        const wrappedOnError = (error) => {
            Sentry.captureException(new Error('Screenshot error', { cause: error, issuer }))
            if (onError) {
                onError(error)
            }
        }
        this.renderEngine?.takeRoomScreenshot(wrappedOnSuccess, wrappedOnError)
    }

    cleanup() {
        this.activeRenderer = false
        gvStartupWarden()?.reset()

        // Loading manager can retain Renderer's "this" somewhere, causing memory leak
        THREE.DefaultLoadingManager.onLoad = undefined

        AssetManager.cleanupShared()

        DefaultAssetManager.cleanup()

        // Clean up custom debug events
        // TODO: isn't related to renderer behavior; move into GrandCentral?
        const events = [
            EVT_FURNITURE_LOAD_BEGIN,
            EVT_FURNITURE_LOAD_END,
            EVT_FURNITURE_GLB_LOAD_END,
            EVT_GLTFLOADER_FILE_LOAD_END,
            EVT_GLTFLOADER_PARSE_END,
            EVT_GLTFLOADER_FILE_LOAD_BEGIN,
            EVT_GLTFLOADER_PARSE_BEGIN,
        ]
        events.forEach((evt) => document.removeEventListener(evt, this.dummyEventListener))

        // ViewManager disposes scene resources for all views
        gvContext()?.viewManager.cleanup()

        this.renderEngine?.cleanup()
        this.renderEngine = null

        // Cleanup might be potentially called indirectly in the middle of Renderer's constructor
        // by calling onInitializationFailure or other React callbacks that might affect Redux state
        // and cause Preview component to unmount, calling 'destroyRenderer', all the calls will happen synchronously.
        // These properties below might be undefined by that moment.
        const colorIdRenderer = gvColorIdRenderer()
        if (colorIdRenderer) {
            colorIdRenderer.cleanup()
        }
        const pinsManager = gvPinsManager()
        if (pinsManager) {
            pinsManager.cleanup()
        }

        WallSnap.cleanUp()

        if (this.furnitureManager) {
            this.furnitureManager.dispose()
            this.furnitureManager = null
        }

        rendererInstance = null
    }

    enableOutline(enable = true) {
        this.renderEngine?.enableOutline(enable)
        this.setRenderIsDirty()
    }

    addObjectToOutline(object, selected) {
        this.renderEngine?.addObjectToOutline(object, selected)
    }

    removeObjectFromOutline(object) {
        this.renderEngine?.removeObjectFromOutline(object)
    }

    updateOutline() {
        this.renderEngine?.updateOutline()
    }

    setOutlineThickness() {
        this.renderEngine?.setOutlineThickness()
    }

    static getFileSize(url) {
        if (!url) {
            return Promise.resolve(0.0)
        }
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('HEAD', url, true)
            xhr.onreadystatechange = () => {
                if (xhr.readyState === xhr.DONE) {
                    const size = parseInt(xhr.getResponseHeader('Content-Length'), 10)
                    resolve(size)
                }
            }
            xhr.onerror = reject
            xhr.send()
        })
    }

    getMagicEraserMode() {
        return this.settings.magicEraserMode
    }
}

export default Renderer
