import * as types from 'models/actionTypes'
import * as tracker from 'utils/tracker'
import { experimentsService } from 'services/experiments'
import { getCurrentUser } from 'models/user/selectors'
import {
    getSelectedCompositionTrackingRoomInfo,
    getRenderItemById,
    getSelectedComposition,
} from 'models/compositions/selectors'

import { getScheduledScreenshotTimeout, getFirstScheduledScreenshotTime } from 'models/tracking/selectors'
import {
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_ACTION_MOVE_PRODUCT,
    GA_ACTION_GET_DETAILS,
    GA_ACTION_ADD_PRODUCT,
    OPTIMIZELY_ADD_PRODUCT,
    TRACK_LOCATION_SIDEPANEL,
    ACTION_ADD_PRODUCT,
} from 'models/tracking/constants'
import { delayedScreenshotScsheduled, delayedScreenshotSent } from 'models/compositions/actions'
import { DESIGN_SIDEPANEL_MODE_FAVORITES_BROWSE } from 'models/ui/constants'
import { getNumFavorites } from 'models/favorites/selectors'

import uploadPreviewScreenshot from 'utils/uploadPreviewScreenshot'
import { getShowrooms } from 'models/showrooms/selectors'
import { GeomViewer } from 'Renderer/geomviewer'
import { PlacementBeginMode, PlacementStoppageMode } from 'Renderer/inputhandler/types'
import {
    getDynamicMeasurementsEnabled,
    getProductDimensionsEnabled,
    getRoomDimensionsEnabled,
} from 'models/ui/selectors'
import { LIST_OF_UNSUPPORTED_SHOWROOMS } from 'constants/roomDimensions'
import { getProductTrackingInfo } from './utils'

function trackProductAdd(trackDataObj, roomSourceLabel) {
    tracker.drop(ACTION_ADD_PRODUCT, trackDataObj)
    if (trackDataObj.LocalItemNumber) {
        const gaEventLabel = `${trackDataObj.LocalItemNumber}${roomSourceLabel}|${trackDataObj.PlacementAction || null}`
        tracker.trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_ADD_PRODUCT, gaEventLabel)
    }
    experimentsService.track(OPTIMIZELY_ADD_PRODUCT)
}

function trackProductMove(trackDataObj, roomSourceLabel) {
    tracker.drop('DecorateRoom.MoveProduct', trackDataObj)
    if (trackDataObj.LocalItemNumber) {
        const gaEventLabel = `${trackDataObj.LocalItemNumber}${roomSourceLabel}`
        tracker.trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_MOVE_PRODUCT, gaEventLabel)
    }
}

const trackingMiddleware = (store) => (next) => (action) => {
    const result = next(action)
    const state = store.getState()
    const roomInfo = getSelectedCompositionTrackingRoomInfo(state)
    const roomSource = roomInfo && roomInfo.RoomSource
    const roomSourceLabel = roomSource ? `|${roomSource}` : ''
    const roomDimensionsEnabled = getRoomDimensionsEnabled(state)
    const productDimensionsEnabled = getProductDimensionsEnabled(state)
    const dynamicMeasurementsEnabled = getDynamicMeasurementsEnabled(state)
    const roomDimensionsInfo = GeomViewer.bindings?.queryRoomDimensionsInfo()
    const composition = getSelectedComposition(state)
    const showroomId = composition?.sceneId

    const isShowroomUnsupported = showroomId && LIST_OF_UNSUPPORTED_SHOWROOMS.includes(showroomId)

    const disableRoomDimensions =
        isShowroomUnsupported || !roomDimensionsInfo?.isValid || !roomDimensionsInfo?.shouldBeVisible

    switch (action.type) {
        case types.FAILED_RECEIVE_USER:
            break
        case types.SET_INITIAL_LOADING:
            if (!action.payload.initialLoading) {
                let totalSceneLoadSizeMB = 0.0
                let modelsCount = 0
                const loadCompleteTime = tracker.getTimeSinceLoadingStart()
                const downloadMetrics = GeomViewer.bindings?.queryDownloadMetrics()
                const sceneLoadingStats = GeomViewer.bindings?.querySceneLoadingStats() ?? null
                const gpuFrameStats = GeomViewer.bindings?.queryPerformanceStats().gpuFrameStats ?? null

                if (downloadMetrics) {
                    totalSceneLoadSizeMB =
                        downloadMetrics.sceneAdditionalDataSizeMB + downloadMetrics.totalModelsLoadSizeMB
                    modelsCount = downloadMetrics.modelsCount
                }

                const designSortOrder = getShowrooms(state).find(
                    (showroom) => showroom.scene === roomInfo.RoomId,
                )?.sortOrder

                tracker.track('DecorateRoom.FullLoadComplete', {
                    ...roomInfo,
                    DesignTitle: roomInfo.DesignTitle,
                    loadCompleteTime,
                    ...sceneLoadingStats,
                    ...gpuFrameStats,
                    totalSceneLoadSizeMB,
                    modelsCount,
                    rank: designSortOrder ?? null,
                    RoomDimensionsEnabled: roomDimensionsEnabled,
                    ProductDimensionsEnabled: productDimensionsEnabled,
                    DynamicMeasurementsEnabled: dynamicMeasurementsEnabled,
                    room_dimensions_success: !disableRoomDimensions,
                })

                const fileName = 'screenshot.jpg'
                uploadPreviewScreenshot(fileName, window.globalRendererSessionId)
                    .then(({ uuid, thumbTelemetry }) => {
                        const eventName = 'DecorateRoom.Screenshot'
                        const { wid } = getCurrentUser(state)
                        tracker.workflow(eventName, {
                            userId: wid,
                            sessionId: window.globalRendererSessionId,
                            uuid,
                            screenshotType: 'InitialLoad',
                            minuteIncrement: 0,
                            issuer: 'SET_INITIAL_LOADING middleware',
                            ...thumbTelemetry,
                            ...roomInfo,
                        })
                    })
                    .catch(() => {
                        const eventName = 'DecorateRoom.ScreenshotFailed'
                        const { wid } = getCurrentUser(state)
                        tracker.workflow(eventName, {
                            userId: wid,
                            sessionId: window.globalRendererSessionId,
                            ...roomInfo,
                        })
                    })
            } else {
                tracker.markLoadingStart()
                GeomViewer.bindings?.signalCompositionLoadingBegin()
            }
            break
        case types.SCHEDULE_DELAYED_SCREENSHOT:
            {
                const currentTimeoutId = getScheduledScreenshotTimeout(state)
                if (!currentTimeoutId) {
                    const screenshotTimeout = 60 * 1000
                    const newTimeout = window.setTimeout(() => {
                        const firstScreenshotTime = getFirstScheduledScreenshotTime(state)
                        const minuteIncrement = Math.round(
                            (window.performance.now() - firstScreenshotTime) / (1000.0 * 60.0),
                        )
                        const fileName = 'screenshot.jpg'
                        uploadPreviewScreenshot(fileName, window.globalRendererSessionId)
                            .then(({ uuid, thumbTelemetry }) => {
                                const eventName = 'DecorateRoom.Screenshot'
                                const { wid } = getCurrentUser(state)
                                tracker.workflow(eventName, {
                                    userId: wid,
                                    sessionId: window.globalRendererSessionId,
                                    uuid,
                                    screenshotType: 'MinuteIncrement',
                                    minuteIncrement,
                                    issuer: 'DELAYED_SCREENSHOT middleware',
                                    ...thumbTelemetry,
                                    ...roomInfo,
                                })
                                store.dispatch(delayedScreenshotSent())
                            })
                            .catch(() => {
                                const eventName = 'DecorateRoom.ScreenshotFailed'
                                const { wid } = getCurrentUser(state)
                                tracker.workflow(eventName, {
                                    userId: wid,
                                    sessionId: window.globalRendererSessionId,
                                    ...roomInfo,
                                })
                            })
                    }, screenshotTimeout)
                    store.dispatch(delayedScreenshotScsheduled(newTimeout))
                }
            }
            break

        case types.TRACK_SHOW_DETAILS: {
            const { trackingInfo } = action
            const eventName = 'DecorateRoom.GetAdditionalDetails'
            tracker.click(eventName, {
                ...trackingInfo,
                ...roomInfo,
            })

            if (trackingInfo && trackingInfo.LocalItemNumber) {
                const gaEventLabel = `${trackingInfo.LocalItemNumber}${roomSourceLabel}`
                tracker.trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_GET_DETAILS, gaEventLabel)
            }
            break
        }
        case types.SET_MAGIC_WINDOW_LOADING: {
            // Only track if finished loading
            if (!action.isMagicWindowLoading) {
                // happens when MW loading animation switches to the scene view
                const eventName = 'DecorateRoom.LoadComplete'
                const loadCompleteTime = tracker.getTimeSinceLoadingStart()

                let glbStats = {}
                const downloadMetrics = GeomViewer.bindings?.queryDownloadMetrics()
                if (downloadMetrics) {
                    glbStats = {
                        totalModelsLoadSizeMB: downloadMetrics.totalModelsLoadSizeMB,
                        modelsCount: downloadMetrics.modelsCount,
                    }
                }
                tracker.track(eventName, {
                    ...roomInfo,
                    loadCompleteTime,
                    ...glbStats,
                })
            }
            break
        }
        case types.OPEN_DESIGN_SIDEPANEL:
        case types.SET_DESIGN_SIDEPANEL_MODE: {
            const { trackingInfo, mode } = action.payload
            // Only track when there is a productId/title/accessFrom fields
            if (trackingInfo && trackingInfo.ProductId) {
                tracker.click('DecorateRoom.GetInfo', {
                    ...trackingInfo,
                    ...roomInfo,
                })
            }
            if (mode === DESIGN_SIDEPANEL_MODE_FAVORITES_BROWSE) {
                tracker.click('DecorateRoom.Favorites', {
                    ...roomInfo,
                    Favorites: getNumFavorites(state),
                })
            }
            break
        }
        case types.TRACK_STACKABLE_PLACEMENT: {
            const {
                itemId,
                placementStoppageReason,
                placementBeginMode,
                isDragEnd,
                isAutoPlacement,
                hasStackableChangedSurface,
            } = action.stackablePlacedInfo
            const renderItem = getRenderItemById(state, itemId)
            const trackingInfo = getProductTrackingInfo(renderItem)
            const isStackable = trackingInfo.CanStack
            if (renderItem && isStackable) {
                let placementActionString = ''
                if (placementStoppageReason === PlacementStoppageMode.SuccessfulPlacementSurface) {
                    placementActionString = 'SceneClick'
                } else if (placementStoppageReason === PlacementStoppageMode.SuccessfulPlacementUI) {
                    placementActionString = 'PlaceOnFloorButton'
                } else if (isDragEnd) {
                    placementActionString = 'DragEnd'
                } else if (isAutoPlacement) {
                    placementActionString = 'AutoPlacement'
                }

                const { stackedPlane } = renderItem
                const isItemAdded = placementBeginMode === PlacementBeginMode.Add
                const isItemAddedFromPanel =
                    isItemAdded && placementStoppageReason === PlacementStoppageMode.SuccessfulPlacementUI
                // AutoPlacement occurs on swapping and snap-rotating. In these cases there always is a change of surface.
                const changedSurface = placementActionString === 'AutoPlacement' ? true : hasStackableChangedSurface
                const trackDataObj = {
                    PlacementAction: placementActionString,
                    PlacementLocation: stackedPlane ? 'StackableSurface' : 'Floor',
                    isStackable,
                    ChangedStackableSurface: !isItemAdded && changedSurface,
                    // AddedFrom and PlacementAction fire under the same circumstances when addition or placement
                    // source is the panel button click. One tracks how the item was placed, other how the item was added.
                    // We need to keep AddedFrom for homogenity with other items addition tracking.
                    ...(isItemAddedFromPanel ? { AddedFrom: TRACK_LOCATION_SIDEPANEL } : {}),
                    ...trackingInfo,
                    ...roomInfo,
                }

                if (isItemAdded) {
                    trackProductAdd(trackDataObj, roomSourceLabel)
                } else {
                    trackProductMove(trackDataObj, roomSourceLabel)
                }
            }

            break
        }

        case types.TRACK_DECORATE_ROOM_MOVE_PRODUCT: {
            const { trackingInfo } = action
            const trackDataObj = {
                ...trackingInfo,
                ...roomInfo,
            }
            trackProductMove(trackDataObj, roomSourceLabel)
            break
        }

        default:
            break
    }

    return result
}

export default trackingMiddleware
