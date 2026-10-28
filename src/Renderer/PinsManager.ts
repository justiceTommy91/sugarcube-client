/* eslint-disable no-continue */
import * as THREE from 'three'
import * as Sentry from '@sentry/react'

import { isObjectNoninteractable, isObjectVisible } from 'Renderer/rendering/rendering_utils'
import FurnitureItem3D from 'Renderer/model/FurnitureItem3D'
import ArtItem3D from 'Renderer/model/ArtItem3D'
import { FurnitureItemInfo, NotificationInfo } from 'Renderer/NotificationDispatcher'
import { PinsManagerDebugRenderer } from 'Renderer/PinsManagerDebugRenderer'
import { createPolesOfInaccessibilityWorker } from 'Renderer/workers/WorkerAdapters'

import {
    NOTIFY_FURNITURE_ITEM_READY,
    NOTIFY_FURNITURE_ITEM_MOVE_START,
    NOTIFY_FURNITURE_ITEM_MOVE_END,
    NOTIFY_COMPOSITION_LOADING_BEGIN,
    NOTIFY_COMPOSITION_LOADING_END,
    COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR,
    SENTRY_BREADCRUMB_CATEGORY,
    EVT_PINS_MANAGER_UPDATED,
} from 'Renderer/constants'

import {
    NOTIFY_SCENE_ITEM_UPDATE,
    NOTIFY_VIEWER_STATE_UPDATE,
} from 'Renderer/geomviewer/geom_constants'
import {
    SceneItemUpdateNotification,
    ViewerStateUpdateNotification,
} from 'Renderer/geomviewer/geom_notifications'
import { RENDER_DIMENSIONS_READY } from 'Renderer/StartupWarden'
import { GrandCentral } from './GrandCentral'
import {
    gvCurrentCamera,
    gvStartupWarden,
    gvColorIdRenderer,
    gvRenderLibrary,
    gvCurrentScene,
} from './foundation/geom_app'
import { getFurnitureItem3D } from './rendering/scene_utils'

/*
    Pins positions search is based on "Poles of Inaccessibility" search in pixel data.
    Desired results are similar to described here:
    https://blog.mapbox.com/a-new-algorithm-for-finding-a-visual-center-of-a-polygon-7c77e6492fbc
    The difference with the algorithm under the link above is that this algorithm uses pixel data
    instead of geometrically described polygons.

    The term that is used frequently here is "Pole of Inaccessibility"(PoI) (https://en.wikipedia.org/wiki/Pole_of_inaccessibility)
    Geometrically speaking, it's a center of the inscribed circle of the maximum possible radius
    for the given polygon. Note that some polygons can have multiple PoIs (e.g. a rectangle).

    How the algorithm for the "Improved pins positions" works:
    1. Furniture items are rendered to a render target using flat colors, unique for each item.
       Done by ColorIdRenderer.
    2. gatherPolesOfInaccessibility walks through the color id pixel data and looks for "Poles of
       Inaccessibility" for each color. Since we're working with furniture, not geographical data,
       "regular" shapes such as rectangles, rings, etc. are common, and such shapes can have multiple
       "Poles of Inaccessibility". gatherPolesOfInaccessibility gathers all such points for each item
       in its results.
    3. computeResultPosition uses a "point cloud" produced by gatherPolesOfInaccessibility to compute
       the final Pin position for each item. Right now it simply attempts to calculate its "average"
       position and checks if it still lays within item's projection (which is not always the case).
       There's room for improvement here: it doesn't work well with shapes such as a hourglass, a
       horseshoe, a ring, etc.
*/

// candidate points array
type CandidatePinPositions = Array<{
    radius: number, // radius of the biggest possible inscribed circle from this point
    x: number, // x,y - pixel coordinates
    y: number,
}>

// "poles of inaccessibility" search results: colorId => found points
// Item's visual projection can contain multiple points with the same possible
// inscribed circle. Also, to make it less restrictive we allow some tolerance when searching for the
// biggest inscribed circle.
export type PoleOfInaccessibilitySearchResults = Map<number, {
    // List of points with the biggest inscribed circle radius (within tolerance from the best one).
    points: CandidatePinPositions,
    // The biggest radius of inscribed circle among these points.
    radius: number,
}>

interface PixelAnalyzeWorkerOutData {
    results: PoleOfInaccessibilitySearchResults
    pixelsBuffer: Uint8Array // buffer to be passed back from the web worker
}

export class PinsManager {

    private items: Set<FurnitureItem3D> = new Set()

    // Note art items are not still fully controlled by the PinsManager.
    // PinsManager currently only control pin visibility on camera switch.
    private artItems: Map<string, ArtItem3D> = new Map()

    private pinsHidden = false

    // Keep track of current pin info. This is used to update the UI only as needed.
    private currentPins: Map<string, { x: number, y: number, hide: boolean, itemIsHidden: boolean }> = new Map();

    // When set to true, all pins will be switched to visible on the next update.
    private deferredMakeAllPinsVisible = false;

    // precomputed pixel offsets for rasterized circles (radius => [[x1,y1], [x2,y2], ...]),\
    // using midpoint circle algorithm
    private rasterizedCircles: Array<Array<Array<number>>> = []

    // radius of the biggest circle to test
    private maxCircleRadius = 0

    // point with inscribed circle radius smaller than this value will be discarded
    // bigger min radius means better performance, allowing to generate less result candidates
    // but can be too restrictive for small or "thin" items
    private minAcceptableRadius = 1

    // tolerance to what is considered a "good" inscribed circle radius, i.e.
    // accept points with inscribed circle radius between maxPossible and maxPossible - candidateRadiusTolerance
    private candidateRadiusTolerance = 1

    private debugModeEnabled = false

    private debugRenderer: PinsManagerDebugRenderer | undefined

    private isDirty = false

    private disabled = false

    private processingFurnitureItems = false

    // Web worker PolesOfInaccessibilityWorker.
    private currentWorker: Worker | null = null;

    // this variable is set to true in case of failure during web worker creation
    private cantUseWebWorkers = false

    private width = 0

    private height = 0

    constructor(enableDebugControls: boolean) {
        this.onCameraStateChange = this.onCameraStateChange.bind(this)
        this.furnitureItemLoadObserver = this.furnitureItemLoadObserver.bind(this)
        this.onFurnitureItemMoveStart = this.onFurnitureItemMoveStart.bind(this)
        this.onFurnitureItemMoveFinish = this.onFurnitureItemMoveFinish.bind(this)
        this.onRenderItemNewPlacement = this.onRenderItemNewPlacement.bind(this)
        this.onCompositionLoadingBegin = this.onCompositionLoadingBegin.bind(this)
        this.onCompositionLoadingEnd = this.onCompositionLoadingEnd.bind(this)

        if (enableDebugControls) {
            this.debugRenderer = new PinsManagerDebugRenderer()
        }

        GrandCentral.getDispatcher().addObserver(NOTIFY_FURNITURE_ITEM_READY, this.furnitureItemLoadObserver)
        GrandCentral.getDispatcher().addObserver(NOTIFY_FURNITURE_ITEM_MOVE_START, this.onFurnitureItemMoveStart)
        GrandCentral.getDispatcher().addObserver(NOTIFY_FURNITURE_ITEM_MOVE_END, this.onFurnitureItemMoveFinish)
        GrandCentral.getDispatcher().addObserver(NOTIFY_SCENE_ITEM_UPDATE, this.onRenderItemNewPlacement)
        GrandCentral.getDispatcher().addObserver(NOTIFY_VIEWER_STATE_UPDATE, this.onCameraStateChange)
        GrandCentral.getDispatcher().addObserver(NOTIFY_COMPOSITION_LOADING_BEGIN, this.onCompositionLoadingBegin)
        GrandCentral.getDispatcher().addObserver(NOTIFY_COMPOSITION_LOADING_END, this.onCompositionLoadingEnd)
        gvStartupWarden()?.registerCallback(RENDER_DIMENSIONS_READY, this.renderDimensionsReady.bind(this))
    }

    // https://en.wikipedia.org/wiki/Midpoint_circle_algorithm
    // pre-compute x,y coordinates for a rasterized circle of a given radius in pixels, according to
    // Bresenham's circle algorithm. Used to search for possible inscribed circles in the
    // gatherPolesOfInaccessibility function, and saved to avoid recomputing their pixel coordinates
    // all the time.
    static rasterizeCircle(pixelRadius: number) {
        const ret = []
        let f = 1 - pixelRadius
        let ddFx = 0
        let ddFy = -2 * pixelRadius
        let x = 0
        let y = pixelRadius

        ret.push([0, 0 + pixelRadius])
        ret.push([0, 0 - pixelRadius])
        ret.push([0 + pixelRadius, 0])
        ret.push([0 - pixelRadius, 0])

        while(x < y)
        {
            if(f >= 0)
            {
                y -= 1
                ddFy += 2
                f += ddFy
            }
            x += 1
            ddFx += 2
            f += ddFx + 1
            ret.push([0 + x, 0 + y])
            ret.push([0 - x, 0 + y])
            ret.push([0 + x, 0 - y])
            ret.push([0 - x, 0 - y])
            ret.push([0 + y, 0 + x])
            ret.push([0 - y, 0 + x])
            ret.push([0 + y, 0 - x])
            ret.push([0 - y, 0 - x])
        }
        return ret
    }

    public getRasterizedCircles() {
        return this.rasterizedCircles
    }

    public getMaxCircleRadius() {
        return this.maxCircleRadius
    }

    public getMinAcceptableRadius() {
        return this.minAcceptableRadius
    }

    public getCandidateRadiusTolerance() {
        return this.candidateRadiusTolerance
    }

    private isUsingImprovedPins() {
        return !this.cantUseWebWorkers
    }

    enableDebugMode(enabled: boolean) {
        this.debugModeEnabled = enabled
        if (this.debugModeEnabled) {
            const debugRenderer = this.getOrCreateDebugRenderer()
            debugRenderer.setResolution(this.width, this.height)
            this.recomputePinPositions()
            this.isDirty = true
        }
    }

    setDisabled(disabled: boolean) {
        if (this.disabled === disabled) {
            return
        }
        this.disabled = disabled
        // Re-enabling: ensure the next frame recomputes, in case pin positions were
        // never calculated (or grew stale) while disabled.
        if (!disabled) {
            this.isDirty = true
        }
    }

    setCandidateRadiusTolerance(tolerance: number) {
        if (this.candidateRadiusTolerance === tolerance) {
            return
        }
        this.candidateRadiusTolerance = tolerance
        this.isDirty = true
    }

    setMinAcceptableRadius(radius: number) {
        if (this.minAcceptableRadius === radius) {
            return
        }
        this.minAcceptableRadius = radius
        this.isDirty = true
    }

    updateDefaultPinPosition(furnitureItem: FurnitureItem3D | null) {
        if (!furnitureItem || !furnitureItem.getFurnitureData()) {
            return
        }
        const bbox = furnitureItem.getBbox()
        if (!bbox) {
            return
        }

        // Initializes the white tag dot position in 3D local coordinates
        // Define utility values that are used along the point selection logic
        const leastItemHeight = 0.3
        const leastNonTableHeight = 0.6
        const furnitureItemHeight = bbox.max.y - bbox.min.y
        const maxIntersections = 10
        const maxSearchTrials = 5
        const intersectionShiftStep = 0.025
        const maxPointDistanceToCenter = furnitureItemHeight * 0.35

        // For very tall/short furniture items, the bbox center is used as the tag point
        if (furnitureItem.getParent() || furnitureItemHeight < leastItemHeight) {
            bbox.getCenter(furnitureItem.defaultPinPosition3d)
            if (this.isUsingImprovedPins()) {
                this.isDirty = true
            }
            return
        }

        // Calculate downward ray for intersection using the bbox dimensions
        const centerPointLocal = bbox.getCenter(new THREE.Vector3())
        const topPointLocal = centerPointLocal.clone().setY(bbox.max.y)
        const renderObject = furnitureItem.getObject()
        if (!renderObject) {
            return
        }
        const topPoint = renderObject.localToWorld(topPointLocal)

        // Note THREE.raycaster doesn't support intersecting object groups so they're split into child meshes
        const furnitureMeshList: THREE.Mesh[] = []
        renderObject.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                furnitureMeshList.push(obj)
            }
        })

        // Calculate intersection points of the downward ray with the furniture geometry
        // Note some furniture items have central holes so a proper search for the intersection surface is needed
        let trials = 0
        let intersections = []
        const searchCenter = topPoint.clone()
        const raycaster = new THREE.Raycaster(searchCenter, new THREE.Vector3(0, -1, 0))
        const threeCamera = gvCurrentCamera()?.getThreeCamera()
        raycaster.camera = threeCamera || new THREE.Camera()
        while (intersections.length < maxIntersections && trials <= maxSearchTrials) {
            searchCenter
                .setX(topPoint.x + (trials % 2 === 0 ? trials * intersectionShiftStep : 0))
                .setZ(topPoint.z + (trials % 2 === 0 ? 0 : trials * intersectionShiftStep))
            raycaster.set(searchCenter, raycaster.ray.direction)
            intersections.push(...raycaster.intersectObjects(furnitureMeshList, false).map(({ point }) => point))
            trials += 1
        }

        // Get the nearest intersection point to the furniture's center for relatively tall items.
        // Note chairs and tables are excluded as their shape easily achieves the correct placement
        // with the first intersection. Note far intersections from center are excluded for storage
        // units items since they lead to bad pin placements.
        const centerPoint = renderObject.localToWorld(centerPointLocal.clone())
        const furnitureData = furnitureItem.getFurnitureData()
        if (!furnitureData.hasTallLegs && furnitureItemHeight > leastNonTableHeight) {
            intersections.sort((a, b) => a.distanceTo(centerPoint) - b.distanceTo(centerPoint))
        }
        if (furnitureData.isCubicStructure) {
            intersections = intersections
                .filter(intersection => intersection.distanceTo(centerPoint) < maxPointDistanceToCenter)
        }

        // Save the intersection point, if any, in local coordinates
        furnitureItem.defaultPinPosition3d.copy(intersections[0]
            ? centerPointLocal.clone().setY(renderObject.worldToLocal(intersections[0]).y)
            : centerPointLocal.clone())

        if (this.isUsingImprovedPins()) {
            this.isDirty = true
        }
    }

    furnitureItemLoadObserver(info: NotificationInfo) {
        this.onFurnitureItemLoad((info?.payload as FurnitureItemInfo)?.furnitureItemId)
    }

    onFurnitureItemLoad(furnitureItemId: string) {
        if (this.processingFurnitureItems) {
            return
        }

        const furnitureItem = getFurnitureItem3D(furnitureItemId)
        if (!furnitureItem) {
            return
        }
        this.updateDefaultPinPosition(furnitureItem)
        this.update()
    }

    onCompositionLoadingBegin() {
        this.processingFurnitureItems = true
    }

    onCompositionLoadingEnd() {
        const colorIdRenderer = gvColorIdRenderer()
        if (!colorIdRenderer) {
            return
        }

        // TODO: move prepareFurnitureItem calls to web workers
        queueMicrotask(() => {
            this.items.forEach(furnitureItem => colorIdRenderer.prepareFurnitureItem(furnitureItem))
            this.artItems.forEach(artItem => colorIdRenderer.prepareArtItem(artItem))
            this.processingFurnitureItems = false
            this.isDirty = true
        })
    }

    addItem(renderItem: FurnitureItem3D | ArtItem3D) {
        if (renderItem.isFurnitureItem()) {
            this.items.add(renderItem as FurnitureItem3D)
        } else if (renderItem.isArtItem()) {
            this.artItems.set(renderItem.getId(), renderItem as ArtItem3D)
        }
    }

    removeItem(renderItem: FurnitureItem3D | ArtItem3D) {
        if (renderItem.isFurnitureItem()) {
            this.items.delete(renderItem as FurnitureItem3D)
            this.currentPins.delete(renderItem.getId())
        } else if (renderItem.isArtItem()) {
            this.artItems.delete(renderItem.getId())
        }
    }

    gatherPolesOfInaccessibility(
        worker: Worker, pixelsBuffer: Uint8Array, width: number): Promise<PixelAnalyzeWorkerOutData> {

        if (!worker) {
            return Promise.reject()
        }

        const options = {
            maxCircleRadius: this.maxCircleRadius,
            minAcceptableRadius: this.minAcceptableRadius,
            candidateRadiusTolerance: this.candidateRadiusTolerance
        };
        const rasterizedCircles = this.rasterizedCircles;

        return new Promise<PixelAnalyzeWorkerOutData>((resolve, reject) => {
            if (worker) {
                // eslint-disable-next-line no-param-reassign
                worker.onmessage = (e: MessageEvent) => {
                    const outData = e.data as PixelAnalyzeWorkerOutData
                    if (outData) {
                        resolve(outData)
                    } else {
                        reject(new Error(`No out data.`))
                    }
                }
                worker.onerror = (ev: ErrorEvent) => {
                    reject(ev)
                }
                const workerData = {
                    pixelsBuffer,
                    width,
                    rasterizedCircles,
                    options,
                }
                worker.postMessage(workerData, [pixelsBuffer.buffer])
            } else {
                reject()
            }
        })
    }

    private fallbackToOldFunctionality() {
        this.cantUseWebWorkers = true
        this.items.forEach((item) => {
            item.pinPosition2d = null
        })
    }

    private createNewWorker() : Worker | null {
        let worker = null
        try {
            worker = createPolesOfInaccessibilityWorker()
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error)
            this.fallbackToOldFunctionality()
            // Catch and report a failure to create the worker.
            Sentry.captureException({
                cause: error,
                breadcrumbs: [{
                    type: `error`,
                    category: SENTRY_BREADCRUMB_CATEGORY,
                    data: {
                        message: `Failed to create worker`,
                        issuer: `PinsManager`,
                    },
                }],
            })
        }
        return worker
    }

    // For each furniture item, gatherPolesOfInaccessibility function returns a cloud of points which
    // have the biggest circle that can be inscribed within item's projection with that point as the center.
    // computeResultPosition attempts to compute the final pin position based on this cloud of candidate
    // point, for each item.
    static computeResultPosition(points: CandidatePinPositions, colorId: number, pixelsBuffer: Uint8Array,
        width: number) {
        if (!Array.isArray(points) || points.length === 0) {
            return null
        }

        // find the centroid of candidate points
        const centroid = points.reduce((acc, curr) => ({x: acc.x + curr.x, y: acc.y + curr.y}), { x: 0, y: 0 })
        centroid.x = Math.round(centroid.x / points.length)
        centroid.y = Math.round(centroid.y / points.length)
        let result = centroid

        // check if found "centroid" still lays within item's projection
        const centroidPixelIndex = 4 * ((result.y * width) + result.x)
        const r = pixelsBuffer[centroidPixelIndex + 0]
        const g = pixelsBuffer[centroidPixelIndex + 1]
        const b = pixelsBuffer[centroidPixelIndex + 2]
        // eslint-disable-next-line no-bitwise
        const centroidColorId = (((r << 8) + g << 8) + b)
        // if found potential result lays out of item's projection, fallback to the first found candidate
        if (centroidColorId !== colorId) {
            result = points[0]
        }

        return result
    }

    /* eslint-disable no-bitwise */
    // Utility function to convert PoI color computing results, which have color ids in unsigned ABGR form
    // to ARGB format with alpha = 255.
    static reverseColorId(colorId: number) {
        return (0xFF000000 | (((colorId << 16) & 0x00FF0000)
        | (colorId & 0x0000FF00) | ((colorId >> 16) & 0x000000FF))) >>> 0
    }
    /* eslint-enable no-bitwise */

    /* eslint-disable no-param-reassign */
    async recomputePinPositions() {
        const colorIdRenderer = gvColorIdRenderer()
        if (!colorIdRenderer) {
            return
        }

        const pixelsData = colorIdRenderer.getPixelsData()
        const {width, height, success} = pixelsData
        let pixelsBuffer = pixelsData.pixelsBuffer
        if (!success || !pixelsBuffer) {
            return
        }

        if (this.currentWorker) {
            this.currentWorker.terminate()
            this.currentWorker = null
        }
        // gather all possible pin position candidates:
        let results: PoleOfInaccessibilitySearchResults | null = null
        try {
            this.currentWorker = this.createNewWorker()
            if (this.currentWorker) {
                // the worker passes back the ownership of the same pixelsBuffer, just reassign the variable
                const outData = await this.gatherPolesOfInaccessibility(this.currentWorker, pixelsBuffer, width)
                results = outData.results
                pixelsBuffer = outData.pixelsBuffer
            }
        } catch(err) {
            // eslint-disable-next-line no-console
            console.error(err)
            this.fallbackToOldFunctionality()
            return
        } finally {
            if (this.currentWorker) {
                this.currentWorker.terminate()
                this.currentWorker = null
            }
        }
        if (!results) {
            return
        }

        if (this.debugModeEnabled) {
            this.debugRenderer?.setDebugData(results)
            gvCurrentScene()?.setIsDirty(true)
        }

        // Create a Set to store processed item IDs (only for grouped items)
        const processedItemIds: Set<string> = new Set()

        // Group linked items and calculate pin positions
        for (const item of this.items) {
            const itemId = item.getId()

            if (processedItemIds.has(itemId)) {
                continue
            }

            const linkedSiblings = item.getLinkedSiblings()

            if (linkedSiblings.length > 0) {
                // Process the entire group of linked items
                let pinPosition: THREE.Vector2 | null = null
                let duvetItem: FurnitureItem3D | null = null

                // First, check if there's an item with socketName "duvet_set_duvet"
                for (let j = 0; j < linkedSiblings.length + 1; j += 1) {
                    const currentItem = j === 0 ? item : linkedSiblings[j - 1]
                    if (currentItem.isDuvet()) {
                        duvetItem = currentItem
                        break
                    }
                }

                // Determine which item to use for pin position
                const itemForPosition = duvetItem || item

                const colorIdReversed = PinsManager.reverseColorId(itemForPosition.colorId)
                const result = results?.get(colorIdReversed)

                if (result && pixelsBuffer) {
                    const resultPoint = PinsManager
                        .computeResultPosition(result.points, itemForPosition.colorId, pixelsBuffer, width)
                    if (resultPoint) {
                        pinPosition = new THREE.Vector2(resultPoint.x / width, (height - resultPoint.y) / height)
                    }
                }

                // Assign the computed position to the item and all its linked siblings
                item.pinPosition2d = pinPosition
                processedItemIds.add(itemId)

                for (let j = 0; j < linkedSiblings.length; j += 1) {
                    const siblingItem = linkedSiblings[j]
                    const siblingItemId = siblingItem.getId()
                    siblingItem.pinPosition2d = pinPosition
                    processedItemIds.add(siblingItemId)
                }
            } else {
                // Single item processing
                const colorIdReversed = PinsManager.reverseColorId(item.colorId)
                const result = results?.get(colorIdReversed)

                const resultPoint = result ? 
                PinsManager.computeResultPosition(result.points, item.colorId, pixelsBuffer, width) : null;
                item.pinPosition2d = resultPoint ? 
                new THREE.Vector2(resultPoint.x / width, (height - resultPoint.y) / height) : null;
            }
        }
    }
    /* eslint-enable no-param-reassign */

    private renderDimensionsReady() {
        const scene = gvCurrentScene()
        if (!scene) {
            return
        }
        const [width, height] = scene.getDimensions()
        this.onRendererSizeChange(width, height)
    }

    private onRendererSizeChange(width: number, height: number) {
        this.width = width
        this.height = height
        this.prepareRasterizedCircles(width * COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR,
            height * COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR)
        this.debugRenderer?.setResolution(width, height)
        this.isDirty = true
    }

    onCanvasResize() {
        this.renderDimensionsReady()
        this.hideAllPins()
        this.deferredMakeAllPinsVisible = true
    }

    // Update all the pins. Param noVisibilityNotification is used to suppress notifications
    // when only the pin visibility has changed. (When the visibility of all the pins changes,
    // we favor sending a single NOTIFY_VIEWER_STATE_UPDATE notification).
    private update(noVisibilityNotification = false) {
        if (this.deferredMakeAllPinsVisible) {
            // Suppress visibility-notifications for individual pins in favor of a show-all
            // notification further below.
            // eslint-disable-next-line no-param-reassign
            noVisibilityNotification = true
            this.pinsHidden = false
        }

        const pinPosition = new THREE.Vector3()
        this.items.forEach((item) => {
            let pinIsReady = false
            if (item.pinPosition2d) {
                pinPosition.set(item.pinPosition2d.x, item.pinPosition2d.y, 0.0)
                pinIsReady = true
            } else if (!this.isUsingImprovedPins()) {
                const renderObject = item.getObject()
                const camera = gvCurrentCamera()?.getThreeCamera()
                if (renderObject && camera) {
                    const defaultPinPosWorld = renderObject.localToWorld(item.defaultPinPosition3d.clone())
                    pinPosition.copy(defaultPinPosWorld.project(camera))
                    const xPositionPadding = 0.025
                    const yPositionPadding = 0.005
                    pinPosition.x = Math.min(
                        Math.max(pinPosition.x * 0.5 + 0.5, xPositionPadding),
                        1.0 - xPositionPadding)
                    pinPosition.y = Math.min(
                        Math.max(1.0 - (pinPosition.y * 0.5 + 0.5), yPositionPadding),
                        1.0 - yPositionPadding)
                    pinIsReady = true
                }
            }

            pinPosition.x *= 100
            pinPosition.y *= 100
            const itemIsHidden = !pinIsReady || !isObjectVisible(item.getObject()) ||
                isObjectNoninteractable(item.getObject())
            const hidePin = !pinIsReady || this.pinsHidden 
            this.dispatchPinUpdateForItem(item, pinPosition, hidePin, itemIsHidden, noVisibilityNotification)
        })

        // Note art items aren't fully controlled by the PinManager yet; it only controls
        // pin visibility on camera view switching behavior.
        this.artItems.forEach((item) => {
            const itemIsHidden = !isObjectVisible(item.getObject()) ||
                isObjectNoninteractable(item.getObject())
            this.dispatchPinUpdateForItem(item, pinPosition, this.pinsHidden, itemIsHidden, noVisibilityNotification)
        })

        // Now that the pins are in their new position, we can make them all visible if requested.
        if (this.deferredMakeAllPinsVisible) {
            this.dispatchShowAllPins()
            this.deferredMakeAllPinsVisible = false
        }

        // needed for e2e tests
        document.dispatchEvent(new CustomEvent(EVT_PINS_MANAGER_UPDATED, { detail: {
            isDirty: this.isDirty
        }}))
    }

    // Dispatch an update for the given item, but only if the pin info has changed. Updates go out
    // both through the legacy callback on each item and as a notification through the GeomViewer
    // API. If noVisibilityNotification is true, visibility-only changes are not dispatched through
    // notifications.
    private dispatchPinUpdateForItem(
        item: FurnitureItem3D | ArtItem3D,
        position: { x: number, y: number },
        hide: boolean,
        itemIsHidden: boolean,
        noVisibilityNotification: boolean) {

        // We use map this.currentPins to check if the pin info has changed.
        let shouldInvokeLegacyCallback = false
        let shouldDispatchNotification = false
        const currentPin = this.currentPins.get(item.getId())
        if (!currentPin) {
            this.currentPins.set(item.getId(), { x: position.x, y: position.y, hide, itemIsHidden })
            shouldInvokeLegacyCallback = true
            shouldDispatchNotification = true
        } else if (currentPin.hide !== hide || currentPin.itemIsHidden !== itemIsHidden
            || currentPin.x !== position.x || currentPin.y !== position.y) {
            // Legacy callback is invoked for any change.
            shouldInvokeLegacyCallback = true
            // Notifications do no go out for visibility changes when noVisibilityNotification is true.
            shouldDispatchNotification = !noVisibilityNotification
                && (currentPin.hide !== hide || currentPin.itemIsHidden !== itemIsHidden)
            // But notifications always go out for position updates.
            shouldDispatchNotification ||= (currentPin.x !== position.x || currentPin.y !== position.y)
            // consequently, notifications always go out for item visibility updates.
            shouldDispatchNotification ||= currentPin.itemIsHidden !== itemIsHidden

            currentPin.x = position.x
            currentPin.y = position.y
            currentPin.hide = hide
            currentPin.itemIsHidden = itemIsHidden
        }

        if (shouldInvokeLegacyCallback && 'updateReactPin' in item) {
            // Invoke the item's pin callback.
            item.updateReactPin({
                pinPosition: { x: position.x, y: position.y },
                hidePin: hide,
                itemIsHidden,
            })
        }

        if (shouldDispatchNotification) {
            const notification: SceneItemUpdateNotification = {
                what: NOTIFY_SCENE_ITEM_UPDATE,
                payload: {
                    itemId: item.getId(),
                    stateInfo: `PinInfo`,
                    itemData: {
                        x: position.x,
                        y: position.y,
                        hidePin: hide,
                        itemIsHidden,
                    }
                }
            }
            GrandCentral.getDispatcher().dispatchNotification(notification);
        }
    }

    private hideAllPins() {
        if (!this.pinsHidden) {
            this.pinsHidden = true

            // This will effectively invoke the legacy callback. However, we suppress
            // notifications for visibility-only changes, since we're going to dispatch below.
            this.update(true /* no notification for visibility */)

            this.currentPins.forEach(pin => {
                pin.hide = true
            })

            const notification: ViewerStateUpdateNotification = {
                what: NOTIFY_VIEWER_STATE_UPDATE,
                payload: {
                    stateInfo: `HideOrShowAllPins`,
                    pinInfo: { hide: true },
                }
            }
            GrandCentral.getDispatcher().dispatchNotification(notification);
        }
    }

    // eslint-disable-next-line class-methods-use-this
    private dispatchShowAllPins() {
        const notification: ViewerStateUpdateNotification = {
            what: NOTIFY_VIEWER_STATE_UPDATE,
            payload: {
                stateInfo: `HideOrShowAllPins`,
                pinInfo: { hide: false },
            }
        }
        GrandCentral.getDispatcher().dispatchNotification(notification);
    }

    onFurnitureItemMoveStart() {
        if (!this.isUsingImprovedPins()) {
            return
        }
        this.deferredMakeAllPinsVisible = false
        this.hideAllPins()
    }

    private onFurnitureItemMoveFinish() {
        if (!this.isUsingImprovedPins()) {
            return
        }
        // Set the dirty flag. This will trigger a pin update on the next frame render.
        this.isDirty = true
        // Setup a deferred request to make all pins visible, which will be taken care of
        // on the next update. This is so that the pins do not become visible before jumping
        // to their new position, which looks very goofy.
        this.deferredMakeAllPinsVisible = true
    }

    private onCameraStateChange(info: NotificationInfo) {
        const state = info as ViewerStateUpdateNotification
        if (state.payload.stateInfo === 'CameraExitStaticView' ||
            state.payload.stateInfo === 'OrbitMoveStart'
        ) {
            this.onCameraExitStaticView()
        } else if (state.payload.stateInfo === 'CameraEnterStaticView'
            || state.payload.stateInfo === 'ViewChangeEnd'
            || state.payload.stateInfo === 'OrbitMoveEnd') {
            this.onCameraEnterStaticView()
        }
    }

    private onCameraExitStaticView() {
        this.deferredMakeAllPinsVisible = false
        this.hideAllPins()
    }

    private onCameraEnterStaticView() {
        this.isDirty = true
        this.deferredMakeAllPinsVisible = true
    }

    private onRenderItemNewPlacement(info: NotificationInfo) {
        // When we get a item-placement notification with parentId === undefined, it may
        // be because the an accessory was placed on the floor for instance after a surface
        // was deleted or a furniture was swapped. Let's update all the pins to be sure.
        const notification = info as SceneItemUpdateNotification
        const isArtItemGeometry = notification.payload.stateInfo === 'Geometry' &&
            this.artItems.has(notification.payload.itemId)
        if (notification.payload.stateInfo === 'PlacementModeSurfaceClicked' ||
            isArtItemGeometry ||
            (notification.payload.stateInfo === 'ItemPlacement' &&
            notification.payload.itemData.parentId === undefined)) {
            this.isDirty = true;
        }
    }

    // pre-compute pixel coordinates for rasterized circles from the biggest possible to the smallest
    // according to the current viewport size. Results will be used in the gatherPolesOfInaccessibility function.
    prepareRasterizedCircles(colorIdTargetWidth: number, colorIdTargetHeight: number) {
        // theoretically, maximum possible inscribed circle radius would be 0.5 * minimal viewport dimension,
        // but unlikely that we'll have a furniture item covering entire viewport, so we arbitrarily chose
        // a smaller value (maxPossibleCircle) for better performance.
        const maxPossibleCircle = 0.25 // in minimal viewport dimension units (most probably, height)
        this.maxCircleRadius = Math.round(maxPossibleCircle * Math.min(colorIdTargetWidth, colorIdTargetHeight))
        this.rasterizedCircles.length = 0
        for (let r = this.maxCircleRadius; r > 0; r -= 1) {
            this.rasterizedCircles.push(PinsManager.rasterizeCircle(r))
        }
    }

    cleanup() {
        GrandCentral.getDispatcher().removeObserver(this.onCameraStateChange)
        GrandCentral.getDispatcher().removeObserver(this.furnitureItemLoadObserver)
        GrandCentral.getDispatcher().removeObserver(this.onFurnitureItemMoveStart)
        GrandCentral.getDispatcher().removeObserver(this.onFurnitureItemMoveFinish)
        GrandCentral.getDispatcher().removeObserver(this.onRenderItemNewPlacement)
        GrandCentral.getDispatcher().removeObserver(this.onCompositionLoadingBegin)
        GrandCentral.getDispatcher().removeObserver(this.onCompositionLoadingEnd)

        this.items.clear()
        this.artItems.clear()
    }

    private getOrCreateDebugRenderer() {
        if (!this.debugRenderer) {
            this.debugRenderer = new PinsManagerDebugRenderer()
        }
        return this.debugRenderer
    }

    debugRender() {
        const debugRenderer = this.getOrCreateDebugRenderer()
        const renderer = gvRenderLibrary()?.renderer
        const camera = gvCurrentCamera()?.getThreeCamera()
        if (!renderer || !camera || !this.debugModeEnabled || this.pinsHidden || !debugRenderer) {
            return
        }
        debugRenderer.render(renderer, camera)
    }

    onAnimationFrame() {
        if (!this.isDirty || this.processingFurnitureItems || this.disabled) {
            return
        }
        this.isDirty = false

        const recomputationPromise = this.isUsingImprovedPins()
            ? this.recomputePinPositions()
            : Promise.resolve()
        recomputationPromise.then(() => this.update())
    }
}
