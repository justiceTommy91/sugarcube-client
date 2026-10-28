import { takeEvery, select, call, put } from 'redux-saga/effects'
import * as Sentry from '@sentry/react'
import {
    RECEIVE_FURNITURE,
    RECEIVE_USER,
    PLACE_RENDER_ITEM,
    DELETE_COMPOSITION_RENDER_ITEM,
    SWAP_RENDER_ITEM,
    RENDER_ITEM_LOADED,
    UPDATE_COMPOSITION_RENDER_ITEM,
    REQUEST_SAVE_COMPOSITION,
    FAILED_SAVE_COMPOSITION,
    OPEN_COMPOSITION,
    NEW_RENDERER,
    RECEIVE_COPY_COMPOSITION,
    RECEIVE_SAVE_COMPOSITION,
    RECEIVE_RENAME_COMPOSITION,
    DESTROY_RENDERER,
    SHARE_PANEL_OPEN_TOGGLE,
    RENDERER_READY,
    COMPLETE_MAGIC_ERASER_ONBOARDING,
    COMPLETE_ONBOARDING,
    INITIALIZATION_FAILURE,
    LOW_PERFORMANCE_DETECTED,
    LOGIN_NEEDED,
    NEW_IFRAME_MESSAGE,
    REMOVE_RENDER_ITEMS,
    SCROLL_SWAP_MENU,
    SET_WALL_COLOR,
    SHOW_CHANGE_VIEW,
    SHOW_DESIGN_SUMMARY,
    SHOW_GOES_WITH_TAB,
    SHOW_LOGIN_PROMPT_MODAL,
    SKIP_MAGIC_ERASER_ONBOARDING,
    SKIP_ONBOARDING,
    TOGGLE_FAVORITE,
    TOGGLE_FAVORITES,
    TRACK_DECORATE_ROOM_ROTATE_PRODUCT,
    TRACK_GA_EVENT,
    TRACK_HELP_CENTER_CLICKS,
    TRACK_SNAP_ROTATE_CLICK,
    UPDATE_COMPOSITION_SAVE_DATA,
    UPDATE_LOCATION,
    UPDATE_PREVIEW_SETTINGS,
    VIEW_LOADED,
    VIEW_SELECTED,
    WEBGL_CONTEXT_LOST,
    WEBGL_CONTEXT_NOT_CREATED,
    WEBGL_CONTEXT_RESTORED,
    WEBGL_CONTEXT_TOO_MANY_LOSSES,
    REQUEST_SAVE_SCENE,
    RECEIVE_SAVE_SCENE,
    FAILED_SAVE_SCENE,
    GO_TO_ROOM_EDITOR,
    ROOM_PLANNER_STARTING,
    ROOM_PLANNER_FINISHING,
    TRACK_ORBIT_MODE_MOVE_START,
    TRACK_ORBIT_MODE_MOVE_STOP,
    SHOW_DOLLHOUSE_VIEWS,
} from 'models/actionTypes'
import { actionTypes as addToShoppingBagActionTypes } from 'features/shopping-bag/redux/actions'
import { getFilterResult, getFurnitureById, getLocation, getFurnitureByFilter } from 'models/furniture/selectors'
import * as furnitureSelectors from 'models/furniture/selectors'
import {
    getRoundTripTimeCatalogSearch,
    getFirstFurnitureScreenshotDone,
    getScheduledScreenshotTimeout,
    getCurrentSearchContext,
    getSearchType,
} from 'models/tracking/selectors'
import {
    getProductsFromLocalItemNumbers,
    getSelectedComposition,
    getSelectedCompositionTrackingRoomInfo,
    getSelectedRenderItem,
    getSelectedScene,
    getSelectedSceneRoomType,
    getUserDidAddRenderItem,
} from 'models/compositions/selectors'
import { Composition, RenderItemComplete, SelectedCompositionTrackingRoomInfo } from 'models/compositions'
import { formatSearchTermDetails, formatSearchQueryDetails } from 'utils/searchTracking'
import type { ProductFilters } from 'components/DesignSidepanel/search-filters/types/hooks'
import type { FilterSelections } from 'components/DesignSidepanel/search-filters/types/core'
import { FilterResult, ProductData } from 'models/furniture'
import * as tracker from 'utils/tracker'
import {
    OPTIMIZELY_ADD_TO_CART_GEO,
    OPTIMIZELY_ADD_TO_CART,
    GA_ACTION_ADD_TO_BAG,
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_ACTION_ADD_ROOM_TO_BAG,
    ACTION_ADD_PRODUCT,
    ACTION_REMOVE_PRODUCT,
    GA_ACTION_ADD_PRODUCT,
    OPTIMIZELY_ADD_PRODUCT,
    OPTIMIZELY_REMOVE_PRODUCT,
    GA_ACTION_REMOVE_PRODUCT,
    OPTIMIZELY_OPEN_ROOM,
    GA_ACTION_SAVE,
    GA_ACTION_ADD_FAVORITE,
    GA_ACTION_ERROR_PAGE_VISIT,
    GA_ACTION_REMOVE_FAVORITE,
    STACKABLE_DISCARDED,
    ACTION_SEARCH_RESULT,
    SEARCH_RESULT_SUCCESS,
    SEARCH_RESULT_FAILED,
    ROOM_BUILDER_MODE_EDIT,
    ROOM_BUILDER_MODE_CREATE,
} from 'models/tracking/constants'
import { getAddToCartUrl } from 'utils/buildUrls'
import { experimentsService } from 'services/experiments'
import { getProductTrackingInfo, GPUStatsTrackingInfo, ProductTrackingInfo } from 'models/tracking/utils'
import { getCurrentUser, getName, getUserId } from 'models/user/selectors'
import { removeNewUser } from 'services/user'
import { GeomViewer, LowPerformanceEventInfo } from 'Renderer/geomviewer'
import { getInitialLoading } from 'models/preview/selectors'
import { firstRenderItemScreenshotDone, scheduleDelayedScreenshot } from 'models/compositions/actions'
import uploadPreviewScreenshot from 'utils/uploadPreviewScreenshot'
import { NEW_COMPOSITION_ID } from 'models/compositions/constants'
import { getctxWasLost, getGPUStats, getTooManyContextLosses } from 'models/renderer/selectors'
import { getSharePanelOpen } from 'models/ui/selectors'
import { ThumbnailTelemetry } from 'Renderer/rendering/rendering_types'
import { updateErasedItemsCount } from 'models/preview/actions'
import {
    AddRoomToBagAction,
    AddToBagAction,
    DeleteCompositionRenderItemAction,
    FailedSaveCompositionAction,
    OpenCompositionAction,
    PlaceRenderAction,
    ReceiveFurnitureAction,
    RenderItemLoadedAction,
    RendererReadyAction,
    RequestSaveCompositionAction,
    SavedCompositionAction,
    SharePanelToggleAction,
    SwapRenderItemAction,
    UpdateCompositionRenderItemAction,
} from 'models/compositions/types'
import { getFurnitureItemOrientation } from 'Renderer/foundation/geom_viewer_model'
import { getNumFavorites } from 'models/favorites/selectors'
import { MAGIC_WINDOW_CLOSE } from 'models/iFrame/msgTypes'
import { getHref } from 'models/location/selectors'
import { receiveStatus, failedReceiveStatus } from 'models/support/slice'
import { Scene } from 'models/scenes'
import { isMultiviewScene } from 'models/scenes/utils'
import { SelectedRoomBuilderChoices } from 'models/planner'
import { getSelectedChoices } from 'models/planner/selectors'
import {
    publishIcoEvent,
    EVENT_PRODUCT_REMOVED,
    EVENT_PRODUCT_ADDED,
    EVENT_COMPOSITION_OPENED,
} from 'services/icoEvents'
import { isAxiosError } from 'utils/error'
import { localizedCurrency } from 'utils/convertCurrency'
import { SMARTA_STATUS_PENDING } from 'constants/stateTypes'
import { hasProp } from 'utils/object'

const getRoomSourceLabel = (roomInfo: SelectedCompositionTrackingRoomInfo) => {
    const roomSource = roomInfo && roomInfo.RoomSource
    return roomSource ? `|${roomSource}` : ''
}

export function* trackGoogleAnalyticsSagas(category: string, action: string, label: string) {
    yield call({
        context: null,
        fn: () => tracker.trackGoogleAnalytics(category, action, label),
    })
}

export function* trackSearchBrowseSaga(action: ReceiveFurnitureAction) {
    const { maxCount } = action
    const filterResult: FilterResult = yield select(getFilterResult)
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const roundTripSearchTime: number = yield select(getRoundTripTimeCatalogSearch)

    // Fire SearchResult tracking if there's active search context
    const searchContext: string | null = yield select(getCurrentSearchContext)
    const searchType: string | null = yield select(getSearchType)

    if (searchContext && searchType) {
        try {
            const searchResults: RenderItemComplete[] = yield select(getFurnitureByFilter)
            const filters: ProductFilters = yield select(furnitureSelectors.getFilter)
            const filterSelections: FilterSelections = yield select(furnitureSelectors.getSelectedFilterOptions)
            const rawFilters: { id: string; type: string }[] = yield select(furnitureSelectors.getRawFilters)
            const roomType: string = yield select(getSelectedSceneRoomType)

            const searchTermDetails = formatSearchTermDetails(filters, filterSelections, rawFilters)
            const searchQueryDetails = formatSearchQueryDetails(filters, filterSelections, rawFilters)

            yield call(tracker.track, ACTION_SEARCH_RESULT, {
                SearchType: searchType,
                SearchTerm: searchContext,
                SearchTermDetails: searchTermDetails,
                SearchQueryDetails: searchQueryDetails,
                ResultCount: maxCount || filterResult.count,
                Result: (maxCount || filterResult.count) > 0 ? SEARCH_RESULT_SUCCESS : SEARCH_RESULT_FAILED,
                APIResponseTime: roundTripSearchTime || 0,
                RoomType: roomType || 'Unknown',
                ProductIds: searchResults?.slice(0, 20).map((item: RenderItemComplete) => item.id.toString()) || [],
                ...roomInfo,
            })

            // Keep search context for correlating subsequent product additions
            // Context will be cleared when a new search is performed
        } catch (error) {
            // Silent fail - don't impact search UX
        }
    }
}

export function* trackTrackAddToBagSaga(action: AddToBagAction) {
    const { furnitureId, trackingInfo } = action.payload
    const byId: Record<string, ProductData> = yield select(getFurnitureById)
    const thisFurniture = byId[furnitureId]

    // This should not happen, early return just in case
    if (!thisFurniture) {
        return
    }

    const { region, localItemNumber } = thisFurniture
    const eventName = 'DecorateRoom.AddProductToBag'
    const cartUrl = getAddToCartUrl([localItemNumber], region)
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const roomSourceLabel = getRoomSourceLabel(roomInfo)

    yield call(tracker.click, eventName, {
        ...trackingInfo,
        CartUrl: cartUrl,
        ...roomInfo,
    })

    yield call(experimentsService.track, OPTIMIZELY_ADD_TO_CART_GEO)
    yield call(experimentsService.track, OPTIMIZELY_ADD_TO_CART)

    if (localItemNumber) {
        const gaEventLabel = `${localItemNumber}${roomSourceLabel}`
        yield call(trackGoogleAnalyticsSagas, GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_ADD_TO_BAG, gaEventLabel)
    }
}

export function* trackAddRoomToBagSaga(action: AddRoomToBagAction) {
    const eventName = 'DecorateRoom.AddRoomToBag'
    const { localItemNumbers, region, trackingInfo } = action.payload
    const cartUrl = getAddToCartUrl(localItemNumbers, region)
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const roomSourceLabel = getRoomSourceLabel(roomInfo)

    const products: ProductData[] = yield select(getProductsFromLocalItemNumbers, localItemNumbers)
    const updatedTrackingInfo = {
        ...trackingInfo,
        CartUrl: cartUrl,
        ProductItems: localItemNumbers.toString(),
        Value: products.reduce((acc, p) => acc + p.priceNumeral, 0),
        Currency: localizedCurrency(),
    }
    yield call(tracker.click, eventName, {
        ...updatedTrackingInfo,
        ...roomInfo,
    })

    // For each item added to cart, call optimizely add to cart event, global and from magic window
    if (localItemNumbers.length) {
        // cannot yield call in forEach | map due synchronous execution
        for (let l = 0; l < localItemNumbers.length; l += 1) {
            yield call(experimentsService.track, OPTIMIZELY_ADD_TO_CART_GEO)
            yield call(experimentsService.track, OPTIMIZELY_ADD_TO_CART)
        }
        const gaEventLabel = `${localItemNumbers.toString()}${roomSourceLabel}`
        yield call(trackGoogleAnalyticsSagas, GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_ADD_ROOM_TO_BAG, gaEventLabel)
    }
}

export function* trackReceiveUserSaga() {
    const name: string = yield select(getName)
    const { wid, metricsId, email, isNewUser, isLoggedIn, loginType, userType } = yield select(getCurrentUser)
    const trackingId = metricsId || wid

    if (isNewUser) {
        yield call(tracker.alias, trackingId)
        yield call(tracker.set, {
            UserId: wid,
            UserType: userType,
            UserEmail: email,
            LoginAuthenticationMode: loginType,
            Name: name,
            SignupDate: new Date(),
            LastLogin: new Date(),
        })
        yield call(removeNewUser)
    } else if (isLoggedIn) {
        yield call(tracker.set, {
            UserId: wid,
            UserType: userType,
            UserEmail: email,
            LoginAuthenticationMode: loginType,
            Name: name,
            LastLogin: new Date(),
        })
        yield call(tracker.identify, trackingId)
    }
}

export function* trackProductAdd(trackDataObj: tracker.TrackOptions, roomSourceLabel: string) {
    yield call(tracker.drop, ACTION_ADD_PRODUCT, trackDataObj)
    if (trackDataObj.LocalItemNumber) {
        const gaCustom = {
            RoomSourceDetail: (trackDataObj.RoomSourceDetail as string) || '',
            RoomViewType: (trackDataObj.RoomViewType as string) || '',
            PlacementType: (trackDataObj.PlacementType as string) || '',
        }
        const gaEventLabel = `${trackDataObj.LocalItemNumber}${roomSourceLabel}|${trackDataObj.PlacementAction || null}`

        yield call(tracker.trackGoogleAnalytics, {
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_ADD_PRODUCT,
            label: gaEventLabel,
            custom: gaCustom,
        })

        const { isLoggedIn } = yield select(getCurrentUser)
        if (trackDataObj.DesignId && isLoggedIn) {
            try {
                yield call(publishIcoEvent, {
                    interactionType: EVENT_PRODUCT_ADDED,
                    composition: String(trackDataObj.DesignId),
                    localItemNumbers: [String(trackDataObj.LocalItemNumber)],
                    scene: String(trackDataObj.RoomId),
                })
            } catch (error) {
                Sentry.captureException(error)
            }
        }
    }
    yield call(experimentsService.track, OPTIMIZELY_ADD_PRODUCT)
}

export function* trackPlaceRenderItemSaga(action: PlaceRenderAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const roomSourceLabel = getRoomSourceLabel(roomInfo)

    // Stackables tracking when viewer is on PlacementMode get's tracked through
    // user's input in a later event. Since this later user input event won't take
    // place with smarta, we do <trackProductAdd> here.

    const { trackingInfo, settings: { hidden = false } = {}, settings, searchContext } = action.payload

    const isStackableSmartaPlacement =
        trackingInfo?.CanStack &&
        trackingInfo?.PlacementType === 'Smarta' &&
        trackingInfo?.PlacementResult === 'Success'
    if (
        trackingInfo &&
        !hidden &&
        settings.smartaPlacementState !== SMARTA_STATUS_PENDING &&
        (!trackingInfo?.CanStack || isStackableSmartaPlacement)
    ) {
        const trackDataObj = {
            ...trackingInfo,
            ...roomInfo,
            // Add search context properties if present
            ...(searchContext && {
                SearchQueryDetails: searchContext.searchQueryDetails,
                SearchResultPosition: searchContext.searchResultPosition,
            }),
        }

        // Duplicate items that we don't want tracked twice in MixPanel
        const untrackedItems = [
            'accent_pillow_2',
            'duvet_set_pillow_1 ',
            'duvet_set_pillow_2',
            'white_pillow_1',
            'white_pillow_2',
        ]
        if (
            settings.combinablePlacement?.socketName !== undefined &&
            untrackedItems.includes(settings.combinablePlacement?.socketName)
        )
            return

        if (action.payload.trackingInfo.AddedFrom === 'SalesDressing') {
            return
        }

        yield* trackProductAdd(trackDataObj, roomSourceLabel)
    }
}

export function* trackDeleteCompositionRenderItem(action: DeleteCompositionRenderItemAction) {
    const { trackingInfo } = action.payload
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const roomSourceLabel = getRoomSourceLabel(roomInfo)

    if (trackingInfo && !trackingInfo.hidden && trackingInfo.RemovedFrom !== STACKABLE_DISCARDED) {
        yield call(tracker.click, 'DecorateRoom.RemoveProduct', {
            ...trackingInfo,
            ...roomInfo,
        })
        yield call(experimentsService.track, OPTIMIZELY_REMOVE_PRODUCT)
        if (trackingInfo.LocalItemNumber) {
            const gaEventLabel = `${trackingInfo.LocalItemNumber}${roomSourceLabel}`
            yield call(trackGoogleAnalyticsSagas, GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_REMOVE_PRODUCT, gaEventLabel)
            const { isLoggedIn } = yield select(getCurrentUser)
            if (roomInfo.DesignId && isLoggedIn) {
                try {
                    yield call(publishIcoEvent, {
                        interactionType: EVENT_PRODUCT_REMOVED,
                        composition: String(roomInfo.DesignId),
                        localItemNumbers: [String(trackingInfo.LocalItemNumber)],
                        scene: String(roomInfo.RoomId),
                    })
                } catch (error) {
                    Sentry.captureException(error)
                }
            }
        }
    }

    yield put(scheduleDelayedScreenshot())
}

export function* trackSwapRenderItem(action: SwapRenderItemAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const { productToSwapOut, productToSwapIn, trackingInfo } = action.payload

    const furnitureById: Record<number, ProductData | undefined> = yield select(getFurnitureById)
    const swappedInProductData = furnitureById[productToSwapIn]
    if (swappedInProductData != null) {
        const swappedInTrackingInfo = getProductTrackingInfo(swappedInProductData)
        yield call(tracker.track, ACTION_ADD_PRODUCT, {
            ...swappedInTrackingInfo,
            ...roomInfo,
            ActionType: trackingInfo.actionType,
            AddedFrom: trackingInfo.from,
        })
        yield call(experimentsService.track, OPTIMIZELY_ADD_PRODUCT)
    } else {
        Sentry.captureMessage(`missing product data for product with id "${productToSwapIn}"`)
    }
    const removedProductData = furnitureById[productToSwapOut || -1]
    if (removedProductData) {
        const removedTrackingInfo = getProductTrackingInfo(removedProductData)
        yield call(tracker.track, ACTION_REMOVE_PRODUCT, {
            ...removedTrackingInfo,
            ...roomInfo,
            ActionType: trackingInfo.actionType,
            RemovedFrom: trackingInfo.from,
        })
        yield call(experimentsService.track, OPTIMIZELY_REMOVE_PRODUCT)
    } else {
        Sentry.captureMessage(`missing product data for product with id "${productToSwapOut}"`)
    }
}

export function* trackRenderItemLoadedSaga(action: RenderItemLoadedAction) {
    const isInitialLoading: boolean = yield select(getInitialLoading)
    const selectedComposition: Composition = yield select(getSelectedComposition)
    const { item, id } = action.payload

    if (item.metrics && selectedComposition) {
        const renderItemComplete = selectedComposition.renderItems.find((ri) => ri.uniqueId === id)
        if (renderItemComplete) {
            const productTrackingInfo = getProductTrackingInfo(renderItemComplete)
            yield call(tracker.workflow, 'DecorateRoom.AddProductLoadTime', {
                ...item.metrics,
                ...productTrackingInfo,
                LoadTime: item.metrics.sTotalTime,
                CompositionLoading: isInitialLoading,
            })
        }
    }

    const userDidAddRenderItem: boolean = yield select(getUserDidAddRenderItem)
    const firstFurnitureScreenshotDone: boolean = yield select(getFirstFurnitureScreenshotDone)
    if (!isInitialLoading && userDidAddRenderItem && !firstFurnitureScreenshotDone) {
        yield put(firstRenderItemScreenshotDone())

        try {
            const uploadScreenshotResponse: { uuid: string; thumbTelemetry: ThumbnailTelemetry } = yield call(
                uploadPreviewScreenshot,
            )
            const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
            const userId: string = yield select(getUserId)
            const eventName = 'DecorateRoom.Screenshot'
            yield call(tracker.workflow, eventName, {
                userId,
                sessionId: window.globalRendererSessionId,
                uuid: uploadScreenshotResponse.uuid,
                screenshotType: 'FirstProductAdd',
                minuteIncrement: 0,
                issuer: 'RENDER_ITEM_LOADED middleware',
                ...uploadScreenshotResponse.thumbTelemetry,
                ...roomInfo,
            })
        } catch (error) {
            const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
            const userId: string = yield select(getUserId)
            const eventName = 'DecorateRoom.ScreenshotFailed'
            yield call(tracker.workflow, eventName, {
                userId,
                sessionId: window.globalRendererSessionId,
                ...roomInfo,
            })
        }
    }
    yield put(scheduleDelayedScreenshot())
}

export function* trackUpdateCompositionRenderItem(action: UpdateCompositionRenderItemAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const {
        item: { assemblyFlip, heading, isLoading, x, y },
        trackingInfo,
    } = action.payload

    if (trackingInfo && !trackingInfo.hidden && trackingInfo.ProductId && !isLoading) {
        if (!(x || y || heading)) {
            // Not a rotation
            if (assemblyFlip) {
                yield call(tracker.click, 'DecorateRoom.ChangeProduct', {
                    AssemblyFlip: assemblyFlip,
                    ...trackingInfo,
                    ...roomInfo,
                })
            } else {
                yield call(tracker.click, 'DecorateRoom.ChangeProperties', {
                    ...trackingInfo,
                    ...roomInfo,
                })
            }
        }
    }
    yield put(scheduleDelayedScreenshot())
}

export function* trackRequestSaveComposition(action: RequestSaveCompositionAction) {
    const roomInfo: Omit<SelectedCompositionTrackingRoomInfo, 'DesignId'> = yield select(
        getSelectedCompositionTrackingRoomInfo,
    )
    const {
        data: { compositionId, name },
        trackingInfo,
    } = action.payload

    yield call(tracker.click, 'DecorateRoom.SaveDesign', {
        DesignName: name,
        DesignId: compositionId,
        ...roomInfo,
        ...trackingInfo,
    })

    if (compositionId === NEW_COMPOSITION_ID) {
        yield call(tracker.increment, 'DesignsSaved')
    }
}

export function* trackFailedSaveComposition(action: FailedSaveCompositionAction) {
    const roomInfo: Omit<SelectedCompositionTrackingRoomInfo, 'DesignId'> = yield select(
        getSelectedCompositionTrackingRoomInfo,
    )
    const { data, trackingInfo, error } = action.payload
    if (error) {
        yield call(Sentry.captureException, error)
    } else {
        yield call(Sentry.captureMessage, 'failed to save composition', 'error')
    }

    let message: string
    let detail: unknown
    if (isAxiosError(error)) {
        message = error.message || 'Axios error occurred'
        detail = error.response?.data
    } else if (error instanceof Error) {
        message = error.message || 'An error occurred'
        detail = error.stack
    } else {
        message = 'Unknown error type'
        detail = error
    }

    yield call(tracker.error, 'DecorateRoom.SaveDesignFailure', {
        DesignName: data.name,
        DesignId: data.id,
        ...roomInfo,
        ...trackingInfo, // contains SaveFrom field
        Error: message,
        ErrorDetail: detail,
    })
}

export function* trackOpenComposition(action: OpenCompositionAction) {
    if (action.payload.trackingInfo) {
        yield call(tracker.click, 'DecorateRoom.OpenDesign', {
            ...action.payload.trackingInfo,
        })
    }
    yield call(experimentsService.track, OPTIMIZELY_OPEN_ROOM)
}

export function* trackNewRendererError() {
    const randNums = new Uint32Array(1)
    window.crypto.getRandomValues(randNums)
    window.globalRendererSessionId = `${Date.now()}-${randNums[0]}`
    const status = GeomViewer.bindings?.getViewerStatus()
    if (status === 'not-started' || status === 'init-failed') {
        yield call(tracker.error, 'NullWebGLContextInfo')
    }
}

export function* trackRendererReady(action: RendererReadyAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)

    // If available, attach GPUStats to the event.
    const gpuStats: GPUStatsTrackingInfo | null = yield select(getGPUStats)
    const contextInfo = {
        ...action.contextInfo,
        ...(gpuStats || {}),
    }

    yield call(tracker.track, 'WebGLContextInfo', contextInfo)

    if (gpuStats) {
        // If available, register GPU tier & gpu name super property.
        yield call(tracker.register, {
            gpuStatsTier: gpuStats.gpuStatsTier,
            gpuStatsGPU: gpuStats.gpuStatsGPU,
        })
    }

    const ctxWasLost: boolean = yield select(getctxWasLost)
    if (ctxWasLost) {
        yield call(tracker.workflow, 'DecorateRoom.WebGlContextReloaded', {
            ...roomInfo,
        })
    }
    // Fire ICO event on opening any composition or scene
    const { isLoggedIn } = yield select(getCurrentUser)
    const shouldFireICOEvent = (roomInfo?.DesignId || roomInfo?.RoomId) && isLoggedIn
    if (shouldFireICOEvent) {
        try {
            const selectedComposition: Composition = yield select(getSelectedComposition)
            if (selectedComposition) {
                const localItemNumbers: string[] =
                    Object.values(selectedComposition.renderItems)
                        ?.map((renderItem) => renderItem?.localItemNumber)
                        .filter((localItemNumber) => !!localItemNumber) || []
                yield call(publishIcoEvent, {
                    interactionType: EVENT_COMPOSITION_OPENED,
                    composition: String(roomInfo?.DesignId || NEW_COMPOSITION_ID),
                    localItemNumbers,
                    scene: String(roomInfo.RoomId),
                })
            }
        } catch (error) {
            Sentry.captureException(error)
        }
    }
}

export function* trackSavedComposition(action: SavedCompositionAction) {
    const roomInfo: Omit<SelectedCompositionTrackingRoomInfo, 'DesignId'> = yield select(
        getSelectedCompositionTrackingRoomInfo,
    )
    const roomSourceLabel = getRoomSourceLabel(roomInfo)

    const { trackingInfo, compositionId, composition, originId } = action.payload

    yield call(tracker.click, 'DecorateRoom.SaveDesignSuccess', {
        DesignName: composition.name,
        DesignId: compositionId,
        ...roomInfo,
        ...trackingInfo, // contains SaveFrom field
    })

    const gaEventLabel = `${originId}|${compositionId}${roomSourceLabel}`
    yield call(trackGoogleAnalyticsSagas, GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_SAVE, gaEventLabel)
}

export function* trackDestroyRenderer() {
    window.globalRendererSessionId = null
    const currentTimeoutId: NodeJS.Timeout = yield select(getScheduledScreenshotTimeout)
    if (currentTimeoutId) {
        window.clearTimeout(currentTimeoutId)
    }
}

export function* trackOpenBag() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.click, 'DecorateRoom.OpenBag', {
        ...roomInfo,
    })
}

export function* trackSharePanelOpenToggle(action: SharePanelToggleAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const isSharePanelOpen: boolean = yield select(getSharePanelOpen)
    if (isSharePanelOpen) {
        yield call(tracker.click, 'DecorateRoom.ShareDesignCTA', {
            ...action.trackingInfo,
            ...roomInfo,
        })
    }
}

type ToggleFavoriteAction = {
    type: typeof TOGGLE_FAVORITE
    payload: {
        localItemNumber: string
        isFavorite: boolean
        trackingInfo: {
            AddedFrom?: string
            RemovedFrom?: string
        }
    }
}

export function* trackToggleFavoriteSaga(action: ToggleFavoriteAction) {
    const { isFavorite, localItemNumber, trackingInfo } = action.payload
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const roomSourceLabel = getRoomSourceLabel(roomInfo)
    const favorites: number = yield select(getNumFavorites)

    yield call(tracker.click, isFavorite ? 'DecorateRoom.AddFavorites' : 'DecorateRoom.RemoveFavorites', {
        ...roomInfo,
        ProductLocalId: localItemNumber,
        Favorites: favorites,
        ...trackingInfo,
    })

    if (localItemNumber) {
        yield call(tracker.trackGoogleAnalytics, {
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: isFavorite ? GA_ACTION_ADD_FAVORITE : GA_ACTION_REMOVE_FAVORITE,
            label: `${localItemNumber}${roomSourceLabel}`,
        })
    }
}

type ToggleFavoritesAction = {
    type: typeof TOGGLE_FAVORITES
    payload: {
        itemsToFavorite: string[]
        isFavorite: boolean
        trackingInfo: {
            AddedFrom?: string
            RemovedFrom?: string
        }
    }
}
export function* trackToggleFavoritesSaga(action: ToggleFavoritesAction) {
    const { isFavorite, itemsToFavorite, trackingInfo } = action.payload
    const itemList = itemsToFavorite.join()
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const roomSourceLabel = getRoomSourceLabel(roomInfo)
    const favorites: number = yield select(getNumFavorites)
    yield call(tracker.click, isFavorite ? 'DecorateRoom.AddFavorites' : 'DecorateRoom.RemoveFavorites', {
        ...roomInfo,
        ProductLocalIds: itemList,
        Favorites: favorites,
        ...trackingInfo,
    })
    yield call(tracker.trackGoogleAnalytics, {
        category: GA_CATEGORY_DYH_SUGARCUBE,
        action: isFavorite ? GA_ACTION_ADD_FAVORITE : GA_ACTION_REMOVE_FAVORITE,
        label: `${itemList}${roomSourceLabel}`,
    })
}

export function* trackRemoveRenderItemsSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.click, 'DecorateRoom.ClearAllFurniture', { ...roomInfo })
}

type UpdatePreviewSettingsAction = {
    type: typeof UPDATE_PREVIEW_SETTINGS
    settings: {
        magicEraserMode: boolean
    }
}
export function* trackUpdatePreviewSettingsSaga(action: UpdatePreviewSettingsAction) {
    const { settings } = action
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    if (settings && hasProp(settings, 'magicEraserMode')) {
        yield call(
            tracker.workflow,
            settings.magicEraserMode ? 'DecorateRoom.EraseMode' : 'DecorateRoom.EraseMode.Exit',
            {
                ...roomInfo,
            },
        )
    }
}

type UpdateCompositionSaveDataAction = {
    type: typeof UPDATE_COMPOSITION_SAVE_DATA
    payload: {
        saveData: {
            erasedSegments: string[]
        }
        trackingInfo: {
            prevErasedSegments: string[]
            EraseableItems: number
        }
    }
}

export function* trackUpdateCompositionSaveDataSaga(action: UpdateCompositionSaveDataAction) {
    const { saveData, trackingInfo } = action.payload
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    if (saveData.erasedSegments && trackingInfo?.prevErasedSegments) {
        const nextSegments = saveData.erasedSegments
        const prevSegments = trackingInfo.prevErasedSegments
        // If the number of erased items has changed
        if (nextSegments.length !== prevSegments.length) {
            let eventName
            let eraseItemId
            const diff = (ar1: string[], ar2: string[]) => {
                const remaining = ar1.filter((i) => !ar2.includes(i))
                // We only get one item at a time in this action
                return remaining[0]
            }
            if (nextSegments.length > prevSegments.length) {
                eventName = 'DecorateRoom.EraseItemHidden'
                eraseItemId = diff(nextSegments, prevSegments)
            } else {
                eventName = 'DecorateRoom.EraseItemShown'
                eraseItemId = diff(prevSegments, nextSegments)
            }
            yield call(tracker.workflow, eventName, {
                ...roomInfo,
                EraseItemId: eraseItemId,
                ErasedItems: nextSegments.length,
                EraseableItems: trackingInfo?.EraseableItems,
            })
        }
        yield put(updateErasedItemsCount(nextSegments.length))
    } else if (saveData.erasedSegments) {
        yield put(updateErasedItemsCount(saveData.erasedSegments.length))
    }
}

type NewIframeMessageAction = {
    type: typeof NEW_IFRAME_MESSAGE
    message: {
        type: string
    }
}
export function* trackNewIframeMessageSaga(action: NewIframeMessageAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    if (action.message?.type === MAGIC_WINDOW_CLOSE) {
        yield call(tracker.workflow, 'DecorateRoom.MagicWindowExit', { ...roomInfo })
    }
}

export function* trackWebglContextLostSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const haveTooManyContextLosses: boolean = yield select(getTooManyContextLosses)
    if (!haveTooManyContextLosses) {
        yield call(tracker.workflow, 'DecorateRoom.WebGlContextLost', {
            ...roomInfo,
            tabVisibility: document.visibilityState,
        })
    }
}
export function* trackWebglContextTooManyLossesSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.workflow, 'DecorateRoom.tooManyWebGlContextLosses', {
        ...roomInfo,
        tabVisibility: document.visibilityState,
    })
}

export function* trackWebglContextNotCreatedSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.workflow, 'DecorateRoom.WebGlContextNotCreated', {
        ...roomInfo,
    })
}

export function* trackWebglContextRestoredSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.workflow, 'DecorateRoom.WebGlContextRestored', {
        ...roomInfo,
    })
}

type SetWallColorAction = {
    type: typeof SET_WALL_COLOR
    payload: {
        colorString: string
        planeIndex: number
        trackingInfo: {
            timestamp: number
        }
    }
}
export function* trackSetWallColorSaga(action: SetWallColorAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.click, 'DecorateRoom.WallColor.Select', {
        WallColorChoice: action.payload.colorString,
        WallColorPlaneIndex: action.payload.planeIndex,
        WallColorChangeId: action.payload.trackingInfo.timestamp,
        ...roomInfo,
    })
}

type ShowLoginOverlayAction = {
    type: typeof LOGIN_NEEDED | typeof SHOW_LOGIN_PROMPT_MODAL
    showLoginPromptModal?: boolean
}
export function* trackShowLoginOverlaySaga(action: ShowLoginOverlayAction) {
    if (action.type === LOGIN_NEEDED || action.showLoginPromptModal) {
        yield call(tracker.click, 'DecorateRoom.SignupLogin.Overlay')
    }
}

type InitializationFailureAction = {
    type: typeof INITIALIZATION_FAILURE
    info: {
        taafailure?: boolean
    }
}
export function* trackInitializationFailureSaga(action: InitializationFailureAction) {
    // TODO: We have disabled the TAA failure tracking for now since Threejs version r138
    // the TAA is malfunctioning. We will re-enable this feature once we hit r154 - Moiz
    if (action.info.taafailure) {
        // tracker.error('DecorateRoom.TAAinitializationFailure', {
        //     ...action.info,
        // })
        return
    }
    yield call(tracker.error, 'DecorateRoom.InitializationFailure', {
        ...action.info,
    })
}

type LowPerformanceDetectedAction = {
    type: typeof INITIALIZATION_FAILURE
    info: LowPerformanceEventInfo
}
export function* trackLowPerformanceDetectedSaga(action: LowPerformanceDetectedAction) {
    yield call(tracker.debug, 'DecorateRoom.LowPerformance', {
        ...action.info,
    })
}

type ShowDesignSummaryAction = {
    type: typeof SHOW_DESIGN_SUMMARY
    showDesignSummary: boolean
}
export function* trackShowDesignSummarySaga(action: ShowDesignSummaryAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)

    if (action.showDesignSummary) {
        yield call(tracker.click, 'DecorateRoom.Summary', {
            ...roomInfo,
        })
    }
}

export function* trackUpdateLocationSaga() {
    const location: { zipcode: string; storeId: string } = yield select(getLocation)
    yield call(tracker.updateLocation, location)
}

export function* trackHelpCenterClicksSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.click, 'DecorateRoom.HelpCenter', {
        ...roomInfo,
    })
}

export function* trackSkipMagicEraserOnboardingSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.workflow, 'DecorateRoom.SkipMagicEraserOnboarding', {
        ...roomInfo,
    })
}

export function* trackCompleteMagicEraserOnboardingSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.workflow, 'DecorateRoom.CompleteMagicEraserOnboarding', {
        ...roomInfo,
    })
}

export function* trackSkipOnboardingSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.workflow, 'DecorateRoom.SkipOnboarding', {
        ...roomInfo,
    })
}

export function* trackCompleteOnboardingSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.workflow, 'DecorateRoom.CompleteOnboarding', {
        ...roomInfo,
    })
}

type TrackGaEventAction = {
    type: typeof TRACK_GA_EVENT
    trackingInfo: {
        category: string
        action: string
        label: string
        custom: Record<string, string>
    }
}

export function* trackGaEventSaga(action: TrackGaEventAction) {
    const { trackingInfo } = action
    const { category = GA_CATEGORY_DYH_SUGARCUBE, action: gaAction, label, custom } = trackingInfo
    if (gaAction) {
        yield call(tracker.trackGoogleAnalytics, {
            category,
            action: gaAction,
            label,
            custom,
        })
    }
}

type SnapRotateClickAction = {
    type: typeof TRACK_SNAP_ROTATE_CLICK
    trackingInfo: ProductTrackingInfo & {
        AddedFrom: string
    }
}
export function* trackSnapRotateClickSaga(action: SnapRotateClickAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const { trackingInfo } = action
    const renderItem: RenderItemComplete = yield select(getSelectedRenderItem)
    const orientation: 'vertical' | 'horizontal' | 'default' = yield call(
        getFurnitureItemOrientation,
        renderItem.anchorCombinationIndex as number,
        // FIXME: There might be a bug in this tracking as renderItem doesn't have the required properties of FurnitureItemParameters, causing it to always be 'default'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        renderItem as any,
    )
    yield call(tracker.click, 'DecorateRoom.ChangeProduct', {
        SnapRotateFlip: orientation,
        ...trackingInfo,
        ...roomInfo,
    })
}

type SwapOrGoesWithButtonClickAction = {
    type: typeof SHOW_GOES_WITH_TAB | typeof SCROLL_SWAP_MENU
    trackingInfo: {
        eventName?: string
        AccessFrom?: string
    }
}
export function* trackSwapOrGoesWithButtonClickSaga(action: SwapOrGoesWithButtonClickAction) {
    const { trackingInfo } = action
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const selectedRenderItem: RenderItemComplete = yield select(getSelectedRenderItem)
    const productTrackingInfo: ProductTrackingInfo = yield call(getProductTrackingInfo, selectedRenderItem)

    if (trackingInfo?.eventName) {
        yield call(tracker.click, trackingInfo.eventName, {
            ...productTrackingInfo,
            ...roomInfo,
            AccessFrom: trackingInfo?.AccessFrom,
        })
    }
}

type ShowChangeViewAction = {
    type: typeof SHOW_CHANGE_VIEW
    show: boolean
}

export function* trackShowChangeViewSaga(action: ShowChangeViewAction) {
    const scene: Scene = yield select(getSelectedScene)
    if (!isMultiviewScene(scene)) {
        return
    }

    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const { show } = action

    yield call(tracker.click, show ? 'DecorateRoom.ChangeView.Expand' : 'DecorateRoom.ChangeView.Collapse', {
        ...roomInfo,
    })
}

type ShowDollhouseViewsAction = {
    type: typeof SHOW_DOLLHOUSE_VIEWS
    show: boolean
}

export function* trackShowDollhouseViewsSaga(action: ShowDollhouseViewsAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const { show } = action

    yield call(tracker.click, show ? 'DecorateRoom.DollhouseViews.Expand' : 'DecorateRoom.DollhouseViews.Collapse', {
        ...roomInfo,
    })
}

type ViewSelectedAction = {
    type: typeof VIEW_SELECTED
    viewName: string
}
export function* trackViewSelectedSaga(action: ViewSelectedAction) {
    const scene: Scene = yield select(getSelectedScene)
    if (!isMultiviewScene(scene)) {
        return
    }

    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const { viewName } = action
    yield call(tracker.click, 'DecorateRoom.ChangeView.Open', {
        View: viewName,
        ...roomInfo,
    })
}

type ViewLoadedAction = {
    type: typeof VIEW_LOADED
    payload: {
        viewName: string
    }
}

export function* trackViewLoadedSaga(action: ViewLoadedAction) {
    const { viewName } = action.payload
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const scene: Scene = yield select(getSelectedScene)
    const loadCompleteTime: number = yield call(tracker.getTimeSinceLoadingStart)
    if (scene.viewports.length) {
        yield call(tracker.click, 'DecorateRoom.ChangeView.ViewLoadComplete', {
            View: viewName,
            loadCompleteTime,
            ...roomInfo,
        })
    }
}

type ReceiveStatusAction = {
    type: typeof receiveStatus.type
    payload: {
        outage: boolean
    }
}

export function* trackReceiveStatusSaga(action: ReceiveStatusAction) {
    const { outage } = action.payload
    const currentUrl: string = yield select(getHref)
    if (outage) {
        yield call(tracker.trackGoogleAnalytics, {
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_ERROR_PAGE_VISIT,
            label: currentUrl,
        })
        yield call(tracker.visit, 'ErrorPage', {
            Href: currentUrl,
            Action: receiveStatus.type,
            ErrorMessage: 'outage',
        })
    }
}

export function* trackFailedReceiveStatusSaga() {
    const currentUrl: string = yield select(getHref)
    yield call(tracker.trackGoogleAnalytics, {
        category: GA_CATEGORY_DYH_SUGARCUBE,
        action: GA_ACTION_ERROR_PAGE_VISIT,
        label: 'outage',
    })
    yield call(tracker.visit, 'ErrorPage', {
        Action: failedReceiveStatus.type,
        ErrorMessage: 'outage',
        Href: currentUrl,
    })
}

type DecorateRoomRotateProductAction = {
    type: typeof TRACK_DECORATE_ROOM_ROTATE_PRODUCT
    trackingInfo: ProductTrackingInfo
}

export function* trackDecorateRoomRotateProductSaga(action: DecorateRoomRotateProductAction) {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    const { trackingInfo } = action
    yield call(tracker.click, 'DecorateRoom.RotateProduct', {
        ...trackingInfo,
        ...roomInfo,
    })
}

export function* trackRequestSaveSceneSaga() {
    const trackingInfo: SelectedRoomBuilderChoices = yield select(getSelectedChoices)
    yield call(tracker.click, 'RoomBuilder.SaveSceneAttempt', {
        ...trackingInfo,
        RoomBuilderMode: ROOM_BUILDER_MODE_CREATE,
    })
}

export function* trackSavedSceneSaga() {
    const trackingInfo: SelectedRoomBuilderChoices = yield select(getSelectedChoices)
    yield call(tracker.click, 'RoomBuilder.SaveSceneSuccess', {
        ...trackingInfo,
        RoomBuilderMode: ROOM_BUILDER_MODE_CREATE,
    })
}

export function* trackFailedSaveSceneSaga() {
    const trackingInfo: SelectedRoomBuilderChoices = yield select(getSelectedChoices)
    yield call(tracker.click, 'RoomBuilder.SaveSceneFailure', {
        ...trackingInfo,
        RoomBuilderMode: ROOM_BUILDER_MODE_CREATE,
    })
}

export function* trackGoToRoomEditor() {
    yield call(tracker.click, 'RoomBuilder.OpenModal', {
        RoomBuilderMode: ROOM_BUILDER_MODE_EDIT,
    })
}

export function trackRoomPlannerStarting() {
    const randNums = new Uint32Array(1)
    window.crypto.getRandomValues(randNums)
    const now = Date.now()
    window.globalPlannerSessionId = `${now}-${randNums[0]}`
    window.globalPlannerSessionStart = now
}

export function trackRoomPlannerFinishing() {
    window.globalPlannerSessionId = null
    window.globalPlannerSessionStart = null
}

export function* trackOrbitModeMoveStartSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)
    yield call(tracker.click, 'DecorateRoom.OrbitModeMoveStart', {
        ...roomInfo,
    })
}

export function* trackOrbitModeMoveStopSaga() {
    const roomInfo: SelectedCompositionTrackingRoomInfo = yield select(getSelectedCompositionTrackingRoomInfo)

    yield call(tracker.click, 'DecorateRoom.CameraMotion', {
        ...roomInfo,
    })
}

function* watchTrackSearchBrowseSaga() {
    yield takeEvery(RECEIVE_FURNITURE, trackSearchBrowseSaga)
}

function* watchTrackAddToBagSaga() {
    yield takeEvery(addToShoppingBagActionTypes.ADD_TO_BAG, trackTrackAddToBagSaga)
}

function* watchTrackAddRoomToBagSaga() {
    yield takeEvery(addToShoppingBagActionTypes.ADD_ROOM_TO_BAG, trackAddRoomToBagSaga)
}

function* watchTrackReceiveUserSaga() {
    yield takeEvery(RECEIVE_USER, trackReceiveUserSaga)
}

function* watchTrackPlaceRenderItem() {
    yield takeEvery(PLACE_RENDER_ITEM, trackPlaceRenderItemSaga)
}

function* watchTrackDeleteCompositionRenderItem() {
    yield takeEvery(DELETE_COMPOSITION_RENDER_ITEM, trackDeleteCompositionRenderItem)
}

function* watchTrackSwapRenderItem() {
    yield takeEvery(SWAP_RENDER_ITEM, trackSwapRenderItem)
}

function* watchTrackRenderItemLoadedSaga() {
    yield takeEvery(RENDER_ITEM_LOADED, trackRenderItemLoadedSaga)
}

function* watchtrackUpdateCompositionRenderItem() {
    yield takeEvery(UPDATE_COMPOSITION_RENDER_ITEM, trackUpdateCompositionRenderItem)
}

function* watchTrackRequestSaveComposition() {
    yield takeEvery(REQUEST_SAVE_COMPOSITION, trackRequestSaveComposition)
}

function* watchTrackFailedSaveComposition() {
    yield takeEvery(FAILED_SAVE_COMPOSITION, trackFailedSaveComposition)
}

function* watchTrackOpenComposition() {
    yield takeEvery(OPEN_COMPOSITION, trackOpenComposition)
}

function* watchTrackNewRendererError() {
    yield takeEvery(NEW_RENDERER, trackNewRendererError)
}

function* watchTrackRendererReady() {
    yield takeEvery(RENDERER_READY, trackRendererReady)
}

function* watchTrackSavedComposition() {
    yield takeEvery(
        [RECEIVE_COPY_COMPOSITION, RECEIVE_SAVE_COMPOSITION, RECEIVE_RENAME_COMPOSITION],
        trackSavedComposition,
    )
}

function* watchTrackDestroyRenderer() {
    yield takeEvery(DESTROY_RENDERER, trackDestroyRenderer)
}

function* watchSharePanelToggle() {
    yield takeEvery(SHARE_PANEL_OPEN_TOGGLE, trackSharePanelOpenToggle)
}

function* watchTrackOpenBag() {
    yield takeEvery(addToShoppingBagActionTypes.OPEN_BAG, trackOpenBag)
}

function* watchTrackToggleFavoriteSaga() {
    yield takeEvery(TOGGLE_FAVORITE, trackToggleFavoriteSaga)
}

function* watchTrackToggleFavoritesSaga() {
    yield takeEvery(TOGGLE_FAVORITES, trackToggleFavoritesSaga)
}

function* watchTrackRemoveRenderItemsSaga() {
    yield takeEvery(REMOVE_RENDER_ITEMS, trackRemoveRenderItemsSaga)
}

function* watchTrackUpdatePreviewSettingsSaga() {
    yield takeEvery(UPDATE_PREVIEW_SETTINGS, trackUpdatePreviewSettingsSaga)
}

function* watchTrackUpdateCompositionSaveDataSaga() {
    yield takeEvery(UPDATE_COMPOSITION_SAVE_DATA, trackUpdateCompositionSaveDataSaga)
}

function* watchTrackNewIframeMessageSaga() {
    yield takeEvery(NEW_IFRAME_MESSAGE, trackNewIframeMessageSaga)
}

function* watchTrackWebglContextLostSaga() {
    yield takeEvery(WEBGL_CONTEXT_LOST, trackWebglContextLostSaga)
}

function* watchTrackWebglContextTooManyLossesSaga() {
    yield takeEvery(WEBGL_CONTEXT_TOO_MANY_LOSSES, trackWebglContextTooManyLossesSaga)
}

function* watchTrackWebglContextNotCreatedSaga() {
    yield takeEvery(WEBGL_CONTEXT_NOT_CREATED, trackWebglContextNotCreatedSaga)
}

function* watchTrackWebglContextRestoredSaga() {
    yield takeEvery(WEBGL_CONTEXT_RESTORED, trackWebglContextRestoredSaga)
}

function* watchTrackSetWallColorSaga() {
    yield takeEvery(SET_WALL_COLOR, trackSetWallColorSaga)
}

function* watchTrackShowLoginOverlaySaga() {
    yield takeEvery([LOGIN_NEEDED, SHOW_LOGIN_PROMPT_MODAL], trackShowLoginOverlaySaga)
}

function* watchTrackInitializationFailureSaga() {
    yield takeEvery(INITIALIZATION_FAILURE, trackInitializationFailureSaga)
}

function* watchTrackLowPerformanceDetectedSaga() {
    yield takeEvery(LOW_PERFORMANCE_DETECTED, trackLowPerformanceDetectedSaga)
}

function* watchTrackShowDesignSummarySaga() {
    yield takeEvery(SHOW_DESIGN_SUMMARY, trackShowDesignSummarySaga)
}

function* watchTrackUpdateLocationSaga() {
    yield takeEvery(UPDATE_LOCATION, trackUpdateLocationSaga)
}

function* watchTrackHelpCenterClicksSaga() {
    yield takeEvery(TRACK_HELP_CENTER_CLICKS, trackHelpCenterClicksSaga)
}

function* watchTrackSkipMagicEraserOnboardingSaga() {
    yield takeEvery(SKIP_MAGIC_ERASER_ONBOARDING, trackSkipMagicEraserOnboardingSaga)
}

function* watchTrackCompleteMagicEraserOnboardingSaga() {
    yield takeEvery(COMPLETE_MAGIC_ERASER_ONBOARDING, trackCompleteMagicEraserOnboardingSaga)
}

function* watchTrackSkipOnboardingSaga() {
    yield takeEvery(SKIP_ONBOARDING, trackSkipOnboardingSaga)
}

function* watchTrackCompleteOnboardingSaga() {
    yield takeEvery(COMPLETE_ONBOARDING, trackCompleteOnboardingSaga)
}

function* watchTrackGaEventSaga() {
    yield takeEvery(TRACK_GA_EVENT, trackGaEventSaga)
}

function* watchTrackSnapRotateClickSaga() {
    yield takeEvery(TRACK_SNAP_ROTATE_CLICK, trackSnapRotateClickSaga)
}

function* watchTrackSwapOrGoesWithButtonClickSaga() {
    yield takeEvery([SHOW_GOES_WITH_TAB, SCROLL_SWAP_MENU], trackSwapOrGoesWithButtonClickSaga)
}

function* watchTrackShowChangeViewSaga() {
    yield takeEvery(SHOW_CHANGE_VIEW, trackShowChangeViewSaga)
}

function* watchTrackShowDollhouseViewsSaga() {
    yield takeEvery(SHOW_DOLLHOUSE_VIEWS, trackShowDollhouseViewsSaga)
}

function* watchTrackViewSelectedSaga() {
    yield takeEvery(VIEW_SELECTED, trackViewSelectedSaga)
}

function* watchTrackViewLoadedSaga() {
    yield takeEvery(VIEW_LOADED, trackViewLoadedSaga)
}

function* watchTrackReceiveStatusSaga() {
    yield takeEvery(receiveStatus.type, trackReceiveStatusSaga)
}

function* watchTrackFailedReceiveStatusSaga() {
    yield takeEvery(failedReceiveStatus.type, trackFailedReceiveStatusSaga)
}

function* watchTrackDecorateRoomRotateProductSaga() {
    yield takeEvery(TRACK_DECORATE_ROOM_ROTATE_PRODUCT, trackDecorateRoomRotateProductSaga)
}

function* watchTrackRequestSaveSceneSaga() {
    yield takeEvery(REQUEST_SAVE_SCENE, trackRequestSaveSceneSaga)
}

function* watchTrackSavedSceneSaga() {
    yield takeEvery(RECEIVE_SAVE_SCENE, trackSavedSceneSaga)
}

function* watchTrackFailedSaveSceneSaga() {
    yield takeEvery(FAILED_SAVE_SCENE, trackFailedSaveSceneSaga)
}

function* watchTrackGoToRoomEditor() {
    yield takeEvery(GO_TO_ROOM_EDITOR, trackGoToRoomEditor)
}

function* watchTrackRoomPlannerStarting() {
    yield takeEvery(ROOM_PLANNER_STARTING, trackRoomPlannerStarting)
}

function* watchTrackRoomPlannerFinishing() {
    yield takeEvery(ROOM_PLANNER_FINISHING, trackRoomPlannerFinishing)
}

function* watchTrackOrbitModeMoveStartSaga() {
    yield takeEvery(TRACK_ORBIT_MODE_MOVE_START, trackOrbitModeMoveStartSaga)
}

function* watchTrackOrbitModeMoveStopSaga() {
    yield takeEvery(TRACK_ORBIT_MODE_MOVE_STOP, trackOrbitModeMoveStopSaga)
}

export const trackingSagas = [
    watchTrackSearchBrowseSaga(),
    watchTrackAddToBagSaga(),
    watchTrackAddRoomToBagSaga(),
    watchTrackReceiveUserSaga(),
    watchTrackPlaceRenderItem(),
    watchTrackDeleteCompositionRenderItem(),
    watchTrackSwapRenderItem(),
    watchTrackRenderItemLoadedSaga(),
    watchtrackUpdateCompositionRenderItem(),
    watchTrackRequestSaveComposition(),
    watchTrackFailedSaveComposition(),
    watchTrackOpenComposition(),
    watchTrackNewRendererError(),
    watchTrackRendererReady(),
    watchTrackSavedComposition(),
    watchTrackDestroyRenderer(),
    watchTrackOpenBag(),
    watchSharePanelToggle(),
    watchTrackToggleFavoriteSaga(),
    watchTrackToggleFavoritesSaga(),
    watchTrackRemoveRenderItemsSaga(),
    watchTrackUpdatePreviewSettingsSaga(),
    watchTrackUpdateCompositionSaveDataSaga(),
    watchTrackNewIframeMessageSaga(),
    watchTrackWebglContextLostSaga(),
    watchTrackWebglContextTooManyLossesSaga(),
    watchTrackWebglContextNotCreatedSaga(),
    watchTrackWebglContextRestoredSaga(),
    watchTrackSetWallColorSaga(),
    watchTrackShowLoginOverlaySaga(),
    watchTrackInitializationFailureSaga(),
    watchTrackLowPerformanceDetectedSaga(),
    watchTrackShowDesignSummarySaga(),
    watchTrackUpdateLocationSaga(),
    watchTrackHelpCenterClicksSaga(),
    watchTrackSkipMagicEraserOnboardingSaga(),
    watchTrackCompleteMagicEraserOnboardingSaga(),
    watchTrackSkipOnboardingSaga(),
    watchTrackCompleteOnboardingSaga(),
    watchTrackGaEventSaga(),
    watchTrackSnapRotateClickSaga(),
    watchTrackSwapOrGoesWithButtonClickSaga(),
    watchTrackShowChangeViewSaga(),
    watchTrackShowDollhouseViewsSaga(),
    watchTrackViewSelectedSaga(),
    watchTrackViewLoadedSaga(),
    watchTrackReceiveStatusSaga(),
    watchTrackFailedReceiveStatusSaga(),
    watchTrackDecorateRoomRotateProductSaga(),
    watchTrackRequestSaveSceneSaga(),
    watchTrackSavedSceneSaga(),
    watchTrackFailedSaveSceneSaga(),
    watchTrackGoToRoomEditor(),
    watchTrackRoomPlannerStarting(),
    watchTrackRoomPlannerFinishing(),
    watchTrackOrbitModeMoveStartSaga(),
    watchTrackOrbitModeMoveStopSaga(),
]
