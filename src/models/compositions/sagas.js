import * as Sentry from '@sentry/react'
import { takeEvery, takeLatest, call, put, select, take, delay, all, race, fork, join } from 'redux-saga/effects'
import {
    getCompositions,
    getCompiledComposition,
    saveCompositionExpertCheckConsent,
    saveCompositionSharing,
    getSmartaRecommendedPlacement,
    renameComposition,
    copyComposition,
} from 'services/compositions'
import { clearPartnerTrackingData } from 'services/partnerTracking'
import { createHomeProjectActivity } from 'services/homeProjects'

import { getSceneDependentInitialDebugSettings } from 'utils/geomviewer_utils'
import { panelBridge } from 'utils/panelBridge'
import {
    receiveCompositions,
    receiveCompiledComposition,
    failedReceiveCompositions,
    failedReceiveCompiledComposition,
    swapRenderItem,
    softSwapRenderItem,
    placeRenderItem,
    removeRenderItems,
    saveSelectedComposition,
    requestSaveCompositionSharing,
    clickPlaceRenderItem,
    receiveSaveExpertCheckConsent,
    receiveSaveCompositionSharing,
    failedSaveExpertCheckConsent,
    failedSaveCompositionSharing,
    selectCompositionRenderItem,
    receiveRenameComposition,
    requestCompiledComposition,
    openComposition,
    receiveCopyComposition,
    failedSaveComposition,
    requestSaveComposition,
    deleteCompositionRenderItem,
    resetPlaceProduct,
    clickPlaceMultipleRenderItems,
    clickPlaceSetRenderItems,
} from 'models/compositions/actions'
import { getPreviewSettings } from 'models/preview/selectors'
import { requestScene } from 'models/scenes/actions'
import { requestUser } from 'models/user/actions'
import { compositionLoaded, sceneLoaded } from 'models/preview/actions'
import {
    getSelectedCompositionId,
    getSelectedComposition,
    getIsModified,
    getSelectedRenderItem,
    getPlaceProductId,
    getPlacedProductData,
    getSmartaRecommendedPlacementData,
    getSelectedSceneHasGLTFManifest,
    getSmartaTimeout,
    getSmartaURL,
    getSmartaRuleset,
    getCompositionsById,
    getSelectedCompositionMissingFurnitureIds,
    getNextRenderItemId,
    getForceSmartaOff,
    getSelectedCompositionProductData,
    getSelectedSceneIsUnsaved,
    getSelectedCompositionFirstRenderItem,
} from 'models/compositions/selectors'
import {
    getForceLegacyManifest,
    getUrlContext,
    getIsLivingRoomContext,
    getMultiPlaceIds,
    getSetID,
} from 'models/location/selectors'
import { getHomeProjectId } from 'models/homeProjects/selectors'
import { getIsFetching as getScenesIsFetching, getById as getScenesById } from 'models/scenes/selectors'
import {
    REQUEST_COMPOSITIONS_SAGA,
    REQUEST_COMPILED_COMPOSITION_SAGA,
    RENDER_ITEM_LOADED,
    START_TEST_SWAP_SAGA,
    RECEIVE_FURNITURE_SWAPPABLES,
    START_TEST_LOAD_SAGA,
    RECEIVE_FURNITURE,
    SWAP_RENDER_ITEM,
    REQUEST_SAVE_COMPOSITION_BEFORE_SHARING,
    RECEIVE_SAVE_COMPOSITION,
    SELECT_COMPOSITION_RENDER_ITEM,
    RECEIVE_DELETE_COMPOSITION,
    RENDERER_READY,
    RENAME_COMPOSITION,
    REQUEST_SAVE_COMPOSITION_SHARING,
    CLICK_PLACE_RENDER_ITEM,
    FAILED_SAVE_COMPOSITION,
    SELECT_COMPOSITION,
    RECEIVE_USER,
    FAILED_RECEIVE_USER,
    RECEIVE_COMPILED_COMPOSITION,
    FAILED_RECEIVE_COMPILED_COMPOSITION,
    COPY_COMPOSITION,
    ADD_PRODUCT_TO_COMPOSITION,
    REMOVE_FURNITURE_FROM_COMPOSITION,
    REQUEST_SAVE_EXPERT_CHECK_CONSENT,
    SET_WALL_COLOR,
    DELETE_COMPOSITION_RENDER_ITEM,
    SWAPPABLE_ITEMS_READY,
    UNDO_SWAP,
    UPDATE_COMPOSITION_LOADED,
    SET_INITIAL_LOADING,
    TRACK_DECORATE_ROOM_MOVE_PRODUCT,
    TRACK_DECORATE_ROOM_ROTATE_PRODUCT,
    SKIP_FEEDBACK_FORM_FIRST_TIME,
    RECEIVE_IKEA_TOKENS,
    SKIP_FETCH_USER,
} from 'models/actionTypes'
import { getIsUserDataLoaded, getHasValidAuthToken, getUserId } from 'models/user/selectors'
import { swapTestSagaFinished, loadTestSagaFinished, debugConsoleLog, updateDebugSettings } from 'models/admin/actions'
import {
    requestFurniture,
    requestFurnitureCombinables,
    requestFurnitureSwappables,
    selectFurniture,
    receiveCombinablesWithMetadata,
    requestFurnitureByComposition,
    requestFurnitureByLocalItemNos,
} from 'models/furniture/actions'

import { FURNITURE_ITEM } from 'constants/renderItemTypes'
import { SUB_CATEGORIES_IDS_MAP } from 'constants/categories'
import { PRODUCT_SWAP } from 'models/tracking/constants'
import { getProductTrackingInfo } from 'models/tracking/utils'
import { GeomViewer } from 'Renderer/geomviewer'
import { getIsNewComposition } from 'models/compositions/helpers'
import { getDesignSidepanelMode, getDesignSidepanelOpen, getHasSeenFeedbackFormOnce } from 'models/ui/selectors'
import * as modes from 'models/ui/constants'
import { isMobileCheck as isMobile } from 'utils/isMobile'
import {
    setDesignSidepanelMode,
    showSwapMenuForId,
    openDesignSidepanel,
    closeDesignSidepanel,
    scrollSwapMenu,
    setPromptVisibility,
} from 'models/ui/actions'
import toastsService, { ToastType } from 'services/toasts'

import * as tracker from 'utils/tracker'
import { isProd } from 'utils/environment'

import {
    getFurnitureById,
    getFurnitureIsLoadingByIds,
    getSwapAnchorId,
    getSelectedFurnitureBeforeSwap,
} from 'models/furniture/selectors'
import { getDebugSettings } from 'models/admin/selectors'
import { getIsProductContext } from 'models/referrer/selector'
import {
    NEW_COMPOSITION_ID,
    PLACED_PRODUCT_INVALID_ID,
    TRACK_COPY_COMPOSITION,
    TRACK_RENAME_COMPOSITION,
    MAX_COMPOSITION_NAME_LENGTH,
} from 'models/compositions/constants'
import { PreviewError } from 'models/preview/constants'
import { incrementFurnitureAddCount, addStoragedSubcategoryId } from 'models/sessionStorage/actions'
import { getSessionAddedSubCategories } from 'models/sessionStorage/selectors'
import { getDecidedFlags } from 'models/experiments/selectors'
import { SMARTA_STATUS_FAILED, SMARTA_STATUS_PENDING, SMARTA_STATUS_SUCCESS } from 'constants/stateTypes'
import { splitByCommonDelimiters } from 'utils/string'
import { browserSupportsPreload, preloadAsset } from './utils'

// eslint-disable-next-line no-promise-executor-return
export const waitPromise = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function* requestCompositionsSaga() {
    try {
        const { data: compositions } = yield call(getCompositions, false /* not legacy manifest */)
        yield put(receiveCompositions(compositions))
    } catch (error) {
        yield put(failedReceiveCompositions())
    }
}

export function* requestCompiledCompositionSaga({ payload: { id, forceLegacyManifest } }) {
    try {
        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2
        const {
            data: { composition, scene, furnitures: furniture },
        } = yield call(getCompiledComposition, id, forceLegacyManifest, isDuvetV2Enabled)
        yield put(receiveCompiledComposition(composition, scene, furniture))
    } catch (e) {
        const responseStatus = e?.response?.status
        const errorType =
            responseStatus >= 400 && responseStatus < 500 ? PreviewError.USER_NOT_ALLOWED : PreviewError.SERVER_ERROR
        yield put(failedReceiveCompiledComposition(errorType, responseStatus))
    }
}

export function* testSwapsSaga({ targetRenderItemId, selectedProduct, swapItemsData }) {
    let furnitures = swapItemsData
    if (!furnitures || furnitures.length === 0) {
        try {
            yield put(requestFurnitureSwappables(selectedProduct.id))
            const action = yield take(RECEIVE_FURNITURE_SWAPPABLES)
            furnitures = action.furniture
            if (!furnitures || furnitures.length === 0) {
                return
            }
        } catch (error) {
            return
        }
    }
    let heapSizeLimit = 0
    let totalHeapSize = 0
    let usedHeapSize = 0
    if (performance.memory) {
        const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = performance.memory

        heapSizeLimit = jsHeapSizeLimit
        totalHeapSize = totalJSHeapSize
        usedHeapSize = usedJSHeapSize
    }
    let textureMemory = 0
    let bufferMemory = 0
    let memoryUsage = GeomViewer.bindings?.queryGpuMemoryUsage()
    if (memoryUsage) {
        textureMemory = memoryUsage.currentTextureMemory
        bufferMemory = memoryUsage.currentBufferMemory
    }
    const count = 50
    let id = targetRenderItemId
    let targetProduct = selectedProduct
    for (let i = 0; i < count; i += 1) {
        const swapItemData = furnitures[i % furnitures.length]

        const swappedInProductTrackingInfo = getProductTrackingInfo(swapItemData)
        const swappedInTrackingInfo = {
            ...swappedInProductTrackingInfo,
            AddedFrom: PRODUCT_SWAP,
        }

        const removedProductTrackingInfo = getProductTrackingInfo(targetProduct)
        const removedTrackingInfo = {
            ...removedProductTrackingInfo,
            RemovedFrom: PRODUCT_SWAP,
        }

        const trackingInfo = {
            swappedInTrackingInfo,
            removedTrackingInfo,
        }

        yield put(swapRenderItem(id, targetProduct.id, trackingInfo))

        const swapAction = yield take(SWAP_RENDER_ITEM)
        const newItemId = swapAction.payload.furnitureToSwapIn

        const itemLoadedAction = yield take((act) => act.type === RENDER_ITEM_LOADED && act.payload.id === newItemId)

        // `yield take` will be called here synchronously from Renderer's render() function, causing
        // nested calls which will interfere with renderer's oneTimeRenderCallbacks, clearing them too early
        // yield here to allow rendering to finish properly.
        yield delay(100)

        id = itemLoadedAction.payload.id
        targetProduct = swapItemData
    }

    const results = {}
    if (performance.memory) {
        const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = performance.memory
        results.jsHeapSizeLimitDelta = jsHeapSizeLimit - heapSizeLimit
        results.totalJSHeapSizeDelta = totalJSHeapSize - totalHeapSize
        results.usedJSHeapSizeDelta = usedJSHeapSize - usedHeapSize
    }
    memoryUsage = GeomViewer.bindings?.queryGpuMemoryUsage()
    if (memoryUsage) {
        results.textureMemoryDelta = memoryUsage.currentTextureMemory - textureMemory
        results.bufferMemoryDelta = memoryUsage.currentBufferMemory - bufferMemory
    }
    yield put(swapTestSagaFinished(results))
}

export function* testLoadsSaga() {
    // Clear composition
    const compositionId = yield select(getSelectedCompositionId)
    yield put(removeRenderItems(compositionId))

    // Get a list of all available furniture data currently in the store
    const getById = (state) => state.furniture.byId
    const furnitureById = yield select(getById)

    // Get the current preview dimensions
    const getDimensions = (state) => state.preview.wallDataDimensions
    const dimensions = yield select(getDimensions)
    const x = dimensions.width * 0.5
    const y = dimensions.height * 0.85

    // Load furniture data into the store
    try {
        let count = Object.keys(furnitureById).length
        while (count < 400) {
            yield put(requestFurniture())
            const action = yield take(RECEIVE_FURNITURE)
            if (!action || !action.furniture || !Object.keys(action.furniture).length) {
                return
            }
            count += action.furniture.length
        }
    } catch (error) {
        return
    }

    let heapSizeLimit = 0
    let totalHeapSize = 0
    let usedHeapSize = 0
    if (performance.memory) {
        const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = performance.memory

        heapSizeLimit = jsHeapSizeLimit
        totalHeapSize = totalJSHeapSize
        usedHeapSize = usedJSHeapSize
    }
    let textureMemory = 0
    let bufferMemory = 0
    let memoryUsage = GeomViewer.bindings?.queryGpuMemoryUsage()
    if (memoryUsage) {
        textureMemory = memoryUsage.currentTextureMemory
        bufferMemory = memoryUsage.currentBufferMemory
    }

    let count = 50
    const furnitureIDs = Object.keys(furnitureById)
    const placedIDs = []
    while (count > 0) {
        const index = Math.floor(Math.random() * (furnitureIDs.length - 1))
        const furnitureItem = furnitureById[furnitureIDs[index]]
        const { id, stacks, renderType } = furnitureItem
        if (!stacks && renderType === FURNITURE_ITEM) {
            const settings = { id, heading: 0, renderType, stacks }
            const trackingInfo = getProductTrackingInfo(furnitureItem)

            yield put(placeRenderItem(compositionId, id, x, y, settings, trackingInfo))
            yield take(RENDER_ITEM_LOADED)
            placedIDs.push(id)
            count -= 1
        }
    }

    // Remove all render items
    // TODO: investigate: deleting items directly after last item is placed without this delay causes
    // a race condition that consumes the renderIsDirty causing the update to not propagate into rendered scene
    yield new Promise((resolve) => {
        setTimeout(resolve, 200)
    })
    yield put(removeRenderItems(compositionId))

    const results = {}
    if (performance.memory) {
        const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = performance.memory
        results.jsHeapSizeLimitDelta = jsHeapSizeLimit - heapSizeLimit
        results.totalJSHeapSizeDelta = totalJSHeapSize - totalHeapSize
        results.usedJSHeapSizeDelta = usedJSHeapSize - usedHeapSize
    }
    memoryUsage = GeomViewer.bindings?.queryGpuMemoryUsage()
    if (memoryUsage) {
        results.textureMemoryDelta = memoryUsage.currentTextureMemory - textureMemory
        results.bufferMemoryDelta = memoryUsage.currentBufferMemory - bufferMemory
    }

    yield put(loadTestSagaFinished(results))
}

export function* saveSharePermissions({ payload: { data: compositionShareData } }) {
    try {
        const { data } = yield call(
            saveCompositionSharing,
            compositionShareData.compositionId,
            compositionShareData,
            false,
        )
        yield put(receiveSaveCompositionSharing(data))
    } catch {
        yield put(failedSaveCompositionSharing())
    }
}

export function* saveExpertCheckConsent({ payload: { data: compositionShareData } }) {
    try {
        const { data } = yield call(
            saveCompositionExpertCheckConsent,
            compositionShareData.compositionId,
            compositionShareData,
            false,
        )
        yield put(receiveSaveExpertCheckConsent(data))
    } catch {
        yield put(failedSaveExpertCheckConsent())
    }
}

export function* requestCompositionSharingSave({ payload: { trackingInfo } }) {
    try {
        const composition = yield select(getSelectedComposition)
        const isModified = yield select(getIsModified)
        const userId = yield select(getUserId)

        const prevIsShared = composition.isShared

        const isNew = getIsNewComposition(composition.compositionId, composition.wid, userId)
        const shouldSave = isNew || isModified

        let savedCompositionAction
        // Save the composition if it's new or modified
        if (shouldSave) {
            yield put(saveSelectedComposition(trackingInfo))
            // Important: wait for the commposition to save. We need this new uuid to
            // update the isShared status.
            savedCompositionAction = yield take(RECEIVE_SAVE_COMPOSITION)
        }

        // The isShared field is false for new compositions and for existing compositions
        // that have never been shared. Here we update the isShared and enableRemix fields.
        if (!prevIsShared) {
            const savedComposition = yield select(getSelectedComposition)
            const sharingData = {
                isShared: true,
                enableRemix: true,
                sendNotifications: false,
                compositionId: shouldSave ? savedCompositionAction.payload.composition.uuid : savedComposition.uuid,
            }
            yield put(requestSaveCompositionSharing(sharingData, trackingInfo))
        }
    } catch (error) {
        // silent catch just in case
        // the errors for requestSaveCompositionSharing and saveSelectedComposition have their own catch.
    }
}

export function* compositionRenderItemSelectSaga({ payload: { renderItemId } }) {
    const mode = yield select(getDesignSidepanelMode)
    const isShowingProductBrowseDetails = mode === modes.DESIGN_SIDEPANEL_MODE_PRODUCT_DETAILS
    const isShowingDetails =
        mode === modes.DESIGN_SIDEPANEL_MODE_MYITEMS_DETAILS || mode === modes.DESIGN_SIDEPANEL_MODE_FAVORITES_DETAILS
    const isShowingSwap =
        mode === modes.DESIGN_SIDEPANEL_MODE_SWAP_BROWSE || mode === modes.DESIGN_SIDEPANEL_MODE_SWAP_DETAILS
    const isOnMobileDevice = isMobile()
    const debugSettings = yield select(getDebugSettings)
    const inspectorModeActive = !!debugSettings.enableObjectInspector

    const renderItem = yield select(getSelectedRenderItem)
    const composition = yield select(getSelectedComposition)
    const parentItem = composition?.renderItems.find((item) => item.uniqueId === renderItem?.parentId) || null
    const renderItemMetadataFromParent =
        parentItem?.combinablesSocketSet?.sockets?.find((socket) => socket.defaultProductId === renderItem.id) || null

    const renderItemWithMetadata = {
        ...renderItem,
        isCartIgnored: renderItemMetadataFromParent?.isCartIgnored || false,
        isNullable: renderItemMetadataFromParent?.isNullable,
        linkGroupName: renderItemMetadataFromParent?.linkGroupName,
    }

    if (renderItemMetadataFromParent) {
        yield put(receiveCombinablesWithMetadata(renderItemWithMetadata))
    } else {
        yield put(receiveCombinablesWithMetadata(null))
    }
    if (renderItemId === -1) {
        GeomViewer.bindings?.doAction('deselect-all')

        if (!isOnMobileDevice) {
            // Redirect to product browse from my items / favorites / swap when a selected rendered item is cleared
            // The only exception is: when a users is viewing product details from the catalog,
            // do not go back to product browse when the user deselects a product
            if (isShowingDetails || isShowingSwap) {
                yield put(setDesignSidepanelMode(modes.DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE))
            }
        } else {
            const isDesignSidepanelOpen = yield select(getDesignSidepanelOpen)
            // On mobile web/ swap only experience, we do not want the sidepanel open
            // and displaying the product browse view. So for mobile web,
            // close the side panel when an item is deselected if the side panel was open.
            if (isDesignSidepanelOpen) {
                yield put(closeDesignSidepanel())
            }
            if (mode === modes.DESIGN_SIDEPANEL_MODE_SWAP_DETAILS) {
                yield put(setDesignSidepanelMode(modes.DESIGN_SIDEPANEL_MODE_SWAP_BROWSE))
            }
        }
        // Unselect the selected furniture and reset the swap anchor furniture id to -1,
        // when the user is not viewing the product browse details
        if (!isShowingProductBrowseDetails) {
            yield put(showSwapMenuForId(false))
            yield put(selectFurniture(null))
        }
    } else if (!inspectorModeActive) {
        const selectedRenderItem = yield select(getSelectedRenderItem)
        if (selectedRenderItem) {
            const { id } = selectedRenderItem
            yield put(showSwapMenuForId(true, id))
            yield put(setDesignSidepanelMode(modes.DESIGN_SIDEPANEL_MODE_SWAP_BROWSE))
            if (isOnMobileDevice) {
                yield put(openDesignSidepanel())
            }
        }
    }
}

export function* renameCompositionSaga({ payload: { id, name, trackingInfo, fullSave = false } }) {
    try {
        if (!fullSave) {
            const { data } = yield call(renameComposition, id, name.slice(0, MAX_COMPOSITION_NAME_LENGTH))
            if (data.name) {
                yield call(toastsService.showToast, { toastType: ToastType.RENAME_COMPOSITION })
                yield put(receiveRenameComposition(data, data.id, trackingInfo))
            } else {
                yield call(toastsService.showToast, { toastType: ToastType.RENAME_COMPOSITION_FAILED })
            }
        } else {
            yield put(saveSelectedComposition(trackingInfo, name, TRACK_RENAME_COMPOSITION))
        }
    } catch (error) {
        yield call(Sentry.captureException, error)
        yield call(tracker.error, 'RenameCompositionFailure', { CompositionId: id })
        yield call(toastsService.showToast, { toastType: ToastType.RENAME_COMPOSITION_FAILED })
    }
}

export function* copyCompositionSaga({ payload: { compositionId, newName, trackingInfo, compositionData } }) {
    try {
        yield put(requestSaveComposition(compositionData, trackingInfo))
        const { data } = yield call(copyComposition, compositionId, newName)
        if (data) {
            yield put(receiveCopyComposition(data, compositionId, trackingInfo))
            yield call(toastsService.showToast, {
                toastType: ToastType.SAVE_COMPOSITION_RESULT,
                isCopy: true,
            })
        }
    } catch (error) {
        yield call(Sentry.captureException, error)
        yield put(failedSaveComposition(error, { ...compositionData, id: compositionId, name: newName }, trackingInfo))
        yield call(toastsService.showToast, { toastType: ToastType.SAVE_COMPOSITION_RESULT, failed: !!error })
    }
}

export function* deletedCompositionSaga() {
    const deleteType = yield select((state) => state.ui.deleteType)
    const sceneTypeLabel = yield select((state) => state.ui.sceneTypeLabel)

    yield call(toastsService.showToast, {
        toastType: ToastType.COMPOSITIONS_DELETED,
        deletedType: deleteType,
        sceneTypeLabel,
    })
}

export function* saveCompositionResultSaga({ payload }) {
    const failed = !!payload?.error
    const homeProjectId = failed ? null : yield select(getHomeProjectId)

    // Only pass homeProjectId -> "Go to project" after the DESIGN activity is recorded
    let homeProjectIdForSaveToast

    if (!failed) {
        yield call(clearPartnerTrackingData)
        if (homeProjectId && payload?.composition?.uuid) {
            try {
                yield call(createHomeProjectActivity, homeProjectId, payload.composition.uuid)
                homeProjectIdForSaveToast = homeProjectId
            } catch (error) {
                yield call(Sentry.captureException, error)
                yield call(toastsService.showToast, { toastType: ToastType.HOME_PROJECT_LINK_FAILED })
            }
        } else if (homeProjectId) {
            homeProjectIdForSaveToast = homeProjectId
        }
    }

    yield call(toastsService.showToast, {
        toastType:
            payload.trackingInfo.SaveType === TRACK_RENAME_COMPOSITION && !payload.isNew
                ? ToastType.RENAME_COMPOSITION
                : ToastType.SAVE_COMPOSITION_RESULT,
        isCopy: payload.trackingInfo.SaveType === TRACK_COPY_COMPOSITION,
        failed,
        homeProjectId: homeProjectIdForSaveToast,
    })
}

export function* rendererReady() {
    const placeProductId = yield select(getPlaceProductId)
    const compositionId = yield select(getSelectedCompositionId)
    const isLivingRoomIntegration = yield select(getIsLivingRoomContext)
    const isProductContext = yield select(getIsProductContext)
    const setId = yield select(getSetID)
    const multiPlaceLocalItemNos = yield select(getMultiPlaceIds)

    // Handle set-based placement (takes precedence over multiPlaceIds)
    if (setId) {
        yield put(
            clickPlaceSetRenderItems({
                compositionId,
                setId,
                ignoreCamera: false,
                trackingInfo: {},
            }),
        )
    } else if (multiPlaceLocalItemNos) {
        const localItemNumbers = splitByCommonDelimiters(multiPlaceLocalItemNos)
        yield put(requestFurnitureByLocalItemNos(localItemNumbers))

        yield put(
            clickPlaceMultipleRenderItems({
                compositionId,
                localItemNumbers,
                ignoreCamera: false,
                trackingInfo: {},
            }),
        )
    }

    if (placeProductId && placeProductId !== PLACED_PRODUCT_INVALID_ID) {
        const placedProductData = yield select(getPlacedProductData)
        yield put(
            clickPlaceRenderItem(
                compositionId,
                placeProductId,
                {
                    id: placeProductId,
                    heading: 0,
                    renderType: FURNITURE_ITEM,
                },
                {
                    AddedFrom: 'RoomOpen',
                    LocalItemNumber: placedProductData?.localItemNumber,
                    PlacementAction: 'Auto',
                },
            ),
        )
        if (isLivingRoomIntegration || isProductContext) {
            // In this integration, we auto place a product and select it so that its swappables are viewable
            // in the side panel.
            // Wait for the item to load before selecting it
            yield take(RENDER_ITEM_LOADED)
            const placedProductRenderItem = yield select(getSelectedCompositionFirstRenderItem)
            if (placedProductRenderItem) {
                const { uniqueId } = placedProductRenderItem
                GeomViewer.bindings?.selectSceneItem(String(uniqueId))
                yield put(selectCompositionRenderItem(uniqueId))

                if (isLivingRoomIntegration) {
                    yield take(SWAPPABLE_ITEMS_READY)
                    yield put(scrollSwapMenu({ eventName: 'DecorateRoom.AccessSwapPane', AccessFrom: 'Auto' }))
                }
            }
        }
    } else if (placeProductId === PLACED_PRODUCT_INVALID_ID) {
        yield call(tracker.error, 'ProductNotFound', { DesignId: compositionId })
        // Display toast: we could not find product, try searching for other products
        yield call(toastsService.showToast, { toastType: ToastType.PRODUCT_NOT_FOUND })
    }
}

// Extracted smarta api call generator for testing compatibility &
// forking.
function* smartaApiCallSaga(smartaApiCall) {
    try {
        return yield smartaApiCall
    } catch (error) {
        yield call(Sentry.captureException, error)
        yield call(tracker.error, 'SmartaApiCallFailure', { error })
        return yield
    }
}

export function* clickPlaceRenderItemSaga({ payload: { compositionId, id, settings, trackingInfo, uniqueId } }) {
    const furnitureList = yield select(getFurnitureById)
    const urlContext = yield select(getUrlContext)
    const { isUpptacka } = urlContext

    const productData = furnitureList[id]

    if (!productData) {
        /*
         * Usually we will have the product data since the user will have clicked it in the sidepanel,
         * but it's not required. A product can be (non-smarta) placed with minimal information and
         * it will get rendered when the product data arrives.
         */
        yield put(debugConsoleLog('smarta', 'early return: no product data loaded for this product id'))
        yield put(
            placeRenderItem(compositionId, id, null, null, settings, {
                PlacementType: 'Default',
                PlacementResult: 'Success',
                PlacementFailureReason: 'early return: no product data loaded for this product id',
                ...trackingInfo,
            }),
        )
        return
    }

    const { isSupportedAutodecorate, modelUrl, entities, subCategoryIds, localItemNumber, renderType } = productData

    /** @type {import('services/experiments').ExperimentVariations} */
    const flags = yield select(getDecidedFlags)
    const isMorpheusEnabled = flags.Morpheus
    if (isMorpheusEnabled && subCategoryIds) {
        const hasAddedBed = yield call(getSessionAddedSubCategories, SUB_CATEGORIES_IDS_MAP.Beds)
        if (
            subCategoryIds?.length === 1 &&
            subCategoryIds?.includes(SUB_CATEGORIES_IDS_MAP.Beds) &&
            !hasAddedBed &&
            !isUpptacka
        ) {
            yield call(toastsService.showToast, {
                toastType: ToastType.SUGGESTION_TOAST,
                /**
                 * Use panelBridge to open the Edit/List panel when user clicks the toast button.
                 * This replaces the old Redux action setDesignSidepanelMode since the panel
                 * system has been refactored to use React Context instead of Redux.
                 *
                 * The panelBridge provides imperative access to React components from
                 * outside the component lifecycle (like this saga callback).
                 */
                onAction: () => panelBridge.openEditPanel(),
            })
        }

        yield put(addStoragedSubcategoryId(subCategoryIds))
    }

    let updatedTrackingInfo = trackingInfo
    let additionalSmartaTracking = {
        Entity: entities,
        PlacementType: 'Default',
    }

    if (settings.stacks && !settings.onFloor && !settings.isAddedFromDuplicate) {
        yield put(selectCompositionRenderItem(-1))
        GeomViewer?.bindings?.doAction('deselect-all')
    }

    /** @type {import('services/experiments').FlagDecisions} */
    // If scene is unsaved or there is no gltf manifest for the underlying scene, we cannot smarta place the product
    const isGLTF = yield select(getSelectedSceneHasGLTFManifest)
    const isSceneUnsaved = yield select(getSelectedSceneIsUnsaved) // Unsaved room builder scene
    if (!isGLTF || isSceneUnsaved) {
        additionalSmartaTracking = {
            Entity: entities,
            PlacementType: 'Default',
            PlacementResult: 'Success',
            PlacementFailureReason: 'early return: no FF or not gltf or scene unsaved',
        }
        updatedTrackingInfo = { ...trackingInfo, ...additionalSmartaTracking }
        yield put(debugConsoleLog('smarta', 'early return: no FF or not gltf or scene unsaved'))
        yield put(placeRenderItem(compositionId, id, null, null, settings, updatedTrackingInfo))
        return
    }

    // get url (admin only)
    const smartaURL = yield select(getSmartaURL)
    const smartaRuleset = yield select(getSmartaRuleset)

    // get smarta data with 3D info
    const smartaData = yield select(getSmartaRecommendedPlacementData)

    // get timeout for smarta call
    const smartaTimeout = yield select(getSmartaTimeout)

    const formattedSmartaData = {
        ...smartaData,
        localProductIdToPlace: id,
        localItemNumberToPlace: localItemNumber,
        smartaURL,
        ruleset: smartaRuleset,
    }

    // Begin downloading the product model at the same time as the API call to save time.
    // This lets us wait longer for the API if needed and makes the model load faster.
    // Using the browser's preload hint means browsers might resume downloads or use the cache.
    // If 'preload' is not supported we fetch the model instead.
    const modelLoad = browserSupportsPreload()
        ? preloadAsset(modelUrl)
        : fetch(modelUrl).then((response) => response.blob())

    const sharedUniqueId = uniqueId || (yield select(getNextRenderItemId))
    const placeholderBufferTimeout = 200

    let data
    let placementTimeout
    const beforeSmartaApiTimestamp = performance.now()

    // If the product is not supported for smarta placement, then we place it the default way.
    if (!isSupportedAutodecorate && smartaURL === null) {
        additionalSmartaTracking = {
            Entity: entities,
            PlacementType: 'Default',
            PlacementResult: 'Success',
            PlacementFailureReason: 'early return: autodecorate not supported for item',
        }
        updatedTrackingInfo = { ...trackingInfo, ...additionalSmartaTracking }
        yield put(debugConsoleLog('smarta', 'early return: autodecorate not supported for item'))
        yield put(placeRenderItem(compositionId, id, null, null, settings, updatedTrackingInfo))
        return
    }

    // Admin users only: smarta can be toggled off through the debug panel.
    // If smarta is turned off in the debug panel, place the product the default way.
    const forceSmartaOff = yield select(getForceSmartaOff)
    if (forceSmartaOff) {
        additionalSmartaTracking = {
            Entity: entities,
            PlacementType: 'Default',
            PlacementResult: 'Success',
            PlacementFailureReason: 'early return: smarta off in debug panel',
        }
        updatedTrackingInfo = { ...trackingInfo, ...additionalSmartaTracking }
        yield put(debugConsoleLog('smarta', 'early return: smarta off in debug panel'))
        yield put(placeRenderItem(compositionId, id, null, null, settings, updatedTrackingInfo))
        return
    }

    try {
        const smartaApiCall = call(getSmartaRecommendedPlacement, formattedSmartaData)

        // Start the API call once and keep a reference to the task
        // Use the extracted generator function
        const apiCallTask = yield fork(smartaApiCallSaga, smartaApiCall)

        // First, we'll wait for either 200ms or the Smarta API call to complete
        const { delayed, item } = yield race({
            delayed: delay(placeholderBufferTimeout),
            item: join(apiCallTask),
        })

        // We waited placeholderBufferTimeout time and Smarta api did not return with item data
        if (delayed && !item) {
            // Add placeholder, except for art items.
            if (renderType !== 'ART_ITEM') {
                // This will not be tracked because smarta status will be pending
                additionalSmartaTracking = {
                    Entity: entities,
                    PlacementType: 'Smarta',
                    PlacementResult: 'Failed',
                    PlacementFailureReason: 'timeout',
                }
                updatedTrackingInfo = { ...trackingInfo, ...additionalSmartaTracking }
                yield put(
                    placeRenderItem(
                        compositionId,
                        id,
                        null,
                        null,
                        {
                            ...settings,
                            uniqueId: sharedUniqueId,
                            smartaPlacementState: SMARTA_STATUS_PENDING,
                        },
                        updatedTrackingInfo,
                    ),
                )
            }

            // Stackables fallback is to trigger stackables placement mode. Needs shorter wait time.
            const STACKABLE_SMART_PLACEMENT_MAX_WAIT_TIME = 350
            const smartaCallMaxWaitTime = settings.stacks
                ? STACKABLE_SMART_PLACEMENT_MAX_WAIT_TIME
                : smartaTimeout - placeholderBufferTimeout

            // Now we need to wait for the API call or timeout
            const { item: delayedItem, timeout } = yield race({
                item: join(apiCallTask), // Reuse the same API call
                timeout: all([delay(smartaCallMaxWaitTime), call(() => modelLoad)]),
            })

            data = delayedItem?.data
            placementTimeout = timeout
        } else {
            // If the API call completed within the placeholderBufferTimeout, we're done
            data = item?.data
        }
    } catch (error) {
        additionalSmartaTracking = {
            Entity: entities,
            PlacementType: 'Smarta',
            PlacementResult: 'Failed',
            PlacementFailureReason: data?.errorCode ? `Placement Error: ${data.errorCode}` : `Error: ${error.message}`,
        }
        updatedTrackingInfo = { ...trackingInfo, ...additionalSmartaTracking }

        yield put(debugConsoleLog('smarta', `Error ${data?.errorCode || `unknown`}`))
        yield put(debugConsoleLog('smarta', `early return: error ${error.message}`))

        yield put(
            placeRenderItem(
                compositionId,
                id,
                null,
                null,
                {
                    ...settings,
                    uniqueId: sharedUniqueId,
                    smartaPlacementState: SMARTA_STATUS_FAILED,
                },
                updatedTrackingInfo,
            ),
        )
        return
    }

    const afterSmartaApiTimestamp = performance.now()
    const timeDiff = afterSmartaApiTimestamp - beforeSmartaApiTimestamp

    tracker.track('SmartaApi', {
        RoundTripTime: timeDiff,
        FurnitureId: id,
        SceneId: smartaData.sceneId,
        Error: data?.error,
        PlacementErrorCode: data?.errorCode,
        ProductCount: smartaData?.placedFurniture?.length || 0,
    })

    if (data?.errorCode || !data?.placedFurniture || placementTimeout) {
        yield put(
            debugConsoleLog(
                'smarta',
                JSON.stringify(
                    {
                        success: false,
                        entity: entities,
                        productId: id,
                        perf: timeDiff,
                        error: data?.error,
                        errorMessage: data?.debug?.message,
                        errorCode: data?.errorCode,
                        timeout: !!placementTimeout,
                        placedFurniture: !!data?.placedFurniture,
                    },
                    null,
                    2,
                ),
            ),
        )
        additionalSmartaTracking = {
            Entity: entities,
            PlacementType: 'Smarta',
            PlacementResult: 'Failed',
            PlacementFailureReason: placementTimeout
                ? 'timeout'
                : data?.errorCode
                ? `Placement Error: ${data.errorCode}`
                : 'No placed furniture',
            PlacementLatencyMS: timeDiff,
        }
        updatedTrackingInfo = { ...trackingInfo, ...additionalSmartaTracking }
        yield put(
            placeRenderItem(
                compositionId,
                id,
                null,
                null,
                {
                    ...settings,
                    uniqueId: sharedUniqueId,
                    smartaPlacementState: SMARTA_STATUS_FAILED,
                },
                updatedTrackingInfo,
            ),
        )
        return
    }

    const { x, y, z, heading, headingI, headingJ, headingK, parentAttachment, parentId } = data.placedFurniture
    const smartaPlacement = {
        kind: `location3Legacy`,
        location3: {
            bindTo: parentAttachment,
            localPos: { x, y, z },
        },
        rotation: [headingI, headingJ, headingK, heading],
        parentId,
    }

    // If not using preload, we need to always wait for full model load,
    // before adding the item to the scene.
    if (!browserSupportsPreload()) {
        yield call(() => modelLoad)
    }

    if (!isProd) {
        /* eslint-disable no-console */
        console.group(`Smarta Debug`)
        console.log('Entity Id:      ', id)
        console.log('Entity Name:      ', entities)
        console.log('Error:     ', data.error)
        console.log('Error Code:     ', data.errorCode)
        console.log('Placement performance:', timeDiff)
        console.log('Placement:', smartaPlacement)
        console.log('Local Item Number:', localItemNumber)
        console.log('Composition ID:', compositionId)
        console.log('Room ID:', smartaData.sceneId)
        console.groupEnd()
    }

    additionalSmartaTracking = {
        Entity: entities,
        PlacementType: 'Smarta',
        PlacementResult: 'Success',
        PlacementLatencyMS: timeDiff,
    }
    updatedTrackingInfo = { ...trackingInfo, ...additionalSmartaTracking }

    yield put(
        debugConsoleLog(
            'smarta',
            JSON.stringify(
                {
                    success: true,
                    entity: entities,
                    productId: id,
                    perf: timeDiff,
                },
                null,
                2,
            ),
        ),
    )

    // If the item is stacked, supply the stackedPlane to the react state.
    // If an item is neither on a surface or another furniture item, stackedPlane is undefined
    // and the item will be placed on some viewer-defined default position as if no smarta was used.
    const numParentId = parseInt(parentId, 10)
    const isParentSurface = parentId === 'SURFACE'
    const isParentFurniture = !isParentSurface && !Number.isNaN(numParentId)
    const surfaceParent = isParentSurface ? `${parentAttachment}` : undefined
    const stackedPlane = isParentFurniture ? `${parentId}${parentAttachment}` : surfaceParent

    // Sanity check:
    // If no surface parent can be determined, the item will still be placed on a default position,
    // but we'll log a message.
    if (surfaceParent === undefined) {
        yield put(
            debugConsoleLog(
                'smarta SPU',
                JSON.stringify({
                    message: 'surfaceParent === undefined',
                    parentId,
                    parentAttachment,
                    placedFurniture: !!data?.placedFurniture,
                }),
            ),
        )
    }

    // If the item is snaprotable, supply the anchorCombinationIndex to the react state.
    const anchorCombinationIndex = data.placedFurniture.gfxAttributes?.anchorCombinationIndex

    yield put(
        placeRenderItem(
            compositionId,
            id,
            null,
            null,
            {
                ...settings,
                ...(settings.anchorCombinationIndex !== undefined ? { anchorCombinationIndex } : {}),
                uniqueId: sharedUniqueId,
                stackedPlane,
                smartaPlacementState: SMARTA_STATUS_SUCCESS,
            },
            updatedTrackingInfo,
            null,
            null,
            null,
            null,
            smartaPlacement,
        ),
    )
}

/**
 * @param {ReturnType<typeof import('./actions').addProductToComposition>} action
 */
export function* addProductToCompositionSaga({ payload }) {
    const productData = yield select((state) => getFurnitureById(state)[payload.productId])
    const { id, stacks, renderType, hidden, placeables } = productData
    let renderData
    if (renderType === FURNITURE_ITEM) {
        renderData = {
            heading: 0,
            stacks,
            hidden,
            placeables,
        }
    } else {
        // For Art
        renderData = {
            matteId: 1,
            frameId: 1,
            sizeId: 1,
            colorId: 1,
            customHeight: null,
        }
    }

    const productTrackingInfo = getProductTrackingInfo(productData)
    yield put(incrementFurnitureAddCount())
    const compositionId = yield select(getSelectedCompositionId)
    yield put(
        clickPlaceRenderItem(
            compositionId,
            id,
            {
                renderType,
                ...renderData,
            },
            {
                ...productTrackingInfo,
                d_id_click_item: Math.floor(Math.random() * 10000000000), // For debugging
                AddedFrom: payload.trackingInfo.AddedFrom,
                // Pass through search context if available
                ...(payload.trackingInfo.searchContext && {
                    SearchQueryDetails: payload.trackingInfo.searchContext.searchQueryDetails,
                    SearchResultPosition: payload.trackingInfo.searchContext.searchResultPosition,
                }),
            },
        ),
    )
}

/**
 * @param {ReturnType<typeof import('./actions').removeFurnitureFromComposition>} action
 */
function* removeFurnitureFromCompositionSaga({ payload: { furnitureId } }) {
    const products = yield select(getSelectedCompositionProductData)
    const product = products.find((p) => p.uniqueId === furnitureId)
    const compositionId = yield select(getSelectedCompositionId)
    yield put(
        deleteCompositionRenderItem(compositionId, furnitureId, {
            ...getProductTrackingInfo(product),
        }),
    )
}

export function* processCombinablesNodes(nodeMeta, renderItem, renderItems, index) {
    /*
    if (nodeMeta.items && nodeMeta.items.length > 0) {
        const productTrackingInfo = getProductTrackingInfo(renderItem)
        const trackingInfo = {
            ...productTrackingInfo,
            AddedFrom: TRACKING_ADDED_FROM.SALES_DRESSING,
        }
        const settings = {
            renderType: FURNITURE_ITEM,
            heading: 0,
            stacks: false,
            hidden: renderItem.hidden,
            combinablePlacement: {
                parentId: action.payload.id,
                localTransform: nodeMeta.matrixModel.flat(),
            }
        }
        store.dispatch(
            placeRenderItem(
                compositionId,
                renderItem.id,
                0,
                0,
                settings,
                combinablePlacement,
                trackingInfo,
            ),
        )
    } else {
    */
    // look for nearest non-wildcard variant in all ancestors
    const wildcardVariant = 2 // probably temporary
    let currParentRenderItem = renderItem
    let variant = currParentRenderItem.metadata.combinables.selfMeta.variant || wildcardVariant

    while (variant === wildcardVariant) {
        const parentUniqueId =
            currParentRenderItem.combinablePlacement && currParentRenderItem.combinablePlacement.parentId
        if (!parentUniqueId) break

        currParentRenderItem = renderItems.find((item) => item.uniqueId === parentUniqueId)
        if (!currParentRenderItem) break

        variant = currParentRenderItem.metadata.combinables.selfMeta.variant || wildcardVariant
    }

    const slotCategory = nodeMeta.category
    const size = nodeMeta.size

    yield put(requestFurnitureCombinables(renderItem.id, renderItem.uniqueId, slotCategory, size, variant, index))
}

export function* renderItemLoadedSaga(action) {
    const { renderItems } = yield select(getSelectedComposition)
    const renderItem = renderItems.find((item) => item.uniqueId === action.payload.id)

    if (renderItem?.metadata?.combinables?.nodesMeta) {
        yield all(
            renderItem.metadata.combinables.nodesMeta.map((nodeMeta, index) =>
                processCombinablesNodes(nodeMeta, renderItem, renderItems, index),
            ),
        )
    }
}

export function* selectCompositionSaga(action) {
    const selectedCompositionId = action.payload.compositionId

    // Wait for IKEA tokens if auth state is unknown
    // This fixes the race condition in singleview email flow where selectComposition
    // is dispatched before RECEIVE_IKEA_TOKENS has been processed
    let hasValidAuthToken = yield select(getHasValidAuthToken)
    let isUserDataLoaded = yield select(getIsUserDataLoaded)
    let userDataNotLoaded = !hasValidAuthToken && !isUserDataLoaded

    if (userDataNotLoaded) {
        // Wait for tokens to be received with a timeout as safety
        yield race({
            tokenReceived: take(RECEIVE_IKEA_TOKENS),
            timeout: delay(5000),
        })

        // Re-check auth state after tokens are received
        hasValidAuthToken = yield select(getHasValidAuthToken)
        isUserDataLoaded = yield select(getIsUserDataLoaded)
        userDataNotLoaded = !hasValidAuthToken && !isUserDataLoaded
    }

    if (userDataNotLoaded) {
        yield put(requestUser())
        yield take([RECEIVE_USER, FAILED_RECEIVE_USER, SKIP_FETCH_USER])
    }

    // Only load comp/scene data if we will be (or are) logged in
    // or if we're done trying to load user data/auth
    // This prevents a race condition where we receive the auth
    // token while the scene is loading

    // If we don't have the composition, load it

    const byId = yield select(getCompositionsById)
    const selectedCompositionData = byId[selectedCompositionId] || null
    const forceLegacyManifest = yield select(getForceLegacyManifest)

    if (!selectedCompositionData) {
        yield put(requestCompiledComposition(selectedCompositionId, forceLegacyManifest))
    } else {
        // Since composition data is there, set preview scene loaded state
        yield put(compositionLoaded({ hasLoaded: true, errorType: null }))
        const isSceneFetching = yield select(getScenesIsFetching)
        if (!isSceneFetching) {
            // If we have a comp, but not the scene, load it
            const selectedSceneId = selectedCompositionData.sceneId
            if (selectedSceneId) {
                const scenesById = yield select(getScenesById)

                const selectedSceneData = scenesById[selectedSceneId] || null
                if (!selectedSceneData) {
                    yield put(requestScene(selectedSceneId, forceLegacyManifest))
                } else {
                    // Since scene data is there, set preview scene loaded state
                    yield put(sceneLoaded({ hasLoaded: true, errorType: null }))

                    // Update debug settings based on scene
                    const debugSettings = yield select(getDebugSettings)
                    const previewSettings = yield select(getPreviewSettings)

                    yield put(
                        updateDebugSettings({
                            ...debugSettings,
                            ...getSceneDependentInitialDebugSettings(previewSettings, selectedSceneData),
                        }),
                    )
                }
            }
        }
    }

    // Pre-uuid compatability block {
    const isDefaultComp = selectedCompositionId === NEW_COMPOSITION_ID
    const isLegacyCompId = !isDefaultComp && !Number.isNaN(Number(selectedCompositionId)) // Legacy int id

    // If we're using the legacy id
    if (isLegacyCompId) {
        const { payload } = yield take(RECEIVE_COMPILED_COMPOSITION)
        // Redirect to the UUID (composition)
        if (payload?.composition?.compositionId.toString() === selectedCompositionId) {
            yield put(openComposition(payload.composition.uuid))
        }
    }
    // } end compatability block

    const furnitureLoadingByIds = yield select(getFurnitureIsLoadingByIds)
    // Load furniture items we're missing
    if (!furnitureLoadingByIds) {
        const missingFurnitureIds = yield select(getSelectedCompositionMissingFurnitureIds)
        if (missingFurnitureIds.length) {
            // Combinables are only available in compiled composition.
            // So instead of requesting by id we request by composition id.
            yield put(requestFurnitureByComposition(selectedCompositionId, forceLegacyManifest))
        }
    }
}

export function* receiveCompiledCompositionSaga(action) {
    const { payload } = action
    yield put(compositionLoaded({ hasLoaded: true, errorType: null }))
    yield put(sceneLoaded({ hasLoaded: true, errorType: null }))

    // When entering a composition, update the debug settings as needed
    const scene = payload?.scene
    if (scene) {
        const debugSettings = yield select(getDebugSettings)
        const previewSettings = yield select(getPreviewSettings)

        yield put(
            updateDebugSettings({
                ...debugSettings,
                ...getSceneDependentInitialDebugSettings(previewSettings, scene),
            }),
        )
    }
}

export function* failedReceiveCompiledCompositionSaga(action) {
    yield put(compositionLoaded({ hasLoaded: true, errorType: action.payload.errorType }))
}

export function* setWallColorSaga(action) {
    const color = action.payload.colorString

    if (!GeomViewer.bindings) {
        return
    }

    yield call(GeomViewer.bindings.setWallColor, color || undefined)
}

export function* deleteCompositionRenderItemSaga() {
    const isLivingRoomIntegration = yield select(getIsLivingRoomContext)
    const placeProductId = yield select(getPlaceProductId)
    const furnitureList = yield select(getFurnitureById)
    const composition = yield select(getSelectedComposition)
    const anchorSwapId = yield select(getSwapAnchorId)
    const isProductContext = yield select(getIsProductContext)

    if (isLivingRoomIntegration) {
        const hasOriginalProductIdPlaced = Object.values(composition.renderItems).find((renderItem) => {
            const furniture = furnitureList?.[renderItem?.id]
            // If original furniture ID is not in the rendered item list or anchor swap id is not the original place product anymore,
            // it would mean the user is far from inital logic of the original placed render item.
            // Otherwise show the filter featured products
            return furniture?.id === placeProductId || placeProductId === anchorSwapId
        })

        if (!hasOriginalProductIdPlaced) {
            yield put(resetPlaceProduct())
        }
    }

    if (isProductContext) {
        yield put(resetPlaceProduct())
    }
}

export function* undoSwapSaga({ payload: { trackingInfo } }) {
    const selectedFurniture = yield select(getSelectedRenderItem)
    const swappedFurniture = yield select(getSelectedFurnitureBeforeSwap)
    if (selectedFurniture == null || swappedFurniture == null) {
        return
    }

    const swapParams = {
        furnitureToSwapOut: selectedFurniture.uniqueId,
        productToSwapIn: swappedFurniture.id,
        trackingInfo,
    }

    if (selectedFurniture?.materialUrl && swappedFurniture?.materialUrl) {
        yield put(softSwapRenderItem(swapParams))
    } else {
        yield put(swapRenderItem(swapParams))
    }
}

// WATCHER functions
function* watchRendererReady() {
    yield takeEvery(RENDERER_READY, rendererReady)
}

function* watchRequestCompositionsSaga() {
    yield takeEvery(REQUEST_COMPOSITIONS_SAGA, requestCompositionsSaga)
}

function* watchRequestCompiledCompositionSaga() {
    yield takeLatest(REQUEST_COMPILED_COMPOSITION_SAGA, requestCompiledCompositionSaga)
}

function* watchStartTestSwapSaga() {
    yield takeEvery(START_TEST_SWAP_SAGA, testSwapsSaga)
}

function* watchStartTestLoadSaga() {
    yield takeEvery(START_TEST_LOAD_SAGA, testLoadsSaga)
}

function* watchRequestCompositionSharingSaga() {
    yield takeEvery(REQUEST_SAVE_COMPOSITION_BEFORE_SHARING, requestCompositionSharingSave)
}

function* watchSelectCompositionRenderItem() {
    yield takeEvery(SELECT_COMPOSITION_RENDER_ITEM, compositionRenderItemSelectSaga)
}

function* watchRenameCompositionSaga() {
    yield takeEvery(RENAME_COMPOSITION, renameCompositionSaga)
}

function* watchDeletedComposition() {
    yield takeEvery(RECEIVE_DELETE_COMPOSITION, deletedCompositionSaga)
}

function* watchSaveCompositionResult() {
    yield takeEvery([FAILED_SAVE_COMPOSITION, RECEIVE_SAVE_COMPOSITION], saveCompositionResultSaga)
}
function* watchSaveCompositionSharePermissions() {
    yield takeEvery(REQUEST_SAVE_COMPOSITION_SHARING, saveSharePermissions)
}

function* watchSaveExpertCheckConsent() {
    yield takeEvery(REQUEST_SAVE_EXPERT_CHECK_CONSENT, saveExpertCheckConsent)
}

function* watchAddProductToComposition() {
    yield takeEvery(ADD_PRODUCT_TO_COMPOSITION, addProductToCompositionSaga)
}

function* watchRemoveFurnitureFromComposition() {
    yield takeEvery(REMOVE_FURNITURE_FROM_COMPOSITION, removeFurnitureFromCompositionSaga)
}

function* watchClickPlaceRenderItem() {
    yield takeEvery(CLICK_PLACE_RENDER_ITEM, clickPlaceRenderItemSaga)
}

function* watchRenderItemLoaded() {
    yield takeEvery(RENDER_ITEM_LOADED, renderItemLoadedSaga)
}

function* watchSelectCompositionAndUser() {
    yield takeLatest(SELECT_COMPOSITION, selectCompositionSaga)
}

function* watchReceiveCompiledCompositionSaga() {
    yield takeLatest(RECEIVE_COMPILED_COMPOSITION, receiveCompiledCompositionSaga)
}

function* watchFailedReceiveCompiledCompositionSaga() {
    yield takeLatest(FAILED_RECEIVE_COMPILED_COMPOSITION, failedReceiveCompiledCompositionSaga)
}

function* watchCopyComposition() {
    yield takeEvery(COPY_COMPOSITION, copyCompositionSaga)
}

function* watchSetColor() {
    yield takeEvery(SET_WALL_COLOR, setWallColorSaga)
}
function* watchDeletedCompositionRenderItem() {
    yield takeEvery(DELETE_COMPOSITION_RENDER_ITEM, deleteCompositionRenderItemSaga)
}

function* watchUndoSwap() {
    yield takeEvery(UNDO_SWAP, undoSwapSaga)
}

export function* waitForInitialLoadingComplete() {
    let initLoading
    // SET_INITIAL_LOADING event gets fired to TRUE then FALSE once everything in the composition is initialized
    while (true) {
        initLoading = yield take(SET_INITIAL_LOADING)
        if (!initLoading.payload.initialLoading) {
            break
        }
    }
}

const FIRST_FEEDBACK_DELAY = 1 * 60 * 1000
const SECOND_FEEDBACK_DELAY = 2 * 60 * 1000
const FIRST_FEEDBACK_TRACKING_DELAY = 1
const SECOND_FEEDBACK_TRACKING_DELAY = 3

export function* watchFeedbackTriggerSaga() {
    // 1. Wait for composition to be loaded
    yield take(UPDATE_COMPOSITION_LOADED)
    yield call(waitForInitialLoadingComplete)

    // 2. Wait for the first user interaction AFTER render
    yield take([
        TRACK_DECORATE_ROOM_MOVE_PRODUCT,
        TRACK_DECORATE_ROOM_ROTATE_PRODUCT,
        CLICK_PLACE_RENDER_ITEM,
        SWAP_RENDER_ITEM,
    ])

    const hasSeenFeedbackFormOnce = yield select(getHasSeenFeedbackFormOnce)
    const delayTimer = hasSeenFeedbackFormOnce ? SECOND_FEEDBACK_DELAY : FIRST_FEEDBACK_DELAY

    // 3. Start timer and show feedback prompt
    yield call(waitPromise, delayTimer)
    yield put(
        setPromptVisibility(
            true,
            hasSeenFeedbackFormOnce ? SECOND_FEEDBACK_TRACKING_DELAY : FIRST_FEEDBACK_TRACKING_DELAY,
        ),
    )
}

export function* watchForUserSkippedFirstFeedback() {
    // Waits for the user to skip the first feedback popup
    // This will get triggered immediately after user skips first popup
    yield take(SKIP_FEEDBACK_FORM_FIRST_TIME)
    yield call(waitPromise, SECOND_FEEDBACK_DELAY)
    yield put(setPromptVisibility(true, SECOND_FEEDBACK_TRACKING_DELAY))
}

export const compositionsSagas = [
    watchRequestCompositionsSaga(),
    watchRequestCompiledCompositionSaga(),
    watchReceiveCompiledCompositionSaga(),
    watchFailedReceiveCompiledCompositionSaga(),
    watchStartTestSwapSaga(),
    watchStartTestLoadSaga(),
    watchRequestCompositionSharingSaga(),
    watchSelectCompositionRenderItem(),
    watchRenameCompositionSaga(),
    watchDeletedComposition(),
    watchRendererReady(),
    watchSaveCompositionSharePermissions(),
    watchSaveExpertCheckConsent(),
    watchAddProductToComposition(),
    watchRemoveFurnitureFromComposition(),
    watchClickPlaceRenderItem(),
    watchRenderItemLoaded(),
    watchSaveCompositionResult(),
    watchSelectCompositionAndUser(),
    watchCopyComposition(),
    watchSetColor(),
    watchDeletedCompositionRenderItem(),
    watchUndoSwap(),
    watchFeedbackTriggerSaga(),
    watchForUserSkippedFirstFeedback(),
]
