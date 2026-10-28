import { GeomViewer, PlacingBehavior } from 'Renderer/geomviewer'
import * as Sentry from '@sentry/react'
import * as types from 'models/actionTypes'
import { FURNITURE_ITEM } from 'constants/renderItemTypes'
import { TRACKING_ADDED_FROM, SALES_DRESSING, TRACK_LOCATION_NOT_SET } from 'models/tracking/constants'
import { getSaveTracking } from 'models/tracking/selectors'
import {
    getNextRenderItemId,
    getSelectedCompositionProductData,
    getSelectedCompositionId,
    getSelectedRenderItem,
    getSelectedComposition,
    getSelectedCompositionData,
    getSelectedCompositionRenderedFurnitureItem,
    getSelectedRenderItemId,
    getCompositionsById,
    getSelectedCompositionSaveData,
    getSelectedFurnitureSwappableItemsData,
    getIsDraggingRenderItem,
} from 'models/compositions/selectors'
import { getDesignSidepanelMode } from 'models/ui/selectors'
import {
    placeRenderItem,
    selectComposition,
    clickPlaceRenderItem,
    renameComposition,
    saveSelectedComposition,
    deleteCompositionRenderItem,
    updateCompositionSaveData,
    clearSwapAffinity,
    swapLinkedItems,
    updateCompositionRenderItem,
    stopDragRenderItem,
} from 'models/compositions/actions'
import { setDesignSidepanelMode, showSwapMenuForId, closeDesignSidepanel } from 'models/ui/actions'
import { selectFurniture, clearFurnitureFilter, requestFurnitureGoesWith } from 'models/furniture/actions'
import { findSocketProductGeometry } from 'models/furniture/helpers'
import * as modes from 'models/ui/constants'
import isMobile from 'utils/isMobile'
import { isDesignPage } from 'utils/tracker'
import { getSaveOnFirstRender } from 'models/location/selectors'
import { getProductTrackingInfo } from 'models/tracking/utils'
import { isWallOrFloor } from 'utils/placeables'
import { getUserId } from 'models/user/selectors'
import { createMatrix4Elements } from 'Renderer/geometry/utilities'
import { getDecidedFlags } from 'models/experiments/selectors'
import { getFurnitureById } from 'models/furniture/selectors'
import { swapPlacingBehaviour } from 'utils/geomviewer_utils'
import { getIsPlacementMode, getIsStackableDraggingMode } from 'models/renderer/selectors'
import {
    placementModeFinished,
    stackableDraggingPositionValid,
    stackableDraggingModeEnded,
} from 'models/renderer/actions'
import { TRACK_RENAME_COMPOSITION } from './constants'

export const SNAP_ROTATION_COUNT = 2

/**
 * Resets cursor and dragging state to default.
 * Call this when transitioning between compositions or when cleaning up viewer state.
 */
const resetCursor = (store) => {
    const state = store.getState()
    const isPlacementMode = getIsPlacementMode(state)
    const isStackableDraggingMode = getIsStackableDraggingMode(state)
    const isDragging = getIsDraggingRenderItem(state)

    if (isPlacementMode) {
        GeomViewer.bindings?.doAction('exit-placement-mode')
        store.dispatch(placementModeFinished())
    }

    if (isStackableDraggingMode) {
        store.dispatch(stackableDraggingModeEnded())
    }

    if (isDragging) {
        store.dispatch(stopDragRenderItem())
    }

    store.dispatch(stackableDraggingPositionValid(true))
}

const compositionsMiddleware = (store) => (next) => (action) => {
    const state = store.getState()
    switch (action.type) {
        case types.SELECT_COMPOSITION: {
            const { newCompositionSaveTransition } = state.compositions ?? {}
            const shouldReplayPendingRename =
                newCompositionSaveTransition?.targetId === action.payload.compositionId &&
                newCompositionSaveTransition.pendingRenameName
            const nextState = next(action)

            if (shouldReplayPendingRename) {
                // Rename commits during the new-composition save transition are queued because
                // saving while selected on -1 can run against placement-stripped sentinel state.
                // Replay once the persisted target id is selected, after reducers clear the transition.
                store.dispatch(
                    renameComposition({
                        id: action.payload.compositionId,
                        name: newCompositionSaveTransition.pendingRenameName,
                        trackingInfo: { SavedFrom: TRACK_LOCATION_NOT_SET, SaveType: TRACK_RENAME_COMPOSITION },
                        fullSave: true,
                    }),
                )
            }

            return nextState
        }

        case types.SELECT_COMPOSITION_RENDER_ITEM: {
            const productData = getSelectedCompositionProductData(state)
            const productId = Object.values(productData).find(
                (product) => product.uniqueId === action.payload.renderItemId,
            )?.id
            return next({
                ...action,
                payload: {
                    ...action.payload,
                    productId,
                },
            })
        }

        case types.PLACE_RENDER_ITEM: {
            const uniqueId = action.payload.settings.uniqueId || getNextRenderItemId(state)
            return next({
                ...action,
                payload: {
                    ...action.payload,
                    uniqueId,
                },
            })
        }

        case types.OPEN_COMPOSITION: {
            // Reset viewer state when entering a new composition
            resetCursor(store)

            const mode = getDesignSidepanelMode(state)
            const isShowingCatalog =
                mode === modes.DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE ||
                mode === modes.DESIGN_SIDEPANEL_MODE_PRODUCT_DETAILS

            // Redirect to product browse if the user was previously on my items
            const isShowingMyItems =
                mode === modes.DESIGN_SIDEPANEL_MODE_MYITEMS_BROWSE ||
                mode === modes.DESIGN_SIDEPANEL_MODE_MYITEMS_DETAILS
            const isShowingSwap =
                mode === modes.DESIGN_SIDEPANEL_MODE_SWAP_BROWSE || modes.DESIGN_SIDEPANEL_MODE_SWAP_DETAILS

            // When entering a new composition from outside the design page, clear out the furniture filter.
            // If we're already on the design page (e.g. after saving a fresh composition and the URL
            // updates from id=-1 to the real UUID), skip the clear to avoid resetting search results
            // into an empty state that can't recover (the furniture request gets blocked when
            // RoomTypesAndCategories is enabled but subCategoryIds have been wiped).
            const isAlreadyOnDesignPage = isDesignPage()
            if (isShowingCatalog && !isAlreadyOnDesignPage) {
                store.dispatch(clearFurnitureFilter())
            }
            // Hide the swap menu on opening a composition if it was previously open
            if (isShowingSwap) {
                store.dispatch(showSwapMenuForId(false))
            }
            if (isShowingMyItems || isShowingSwap) {
                store.dispatch(setDesignSidepanelMode(modes.DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE))
            }
            store.dispatch(selectComposition(action.payload.compositionId, action.payload.trackingInfo))
            return next({
                ...action,
                payload: {
                    ...action.payload,
                    isAlreadyOnDesignPage,
                },
            })
        }
        case types.DELETE_COMPOSITION_RENDER_ITEM: {
            const { id } = action.payload
            const { renderItems } = getSelectedComposition(state)
            const renderedItems = getSelectedCompositionProductData(state)

            const renderItem = renderItems.find((item) => item.uniqueId === id)
            if (!renderItem) {
                // Safety check: if renderItem is not found, skip processing
                return next(action)
            }
            const { isCombinableChild } = renderItem

            if (!isCombinableChild) {
                const mode = getDesignSidepanelMode(state)
                // Hide the swap menu on deleting an item
                store.dispatch(showSwapMenuForId(false))

                // If there are no my items, redirect to product browse
                const isShowingMyItems =
                    mode === modes.DESIGN_SIDEPANEL_MODE_MYITEMS_BROWSE ||
                    mode === modes.DESIGN_SIDEPANEL_MODE_MYITEMS_DETAILS
                if (isShowingMyItems) {
                    // renderItems.length will be one if this item is going to be deleted
                    if (renderedItems.length === 1) {
                        store.dispatch(setDesignSidepanelMode(modes.DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE))
                    } else {
                        store.dispatch(setDesignSidepanelMode(modes.DESIGN_SIDEPANEL_MODE_MYITEMS_BROWSE))
                    }
                } else {
                    store.dispatch(setDesignSidepanelMode(modes.DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE))
                }
            }

            // delete all combinable children of this item, if any
            const combinableChildren = renderItems.filter(
                (item) => item.combinablePlacement && item.combinablePlacement.parentId === id,
            )
            if (combinableChildren.length > 0) {
                const compositionId = getSelectedCompositionId(state)
                combinableChildren.forEach((item) => {
                    const productData = renderedItems.find((prod) => prod.uniqueId === item.uniqueId)
                    const productTrackingInfo = getProductTrackingInfo(productData)
                    const trackingInfo = {
                        ...productTrackingInfo,
                        RemovedFrom: SALES_DRESSING,
                        hidden: productData.hidden,
                    }
                    store.dispatch(deleteCompositionRenderItem(compositionId, item.uniqueId, trackingInfo))
                })
            }

            return next({
                ...action,
                payload: {
                    ...action.payload,
                    isLastItem: renderedItems.length === 1,
                },
            })
        }

        case types.SWAP_RENDER_ITEM: {
            const { furnitureToSwapOut, productToSwapIn } = action.payload

            const compositionId = getSelectedCompositionId(state)
            let uniqueId = getNextRenderItemId(state)

            const renderedItems = getSelectedCompositionProductData(state)
            const { renderItems } = getSelectedComposition(state)
            const selectedItem = renderItems.find((item) => item.uniqueId === furnitureToSwapOut)

            // Handle combinable children (linked items)
            if (selectedItem?.isCombinableChild) {
                const linkedGroupItems = renderItems.filter(
                    (item) =>
                        selectedItem.combinablePlacement?.linkGroupName &&
                        selectedItem.combinablePlacement?.linkGroupName === item.combinablePlacement?.linkGroupName &&
                        item.combinablePlacement?.parentId === selectedItem.combinablePlacement?.parentId &&
                        item.uniqueId !== furnitureToSwapOut,
                )

                if (linkedGroupItems.length > 0) {
                    const linkedItemIds = linkedGroupItems.map((item) => item.uniqueId)
                    // eslint-disable-next-line no-plusplus
                    const uniqueIds = linkedItemIds.map(() => uniqueId++)

                    store.dispatch(swapLinkedItems(linkedItemIds, productToSwapIn, compositionId, uniqueIds))
                }
            }

            GeomViewer.bindings?.aboutToSwapItem(String(furnitureToSwapOut))

            // Get all combinable children of the selected item
            const combinableChildren = renderItems.filter(
                (item) => item.combinablePlacement?.parentId === furnitureToSwapOut,
            )

            const furnitureById = getFurnitureById(state)
            const targetFurnitureData = furnitureById[productToSwapIn]

            const placingBehavior = swapPlacingBehaviour(
                selectedItem.placingBehavior,
                targetFurnitureData.placeables,
                targetFurnitureData.geometryTypes,
            )

            if (combinableChildren.length > 0) {
                // Get furniture details for socket information.
                const sockets = targetFurnitureData.combinablesSocketSet?.sockets

                // We will allocate new ids for preserved child items
                let childId = uniqueId

                if (sockets && sockets.length) {
                    sockets.forEach((socket) => {
                        const matchingChild = combinableChildren.find((item) => {
                            const productData = renderedItems.find((prod) => prod.uniqueId === item.uniqueId)
                            return productData?.productGeometries.dynamic?.some((geom) => {
                                const socketType = geom.socketType ?? geom.rules.socketType
                                return (
                                    socketType?.category === socket.type.category &&
                                    socketType?.size === socket.type.size
                                )
                            })
                        })

                        if (matchingChild) {
                            const productData = renderedItems.find((prod) => prod.uniqueId === matchingChild.uniqueId)
                            const productTrackingInfo = getProductTrackingInfo(productData)

                            const trackingInfo = {
                                ...productTrackingInfo,
                                ProductTitle: productData.name,
                                ProductId: productData.id,
                                ProductSource: productData.source,
                                RemovedFrom: SALES_DRESSING,
                                hidden: productData.hidden,
                            }

                            // Increment the child ID.
                            childId += 1

                            // Create and add the combinable to the scene with new data.
                            const combinableSettings = {
                                ...matchingChild,
                                uniqueId: childId,
                                combinablePlacement: {
                                    ...matchingChild.combinablePlacement,
                                    parentId: uniqueId,
                                    linkGroupName: socket.linkGroupName,
                                    socketName: socket.name,
                                    localTransform: createMatrix4Elements({ x: socket.x, y: socket.y, z: socket.z }, [
                                        socket.headingI,
                                        socket.headingJ,
                                        socket.headingK,
                                        socket.headingW,
                                    ]),
                                },
                                parentId: uniqueId,
                                // Reset unnecessary properties.
                                p3: undefined,
                                readyAndRendered: undefined,
                                placement: undefined,
                                metrics: undefined,
                            }

                            // Place the child item into the composition under the new parent.
                            store.dispatch(
                                placeRenderItem(compositionId, productData.id, 0, 0, combinableSettings, trackingInfo),
                            )
                        }
                    })
                }

                combinableChildren.forEach((item) => {
                    const productData = renderedItems.find((prod) => prod.uniqueId === item.uniqueId)
                    const productTrackingInfo = getProductTrackingInfo(productData)

                    const trackingInfo = {
                        ...productTrackingInfo,
                        ProductTitle: productData.name,
                        ProductId: productData.id,
                        ProductSource: productData.source,
                        RemovedFrom: SALES_DRESSING,
                        hidden: productData.hidden,
                    }
                    store.dispatch(deleteCompositionRenderItem(compositionId, item.uniqueId, trackingInfo))
                })
            }

            if (isMobile()) {
                store.dispatch(closeDesignSidepanel())
            } else {
                store.dispatch(selectFurniture(productToSwapIn))
            }

            // Proactively fetch goes-with items for the swapped-in product
            // so the action panel button state is correct
            store.dispatch(requestFurnitureGoesWith(productToSwapIn))

            return next({
                ...action,
                payload: {
                    ...action.payload,
                    productToSwapOut: selectedItem.id,
                    furnitureToSwapIn: uniqueId,
                    compositionId,
                    placingBehavior,
                },
            })
        }

        case types.SOFT_SWAP_RENDER_ITEM: {
            const { furnitureToSwapOut, productToSwapIn } = action.payload
            const furnitureById = getFurnitureById(state)
            const targetFurnitureProduct = furnitureById[productToSwapIn]
            const { renderItems } = getSelectedComposition(state)
            const selectedItem = renderItems.find((item) => item.uniqueId === furnitureToSwapOut)

            const validateCombinableProductGeometry = (renderItem, parentItem) => {
                const socketName = renderItem.combinablePlacement?.socketName
                const parentSockets = parentItem?.combinablesSocketSet?.sockets
                if (socketName && parentSockets) {
                    const socketGeometry = findSocketProductGeometry(
                        socketName,
                        targetFurnitureProduct,
                        parentItem,
                        parentSockets,
                    )

                    if (!socketGeometry) {
                        Sentry.captureMessage(`Cannot find socket product geometry: "${targetFurnitureProduct.name}"`)
                    }
                }
            }

            const linkedItemIds = []
            if (renderItems && selectedItem?.isCombinableChild) {
                const linkedGroupItems = renderItems.filter(
                    (item) =>
                        selectedItem.combinablePlacement?.linkGroupName &&
                        selectedItem.combinablePlacement?.linkGroupName === item.combinablePlacement?.linkGroupName &&
                        item.combinablePlacement?.parentId === selectedItem.combinablePlacement?.parentId,
                )

                const parentItem = renderItems.find(
                    (item) => item.uniqueId === selectedItem.combinablePlacement?.parentId,
                )

                linkedGroupItems.forEach((item) => {
                    validateCombinableProductGeometry(item, parentItem)

                    GeomViewer.bindings?.modifySceneItem(String(item.uniqueId), {
                        modifyFurnitureItem: { newMaterialUrl: targetFurnitureProduct.materialUrl },
                    })

                    linkedItemIds.push(item.uniqueId)
                })

                store.dispatch(selectFurniture(productToSwapIn))
            }

            return next({
                ...action,
                payload: {
                    ...action.payload,
                    linkedItemIds,
                    compositionId: getSelectedCompositionId(state),
                },
            })
        }

        case types.DUPLICATE_RENDER_ITEM: {
            const { targetRenderItemId, renderType, trackingInfo } = action.payload

            const selectedCompositionData = getSelectedCompositionData(state)
            const uniqueId = getNextRenderItemId(state)
            const compositionId = getSelectedCompositionId(state)
            const targetRenderItem = selectedCompositionData.renderItems[targetRenderItemId]
            let anchorCombinationIndex = targetRenderItem.anchorCombinationIndex
            // check if snap rotate index needs adjust from floor to wall on duplicate
            if (anchorCombinationIndex) {
                const { placeables, geometryTypes } = getSelectedRenderItem(state)
                if (isWallOrFloor(placeables, geometryTypes)) {
                    const swappedOutPlacingBehavior = targetRenderItem.placingBehavior
                    const duplicatedPlacingBehavior = trackingInfo.placingBehavior
                    if (swappedOutPlacingBehavior !== duplicatedPlacingBehavior) {
                        if (swappedOutPlacingBehavior === PlacingBehavior.ON_WALL) {
                            const floorIdx = targetRenderItem.anchorCombinationIndex - SNAP_ROTATION_COUNT
                            anchorCombinationIndex = floorIdx
                        }
                    }
                }
            }

            const settings = {
                ...targetRenderItem,
                uniqueId,
                renderType,
                anchorCombinationIndex,
                isAddedFromDuplicate: true,
            }

            if (settings.stackedPlane) {
                delete settings.stackedPlane
                settings.stacks = true
            }

            delete settings.p3
            delete settings.parentId

            delete settings.x
            delete settings.y
            delete settings.metrics
            delete settings.readyAndRendered

            // 'placingBehavior' can change during the lifetime of a RenderItem.
            // So we let placement determine behavior for the duplicate, instead
            // of carrying it over from the source.
            delete settings.placingBehavior
            delete settings.swapChainPosition
            delete settings.swappedOutPlacingBehavior

            // Duplicate combinables first
            const pluggedCombinables = Object.values(selectedCompositionData.renderItems).filter(
                (item) =>
                    item.combinablePlacement?.parentId === targetRenderItemId && item.combinablePlacement?.socketName,
            )

            if (pluggedCombinables?.length > 0) {
                // Duplicate item with custom combinables.
                store.dispatch(placeRenderItem(compositionId, targetRenderItem.id, 0, 0, settings, trackingInfo))
                pluggedCombinables.forEach((combinable, index) => {
                    const combinableSettings = {
                        ...combinable,
                        uniqueId: uniqueId + index + 1,
                        combinablePlacement: {
                            ...combinable.combinablePlacement,
                            parentId: uniqueId,
                        },
                        parentId: uniqueId,
                        p3: undefined,
                        readyAndRendered: undefined,
                        placement: undefined,
                        metrics: undefined,
                    }
                    store.dispatch(
                        placeRenderItem(compositionId, combinable.id, 0, 0, combinableSettings, trackingInfo),
                    )
                })
            } else {
                store.dispatch(
                    clickPlaceRenderItem(compositionId, targetRenderItem.id, settings, trackingInfo, uniqueId),
                )
            }

            return next(action)
        }
        case types.RECEIVE_FURNITURE_COMBINABLES: {
            if (action.furniture.length === 0) {
                return next(action)
            }
            const compositionId = getSelectedCompositionId(state)
            const parentFurnitureData = getSelectedCompositionProductData(state).find(
                (item) => item.uniqueId === action.parentUniqueId,
            )
            if (parentFurnitureData) {
                const flags = getDecidedFlags(state)
                const isMorpheusEnabled = flags.Morpheus
                const furniture = action.furniture[0]
                const productTrackingInfo = getProductTrackingInfo(furniture)
                const trackingInfo = {
                    ...productTrackingInfo,
                    AddedFrom: TRACKING_ADDED_FROM.SALES_DRESSING,
                }

                // check if this item should be plugged into one of the parent's sockets
                const matchingSockets = parentFurnitureData.combinablesSocketSet?.sockets.filter(
                    (socket) => socket.defaultProductId === furniture.id,
                )

                if (matchingSockets && isMorpheusEnabled) {
                    const composition = getSelectedCompositionData(state)
                    // we add the item to each socket with per socket settings.
                    // eslint-disable-next-line no-restricted-syntax
                    for (const socket of matchingSockets) {
                        // Skip loading the combinable if the socket is not empty.
                        const renderItems = composition.renderItems
                        const itemInSocket = Object.values(renderItems).find(
                            (item) =>
                                (Number(item.parentIdOrSurface) === action.parentUniqueId ||
                                    item.combinablePlacement?.parentId === action.parentUniqueId) &&
                                (item.combinablePlacement?.socketName === socket.name || item.socket === socket.name),
                        )

                        if (itemInSocket === undefined) {
                            const settings = {
                                renderType: FURNITURE_ITEM,
                                heading: 0,
                                stacks: false,
                                hidden: furniture.hidden,
                                combinablePlacement: {
                                    parentId: action.parentUniqueId,
                                    linkGroupName: socket.linkGroupName,
                                    socketName: socket.name,
                                    localTransform: createMatrix4Elements({ x: socket.x, y: socket.y, z: socket.z }, [
                                        socket.headingI,
                                        socket.headingJ,
                                        socket.headingK,
                                        socket.headingW,
                                    ]),
                                },
                            }
                            store.dispatch(placeRenderItem(compositionId, furniture.id, 0, 0, settings, trackingInfo))
                        } else if (!itemInSocket.combinablePlacement) {
                            const combinablePlacement = {
                                parentId: action.parentUniqueId,
                                linkGroupName: socket.linkGroupName,
                                socketName: socket.name,
                                localTransform: createMatrix4Elements({ x: socket.x, y: socket.y, z: socket.z }, [
                                    socket.headingI,
                                    socket.headingJ,
                                    socket.headingK,
                                    socket.headingW,
                                ]),
                            }
                            store.dispatch(
                                updateCompositionRenderItem(
                                    compositionId,
                                    itemInSocket.uniqueId,
                                    { combinablePlacement },
                                    {},
                                ),
                            )
                        }
                    }
                } else {
                    // process legacy combinables
                    const settings = {
                        renderType: FURNITURE_ITEM,
                        heading: 0,
                        stacks: false,
                        hidden: furniture.hidden,
                        combinablePlacement: {
                            parentId: action.parentUniqueId,
                            localTransform:
                                parentFurnitureData.metadata.combinables.nodesMeta[action.nodeIndex].matrixModel.flat(),
                        },
                    }
                    store.dispatch(placeRenderItem(compositionId, furniture.id, 0, 0, settings, trackingInfo))
                }
            }
            return next(action)
        }
        case types.RENAME_COMPOSITION: {
            const { id } = action.payload
            const byId = getCompositionsById(state)
            const compositionOwner = byId[id]?.wid
            const userId = getUserId(state)

            // For compositions that are not owned by the user, we should not allow them to rename the name in redux.
            // For example, a showroom is a stock composition that the user can open and edit. For this composition, when a user
            // renames the name, we should preserve the original name.
            // For stock compositions that the user owns, the user can change the name in redux.
            const preserveOriginalName = userId !== compositionOwner
            return next({
                ...action,
                payload: {
                    ...action.payload,
                    preserveOriginalName,
                },
            })
        }
        case types.VIEW_SELECTED: {
            // Clear the 2D swapChainPosition to avoid wrong 2D to 3D position calculation.
            // TODO: Revert when swapChainPosition is converted to 3D or deprecated.
            const compositionId = getSelectedCompositionId(state)
            const renderItems = getSelectedCompositionProductData(state)
            renderItems.forEach((renderItem) => store.dispatch(clearSwapAffinity(compositionId, renderItem.uniqueId)))
            return next(action)
        }
        case types.VIEW_LOADED: {
            const { cameraInfo } = action.payload
            if (!cameraInfo) {
                return next(action)
            }

            const compositionId = getSelectedCompositionId(state)
            store.dispatch(updateCompositionSaveData(compositionId, { camera: cameraInfo }))
            return next(action)
        }
        case types.SET_INITIAL_LOADING: {
            const nextState = next(action)
            if (!action.payload.initialLoading && getSaveOnFirstRender(state)) {
                const trackingInfo = getSaveTracking(state)
                store.dispatch(saveSelectedComposition(trackingInfo))
            }
            return nextState
        }
        case types.START_TEST_SWAP_SAGA: {
            const swapItemsData = getSelectedFurnitureSwappableItemsData(state)
            const selectedProduct = getSelectedCompositionRenderedFurnitureItem(state)
            const targetRenderItemId = getSelectedRenderItemId(state)
            return next({
                ...action,
                targetRenderItemId,
                selectedProduct,
                swapItemsData,
            })
        }
        case types.TEST_SWAP_SAGA_FINISHED: {
            /* eslint-disable no-console */
            console.group('After multi swap test heap difference:')
            console.log(`jsHeapSizeLimitDelta: ${action.results.jsHeapSizeLimitDelta / 1024 / 1024}Mb`)
            console.log(`totalJSHeapSizeDelta: ${action.results.totalJSHeapSizeDelta / 1024 / 1024}Mb`)
            console.log(`usedJSHeapSizeDelta: ${action.results.usedJSHeapSizeDelta / 1024 / 1024}Mb`)
            console.log(`textureMemoryDelta: ${action.results.textureMemoryDelta / 1024 / 1024}Mb`)
            console.log(`bufferMemoryDelta: ${action.results.bufferMemoryDelta / 1024 / 1024}Mb`)
            console.groupEnd()
            return next(action)
        }
        case types.TEST_LOAD_SAGA_FINISHED: {
            /* eslint-disable no-console */
            console.group('After multi load/delete test heap difference:')
            console.log(`jsHeapSizeLimitDelta: ${action.results.jsHeapSizeLimitDelta / 1024 / 1024}Mb`)
            console.log(`totalJSHeapSizeDelta: ${action.results.totalJSHeapSizeDelta / 1024 / 1024}Mb`)
            console.log(`usedJSHeapSizeDelta: ${action.results.usedJSHeapSizeDelta / 1024 / 1024}Mb`)
            console.log(`textureMemoryDelta: ${action.results.textureMemoryDelta / 1024 / 1024}Mb`)
            console.log(`bufferMemoryDelta: ${action.results.bufferMemoryDelta / 1024 / 1024}Mb`)
            console.groupEnd()
            return next(action)
        }
        case types.UPDATE_RENDER_ITEMS_HEADING_FROM_2D_TO_3D: {
            const compositionId = getSelectedCompositionId(state)
            const compositionSaveData = getSelectedCompositionSaveData(state)
            return next({
                ...action,
                payload: {
                    compositionSaveData,
                    compositionId,
                },
            })
        }
        default:
            return next(action)
    }
}

export default compositionsMiddleware
