import { createAction } from '@reduxjs/toolkit'
import * as Sentry from '@sentry/react'

import * as tracker from 'utils/tracker'
import * as types from 'models/actionTypes'
import * as compositionsApi from 'services/compositions'
import * as scenesApi from 'services/scenes'
import * as envmapsApi from 'services/envmapUpload'

import {
    getIsModified,
    getSelectedCompositionData,
    getSelectedCompositionId,
    getSelectedRenderItemId,
    getSelectedCompositionSaveData,
    getSelectedScene,
    getNewCompositionSaveTransition,
} from 'models/compositions/selectors'
import { getIsLoggedIn, getUserId } from 'models/user/selectors'
import { loginNeeded } from 'models/user/actions'
import { getIsNewComposition } from 'models/compositions/helpers'
import { getAuthToken } from 'services/authToken'
import {
    detectEmptyPlacementSaveAnomaly,
    detectCompositionSaveAnomaly,
    trackPreSavePayload,
    trackDoubleSave,
} from 'models/compositions/saveAnomalyTelemetry'
import type {
    APIComposition,
    CompositionSaveData,
    CompositionSharingData,
    CompositionDataItem,
    RenderItem,
    SavedProperties,
    CompositionSaveType,
    CompositionSaveTrackingInfo,
    RenderItemComplete,
} from 'models/compositions/'
import { createThumbnail } from 'models/compositions/utils'
import { APIScene } from 'models/scenes'
import { NEW_SCENE_ID, SOURCETYPE_LITE_SCAN } from 'models/scenes/constants'
import { receiveScene } from 'models/scenes/actions'
import { APIProduct } from 'models/furniture'
import type { AppDispatch, RootState } from 'store'
import OpenCompositionTrackingType from 'models/tracking'
import { getSavingUsingModal } from 'models/ui/selectors'
import { getDecidedFlags } from 'models/experiments/selectors'
import { RenderType } from 'constants/renderItemTypes'
import { type TrackingAddedFrom, TRACK_LOCATION_NOT_SET } from 'models/tracking/constants'
import { PreviewError } from 'models/preview/constants'
import { upptackaActions } from 'models/upptacka/slice'
import { type SmartaPlacementStatus } from 'constants/stateTypes'
import { GeomViewer, type PlacingBehavior } from 'Renderer/geomviewer'
import { validateHDRfile } from 'Renderer/utils/rgbeUtils'
import { stashGuestToken, stashGuestCompositionId, stashMergeSceneId, getStashedGuestCompositionId } from 'utils/guestToken'
import {
    NEW_COMPOSITION_ID,
    MAX_COMPOSITION_NAME_LENGTH,
    TRACK_COPY_COMPOSITION,
    TRACK_EDIT_COMPOSITION,
    TRACK_NEW_COMPOSITION,
    TRACK_RENAME_COMPOSITION,
} from './constants'

export type TrackingInfo = Record<string, unknown>

export const requestSaveComposition = createAction(
    types.REQUEST_SAVE_COMPOSITION,
    (data: CompositionSaveData, trackingInfo: CompositionSaveTrackingInfo) => ({
        payload: {
            data,
            trackingInfo,
        },
    }),
)

export const receiveSaveComposition = createAction(
    types.RECEIVE_SAVE_COMPOSITION,
    (
        composition: APIComposition,
        isNew: boolean,
        isNewScene: boolean,
        originId: string,
        trackingInfo: CompositionSaveTrackingInfo,
    ) => ({
        payload: {
            composition,
            compositionId: composition.compositionId,
            originId,
            trackingInfo,
            isNew,
            isNewScene,
        },
    }),
)

export const receiveGuestSaveComposition = createAction(
    types.RECEIVE_GUEST_SAVE_COMPOSITION,
    (composition: APIComposition, isNewScene: boolean, originId: string) => ({
        payload: {
            composition,
            isNewScene,
            originId,
        },
    }),
)

// Guest saves run silently behind the login modal — a failure must not surface a "save failed"
// toast or hasSaveError state. This action exists solely to flip isSaving back to false so the
// modal's Login/Sign Up buttons re-enable; the user sees no feedback that the background save failed.
export const failedGuestSaveComposition = createAction(types.FAILED_GUEST_SAVE_COMPOSITION)

export const receiveRenameComposition = createAction(
    types.RECEIVE_RENAME_COMPOSITION,
    (composition: APIComposition, originId: string, trackingInfo: CompositionSaveTrackingInfo) => ({
        payload: {
            trackingInfo,
            composition,
            compositionId: composition.compositionId,
            originId,
        },
    }),
)

export const failedSaveComposition = createAction(
    types.FAILED_SAVE_COMPOSITION,
    (error: unknown, compositionData: CompositionDataItem, trackingInfo: CompositionSaveTrackingInfo) => ({
        payload: {
            error,
            data: compositionData,
            trackingInfo,
        },
    }),
)

export const startNewCompositionSaveTransition = createAction(
    types.START_NEW_COMPOSITION_SAVE_TRANSITION,
    (originId: string) => ({
        payload: {
            originId,
        },
    }),
)

export const recordNewCompositionSaveTarget = createAction(
    types.RECORD_NEW_COMPOSITION_SAVE_TARGET,
    (targetId: string) => ({
        payload: {
            targetId,
        },
    }),
)

export const deferNewCompositionSaveRename = createAction(
    types.DEFER_NEW_COMPOSITION_SAVE_RENAME,
    (pendingRenameName: string) => ({
        payload: {
            pendingRenameName,
        },
    }),
)

export const saveCompositionBeforeSharing = createAction(
    types.REQUEST_SAVE_COMPOSITION_BEFORE_SHARING,
    (trackingInfo?: CompositionSaveTrackingInfo) => ({
        payload: {
            trackingInfo,
        },
    }),
)

export const requestSaveCompositionSharing = createAction(
    types.REQUEST_SAVE_COMPOSITION_SHARING,
    (data: CompositionSharingData, trackingInfo?: TrackingInfo) => ({
        payload: {
            data,
            trackingInfo,
        },
    }),
)

export const receiveSaveCompositionSharing = createAction(
    types.RECEIVE_SAVE_COMPOSITION_SHARING,
    (composition: APIComposition) => ({
        payload: {
            composition,
        },
    }),
)

export const failedSaveCompositionSharing = createAction(types.FAILED_SAVE_COMPOSITION_SHARING, (error?: unknown) => ({
    payload: {
        error,
    },
}))

export const requestSaveExpertCheckConsent = createAction(
    types.REQUEST_SAVE_EXPERT_CHECK_CONSENT,
    (data: CompositionSharingData, trackingInfo?: TrackingInfo) => ({
        payload: {
            data,
            trackingInfo,
        },
    }),
)

export const receiveSaveExpertCheckConsent = createAction(
    types.RECEIVE_SAVE_EXPERT_CHECK_CONSENT,
    (composition: APIComposition) => ({
        payload: {
            composition,
        },
    }),
)

export const failedSaveExpertCheckConsent = createAction(types.FAILED_SAVE_EXPERT_CHECK_CONSENT, (error?: unknown) => ({
    payload: {
        error,
    },
}))

export const fetchCompositions = createAction(types.REQUEST_COMPOSITIONS_SAGA)

export const receiveCompositions = createAction(types.RECEIVE_COMPOSITIONS, (compositions: APIComposition[]) => ({
    payload: {
        compositions,
    },
}))

export const failedReceiveCompositions = createAction(types.FAILED_RECEIVE_COMPOSITIONS)

export const requestCompiledComposition = createAction(
    types.REQUEST_COMPILED_COMPOSITION_SAGA,
    (id: string, forceLegacyManifest: boolean) => ({
        payload: {
            id,
            forceLegacyManifest,
        },
    }),
)

export const receiveCompiledComposition = createAction(
    types.RECEIVE_COMPILED_COMPOSITION,
    (composition: APIComposition, scene: APIScene, furniture: APIProduct[]) => ({
        payload: {
            composition,
            scene,
            furniture,
        },
    }),
)

export const updateHiddenSurfaces = createAction(
    types.UPDATE_HIDDEN_SURFACES,
    (compositionId: string, surfaces: number[]) => ({
        payload: {
            compositionId,
            surfaces,
        },
    }),
)

export const failedReceiveCompiledComposition = createAction(
    types.FAILED_RECEIVE_COMPILED_COMPOSITION,
    (errorType: PreviewError, status: number) => ({
        payload: {
            errorType,
            status,
        },
    }),
)

export const setCompositionPreFetchLoading = createAction(
    types.SET_COMPOSITION_PRE_FETCH_LOADING,
    (isLoading: boolean) => ({
        payload: {
            isLoading,
        },
    }),
)

export const startDragRenderItem = createAction(types.START_DRAG_RENDER_ITEM, (uniqueId: number) => ({
    payload: {
        uniqueId,
    },
}))

export const stopDragRenderItem = createAction(types.STOP_DRAG_RENDER_ITEM)

export const enableMirrorOption = createAction(
    types.ENABLE_MIRROR_OPTION,
    (compositionId: string, uniqueId: number, shouldEnable: boolean) => ({
        payload: {
            compositionId,
            uniqueId,
            shouldEnable,
        },
    }),
)

export type PlaceRenderItemSettings = {
    renderType: RenderType
    heading: number
    stacks: boolean
    hidden: boolean
    placeables: unknown
    uniqueId?: number
    isAddedFromDuplicate?: boolean
    smartaPlacementState?: SmartaPlacementStatus
    combinablePlacement?: { socketName: string }
}

export type ArtRenderItemSettings = {
    renderType: RenderType
    matteId: number
    frameId: number
    sizeId: number
    colorId: number
    customHeight: number | null
    heading: number
    stacks: boolean
    hidden: boolean
    placeables: unknown
    uniqueId?: number
    isAddedFromDuplicate?: boolean
    smartaPlacementState?: SmartaPlacementStatus
    combinablePlacement?: { socketName: string }
}

export const placeRenderItem = createAction(
    types.PLACE_RENDER_ITEM,
    (
        compositionId: string,
        id: number,
        x0: number | null,
        y0: number | null,
        settings: PlaceRenderItemSettings | ArtRenderItemSettings,
        trackingInfo: TrackingInfo,
        parentId: number | null = null,
        p3x0: number | null = null,
        p3y0: number | null = null,
        p3z0: number | null = null,
        smartaPlacement: unknown | null = null,
        searchContext?: { searchQueryDetails: string; searchResultPosition: number | null } | null,
    ) => ({
        payload: {
            id,
            compositionId,
            x0,
            y0,
            settings,
            trackingInfo,
            parentId,
            p3x0,
            p3y0,
            p3z0,
            smartaPlacement,
            uniqueId: null as number | null, // Filled in middleware
            searchContext,
        },
    }),
)

export const clickPlaceRenderItem = createAction(
    types.CLICK_PLACE_RENDER_ITEM,
    (
        compositionId: string,
        id: number,
        settings: PlaceRenderItemSettings,
        trackingInfo: TrackingInfo,
        uniqueId?: number,
    ) => ({
        payload: {
            id,
            compositionId,
            settings,
            trackingInfo,
            uniqueId: uniqueId || Math.floor(Date.now() / 2),
        },
    }),
)

export const clickPlaceMultipleRenderItems = createAction<{
    compositionId: string
    // ids: number[],
    localItemNumbers: string[]
    ignoreCamera?: boolean
    trackingInfo: TrackingInfo
}>(types.CLICK_PLACE_MULTIPLE_RENDER_ITEMS)

export const placeMultipleRenderItemsLoading = createAction(
    types.PLACE_MULTIPLE_RENDER_ITEMS_LOADING,
    (isPlacingMultiple: boolean) => ({
        payload: {
            isPlacingMultiple,
        },
    }),
)
export const clickPlaceSetRenderItems = createAction<{
    compositionId: string
    setId: string
    ignoreCamera?: boolean
    trackingInfo: TrackingInfo
}>(types.CLICK_PLACE_SET_RENDER_ITEMS)

export const addProductToComposition = createAction(
    types.ADD_PRODUCT_TO_COMPOSITION,
    (
        productId: number,
        trackingInfo: TrackingInfo & {
            searchContext?: { searchQueryDetails: string; searchResultPosition: number | null }
        },
    ) => ({
        payload: {
            productId,
            trackingInfo,
        },
    }),
)

export const removeFurnitureFromComposition = createAction(
    types.REMOVE_FURNITURE_FROM_COMPOSITION,
    (furnitureId: number) => ({
        payload: {
            furnitureId,
        },
    }),
)

export const requestDeleteComposition = createAction(types.REQUEST_DELETE_COMPOSITION, (id: string) => ({
    payload: {
        id,
    },
}))

const receiveDeleteComposition = createAction(types.RECEIVE_DELETE_COMPOSITION)

// Select another composition
export const selectComposition = createAction(types.SELECT_COMPOSITION, (compositionId: string) => ({
    payload: {
        compositionId,
    },
}))

export const openComposition = createAction(
    types.OPEN_COMPOSITION,
    (
        compositionId: string,
        trackingInfo?: OpenCompositionTrackingType,
        extra?: Record<string, string | null | undefined>,
        options?: { replaceCurrentHistoryEntry?: boolean; preserveCurrentCompositionState?: boolean },
    ) => ({
        payload: {
            compositionId,
            trackingInfo,
            extra,
            ...(options?.replaceCurrentHistoryEntry ? { replaceCurrentHistoryEntry: true } : {}),
            ...(options?.preserveCurrentCompositionState ? { preserveCurrentCompositionState: true } : {}),
        },
    }),
)

export const deleteComposition = (id: string) => (dispatch: AppDispatch) => {
    dispatch(requestDeleteComposition(id))
    return compositionsApi.deleteComposition(id).then(() => dispatch(receiveDeleteComposition()))
}

export const copyComposition = createAction(
    types.COPY_COMPOSITION,
    (
        compositionId: string,
        newName: string | undefined,
        trackingInfo: TrackingInfo,
        compositionData: CompositionDataItem,
    ) => ({
        payload: {
            compositionId,
            newName,
            trackingInfo,
            compositionData,
        },
    }),
)

export const receiveCopyComposition = createAction(
    types.RECEIVE_COPY_COMPOSITION,
    (composition: APIComposition, originId: string, trackingInfo: CompositionSaveTrackingInfo) => ({
        payload: {
            composition,
            compositionId: composition.compositionId,
            originId,
            trackingInfo,
        },
    }),
)

export const saveSelectedComposition =
    (
        trackingInfo: CompositionSaveTrackingInfo = { SavedFrom: TRACK_LOCATION_NOT_SET },
        newName?: string,
        saveType?: CompositionSaveType,
    ) =>
    async (dispatch: AppDispatch, getState: () => RootState) => {
        const state = getState()

        const compositionData = getSelectedCompositionData(state)
        const compositionSaveData = getSelectedCompositionSaveData(state)
        const userId = getUserId(state)
        const isCopy = saveType === TRACK_COPY_COMPOSITION
        const isRename = saveType === TRACK_RENAME_COMPOSITION
        const isLoggedIn = getIsLoggedIn(state)
        const hasGuestToken = getAuthToken()?.type === 'guest'
        const selectedScene = getSelectedScene(state)
        const isKreativLiteScene = selectedScene?.sourceType === SOURCETYPE_LITE_SCAN
        // Today only Kreativ Lite scenes opt into silent guest saves. Future guest-save
        // surfaces should join this condition if they need the same background save,
        // login-prompt, URL-preserving, post-login merge behavior.
        const isSilentGuestSave = hasGuestToken && isKreativLiteScene
        const allowGuestSave = isSilentGuestSave
        const selectedCompositionId = getSelectedCompositionId(state)
        const hasActiveNewCompositionSave = !!getNewCompositionSaveTransition(state)

        // For guest saves, skip the ownership check — the guest comp's wid won't match
        // state.user.wid (which stays at -1 for unauthenticated users). We only need to
        // know whether we're creating a new comp or updating an existing one.
        const isNewOrUnowned = isSilentGuestSave
            ? compositionSaveData.compositionId === NEW_COMPOSITION_ID
            : getIsNewComposition(compositionSaveData.compositionId, compositionData.wid, userId)
        const isSceneCreation = isCopy || isNewOrUnowned
        const savingUsingModal = getSavingUsingModal(state)

        // Set SaveType for tracking
        let trackingSaveType: CompositionSaveType
        if (isRename) {
            trackingSaveType = TRACK_RENAME_COMPOSITION
        } else if (isCopy) {
            trackingSaveType = TRACK_COPY_COMPOSITION
        } else if (isNewOrUnowned) {
            trackingSaveType = TRACK_NEW_COMPOSITION
        } else {
            trackingSaveType = TRACK_EDIT_COMPOSITION
        }

        const updatedTrackingInfo = { ...trackingInfo, SaveType: trackingSaveType }

        if (!isSilentGuestSave && selectedCompositionId === NEW_COMPOSITION_ID && hasActiveNewCompositionSave) {
            if (isRename && newName !== undefined) {
                dispatch(deferNewCompositionSaveRename(newName))
            }
            return
        }

        if (!isLoggedIn && !allowGuestSave) {
            dispatch(loginNeeded(updatedTrackingInfo))
            return // Return early if not logged in or guest
        }

        // Capture the guest token now, before any async work — by the time the save
        // resolves the auth token may have changed (e.g. user logs in while save is in flight).
        const capturedGuestToken = isSilentGuestSave ? getAuthToken()?.token : null

        if (isSilentGuestSave) {
            // Show login modal immediately; save runs silently in the background.
            // Buttons in the modal are disabled via isSaving until the save completes.
            dispatch(loginNeeded(updatedTrackingInfo))
        }

        detectCompositionSaveAnomaly(compositionData, compositionSaveData.placedFurniture.length)

        // Detect double-save within short time window
        trackDoubleSave(compositionData.id)

        // Track final payload placement count before save
        trackPreSavePayload(
            compositionData.id,
            compositionSaveData.placedFurniture.length,
            Object.keys(compositionData.renderItems).length,
        )

        // WEBFS-902: defense-in-depth. If the composition has renderItems but the
        // serialized payload would ship placedFurniture: [] (placement was stripped
        // by a reset before this thunk ran), abort the save instead of letting the
        // server delete the user's furniture. Sentry capture fingerprints the path.
        if (
            detectEmptyPlacementSaveAnomaly(
                compositionData,
                compositionSaveData.placedFurniture.length,
                trackingSaveType,
                updatedTrackingInfo,
            )
        ) {
            dispatch(
                failedSaveComposition(new Error('SaveAborted.EmptyPlacement'), compositionData, updatedTrackingInfo),
            )
            return
        }

        if (!isSilentGuestSave && selectedCompositionId === NEW_COMPOSITION_ID && isNewOrUnowned) {
            dispatch(startNewCompositionSaveTransition(selectedCompositionId))
        }

        dispatch(requestSaveComposition(compositionSaveData, updatedTrackingInfo))

        try {
            const flags = getDecidedFlags(getState())

            let nextSceneId = compositionSaveData.sceneId
            const isNewScene = compositionSaveData.sceneId === NEW_SCENE_ID

            // Upload the scene if the id implies that it only exists locally
            if (isNewScene) {
                const { name, roomType, gltfManifest } = getSelectedScene(state)

                let envmap = null
                if (flags.RoomBuilderEnvmapUploading) {
                    envmap = GeomViewer.bindings?.exportEnvmap()
                    const result = validateHDRfile(envmap)
                    if (!result.valid) {
                        tracker.track('RoomBuilder.EnvmapGenerationFailed', { ...result })
                        envmap = null
                    }
                }

                // TODO: Some way to get a scene thumbnail
                const envmapUUID = await envmapsApi.uploadEnvmap(envmap)
                const { data } = await scenesApi.createRoomBuilderScene(name, roomType, gltfManifest, envmapUUID)

                dispatch(receiveScene(data))

                // TODO 3D TRANSITION: Uncomment this code
                // We should be able to open the scene here to save the
                // new id in the url, but for now the viewer is unhappy with
                // restarting using a "runtime" composition.
                // dispatch(openScene(data.uuid))

                nextSceneId = data.uuid
            }

            const baseImageData = await createThumbnail('saveSelectedComposition action')

            const saveData = {
                ...compositionSaveData,
                sceneId: nextSceneId,
                name: (newName ?? compositionSaveData.name)?.slice(0, MAX_COMPOSITION_NAME_LENGTH),
                baseImageData: baseImageData.thumbDataUrl,
            }

            const stashedGuestCompositionId = isSilentGuestSave ? getStashedGuestCompositionId() : null
            const shouldUpdateStashedGuestComposition = !!stashedGuestCompositionId
            // Silent guest saves keep Redux/URL on the original "new" composition so guest comp IDs
            // never appear in browser history. After the first POST succeeds, the stash becomes the
            // persistence identity for later background saves.
            const requestSaveData = shouldUpdateStashedGuestComposition
                ? { ...saveData, compositionId: stashedGuestCompositionId }
                : saveData
            const shouldCreateComposition = isSceneCreation && !shouldUpdateStashedGuestComposition

            const { data } = await (shouldCreateComposition
                ? compositionsApi.createComposition(requestSaveData, allowGuestSave)
                : compositionsApi.saveComposition(requestSaveData, allowGuestSave))

            if (isSilentGuestSave && capturedGuestToken) {
                // Stash token and comp ID together — both are needed for the post-login merge.
                // We do NOT update the URL so the guest comp ID never appears in browser history.
                stashGuestToken(capturedGuestToken)
                stashGuestCompositionId(data.uuid)
                stashMergeSceneId(data.sceneUuid)
                dispatch(receiveGuestSaveComposition(data, isNewScene, compositionData.id))
            } else {
                if (isNewOrUnowned && selectedCompositionId === NEW_COMPOSITION_ID) {
                    dispatch(recordNewCompositionSaveTarget(data.uuid))
                }

                dispatch(
                    receiveSaveComposition(data, isSceneCreation, isNewScene, compositionData.id, updatedTrackingInfo),
                )

                if (isCopy) {
                    if (flags.OpenSaveAsInNewTab) {
                        window.open(
                            `${window.location.pathname}${window.location.search}#${data.uuid}/${data.sceneUuid}`,
                            '_blank',
                        )
                    } else {
                        dispatch(openComposition(data.uuid))
                    }
                }
            }
            if (!isSilentGuestSave && isNewOrUnowned && !savingUsingModal) {
                dispatch(
                    openComposition(data.uuid, undefined, undefined, {
                        replaceCurrentHistoryEntry: true,
                        preserveCurrentCompositionState: true,
                    }),
                )
            }
        } catch (error) {
            if (isSilentGuestSave) {
                dispatch(failedGuestSaveComposition())
            } else {
                dispatch(failedSaveComposition(error, compositionData, updatedTrackingInfo))
            }
            Sentry.captureException(error)
        }
    }

export const deleteCompositionRenderItem = createAction(
    types.DELETE_COMPOSITION_RENDER_ITEM,
    (compositionId: string, id: number, trackingInfo: TrackingInfo) => ({
        payload: {
            compositionId,
            id,
            isLastItem: false, // Filled in middleware
            trackingInfo,
        },
    }),
)

export const selectCompositionRenderItem = createAction(
    types.SELECT_COMPOSITION_RENDER_ITEM,
    (renderItemId: number) => ({
        payload: {
            renderItemId,
        },
    }),
)

export const updateCompositionRenderItem = createAction(
    types.UPDATE_COMPOSITION_RENDER_ITEM,
    (compositionId: string, id: number, item: Partial<RenderItemComplete>, trackingInfo: TrackingInfo) => ({
        payload: {
            compositionId,
            id,
            item, // Item, here, is an object containing the fields that we want to overwrite
            trackingInfo,
        },
    }),
)

export const clearSwapAffinity = createAction(types.CLEAR_SWAP_AFFINITY, (compositionId: string, id: number) => ({
    payload: {
        compositionId,
        id,
    },
}))

export const updateSelectedCompositionRenderItem =
    (item: Partial<RenderItemComplete>, trackingInfo: TrackingInfo) =>
    (dispatch: AppDispatch, getState: () => RootState) => {
        const compositionId = getSelectedCompositionId(getState())
        const renderItemId = getSelectedRenderItemId(getState())

        if (renderItemId) {
            dispatch(updateCompositionRenderItem(compositionId, renderItemId, item, trackingInfo))
        }
    }

export const renderItemLoaded = createAction(
    types.RENDER_ITEM_LOADED,
    (compositionId: string, id: number, item: Partial<RenderItem>) => ({
        payload: {
            compositionId,
            id,
            item,
        },
    }),
)

export const renameComposition = createAction(
    types.RENAME_COMPOSITION,
    ({ id, name, trackingInfo, fullSave = false }) => ({
        payload: {
            id,
            name,
            trackingInfo,
            fullSave,
            preserveOriginalName: null as boolean | null, // Filled in middleware
        },
    }),
)

export type TrackingHints = {
    actionType: 'click'
    from: TrackingAddedFrom
}

export type SwapRenderItemArgs = {
    furnitureToSwapOut: number
    productToSwapIn: number
    trackingInfo: TrackingHints
}

export const swapRenderItem = createAction(
    types.SWAP_RENDER_ITEM,
    ({ furnitureToSwapOut, productToSwapIn, trackingInfo }: SwapRenderItemArgs) => ({
        payload: {
            furnitureToSwapOut,
            productToSwapOut: null as number | null, // Filled in middleware
            productToSwapIn,
            furnitureToSwapIn: null as number | null, // Filled in in middleware
            trackingInfo,
            compositionId: null as number | null, // Filled in middleware
            anchorCombinationIndex: null as number | null, // Filled in middleware
            placingBehavior: null as PlacingBehavior | null, // Filled in middleware
        },
    }),
)

// Swap render item's product and material data without deleting render item and creating a new one
export const softSwapRenderItem = createAction(
    types.SOFT_SWAP_RENDER_ITEM,
    ({ furnitureToSwapOut, productToSwapIn, trackingInfo }: SwapRenderItemArgs) => ({
        payload: {
            furnitureToSwapOut,
            productToSwapIn,
            linkedItemIds: [] as number[], // Filled in middleware
            compositionId: null as number | null, // Filled in middleware
            trackingInfo,
        },
    }),
)

export type UndoSwapArgs = {
    trackingInfo: TrackingHints
}

export const undoSwap = createAction(types.UNDO_SWAP, ({ trackingInfo }: UndoSwapArgs) => ({
    payload: {
        trackingInfo,
    },
}))

export const swapLinkedItems = createAction(
    types.SWAP_LINKED_ITEMS,
    (linkedItemIds: number[], productId: number, compositionId: number, uniqueIds: number[]) => ({
        payload: {
            linkedItemIds,
            productId,
            compositionId,
            uniqueIds,
        },
    }),
)

export const duplicateRenderItem = createAction(
    types.DUPLICATE_RENDER_ITEM,
    (targetRenderItemId: number, renderType: string, trackingInfo: TrackingInfo) => ({
        payload: {
            targetRenderItemId,
            renderType,
            trackingInfo,
        },
    }),
)

export const updateCompositionSaveData = createAction(
    types.UPDATE_COMPOSITION_SAVE_DATA,
    (compositionId: string, saveData: Partial<SavedProperties>, trackingInfo: TrackingInfo | null = null) => ({
        payload: {
            compositionId,
            saveData,
            trackingInfo,
        },
    }),
)

export const removeRenderItems = createAction(types.REMOVE_RENDER_ITEMS, (compositionId: string) => ({
    payload: {
        compositionId,
    },
}))

export const undoRemoveRenderItems = createAction(types.UNDO_REMOVE_RENDER_ITEMS, (compositionId: string) => ({
    payload: {
        compositionId,
    },
}))

export const scheduleDelayedScreenshot = createAction(types.SCHEDULE_DELAYED_SCREENSHOT)

export const delayedScreenshotScsheduled = createAction(types.DELAYED_SCREENSHOT_SCHEDULED, (timeoutId: number) => ({
    payload: {
        timeoutId,
    },
}))

export const delayedScreenshotSent = createAction(types.DELAYED_SCREENSHOT_SENT)

export const firstRenderItemScreenshotDone = createAction(types.FIRST_RENDER_ITEM_SCREENSHOT_DONE)

export const setWallColor = createAction(
    types.SET_WALL_COLOR,
    (
        compositionId: string,
        planeIndex: number,
        planeIndexInpaint: number,
        colorString: string | null,
        trackingInfo: TrackingInfo = {},
    ) => ({
        payload: {
            compositionId,
            planeIndex,
            planeIndexInpaint,
            colorString,
            trackingInfo,
        },
    }),
)

export const resetCompositionToLatestSavedState = createAction(
    types.RESET_COMPOSITION_LATEST_SAVED_STATE,
    (compositionId: string) => ({ payload: { compositionId } }),
)

export const setSmartaTimeout = createAction(types.SET_SMARTA_TIMEOUT, (timeout: number) => ({ payload: { timeout } }))

export const setSmartaURL = createAction(types.SET_SMARTA_URL, (url: string) => ({ payload: { url } }))

export const setForceSmartaOff = createAction(types.SET_FORCE_SMARTA_OFF, (forceSmartaOff: boolean) => ({
    payload: { forceSmartaOff },
}))

export const setSmartaRuleset = createAction(types.SET_SMARTA_RULESET, (ruleset: string) => ({
    payload: { ruleset },
}))

export const updateRenderItemsHeadingFrom2dTo3d = createAction(
    types.UPDATE_RENDER_ITEMS_HEADING_FROM_2D_TO_3D,
    (compositionSaveData: CompositionSaveData, compositionId: string) => ({
        payload: {
            compositionSaveData,
            compositionId,
        },
    }),
)

export const saveUpptackaComposition =
    (trackingInfo: CompositionSaveTrackingInfo = { SavedFrom: TRACK_LOCATION_NOT_SET }) =>
    async (dispatch: AppDispatch, getState: () => RootState) => {
        const state = getState()
        const isModified = getIsModified(state)
        if (!isModified) return
        const compositionData = getSelectedCompositionData(state)
        const compositionSaveData = getSelectedCompositionSaveData(state)
        const selectedCompositionId = getSelectedCompositionId(state)
        const hasActiveNewCompositionSave = !!getNewCompositionSaveTransition(state)

        if (
            hasActiveNewCompositionSave &&
            (selectedCompositionId === NEW_COMPOSITION_ID || compositionSaveData.compositionId === NEW_COMPOSITION_ID)
        ) {
            return
        }

        detectCompositionSaveAnomaly(compositionData, compositionSaveData.placedFurniture.length)

        // Detect double-save within short time window
        trackDoubleSave(compositionData.id)

        // Track final payload placement count before save
        trackPreSavePayload(
            compositionData.id,
            compositionSaveData.placedFurniture.length,
            Object.keys(compositionData.renderItems).length,
        )

        // WEBFS-902: same defense-in-depth as saveSelectedComposition — never let the
        // server receive a destructive empty placedFurniture write.
        if (
            detectEmptyPlacementSaveAnomaly(
                compositionData,
                compositionSaveData.placedFurniture.length,
                undefined,
                trackingInfo,
            )
        ) {
            dispatch(failedSaveComposition(new Error('SaveAborted.EmptyPlacement'), compositionData, trackingInfo))
            return
        }

        dispatch(requestSaveComposition(compositionSaveData, trackingInfo))
        try {
            const nextSceneId = compositionSaveData.sceneId
            const isNewScene = compositionSaveData.sceneId === NEW_SCENE_ID
            const baseImageData = await createThumbnail('saveSelectedComposition action')
            const saveData = {
                ...compositionSaveData,
                sceneId: nextSceneId,
                name: compositionSaveData.name?.slice(0, MAX_COMPOSITION_NAME_LENGTH),
                baseImageData: baseImageData.thumbDataUrl,
                isShared: true,
                enableRemix: true,
            }
            const { data } = await compositionsApi.createComposition(saveData)
            dispatch(upptackaActions.setLastSavedUpptackaComposition(data.uuid))
            dispatch(receiveSaveComposition(data, false, isNewScene, compositionData.id, trackingInfo))
        } catch (error) {
            dispatch(failedSaveComposition(error, compositionData, trackingInfo))
            Sentry.captureException(error)
        }
    }

export const transferGuestCompositionOwnership = createAction(
    types.TRANSFER_GUEST_COMPOSITION_OWNERSHIP,
    (compositionId: string, wid: number) => ({ payload: { compositionId, wid } }),
)

export const resetPlaceProduct = createAction(types.RESET_PLACE_PRODUCT)
