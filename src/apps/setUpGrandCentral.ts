import { Store } from 'store'

import { getGrandCentral } from 'Renderer/GrandCentral'
import {
    NOTIFY_DOWNLOAD_ERROR,
    NOTIFY_VIEWER_STATE_UPDATE,
    NOTIFY_VIEWER_LEGACY_CALLBACK,
    NOTIFY_VIEWER_ERROR,
    NOTIFY_LOW_PERFORMANCE,
    DOWNLOAD_TYPE_SCENEDATA,
    DOWNLOAD_TYPE_ENVMAP,
    type NotificationInfo,
    type ViewerStateUpdateNotification,
    type ViewerDownloadErrorNotification,
    type ViewerLegacyCallbackNotification,
    type ViewerErrorNotification,
    type LowPerformanceNotification,
    NOTIFY_SCENE_ITEM_UPDATE,
    SceneItemUpdateNotification,
    GeomViewer,
    NOTIFY_GPU_STATS,
    GPUStatsNotification,
} from 'Renderer/geomviewer'
import {
    firstRender,
    initializationFailure,
    lowPerformanceDetected,
    placementModeFinished,
    placementModeStarted,
    rendererReady,
    setViewports,
    stackableDraggingModeEnded,
    stackableDraggingModeStarted,
    stackableDraggingPositionValid,
    orbitModeBegin,
    orbitModeEnd,
    orbitModeMoveStart,
    orbitModeMoveStop,
    gpuStatsReady,
} from 'models/renderer/actions'
import { updateAllPins, viewLoaded, wallDataReady } from 'models/preview/actions'
import {
    updateHiddenSurfaces,
    updateCompositionRenderItem,
    selectCompositionRenderItem,
    renderItemLoaded,
    clearSwapAffinity,
    startDragRenderItem,
    stopDragRenderItem,
    deleteCompositionRenderItem,
} from 'models/compositions/actions'
import {
    getSelectedComposition,
    getSelectedCompositionId,
    getSelectedCompositionProductData,
    getSelectedRenderItemId,
    getSelectedScene,
    getSelectedView,
} from 'models/compositions/selectors'
import { selectFurniture } from 'models/furniture/actions'
import { debugConsoleLog } from 'models/admin/actions'
import { getProductTrackingInfo, GPUStatsTrackingInfo } from 'models/tracking/utils'
import { hoverRenderItemIdSlice } from 'models/compositions/slices'
import { RenderItemComplete } from 'models/compositions'
import { STACKABLE_DISCARDED } from 'models/tracking/constants'
import { upptackaActions } from 'models/upptacka/slice'
import { EPSILON } from 'Renderer/geometry'
import { getHasPointChanged } from 'Renderer/geometry/utilities'
import {
    trackDecorateRoomMove,
    trackDecorateRoomRotate,
    trackStackablePlacement,
    trackOrbitModeMoveStop,
} from '../models/tracking/actions'

const matchNotif = <N extends NotificationInfo>(what: number, notification: NotificationInfo): notification is N =>
    notification.what === what

export const setUpGrandCentralObservers = (store: Store) => {
    const gc = getGrandCentral()

    // gc.enableLogging()

    // Receive GPU Stats
    gc.addObserver(NOTIFY_GPU_STATS, (notification) => {
        if (matchNotif<GPUStatsNotification>(NOTIFY_GPU_STATS, notification)) {
            const { payload } = notification
            if (payload.stateInfo === `GPUStatsSuccess`) {
                const gpuStats: GPUStatsTrackingInfo = {
                    gpuStatsTier: payload.stats.tier,
                    gpuStatsLoadTime: payload.stats.elapsedTime,
                    gpuStatsGPU: payload.stats.gpu,
                    gpuStatsCached: payload.stats.cached,
                    gpuStatsIsMobile: payload.stats.isMobile,
                    gpuStatsType: payload.stats.type,
                    gpuStatsFps: payload.stats.fps,
                }
                store.dispatch(gpuStatsReady(gpuStats))
                store.dispatch(debugConsoleLog('GPU Stats', `GPU Stats: \n${JSON.stringify(payload.stats, null, 2)}`))
            } else if (payload.stateInfo === `GPUStatsFailed`) {
                store.dispatch(debugConsoleLog('GPU Stats', `GPU Stats: \n${JSON.stringify(payload.error, null, 2)}`))
            }
        }
    })

    gc.addObserver(NOTIFY_DOWNLOAD_ERROR, (notification) => {
        if (matchNotif<ViewerDownloadErrorNotification>(NOTIFY_DOWNLOAD_ERROR, notification)) {
            const { payload } = notification
            if ([DOWNLOAD_TYPE_SCENEDATA, DOWNLOAD_TYPE_ENVMAP].includes(payload.downloadType)) {
                store.dispatch(
                    initializationFailure({
                        ...payload,
                        hasSceneLoadFailure: true,
                    }),
                )
            }
        }
    })

    gc.addObserver(NOTIFY_VIEWER_ERROR, (notification) => {
        if (matchNotif<ViewerErrorNotification>(NOTIFY_VIEWER_ERROR, notification)) {
            const { payload } = notification
            switch (payload.error) {
                case 'InitializationFailure':
                    store.dispatch(initializationFailure(payload.initializationFailureInfo))
                    break
                case 'Other':
                default:
                    break
            }
        }
    })

    gc.addObserver(NOTIFY_LOW_PERFORMANCE, (notification) => {
        if (matchNotif<LowPerformanceNotification>(NOTIFY_LOW_PERFORMANCE, notification)) {
            const { payload } = notification
            store.dispatch(
                lowPerformanceDetected({
                    ...payload,
                }),
            )
        }
    })

    gc.addObserver(NOTIFY_VIEWER_STATE_UPDATE, (notification) => {
        if (matchNotif<ViewerStateUpdateNotification>(NOTIFY_VIEWER_STATE_UPDATE, notification)) {
            const { payload } = notification
            switch (payload.stateInfo) {
                case 'FirstRender':
                    store.dispatch(firstRender())
                    break
                case 'WallDataReady': {
                    const { width, height } = payload.wallDataInfo
                    store.dispatch(wallDataReady(width, height))
                    break
                }
                case 'ViewerReady': {
                    store.dispatch(rendererReady(payload.viewerReadyContextInfo))
                    store.dispatch(
                        debugConsoleLog(
                            'viewer',
                            `viewer ready\n${JSON.stringify(payload.viewerReadyContextInfo, null, 2)}`,
                        ),
                    )

                    const viewerInfo = GeomViewer.bindings?.queryViewerInfo()
                    const scene = getSelectedScene(store.getState())
                    if (viewerInfo && viewerInfo.views) {
                        const viewports = viewerInfo.views.map((label, idx) => {
                            const thumbnail = scene?.viewports?.[idx]?.thumbnailUrl
                            return { id: label, name: label, thumbnailUrl: thumbnail }
                        })
                        store.dispatch(setViewports(viewports))
                    }
                    break
                }
                case 'HideOrShowAllPins':
                    store.dispatch(updateAllPins({ hidePin: payload.pinInfo.hide }))
                    break
                case 'ViewChangeEnd': {
                    const camera = payload.camera
                    const intrinsics = camera?.getIntrinsics()
                    const threeCamera = camera?.getThreeCamera()
                    if (!camera || !intrinsics || !threeCamera) {
                        break
                    }

                    const cameraType = threeCamera.isPerspectiveCamera ? `perspective` : `orthographic`
                    const cameraInfo = {
                        translation: threeCamera.position.toArray(),
                        rotation: threeCamera.quaternion.toArray(),
                        type: cameraType,
                        [cameraType]: {
                            aspectRatio: camera.getViewWidth() / camera.getViewHeight(),
                            yfov: threeCamera.fov,
                            znear: threeCamera.near,
                            zfar: threeCamera.far,
                            cxyNormalized: [
                                intrinsics.principalPointX / camera.getViewWidth(),
                                intrinsics.principalPointY / camera.getViewHeight(),
                            ],
                        },
                    }
                    const viewName = getSelectedView(store.getState())
                    store.dispatch(viewLoaded(viewName, cameraInfo))
                    break
                }
                case 'ToggleFocus': {
                    GeomViewer.bindings?.setCameraMode({
                        mode: payload.itemId ? `focused` : `default`,
                        itemId: payload.itemId,
                    })
                    break
                }
                case 'BeginStackableDraggingMode': {
                    store.dispatch(stackableDraggingModeStarted())
                    break
                }
                case 'EndStackableDraggingMode': {
                    store.dispatch(stackableDraggingModeEnded())
                    break
                }
                case `ValidOrInvalidDestinationCursor`:
                    store.dispatch(stackableDraggingPositionValid(payload.isDragDestinationValid))
                    break
                case `OrbitModeBegin`:
                    store.dispatch(orbitModeBegin())
                    break
                case `OrbitModeEnd`:
                    store.dispatch(orbitModeEnd())
                    break
                case `OrbitMoveStart`:
                    store.dispatch(orbitModeMoveStart())
                    break
                case `OrbitMoveEnd`:
                    store.dispatch(orbitModeMoveStop())
                    store.dispatch(trackOrbitModeMoveStop())
                    break
                default:
                    break
            }
        }
    })

    gc.addObserver(NOTIFY_VIEWER_LEGACY_CALLBACK, (notification) => {
        if (matchNotif<ViewerLegacyCallbackNotification>(NOTIFY_VIEWER_LEGACY_CALLBACK, notification)) {
            const { payload } = notification
            switch (payload.legacyCallback) {
                case 'updateHiddenSurfaces': {
                    const { surfaces } = payload.updateHiddenSurfacesInfo
                    const id = getSelectedCompositionId(store.getState())
                    store.dispatch(updateHiddenSurfaces(id, surfaces))
                    break
                }
                default:
                    break
            }
        }
    })

    gc.addObserver(NOTIFY_SCENE_ITEM_UPDATE, (notification) => {
        if (matchNotif<SceneItemUpdateNotification>(NOTIFY_SCENE_ITEM_UPDATE, notification)) {
            const { payload } = notification
            switch (payload.stateInfo) {
                case 'DragStart': {
                    const compositionId = getSelectedCompositionId(store.getState())
                    const uniqueId = parseInt(payload.itemId, 10)
                    store.dispatch(clearSwapAffinity(compositionId, uniqueId))
                    store.dispatch(startDragRenderItem(uniqueId))
                    break
                }
                case 'DragEnd': {
                    store.dispatch(stopDragRenderItem())
                    if (payload.stackablePlacementTelemetry) {
                        const { stackablePlacementTelemetry: { hasStackableChangedSurface } = {} } = payload
                        store.dispatch(
                            trackStackablePlacement({
                                itemId: Number(payload.itemId),
                                isDragEnd: true,
                                hasStackableChangedSurface,
                            }),
                        )
                    }
                    break
                }
                case 'Geometry': {
                    const composition = getSelectedComposition(store.getState())
                    if (composition) {
                        const { itemId, itemData = { p3: undefined } } = payload
                        const renderItemId = parseInt(itemId, 10)
                        const renderItem = composition.renderItems.find((ri) => ri.uniqueId === renderItemId)

                        if (renderItem) {
                            const trackingInfo: Record<string, unknown> = { ...getProductTrackingInfo(renderItem) }
                            trackingInfo.hidden = renderItem.hidden
                            // If item is added from the side panel, or loaded from a saved composition is added to the scene, but not moved.
                            const isAddedToScene = !renderItem.p3 || !!itemData.isLoading
                            const ispos2DataDefined = itemData.x !== undefined && itemData.y !== undefined
                            if (!isAddedToScene) {
                                // Telemetry dispatch. Note we compare pos3 changes to dispatch the position 2d. This prevents false positives when
                                // 2d position changes but item does not move. E.g on view change or stackable movement through parent drag.
                                // We only track DecorateRoom.Move for non-stackables here. For stacakbles, tracking payload is different.
                                // For that reason stackables move is tracked in the respective event type where the move ends, e.g 'DragEnd' or 'EndPlacementModeWithItem.'
                                if (ispos2DataDefined && itemData.p3 && renderItem.p3 && !renderItem.stacks) {
                                    trackingInfo.OriginalPosition = { x: renderItem.x, y: renderItem.y }
                                    trackingInfo.FinalPosition = { x: itemData.x, y: itemData.y }
                                    const hasPosChanged = getHasPointChanged(renderItem.p3, itemData.p3)
                                    if (hasPosChanged) {
                                        store.dispatch(trackDecorateRoomMove(trackingInfo))
                                    }
                                }

                                if (itemData.heading !== undefined && !itemData.isBoundToWall) {
                                    trackingInfo.OriginalOrientation = renderItem.heading
                                    trackingInfo.FinalOrientation = itemData.heading
                                    // Telemetry dispatch.
                                    const hasHeadingChanged =
                                        Math.abs(Math.abs(renderItem.heading) - Math.abs(itemData.heading)) > EPSILON
                                    if (hasHeadingChanged) {
                                        store.dispatch(trackDecorateRoomRotate(trackingInfo))
                                    }
                                }
                            }

                            store.dispatch(
                                updateCompositionRenderItem(composition.id, renderItemId, itemData, trackingInfo),
                            )
                        }
                    }
                    break
                }
                case 'ItemPlacement': {
                    const compositionId = getSelectedCompositionId(store.getState())

                    const { itemId, itemData, collisionState } = payload
                    const renderItemId = parseInt(itemId, 10)

                    const item: Partial<RenderItemComplete> = {}

                    if (itemData.placement) {
                        item.placement = itemData.placement
                    }
                    if (itemData.parentId) {
                        item.parentId = Number(itemData.parentId)
                    } else {
                        item.parentId = undefined
                    }
                    if (itemData.parentIdOrSurface) {
                        item.parentIdOrSurface = itemData.parentIdOrSurface
                    }
                    if (itemData.parentAttachment !== undefined) {
                        item.parentAttachment = itemData.parentAttachment
                    }
                    if (itemData.additionalContacts) {
                        item.additionalContacts = itemData.additionalContacts
                    }
                    if (itemData.snapRotationIndex !== undefined) {
                        item.anchorCombinationIndex = itemData.snapRotationIndex
                    }
                    if (itemData.placingBehavior) {
                        item.placingBehavior = itemData.placingBehavior
                    }
                    if (itemData.stackedOnSurfaceId) {
                        item.stackedPlane = itemData.stackedOnSurfaceId
                    } else {
                        item.stackedPlane = undefined
                    }
                    if (itemData.rawPlacement3d) {
                        item.rawPlacement3d = itemData.rawPlacement3d
                    }
                    if (collisionState) {
                        item.collisionState = collisionState
                    }
                    // TODO add tracking info
                    store.dispatch(updateCompositionRenderItem(compositionId, renderItemId, item, {}))
                    if (itemData.isAutoPlacement) {
                        store.dispatch(
                            trackStackablePlacement({ itemId: Number(payload.itemId), isAutoPlacement: true }),
                        )
                    }

                    break
                }
                case 'Selected': {
                    const renderItemId = parseInt(payload.itemId, 10)
                    const currentSelectedRenderItemId = getSelectedRenderItemId(store.getState())
                    // Hide the upptacka details view when selecting a new item
                    // (upptacka details view is 'covering' the selected item view, so it needs to be hidden)
                    store.dispatch(upptackaActions.hideUpptackaDetailsView())
                    store.dispatch(upptackaActions.setSceneHasBeenInteractedWith())
                    if (renderItemId === currentSelectedRenderItemId) {
                        // Don't trigger all of the selection logic when
                        // we are selecting an item in the viewer that
                        // is already selected in redux
                        break
                    }
                    store.dispatch(selectCompositionRenderItem(renderItemId))

                    const renderedProductData = getSelectedCompositionProductData(store.getState())
                    const nextSelectedProductData = renderedProductData.find((i) => i.uniqueId === renderItemId)
                    if (nextSelectedProductData) {
                        store.dispatch(selectFurniture(nextSelectedProductData.id))
                    }
                    break
                }
                case 'Deselected': {
                    const selectedRenderItemId = getSelectedRenderItemId(store.getState())
                    if (selectedRenderItemId === parseInt(payload.itemId, 10)) {
                        store.dispatch(selectCompositionRenderItem(-1))
                    }
                    break
                }
                case 'ItemReady': {
                    const compositionId = getSelectedCompositionId(store.getState())

                    const metricsResult = GeomViewer.bindings?.queryItemMetrics(payload.itemId)
                    const metrics = (metricsResult && metricsResult.ok && metricsResult.retValues) ?? {}

                    store.dispatch(
                        renderItemLoaded(compositionId, parseInt(payload.itemId, 10), {
                            metrics,
                            readyAndRendered: true,
                        }),
                    )
                    break
                }
                case 'PinInfo': {
                    const compositionId = getSelectedCompositionId(store.getState())

                    const { itemId, itemData } = payload
                    const renderItemId = parseInt(itemId, 10)

                    const item = {
                        pin: {
                            x: itemData.x ?? 0,
                            y: itemData.y ?? 0,
                            hidePin: itemData.hidePin ?? true,
                            itemIsHidden: itemData.itemIsHidden ?? false,
                        },
                    }
                    // TODO add tracking info
                    store.dispatch(updateCompositionRenderItem(compositionId, renderItemId, item, {}))
                    break
                }
                case 'HoverStart': {
                    const { itemId } = payload
                    store.dispatch(hoverRenderItemIdSlice.actions.hoverStart(parseInt(itemId, 10)))
                    break
                }
                case 'HoverEnd': {
                    store.dispatch(hoverRenderItemIdSlice.actions.hoverEnd())
                    break
                }
                case 'BeginPlacementModeWithItem':
                    store.dispatch(placementModeStarted())
                    break
                case 'EndPlacementModeWithItem': {
                    const compositionId = getSelectedCompositionId(store.getState())
                    const {
                        itemId,
                        itemData: { discardItem },
                        stackablePlacementTelemetry,
                    } = payload
                    // NOTE: we're occasionally seeing errors about the render item being deleted before tracking
                    //       executes, which may indicate a race condition. See https://geomagical-labs.sentry.io/issues/4682085545/.
                    if (stackablePlacementTelemetry) {
                        const { placementStoppageReason, placementBeginMode, hasStackableChangedSurface } =
                            stackablePlacementTelemetry
                        store.dispatch(
                            trackStackablePlacement({
                                itemId: Number(itemId),
                                placementStoppageReason,
                                placementBeginMode,
                                hasStackableChangedSurface,
                            }),
                        )
                    }
                    if (discardItem) {
                        const trackingInfo = {
                            RemovedFrom: STACKABLE_DISCARDED,
                        }

                        store.dispatch(deleteCompositionRenderItem(compositionId, Number(itemId), trackingInfo))
                    }
                    store.dispatch(placementModeFinished())

                    break
                }
                default:
                    break
            }
        }
    })
}
