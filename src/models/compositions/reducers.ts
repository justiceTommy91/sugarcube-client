import { type Action, combineReducers, createReducer, isAnyOf } from '@reduxjs/toolkit'

import { isVectorValid } from 'utils/vector'
import { makeByIdStateFromApiComposition, makeCompositionFromApiComposition } from 'models/compositions/utils'

import { failedReceivePlaceProduct, receivePlaceProduct, selectFurniture } from 'models/furniture/actions'
import { PLACED_PRODUCT_INVALID_ID, NEW_COMPOSITION_ID } from 'models/compositions/constants'
import type { CompositionDataItem, RenderItem } from 'models/compositions'
import {
    failedReceiveCompositions,
    receiveCompiledComposition,
    receiveCompositions,
    failedReceiveCompiledComposition,
    requestSaveComposition,
    receiveSaveComposition,
    receiveGuestSaveComposition,
    failedGuestSaveComposition,
    failedSaveComposition,
    startNewCompositionSaveTransition,
    recordNewCompositionSaveTarget,
    deferNewCompositionSaveRename,
    startDragRenderItem,
    stopDragRenderItem,
    receiveSaveExpertCheckConsent,
    receiveSaveCompositionSharing,
    failedSaveExpertCheckConsent,
    failedSaveCompositionSharing,
    requestSaveCompositionSharing,
    placeRenderItem,
    swapRenderItem,
    softSwapRenderItem,
    deleteCompositionRenderItem,
    enableMirrorOption,
    updateCompositionRenderItem,
    renderItemLoaded,
    clearSwapAffinity,
    renameComposition,
    requestDeleteComposition,
    selectComposition,
    updateCompositionSaveData,
    removeRenderItems,
    undoRemoveRenderItems,
    setWallColor,
    updateHiddenSurfaces,
    selectCompositionRenderItem,
    duplicateRenderItem,
    fetchCompositions,
    setCompositionPreFetchLoading,
    requestCompiledComposition,
    resetCompositionToLatestSavedState,
    setSmartaTimeout,
    setSmartaURL,
    setForceSmartaOff,
    setSmartaRuleset,
    receiveCopyComposition,
    updateRenderItemsHeadingFrom2dTo3d,
    swapLinkedItems,
    requestSaveExpertCheckConsent,
    resetPlaceProduct,
    placeMultipleRenderItemsLoading,
    transferGuestCompositionOwnership,
    openComposition,
} from 'models/compositions/actions'
import { loadCompositionFromLocalStorage, saveSelectedCompositionToLocalStorage } from 'models/localStorage/actions'
import {
    recordPlacementClobber,
    trackApiResponsePlacement,
    trackReduxStatePlacement,
} from 'models/compositions/saveAnomalyTelemetry'
import { selectScene } from 'models/scenes/actions'
import { openDesignSidepanel } from 'models/ui/actions'
import { setInitialLoading, updateAllPins, viewLoaded, viewSelected } from 'models/preview/actions'
import * as types from 'models/actionTypes'
import { hoverRenderItemIdSlice } from './slices'

type CompositionsState = {
    byId: Record<string, CompositionDataItem | undefined>
    draggingRenderItemId: number
    isSaving: boolean
    hasSaveError: boolean
    isSavingSharing: boolean
    hasSavingShareError: boolean
    isSavingExpertCheckConsent: boolean
    hasSavingExpertCheckConsentError: boolean
    isCompositionDataLoaded: boolean
    placeProductId: string | null
    selectedId: string
    selectedRenderItemId: number
    nextRenderItemId: number
    // TODO: isModified should be per-composition, ideally
    isModified: boolean
    isLoadingCompositions: boolean
    isLoadingCompiledCompositions: boolean
    swappingSurfaces: boolean
    userDidAddRenderItem: boolean
    hasBeenSaved: boolean
    selectedView: string
    smartaTimeout: number
    selectedCameraInfo: object | null
    smartaURL: string | null
    forceSmartaOff: boolean
    smartaRuleset: string | null
    isLoadingCombinables: boolean
    isLoadingMultipleRenderItems: boolean
    newCompositionSaveTransition: NewCompositionSaveTransition
}

/** Tracks the unsafe lifecycle while a new composition moves from the -1 placeholder to its actual id. */
export type NewCompositionSaveTransition = {
    originId: string
    targetId?: string
    pendingRenameName?: string
} | null

export const defaultComposition: CompositionDataItem = {
    id: NEW_COMPOSITION_ID,
    wid: -1,
    renderItems: {},
    sceneId: '',
    name: '',
    thumbUrl: '',
    uuid: '', // TODO remove this field
    isShared: false,
    isStock: false,
    geoProperties: {},
    savedProperties: {},
    wallPaint: {},
    wallPaintInpaint: {},
    hiddenSurfaces: [],
    shareUrl: '',
    adminUrl: '',
    creationDate: '',
    lastModifiedDate: '',
    enableRemix: false,
    publicCompositionImageUrl: '',
    sendNotifications: false,
    deletedRenderItems: undefined,
}

const initialState: CompositionsState = {
    byId: {
        [NEW_COMPOSITION_ID]: defaultComposition,
    },
    draggingRenderItemId: -1,
    isSaving: false,
    hasSaveError: false,
    isSavingSharing: false,
    isSavingExpertCheckConsent: false,
    hasSavingShareError: false,
    hasSavingExpertCheckConsentError: false,
    isCompositionDataLoaded: false,
    placeProductId: null,
    selectedId: NEW_COMPOSITION_ID,
    selectedRenderItemId: -1,
    nextRenderItemId: Date.now(),
    isModified: false,
    isLoadingCompositions: false,
    isLoadingCompiledCompositions: false,
    swappingSurfaces: false,
    userDidAddRenderItem: false,
    hasBeenSaved: false,
    selectedView: 'mainView',
    smartaTimeout: 500,
    selectedCameraInfo: null,
    smartaURL: null,
    forceSmartaOff: false,
    smartaRuleset: null,
    isLoadingCombinables: false,
    isLoadingMultipleRenderItems: false,
    newCompositionSaveTransition: null,
}

// When creating new render items in the store
// these are the properties that are unsaved
// and must be initialized from scratch.
// Use for loading/placing/swapping/duplicating/etc
const resetableProps = {
    metrics: null,
    readyAndRendered: false,
}

// Reducers exported for tests

export const byId = createReducer(initialState.byId, (builder) => {
    builder
        .addCase(receiveCompositions, (state, action) =>
            Object.assign(
                {},
                ...action.payload.compositions.map((comp) => makeByIdStateFromApiComposition(comp)),
                state,
            ),
        )
        .addCase(loadCompositionFromLocalStorage, (state, action) => {
            const { composition } = action.payload
            if (!composition) {
                return
            }

            // The utility function overwrites the name (if the composition is isStock)
            // and originalCompositionData
            const compFromLocalStorage = makeCompositionFromApiComposition(composition)

            // Reset the name and originalCompositionData to what it was in the localStorage
            const compositionStoredToState = {
                ...compFromLocalStorage,
                name: composition?.name || '',
                originalCompositionData: { ...composition.originalCompositionData },
            }

            recordPlacementClobber(
                'loadCompositionFromLocalStorage',
                compositionStoredToState.uuid,
                state[compositionStoredToState.uuid]?.renderItems,
            )

            // Local storage can overwrite state
            state[compositionStoredToState.uuid] = compositionStoredToState

            // Track Redux state after localStorage overwrite
            trackReduxStatePlacement(
                'loadCompositionFromLocalStorage',
                compositionStoredToState.uuid,
                compositionStoredToState.renderItems,
            )
        })

        .addCase(receiveSaveComposition, (state, action) => {
            const { isNew, isNewScene, composition, originId } = action.payload

            const newComposition = makeCompositionFromApiComposition(composition)

            // Track placement counts from API response
            trackApiResponsePlacement(newComposition.id, newComposition.renderItems)

            if (isNew) {
                if (isNewScene) {
                    recordPlacementClobber(
                        'receiveSaveComposition.isNewScene',
                        newComposition.id,
                        state[originId]?.renderItems,
                    )
                }

                state[newComposition.id] = newComposition

                // If we have a new scene, the viewer will reload. In this case we do not
                // want to preserve runtime-format renderItems
                if (!isNewScene) {
                    const originalRenderItems = state[originId]?.renderItems
                    // Due to the current transitional state between 2d and 3d, copy 2D items into newComposition. This way <originalCompositionData>
                    // gets the saved version (3d) in case user clicks back in, while we preserve the "2d" currently in use.
                    if (originalRenderItems) {
                        newComposition.renderItems = originalRenderItems
                    }
                }

                // Track Redux state after update for isNew path
                trackReduxStatePlacement(
                    'receiveSaveComposition.isNew',
                    newComposition.id,
                    state[newComposition.id]?.renderItems,
                )

                // The just-saved composition now lives under its real id. Reset the
                // NEW_COMPOSITION_ID sentinel slot so the next "new room" flow starts
                // clean instead of inheriting the prior room's renderItems and name.
                if (originId === NEW_COMPOSITION_ID && newComposition.id !== NEW_COMPOSITION_ID) {
                    state[NEW_COMPOSITION_ID] = defaultComposition
                }
            } else {
                const currentComposition = state[originId]
                if (currentComposition) {
                    // Update changed fields
                    currentComposition.thumbUrl = composition.thumbnailUrl
                    currentComposition.isGLTF = !!composition.gltf?.nodes
                    currentComposition.lastModifiedDate = composition.lastModifiedTs

                    // Overwrite with new saved data
                    currentComposition.originalCompositionData = newComposition
                }
            }
        })
        .addCase(receiveGuestSaveComposition, (state, action) => {
            const { isNewScene, composition, originId } = action.payload

            const newComposition = makeCompositionFromApiComposition(composition)

            // Separate from receiveSaveComposition: the guest flow is a silent background save so
            // isModified intentionally stays true to prompt the user to log in. Live renderItems must
            // be preserved — the API response cannot reproduce viewer-assigned placement data (set via ItemPlacement events).
            if (!isNewScene) {
                newComposition.renderItems = state[originId]?.renderItems ?? newComposition.renderItems
            }

            state[newComposition.id] = newComposition
        })
        .addCase(receiveSaveCompositionSharing, (state, action) => {
            const { composition } = action.payload
            const currentComposition = state[composition.uuid]

            if (currentComposition) {
                currentComposition.isShared = composition.isShared
                currentComposition.enableRemix = composition.enableRemix
                currentComposition.sendNotifications = composition.sendNotifications
                currentComposition.shareUrl = composition.shareUrl
            }
        })
        .addCase(updateRenderItemsHeadingFrom2dTo3d, (state, action) => {
            const { compositionSaveData, compositionId } = action.payload
            const currentComposition = state[compositionId]
            if (currentComposition?.isGLTF) {
                compositionSaveData.placedFurniture.forEach((savedFurnitureItem) => {
                    currentComposition.renderItems[savedFurnitureItem.uniqueId].heading = savedFurnitureItem.heading
                })
            }
        })

    builder
        .addCase(placeRenderItem, (state, action) => {
            const { compositionId, id, uniqueId, x0, y0, settings, parentId, p3x0, p3y0, p3z0, smartaPlacement } =
                action.payload

            if (!uniqueId) {
                return
            }

            const newRenderItem: RenderItem = {
                id,
                uniqueId,
                x: x0,
                y: y0,
                mirrorOptionEnabled: false,
                corners: [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                ],
                pin: {
                    x: 0,
                    y: 0,
                    hidePin: true,
                    itemIsHidden: false,
                },
                ...settings,
                smartaPlacement,
                ...resetableProps,
            }

            // RenderItems in the store should have parentId and p3 values only if the
            // given action specifically requested 3D positioning.

            if (Number.isFinite(parentId) && parentId) {
                newRenderItem.parentId = parentId
            }

            if (isVectorValid(p3x0, p3y0, p3z0) && p3x0 && p3y0 && p3z0) {
                newRenderItem.p3 = {
                    x: p3x0,
                    y: p3y0,
                    z: p3z0,
                }
            }

            const currentComposition = state[compositionId]
            if (currentComposition) {
                currentComposition.renderItems[uniqueId] = newRenderItem
            }
        })
        .addCase(swapRenderItem, (state, action) => {
            const {
                compositionId,
                furnitureToSwapOut,
                furnitureToSwapIn,
                productToSwapIn,
                anchorCombinationIndex,
                placingBehavior,
            } = action.payload

            if (!compositionId || !furnitureToSwapIn) {
                return
            }

            const renderItems = state[compositionId]?.renderItems
            if (!renderItems) {
                return
            }

            const targetRenderItem = renderItems[furnitureToSwapOut]
            delete renderItems[furnitureToSwapOut]

            const swappedInRenderItem: RenderItem = {
                ...targetRenderItem,
                uniqueId: furnitureToSwapIn,
                id: productToSwapIn,
                anchorCombinationIndex,
                swappedOutPlacingBehavior: targetRenderItem.placingBehavior,
                ...resetableProps,
            }
            delete swappedInRenderItem.smartaPlacement

            if (placingBehavior) {
                swappedInRenderItem.placingBehavior = placingBehavior
            }

            if (targetRenderItem.swapChainPosition) {
                swappedInRenderItem.x = targetRenderItem.swapChainPosition[0]
                swappedInRenderItem.y = targetRenderItem.swapChainPosition[1]

                swappedInRenderItem.swapChainPosition = [...targetRenderItem.swapChainPosition]
            } else {
                const { x, y } = targetRenderItem
                if (x !== null && y !== null) {
                    swappedInRenderItem.swapChainPosition = [x, y]
                } else {
                    swappedInRenderItem.swapChainPosition = undefined
                }
            }

            renderItems[furnitureToSwapIn] = swappedInRenderItem
        })
        .addCase(softSwapRenderItem, (state, action) => {
            const { compositionId, linkedItemIds, productToSwapIn } = action.payload

            if (!compositionId) {
                return
            }

            const renderItems = state[compositionId]?.renderItems
            if (!renderItems) {
                return
            }

            linkedItemIds.forEach((itemId) => {
                renderItems[itemId].id = productToSwapIn
            })
        })
        .addCase(swapLinkedItems, (state, action) => {
            const { compositionId, productId, linkedItemIds, uniqueIds } = action.payload

            if (!compositionId || !linkedItemIds || !uniqueIds || linkedItemIds.length !== uniqueIds.length) {
                return
            }

            const renderItems = state[compositionId]?.renderItems

            if (!renderItems) {
                return
            }

            linkedItemIds.forEach((itemId, index) => {
                const targetRenderItem = renderItems[itemId]
                const newUniqueId = uniqueIds[index]

                if (!targetRenderItem || !newUniqueId) {
                    return // Skip this item if we don't have a valid target or new ID
                }

                delete renderItems[itemId]

                const swappedInRenderItem = {
                    ...targetRenderItem,
                    uniqueId: newUniqueId, // Assign the new unique ID here
                    id: productId,
                    swappedOutPlacingBehavior: targetRenderItem.placingBehavior,
                    ...resetableProps,
                }

                // Handle swap chain position
                if (targetRenderItem.swapChainPosition) {
                    swappedInRenderItem.x = targetRenderItem.swapChainPosition[0]
                    swappedInRenderItem.y = targetRenderItem.swapChainPosition[1]
                    swappedInRenderItem.swapChainPosition = [...targetRenderItem.swapChainPosition]
                } else {
                    const { x, y } = targetRenderItem
                    swappedInRenderItem.swapChainPosition = x !== null && y !== null ? [x, y] : undefined
                }

                renderItems[newUniqueId] = swappedInRenderItem // Use the new unique ID as the key
            })
        })
        .addCase(deleteCompositionRenderItem, (state, action) => {
            const { id: deletedId, compositionId } = action.payload
            const renderItems = state[compositionId]?.renderItems

            if (!renderItems) {
                return
            }

            delete renderItems[deletedId]

            // Process for stacked children
            Object.values(renderItems).forEach((renderItem) => {
                // If item stacks, check if stackedPlane begins with deletedId
                if (renderItem.stackedPlane && renderItem.stackedPlane.indexOf(String(deletedId)) === 0) {
                    // Delete "children" stacked on deleted render item
                    delete renderItems[renderItem.uniqueId]
                }
            })
        })
        .addCase(removeRenderItems, (state, action) => {
            const { compositionId } = action.payload
            const composition = state[compositionId]
            if (composition) {
                composition.deletedRenderItems = composition.renderItems // To be used later for undo delete
                composition.renderItems = {}
            }
        })
        .addCase(undoRemoveRenderItems, (state, action) => {
            const { compositionId } = action.payload
            const composition = state[compositionId]
            if (composition) {
                composition.renderItems = composition.deletedRenderItems || {}
            }
        })
    builder.addCase(enableMirrorOption, (state, action) => {
        const { uniqueId, compositionId, shouldEnable } = action.payload
        const targetItem = state[compositionId]?.renderItems[uniqueId]

        if (targetItem) {
            targetItem.mirrorOptionEnabled = shouldEnable
        }
    })
    builder.addCase(clearSwapAffinity, (state, action) => {
        const { compositionId, id } = action.payload
        const composition = state[compositionId]

        if (!composition) {
            return
        }

        delete composition.renderItems[id].swapChainPosition

        Object.values(composition.renderItems)
            .filter((item) => item.stackedPlane && item.stackedPlane.startsWith(String(id)))
            .map((item) => item.uniqueId)
            .forEach((itemId) => {
                delete composition.renderItems[itemId].swapChainPosition
            })
    })
    builder
        .addCase(renameComposition, (state, action) => {
            const { id, name, preserveOriginalName } = action.payload

            const composition = state[id]

            if (composition) {
                composition.name = name

                if (!preserveOriginalName && composition.originalCompositionData) {
                    composition.originalCompositionData.name = name
                }
            }
        })
        .addCase(requestDeleteComposition, (state, action) => {
            delete state[action.payload.id]
        })
    builder
        .addCase(updateCompositionSaveData, (state, action) => {
            const { compositionId, saveData } = action.payload
            const composition = state[compositionId]
            if (composition) {
                composition.savedProperties = {
                    ...composition.savedProperties,
                    ...saveData,
                }
            }
        })
        .addCase(setWallColor, (state, action) => {
            const { compositionId, colorString, planeIndex, planeIndexInpaint } = action.payload

            const composition = state[compositionId]

            if (!composition) {
                return
            }

            const wallPaint = composition.wallPaint
            const wallPaintInpaint = composition.wallPaintInpaint

            if (colorString) {
                wallPaint[planeIndex] = colorString
                wallPaintInpaint[planeIndexInpaint] = colorString
            } else {
                delete wallPaint[planeIndex]
                delete wallPaintInpaint[planeIndexInpaint]
            }
        })
        .addCase(updateHiddenSurfaces, (state, action) => {
            const { compositionId, surfaces } = action.payload
            const composition = state[compositionId]
            if (composition) {
                composition.hiddenSurfaces = surfaces
            }
        })
    builder.addCase(updateAllPins, (state, action) => {
        // TODO: Move everything to do with pins to a slice
        // under the preview model
        Object.values(state).forEach((comp) => {
            if (comp) {
                Object.values(comp.renderItems).forEach((item) => {
                    if (item.pin) {
                        // eslint-disable-next-line no-param-reassign
                        item.pin = {
                            ...item.pin,
                            ...action.payload,
                        }
                    }
                })
            }
        })
    })

    builder
        .addCase(renderItemLoaded, (state, action) => {
            // Reset the isAddedFromDuplicate property on finishing item loading.
            const { compositionId, id: renderItemUniqueId } = action.payload
            const renderItems = state[compositionId]?.renderItems
            if (renderItems?.[renderItemUniqueId]?.isAddedFromDuplicate) {
                delete renderItems[renderItemUniqueId].isAddedFromDuplicate
            }
        })
        .addCase(resetCompositionToLatestSavedState, (state, action) => {
            // Reset composition back to what we got from the server
            const { compositionId } = action.payload

            if (compositionId === NEW_COMPOSITION_ID) {
                state[NEW_COMPOSITION_ID] = defaultComposition
                return
            }

            const originalCompositionData = state[compositionId]?.originalCompositionData

            if (!originalCompositionData) {
                return
            }

            const nextComposition = {
                ...originalCompositionData,
                originalCompositionData,
            }

            recordPlacementClobber(
                'resetCompositionToLatestSavedState',
                compositionId,
                state[compositionId]?.renderItems,
            )

            state[compositionId] = nextComposition

            // Track Redux state after reset to saved state
            trackReduxStatePlacement('resetCompositionToLatestSavedState', compositionId, nextComposition.renderItems)
        })
        .addCase(transferGuestCompositionOwnership, (state, action) => {
            const { compositionId, wid } = action.payload
            const comp = state[compositionId]
            if (comp) {
                comp.wid = wid
            }
        })
        .addMatcher(isAnyOf(updateCompositionRenderItem, renderItemLoaded), (state, action) => {
            const { compositionId, id: renderItemUniqueId, item } = action.payload
            const renderItems = state[compositionId]?.renderItems

            const renderItem = renderItems?.[renderItemUniqueId]

            if (!renderItems || !renderItem) {
                return
            }

            const itemCopy = { ...item }

            if (itemCopy.p3) {
                itemCopy.p3 = { ...itemCopy.p3 }
            }
            renderItems[renderItemUniqueId] = {
                ...renderItem,
                ...itemCopy,
            }
        })
        .addMatcher(isAnyOf(receiveCompiledComposition), (state, action) => {
            const incoming = makeByIdStateFromApiComposition(
                action.payload.composition,
                undefined,
                action.payload.furniture,
            )

            // Track placement counts from compiled API response
            const compositionId = action.payload.composition.uuid
            const incomingComp = incoming[compositionId]
            if (incomingComp) {
                trackApiResponsePlacement(compositionId, incomingComp.renderItems)
            }

            const merged = {
                ...incoming,
                ...state,
            }

            // Track Redux state after merge
            if (incomingComp) {
                trackReduxStatePlacement(
                    'receiveCompiledComposition',
                    compositionId,
                    merged[compositionId]?.renderItems,
                )
            }

            return merged
        })
        .addMatcher(isAnyOf(receiveCopyComposition), (state, action) => ({
            ...makeByIdStateFromApiComposition(action.payload.composition),
            ...state, // Don't allow incoming comps to overwrite state
        }))
})

export const draggingRenderItemId = createReducer(initialState.draggingRenderItemId, (builder) => {
    builder.addCase(startDragRenderItem, (_, action) => action.payload.uniqueId)
    builder.addCase(stopDragRenderItem, () => -1)
})

export const isSaving = createReducer(initialState.isSaving, (builder) => {
    builder
        .addCase(requestSaveComposition, () => true)
        .addMatcher(
            isAnyOf(
                receiveSaveComposition,
                receiveGuestSaveComposition,
                failedSaveComposition,
                failedGuestSaveComposition,
                receiveCopyComposition,
            ),
            () => false,
        )
})

export const hasBeenSaved = createReducer(initialState.hasBeenSaved, (builder) => {
    builder
        .addCase(receiveSaveComposition, () => true)
        .addCase(receiveGuestSaveComposition, () => true)
        .addMatcher(
            isAnyOf(failedSaveComposition, failedSaveCompositionSharing, failedSaveExpertCheckConsent),
            () => false,
        )
})
export const hasSaveError = createReducer(initialState.hasSaveError, (builder) => {
    builder
        .addMatcher(isAnyOf(failedSaveComposition), () => true)
        .addMatcher(
            isAnyOf(
                requestSaveComposition,
                receiveSaveComposition,
                receiveGuestSaveComposition,
                receiveCopyComposition,
            ),
            () => false,
        )
})

export const newCompositionSaveTransition = createReducer(initialState.newCompositionSaveTransition, (builder) => {
    builder
        .addCase(startNewCompositionSaveTransition, (_, action) => ({ originId: action.payload.originId }))
        .addCase(recordNewCompositionSaveTarget, (state, action) => {
            if (!state) {
                return state
            }

            state.targetId = action.payload.targetId
            return state
        })
        .addCase(deferNewCompositionSaveRename, (state, action) => {
            if (!state) {
                return state
            }

            state.pendingRenameName = action.payload.pendingRenameName
            return state
        })
        .addCase(selectComposition, (state, action) => {
            if (state?.targetId === action.payload.compositionId) {
                return null
            }

            return state
        })
        // If navigation after a fresh save never completes (e.g. back-button, network failure),
        // the transition stays active indefinitely. Opening a new composition means the previous
        // transition is stale — clear it so saves aren't silently blocked.
        .addCase(openComposition, (state, action) => {
            if (action.payload.compositionId === NEW_COMPOSITION_ID) {
                return null
            }

            return state
        })
        .addCase(failedSaveComposition, () => null)
})

export const isSavingSharing = createReducer(initialState.isSavingSharing, (builder) => {
    builder
        .addCase(requestSaveCompositionSharing, () => true)
        .addMatcher(isAnyOf(receiveSaveCompositionSharing, failedSaveCompositionSharing), () => false)
})

export const hasSavingShareError = createReducer(initialState.hasSavingShareError, (builder) => {
    builder
        .addCase(failedSaveCompositionSharing, () => true)
        .addMatcher(isAnyOf(requestSaveCompositionSharing, receiveSaveCompositionSharing), () => false)
})

export const isSavingExpertCheckConsent = createReducer(initialState.isSavingExpertCheckConsent, (builder) => {
    builder
        .addCase(requestSaveExpertCheckConsent, () => true)
        .addMatcher(isAnyOf(receiveSaveExpertCheckConsent, failedSaveExpertCheckConsent), () => false)
})

export const hasSavingExpertCheckConsentError = createReducer(
    initialState.hasSavingExpertCheckConsentError,
    (builder) => {
        builder
            .addCase(failedSaveExpertCheckConsent, () => true)
            .addMatcher(isAnyOf(requestSaveExpertCheckConsent, receiveSaveExpertCheckConsent), () => false)
    },
)

export const isCompositionDataLoaded = createReducer(initialState.isCompositionDataLoaded, (builder) => {
    builder.addMatcher(
        isAnyOf(
            receiveCompositions,
            failedReceiveCompositions,
            receiveCompiledComposition,
            failedReceiveCompiledComposition,
        ),
        () => true,
    )
})

export const placeProductId = createReducer(initialState.placeProductId, (builder) => {
    builder
        .addCase(receivePlaceProduct, (_, action) => action.payload.product.id)
        .addCase(failedReceivePlaceProduct, () => PLACED_PRODUCT_INVALID_ID)
        .addCase(resetPlaceProduct, () => null)
})

export const selectedId = createReducer(initialState.selectedId, (builder) => {
    builder
        .addCase(selectComposition, (_, action) => action.payload.compositionId)
        .addCase(selectScene, () => NEW_COMPOSITION_ID)
        .addCase(receiveGuestSaveComposition, (_, action) => action.payload.composition.uuid)
})

export const selectedRenderItemId = createReducer(initialState.selectedRenderItemId, (builder) => {
    builder
        .addCase(swapRenderItem, (_, action) => action.payload.furnitureToSwapIn || -1)
        .addCase(selectCompositionRenderItem, (_, action) => action.payload.renderItemId)
        .addCase(openDesignSidepanel, (state, action) => action.payload.renderItemId || state)
        .addCase(deleteCompositionRenderItem, () => -1)
})

export const nextRenderItemId = createReducer(initialState.nextRenderItemId, (builder) => {
    builder
        .addCase(swapLinkedItems, (state, action) => state + action.payload.uniqueIds.length)
        .addMatcher(
            isAnyOf(setInitialLoading, selectFurniture, placeRenderItem, swapRenderItem, duplicateRenderItem),
            (state) => state + 1,
        )
})

export const isModified = createReducer(initialState.isModified, (builder) => {
    builder
        .addCase(updateCompositionRenderItem, (currentState, action) => {
            if (action.payload.item.pin || Object.keys(action.payload.trackingInfo).length === 0) {
                // If it's an automatic update (not user handled) just keep the current state
                return currentState
            }
            return true
        })
        .addCase(updateCompositionSaveData, (currentState, action) => {
            if (action.payload.saveData.camera && !action.payload.trackingInfo) {
                // If it's only updating the camera view then it should not consider a modification in the composition
                // Just a stop-gap until we can move the isModified responsibility to the viewer
                return currentState
            }
            return true
        })
        // New compositions should behave like modified so user can save an empty room
        .addCase(setInitialLoading, (_, action) => action.payload.compositionId === NEW_COMPOSITION_ID)
        .addCase(deleteCompositionRenderItem, (_, action) => {
            const { compositionId, isLastItem } = action.payload
            // Empty default comp is not modified
            return !(compositionId === NEW_COMPOSITION_ID && isLastItem)
        })
        // Guest save is a silent background save — keep the composition marked as modified so the UI
        // continues to prompt the user to log in. Intentionally separate from the matcher below.
        .addCase(receiveGuestSaveComposition, () => true)
        .addMatcher(
            isAnyOf(placeRenderItem, renameComposition, swapRenderItem, softSwapRenderItem, setWallColor),
            () => true,
        )
        .addMatcher(
            isAnyOf(selectComposition, selectScene, receiveSaveComposition, saveSelectedCompositionToLocalStorage),
            () => false,
        )
})

export const isLoadingMultipleRenderItems = createReducer(initialState.isLoadingMultipleRenderItems, (builder) =>
    builder.addCase(placeMultipleRenderItemsLoading, (_, action) => {
        const { isPlacingMultiple } = action.payload
        return isPlacingMultiple
    }),
)

export const isLoadingCompositions = createReducer(initialState.isLoadingCompositions, (builder) => {
    builder
        .addCase(fetchCompositions, () => true)
        .addMatcher(isAnyOf(receiveCompositions, failedReceiveCompositions), () => false)
})

export const isLoadingCompiledComposition = createReducer(initialState.isLoadingCompiledCompositions, (builder) => {
    builder
        .addCase(requestCompiledComposition, () => true)
        .addCase(setCompositionPreFetchLoading, (_, action) => action.payload.isLoading)
        .addMatcher(isAnyOf(receiveCompiledComposition, failedReceiveCompiledComposition), () => false)
})

export const userDidAddRenderItem = createReducer(initialState.userDidAddRenderItem, (builder) => {
    builder.addCase(setInitialLoading, () => false)
    builder.addCase(placeRenderItem, () => true)
})

export const selectedView = createReducer(initialState.selectedView, (builder) => {
    builder.addCase(viewSelected, (_, action) => action.payload.viewId)
})

export const smartaTimeout = createReducer(initialState.smartaTimeout, (builder) => {
    builder.addCase(setSmartaTimeout, (_, action) => action.payload.timeout)
})

export const selectedCameraInfo = createReducer(initialState.selectedView, (builder) => {
    builder.addCase(viewLoaded, (_, action) => action.payload.cameraInfo)
})

export const smartaURL = createReducer(initialState.smartaURL, (builder) => {
    builder.addCase(setSmartaURL, (_, action) => action.payload.url)
})

export const forceSmartaOff = createReducer(initialState.forceSmartaOff, (builder) => {
    builder.addCase(setForceSmartaOff, (_, action) => action.payload.forceSmartaOff)
})

export const smartaRuleset = createReducer(initialState.smartaRuleset, (builder) => {
    builder.addCase(setSmartaRuleset, (_, action) => action.payload.ruleset)
})

const isLoadingCombinables = (state = initialState.isLoadingCombinables, action: Action) => {
    switch (action.type) {
        case types.REQUEST_FURNITURE_COMBINABLES_SAGA:
            return true
        case types.RECEIVE_FURNITURE_COMBINABLES:
        case types.FAILED_RECEIVE_FURNITURE_COMBINABLES:
            return false
        default:
            return state
    }
}

const combinedReducer = combineReducers({
    byId,
    draggingRenderItemId,
    isSaving,
    hasBeenSaved,
    hasSaveError,
    newCompositionSaveTransition,
    isSavingSharing,
    hasSavingShareError,
    isSavingExpertCheckConsent,
    hasSavingExpertCheckConsentError,
    isCompositionDataLoaded,
    placeProductId,
    selectedId,
    selectedRenderItemId,
    nextRenderItemId,
    isModified,
    isLoadingCompositions,
    isLoadingCompiledComposition,
    userDidAddRenderItem,
    hoverRenderItemId: hoverRenderItemIdSlice.reducer,
    selectedView,
    smartaTimeout,
    selectedCameraInfo,
    smartaURL,
    smartaRuleset,
    forceSmartaOff,
    isLoadingCombinables,
    isLoadingMultipleRenderItems,
})

type CompositionsReducerState = ReturnType<typeof combinedReducer>

export const reducer = (state: CompositionsReducerState | undefined, action: Action): CompositionsReducerState => {
    if (
        state?.newCompositionSaveTransition &&
        resetCompositionToLatestSavedState.match(action) &&
        action.payload.compositionId === NEW_COMPOSITION_ID
    ) {
        const newState = combinedReducer(state, action)

        return {
            ...newState,
            byId: {
                ...newState.byId,
                [NEW_COMPOSITION_ID]: state.byId[NEW_COMPOSITION_ID],
            },
        }
    }

    if (
        state?.newCompositionSaveTransition &&
        receiveSaveComposition.match(action) &&
        action.payload.originId === NEW_COMPOSITION_ID
    ) {
        const newState = combinedReducer(state, action)

        return {
            ...newState,
            byId: {
                ...newState.byId,
                [NEW_COMPOSITION_ID]: state.byId[NEW_COMPOSITION_ID],
            },
        }
    }

    return combinedReducer(state, action)
}
