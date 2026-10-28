// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { createSelector } from 'reselect'
import { formatGeoProperties } from 'services/partnerTracking'
import * as RenderItemTypes from 'constants/renderItemTypes'
import {
    FEATURE_WALLART,
    FEATURE_ERASER,
    FEATURE_STACKABLES,
    FEATURE_COMBINABLES,
    FEATURE_MIRROR,
    FEATURE_VERSIONS,
    LAST_SAVED_ON_WEB,
    FEATURE_WALLPAINT,
    NEW_COMPOSITION_ID,
    FEATURE_WALLPAINT_INPAINT,
    FEATURE_WALL_PLACEABLES,
    FEATURE_WALL_FLOOR_PLACEABLES,
    FEATURE_SNAP_ROTATE,
} from 'models/compositions/constants'

import {
    getSceneItemsById,
    getSelectedSceneId,
    getUserSceneItems,
    getIsSceneDataLoaded,
    getFetchState,
} from 'models/scenes/selectors'
import {
    isMultiviewScene,
    getRoomViewTypeFromScene,
    getRoomSourceDetailFromScene,
    isRoomBuilderScene,
    getRoomSourceFromScene,
    getSourceTypeLabel,
} from 'models/scenes/utils'

import {
    getFurnitureById,
    getFurnitureIsLoading,
    getFurnitureIsLoadingByIds,
    getSelectedSwapFurnitureData,
} from 'models/furniture/selectors'
import { getContextualRoomType } from 'models/referrer/selector'
import { getCountryCode, getLocale } from 'models/location/selectors'
import { getUserId } from 'models/user/selectors'
import { getDebugSettings } from 'models/admin/selectors'
import { getDecidedFlags } from 'models/experiments/selectors'
import { ProductData } from 'models/furniture'

import {
    ROOM_SOURCE_USERCAPTURED,
    ROOM_SOURCE_STOCK,
    ROOM_SOURCE_OTHER,
    ROOM_VIEW_TYPE_MULTI,
    ROOM_VIEW_TYPE_UNKNOWN,
    DESIGN_SOURCE_STOCK,
    DESIGN_SOURCE_USERDESIGNED,
} from 'models/tracking/constants'
import {
    NEW_SCENE_ID,
    ROOM_BUILDER_SCENE_THUMBNAIL,
    SCENE_STATE_PROCESSING,
    SCENE_STATE_QUEUED,
    SCENE_STATE_UPLOADED,
    SCENE_STATE_FAILED,
    SCENE_STATE_ERROR,
    SCENE_STATE_SUCCESS,
    SceneState,
    SOURCETYPE_LITE_SCAN,
} from 'models/scenes/constants'
import sortByArray from 'utils/sortByArray'

import { ART_FRAMES, ART_SIZES, DEFAULT_ART_OPTIONS_ID } from 'models/furniture/artConstants'
import { getLocalizedCurrencyString } from 'utils/convertCurrency'
import { buildTag } from 'utils/buildInfo'

import { isVectorValid } from 'utils/vector'
import { isWallAndFloor, isWallOrFloor, isWallPlaceableOnly } from 'utils/placeables'
import type { RootState } from 'store'
import { STATE_ERROR } from 'constants/stateTypes'
import { getShowrooms } from 'models/showrooms/selectors'
import type { CompositionDataItem, Composition, CompositionSaveData, RoomGroup } from 'models/compositions'
import { groupBy } from 'utils/object'
import { SUB_CATEGORIES_IDS_MAP } from 'constants/categories'
import { expertCheckMinimumCartValues } from 'utils/expertCheck'
import type { Scene } from 'models/scenes'
import { trackPreSerialization, trackPostSerialization } from 'models/compositions/saveAnomalyTelemetry'
import type { APIPlacedFurniture } from './types'
import { sortCompositionsByLastModified, sortByDateProperty } from './utils'

export const getCompositionsById = (state: RootState): Record<string, CompositionDataItem> => state.compositions.byId
const getSelectedRenderItemIdRaw = (state: RootState) => state.compositions.selectedRenderItemId
const getDraggingRenderItemIdRaw = (state: RootState) => state.compositions.draggingRenderItemId

export const getSelectedCompositionId = (state: RootState) => state.compositions.selectedId
export const getIsLoadingCompositions = (state: RootState) => state.compositions.isLoadingCompositions
export const getIsLoadingCompiledComposition = (state: RootState) => state.compositions.isLoadingCompiledComposition
export const getIsCompositionDataLoadedRaw = (state: RootState) => state.compositions.isCompositionDataLoaded
export const getNextRenderItemId = (state: RootState) => state.compositions.nextRenderItemId
export const getPlaceProductId = (state: RootState) => state.compositions.placeProductId
export const getUserDidAddRenderItem = (state: RootState) => state.compositions.userDidAddRenderItem
export const getHoverRenderItemId = (state: RootState) => state.compositions.hoverRenderItemId
export const getIsLoadingCombinables = (state: RootState) => state.compositions.isLoadingCombinables
export const getIsPlaceMultipleRenderLoading = (state: RootState) => state.compositions.isLoadingMultipleRenderItems

export const getHasCompositions = createSelector(
    [getCompositionsById],
    (compsById) => Object.keys(compsById).length > 1,
)

export const getIsSaving = (state: RootState) => state.compositions.isSaving
export const getIsModified = (state: RootState) => state.compositions.isModified
export const getHasSaveError = (state: RootState) => state.compositions.hasSaveError
export const getHasBeenSaved = (state: RootState) => state.compositions.hasBeenSaved
export const getNewCompositionSaveTransition = (state: RootState) => state.compositions.newCompositionSaveTransition

export const getIsSavingSharing = (state: RootState) => state.compositions.isSavingSharing
export const getHasSavingShareError = (state: RootState) => state.compositions.hasSavingShareError

export const getIsSavingExpertCheckConsent = (state: RootState) => state.compositions.isSavingExpertCheckConsent
export const getHasSavingExpertCheckConsentError = (state: RootState) =>
    state.compositions.hasSavingExpertCheckConsentError

export const getSelectedView = (state: RootState) => state.compositions.selectedView

export const getSmartaTimeout = (state: RootState) => state.compositions.smartaTimeout

export const getSmartaURL = (state: RootState) => state.compositions.smartaURL

export const getForceSmartaOff = (state: RootState) => state.compositions.forceSmartaOff

export const getSmartaRuleset = (state: RootState) => state.compositions.smartaRuleset

export const getIsSaved = createSelector(
    [getIsSaving, getIsModified, getHasSaveError, getHasBeenSaved],
    (isSaving, isModified, hasSaveError, hasBeenSaved) => !isSaving && !isModified && !hasSaveError && hasBeenSaved,
)

export const getSelectedCompositionData = createSelector(
    [getCompositionsById, getSelectedCompositionId],
    (compsById, selectedId) => compsById[selectedId],
)

// Get the selectedRenderItemId
export const getSelectedRenderItemId = createSelector([getSelectedRenderItemIdRaw], (selectedId) => {
    if (selectedId > -1) {
        return selectedId
    }
    return null
})

export const getDraggingRenderItemId = createSelector([getDraggingRenderItemIdRaw], (draggingId) => {
    if (draggingId > -1) {
        return draggingId
    }
    return null
})

export const getIsDraggingRenderItem = createSelector([getDraggingRenderItemId], (draggingId) => !!draggingId)

export const getActiveSceneId = createSelector(
    [getSelectedCompositionData, getSelectedSceneId],
    (compositionItem, selectedSceneId) => {
        if (!compositionItem) {
            return null
        }

        // Default comp will get the selected scene
        const sceneId = compositionItem.sceneId || selectedSceneId

        if (!sceneId) {
            return null
        }
        return sceneId
    },
)

export const getSelectedScene = createSelector(
    [getSceneItemsById, getActiveSceneId],
    (sceneItemsById, selectedSceneId) => {
        if (!selectedSceneId) {
            return null
        }

        // Default comp will get the selected scene
        const scene = sceneItemsById[selectedSceneId]

        if (!scene) {
            // No scenes have been loaded
            return null
        }
        return scene
    },
)

export const getSelectedSceneRoomType = createSelector(
    [getSelectedScene, getContextualRoomType],
    (selectedScene, contextRoomType) => {
        if (contextRoomType) return contextRoomType
        return selectedScene && selectedScene.roomType
    },
)

export const getSelectedSceneHasGLTFManifest = createSelector(
    [getSceneItemsById, getActiveSceneId],
    (sceneItemsById, selectedSceneId) => {
        if (!selectedSceneId) {
            return false
        }

        const scene = sceneItemsById[selectedSceneId]
        return !!scene?.gltfManifest
    },
)

export const getSelectedSceneIsUnsaved = createSelector([getActiveSceneId], (sceneId) => sceneId === NEW_SCENE_ID)

export const getIsLoading = createSelector(
    [getFurnitureIsLoading, getFurnitureIsLoadingByIds],
    (furnitureIsLoading, furnitureIsLoadingByIds) => furnitureIsLoading || furnitureIsLoadingByIds,
)

// Used for the design page
export const getSelectedComposition = createSelector(
    [
        getSelectedCompositionData,
        getSelectedScene,
        getFurnitureById,
        getSelectedRenderItemId,
        getIsLoading,
        getDecidedFlags,
    ],
    (
        compositionItem,
        selectedScene,
        productDataById,
        selectedRenderItemId,
        isLoading,
        flags,
    ): Composition | undefined => {
        if (!selectedScene) {
            return undefined
        }
        let hasFailedRenderItem = false

        // Furniture only (used for Pendo guide)
        const leftMostRenderItemId = Object.values(compositionItem.renderItems)
            .filter((i) => i.renderType === RenderItemTypes.FURNITURE_ITEM)
            .reduce((acc, item) => (item.x < acc[1] ? [item.uniqueId, item.x] : acc), [null, 99999])[0]

        let renderItems = Object.values(compositionItem.renderItems).map((renderItemPartial) => {
            const selected = renderItemPartial.uniqueId === selectedRenderItemId
            const isLeftMost = leftMostRenderItemId === renderItemPartial.uniqueId
            const productData = productDataById[renderItemPartial.id]
            const parentId = renderItemPartial.combinablePlacement?.parentId
            const isCombinableChild = Boolean(parentId)

            const parentItem = parentId ? compositionItem.renderItems[parentId] : null

            const rootCorners = parentItem ? parentItem.corners : renderItemPartial.corners

            if (!productData) {
                return null
            }

            switch (productData.renderType) {
                case RenderItemTypes.ART_ITEM: {
                    // Legace/mobile art items saved without frame data are default initialized
                    const {
                        frameId = DEFAULT_ART_OPTIONS_ID,
                        sizeId = DEFAULT_ART_OPTIONS_ID,
                        colorId = DEFAULT_ART_OPTIONS_ID,
                        matteId = DEFAULT_ART_OPTIONS_ID,
                        customHeight,
                    } = renderItemPartial
                    const artItem = productData

                    const framePartial = ART_FRAMES[frameId]

                    let size = ART_SIZES[sizeId]
                    if (sizeId === 1) {
                        // The default size is the actual product size
                        size = {
                            ...size,
                            height: productData.displayHeightCm / 100,
                        }
                    } else if (sizeId === 999) {
                        size = {
                            ...size,
                            height: customHeight || 0.4,
                        }
                    }

                    // The colors are stored per-frame, but for now
                    // we're pretending like the color selection
                    // operates at the artItem scope (not the frame scope)
                    const color = framePartial.colors ? { ...framePartial.colors[colorId], id: colorId } : null
                    const matte = framePartial.mattes ? { ...framePartial.mattes[matteId], id: matteId } : null
                    const frame = {
                        ...framePartial,
                        color,
                        matte,
                    }

                    return {
                        ...renderItemPartial,
                        ...artItem,
                        frame,
                        size,
                        selected,
                        isLeftMost, // Always false for now (for furni only)
                        rootCorners,
                    }
                }
                case RenderItemTypes.FURNITURE_ITEM: {
                    if (renderItemPartial.metrics && renderItemPartial.metrics.failed) {
                        hasFailedRenderItem = true
                    }
                    return {
                        ...renderItemPartial,
                        ...productData,
                        selected,
                        isLeftMost,
                        isCombinableChild,
                        rootCorners,
                    }
                }
                default:
                    return null
            }
        })

        renderItems = renderItems.filter((item) => item !== null)

        const isMissingItems =
            (!isLoading && renderItems.length !== Object.keys(compositionItem.renderItems).length) ||
            hasFailedRenderItem

        // if Morpheus is disabled, we want to filter out the Morpheus bed items to avoid having duplicate sets of combinables
        const isMorpheusEnabled = flags.Morpheus
        if (!isMorpheusEnabled) renderItems = renderItems.filter((ri) => !ri.socket)

        const { manifest } = selectedScene

        const hiddenSurfacesCount = compositionItem.hiddenSurfaces?.length
        const dynamicSurfacesCount = renderItems
            .filter((ri) => ri.areStackableSurfsEnabled === undefined || ri.areStackableSurfsEnabled)
            .flatMap((renderItem) => renderItem.stackables || []).length
        const hasStackableSurfaces =
            selectedScene.staticStackingSurfacesCount + dynamicSurfacesCount - hiddenSurfacesCount > 0

        const canMagicErase = Boolean(
            manifest &&
                manifest.pano_inpaint_0 &&
                manifest.depth_occlusion_inpaint_0 &&
                (manifest.plane_polygons || // Either plane polygons is going to be used to generate
                    // a segmentation map, or use the actual segmentation-map/plane-orientation pair.
                    (manifest.plane_orientation_inpaint_0 && manifest.normals_segmentation_inpaint_0)) &&
                (!manifest.segmentation_meta_0 || // Either we don't have the new prop or...
                    // We do have the new prop so check the contents (support eraser for old scenes)
                    (manifest.segmentation_meta_0.instances && manifest.segmentation_meta_0.instances.length)),
        )

        return {
            ...compositionItem,
            sceneId: selectedScene.sceneId,
            scene: selectedScene,
            isMissingItems,
            renderItems,
            hasStackableSurfaces,
            canMagicErase,
        }
    },
)

export const getSelectedCompositionIsLoading = createSelector(
    [getSelectedComposition, getIsLoadingCompositions, getIsLoadingCompiledComposition, getIsLoadingCombinables],
    (compositionItem, isLoadingCompositions, isLoadingCompiledComposition, isLoadingCombinables) => {
        if (!compositionItem) {
            // Still loading compositions
            return isLoadingCompositions || isLoadingCompiledComposition
        }
        if (isLoadingCombinables) {
            return isLoadingCombinables
        }
        if (compositionItem.renderItems && compositionItem.renderItems.length) {
            return compositionItem.renderItems.some((ri) => !ri.readyAndRendered)
        }
        // Assume not loading by default
        return false
    },
)

export const isRenderItemsLoading = createSelector([getSelectedComposition], (compositionItem) => {
    if (compositionItem?.renderItems && compositionItem?.renderItems?.length) {
        return compositionItem.renderItems.every((ri) => !ri.readyAndRendered)
    }
    return false
})

// Get selected render item in the current composition
export const getSelectedRenderItem = createSelector(
    [getSelectedComposition, getSelectedRenderItemId],
    (compositionItem, renderItemId) => {
        if (!compositionItem || renderItemId < 0) {
            return null
        }

        const renderItem = compositionItem.renderItems.find((i) => i.uniqueId === renderItemId)

        return renderItem || null
    },
)

// Get composition data for saving server-side
export const getSelectedCompositionSaveData = createSelector(
    [
        getSelectedCompositionData,
        getActiveSceneId,
        getUserId,
        getFurnitureById,
        getSelectedSceneHasGLTFManifest,
        getDebugSettings,
        getDecidedFlags,
    ],
    (
        compositionData,
        selectedSceneId,
        userId,
        productDataById,
        selectedSceneHasGLTFManifest,
        debugSettings,
        flags,
    ): CompositionSaveData => {
        if (!compositionData) {
            return null
        }
        // Tracks what features are used in the composition
        const features = {
            design: 1, // Informs mobile that we're using the features{} feature
        }

        const needs3DSaveData = selectedSceneHasGLTFManifest && !debugSettings.disable3DCompositionSave

        // Check for Morpheus flag/experiment
        const isMorpheusEnabled = flags.Morpheus
        const isDuvetV2Enabled = flags.DuvetV2

        // Track placement counts before serialization
        trackPreSerialization(compositionData.id, compositionData.renderItems, needs3DSaveData)

        // Filter out hidden (combinable) items and missing items.
        const filteredRenderItems = Object.values(compositionData.renderItems).filter(
            (item) => !item.hidden && !!productDataById[item.id],
        )
        const productItems = filteredRenderItems
            .filter((item) => item.x !== null && item.y !== null)
            // Items without placement data can't be saved in 3d gltf composition mode.
            .filter((item) => !needs3DSaveData || item.placement)
            .map((item) => {
                if (item.frameId) {
                    features[FEATURE_WALLART] = FEATURE_VERSIONS[FEATURE_WALLART]
                }
                if (item.stackedPlane) {
                    features[FEATURE_STACKABLES] = FEATURE_VERSIONS[FEATURE_STACKABLES]
                }
                if (item.combinablePlacement) {
                    if (isMorpheusEnabled && isDuvetV2Enabled) {
                        features[FEATURE_COMBINABLES] = 3
                    } else if (isMorpheusEnabled) {
                        features[FEATURE_COMBINABLES] = 2
                    } else {
                        features[FEATURE_COMBINABLES] = FEATURE_VERSIONS[FEATURE_COMBINABLES]
                    }
                }
                if (item.mirrorOptionEnabled) {
                    features[FEATURE_MIRROR] = FEATURE_VERSIONS[FEATURE_MIRROR]
                }
                const productData = productDataById[item.id]
                if (productData && productData.placeables && isWallPlaceableOnly(productData.placeables)) {
                    features[FEATURE_WALL_PLACEABLES] = FEATURE_VERSIONS[FEATURE_WALL_PLACEABLES]
                }
                if (item.anchorCombinationIndex) {
                    features[FEATURE_SNAP_ROTATE] = FEATURE_VERSIONS[FEATURE_SNAP_ROTATE]
                }
                if (
                    productData &&
                    productData.placeables &&
                    (isWallOrFloor(productData.placeables, productData.geometryTypes) ||
                        isWallAndFloor(productData.placeables))
                ) {
                    features[FEATURE_WALL_FLOOR_PLACEABLES] = FEATURE_VERSIONS[FEATURE_WALL_FLOOR_PLACEABLES]
                }

                const gfxAttributes = {
                    stackedPlane: item.stackedPlane,
                    combinablePlacement: item.combinablePlacement,
                    mirrorOptionEnabled: item.mirrorOptionEnabled,
                    anchorCombinationIndex: item.anchorCombinationIndex,
                    artData: {
                        sizeId: item.sizeId,
                        frameId: item.frameId,
                        colorId: item.colorId,
                        matteId: item.matteId,
                    },
                    placingBehavior: item.placingBehavior,
                }

                if (item.p3 && isVectorValid(item.p3.x, item.p3.y, item.p3.z) && Number.isFinite(item.parentId)) {
                    gfxAttributes.parentId = item.parentId

                    gfxAttributes.position = {
                        x: item.p3.x,
                        y: item.p3.y,
                        z: item.p3.z,
                    }
                }

                const placement = item.placement || item.smartaPlacement

                return {
                    furnitureId: item.id,
                    uniqueId: String(item.uniqueId),
                    x: item.x,
                    y: item.y,
                    socketSet: productData.combinablesDefaultSocketSet,
                    socket: gfxAttributes.combinablePlacement?.socketName,
                    heading: item.heading,
                    gfxAttributes,
                    ...(needs3DSaveData
                        ? {
                              x: placement?.location3.localPos.x,
                              y: placement?.location3.localPos.y,
                              z: placement?.location3.localPos.z,
                              headingI: placement?.rotation.x,
                              headingJ: placement?.rotation.y,
                              headingK: placement?.rotation.z,
                              heading: placement?.rotation.w,
                              parentAttachment: item.parentAttachment,
                              parentId: item.parentIdOrSurface,
                              gfxAttributes: {
                                  ...gfxAttributes,
                                  additionalContacts: item.additionalContacts,
                              },
                          }
                        : {}),
                } as APIPlacedFurniture
            })

        // Track input vs output placement count after serialization
        trackPostSerialization(
            compositionData.id,
            filteredRenderItems.length,
            productItems.length,
            needs3DSaveData,
        )

        const savedProperties = { ...compositionData.savedProperties }
        if (savedProperties.erasedSegments && savedProperties.erasedSegments.length) {
            features[FEATURE_ERASER] = FEATURE_VERSIONS[FEATURE_ERASER]
        }
        const hasWallPaintApplied = compositionData.wallPaint && Object.keys(compositionData.wallPaint).length > 0
        if (hasWallPaintApplied) {
            features[FEATURE_WALLPAINT] = FEATURE_VERSIONS[FEATURE_WALLPAINT]
            savedProperties.wallPaint = compositionData.wallPaint
        } else {
            delete savedProperties.wallPaint
        }
        const hasWallPaintInpaint = Object.keys(compositionData.wallPaintInpaint).length > 0
        if (hasWallPaintInpaint) {
            features[FEATURE_WALLPAINT_INPAINT] = FEATURE_VERSIONS[FEATURE_WALLPAINT_INPAINT]
            savedProperties.wallPaintInpaint = compositionData.wallPaintInpaint
        } else {
            delete savedProperties.wallPaintInpaint
        }

        const { id, name, isShared, enableRemix } = compositionData

        const canBeRemixed = isShared && enableRemix && id !== NEW_COMPOSITION_ID
        return {
            compositionId: id,
            placedFurniture: productItems,
            name,
            sceneId: selectedSceneId,
            isShared,
            enableRemix,
            remixParent: canBeRemixed ? id : undefined,
            savedProperties: {
                ...savedProperties,
                // Version data
                lastSavedOn: LAST_SAVED_ON_WEB,
                clientVersion: buildTag,
                clientLibVersions: buildTag,
                features,
            },
            geo_properties: formatGeoProperties(),
        }
    },
)

// Get composition sharing data for saving server-side
export const getSelectedCompositionSharingData = createSelector(
    [getSelectedCompositionData],
    ({ uuid: compositionId, isShared, enableRemix, sendNotifications }) => ({
        compositionId,
        isShared,
        enableRemix,
        sendNotifications,
    }),
)

export const getCompositionsData = createSelector([getCompositionsById], (compData) =>
    Object.values(compData)
        .filter((item) => item.id !== NEW_COMPOSITION_ID)
        .sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate)),
)

export const getUserCompositionsData = createSelector([getCompositionsData], (comps) => comps.filter((c) => !c.isStock))

export const getStockCompositionsData = createSelector([getCompositionsData], (comps) => comps.filter((c) => c.isStock))

export const getStockCompositionsDataSorted = createSelector(
    [getStockCompositionsData, getSelectedCompositionId, getSelectedCompositionData],
    (comps, selectedCompId, selectedComposition) => {
        const getFirstWord = (title) => title.split(' ')[0] || ''
        const filteredComps = comps.filter((c) => c.id !== selectedCompId)
        const { name } = selectedComposition
        const orderByFirstWordSelectedCompName = getFirstWord(name).trim().toUpperCase()

        return sortByArray(
            filteredComps,
            [(a) => getFirstWord(a.name.trim().toUpperCase()), [orderByFirstWordSelectedCompName]],
            (a) => a.name.trim().toUpperCase(),
        )
    },
)

export const getNumberCompositions = createSelector([getCompositionsData], (comps) => comps.length)

// Get the product (furniture and wall art) data of the rendered items in the composition
// and the uniqueId and parentId field of the renderItem
export const getSelectedCompositionProductData = createSelector(
    [getSelectedCompositionData, getFurnitureById],
    (selectedCompositionData, furnitureDataById) => {
        if (!selectedCompositionData || !selectedCompositionData.renderItems) {
            return []
        }
        return Object.values(selectedCompositionData.renderItems)
            .map((renderItem) => {
                const renderItemData = furnitureDataById[renderItem.id]
                if (!renderItemData) {
                    return null
                }
                return {
                    ...renderItemData,
                    uniqueId: renderItem.uniqueId,
                    parentId: renderItem.parentId,
                }
            })
            .filter((item) => !!item)
    },
)

export const getPlacedProductData = createSelector(
    [getPlaceProductId, getFurnitureById],
    (placedProductId, furnitureDataById) => furnitureDataById[placedProductId] || null,
)

// Get the first rendered item of a composition if there is one
export const getSelectedCompositionFirstRenderItem = createSelector([getSelectedCompositionData], (composition) => {
    const { renderItems } = composition
    const renderItemsArray = Object.values(renderItems)
    if (renderItemsArray?.length) {
        return renderItemsArray[0]
    }
    return null
})

/**
 *  Filter out products that the user shouldn't be able to access in the UI
 */
export const getSelectedCompositionShoppableProductData = createSelector(
    [getSelectedCompositionProductData],
    (allProductData) => {
        const uniqueProductsByParentId = new Set<string>()
        return (
            allProductData
                .filter((item) => !item.hidden && !item.isNoninteractable)
                /**
                 * We want to filter out duplicate children items that were added by the same parent item
                 * e.g. Bed (parent item) with a duvet set and 2 pillows will add in total 3 duvet sets,
                 * 1 from the bed itself, and the other 2 linked from the pillows.
                 * In this case we only want to keep the 1 duvet set in total.
                 */
                .filter((item) => {
                    if (!item.parentId || item.stacks) {
                        // A parent item or a stackable will not need to be filtered.
                        return true
                    }
                    const key = `${item.id}-${item.parentId}` // this key is for all products except for items we need two copies of, such as accent pillows
                    const pairedItemKey = `${item.id}-${item.parentId}-2` // this key is for all paired items that need to have two copies in the cart such as accent pillows

                    if (uniqueProductsByParentId.has(pairedItemKey)) {
                        // check if the second paired item has been added
                        return false
                    }

                    if (uniqueProductsByParentId.has(key)) {
                        if (item.subCategoryIds?.includes(SUB_CATEGORIES_IDS_MAP.DecorativePillow)) {
                            // If second paired item has not been added, add it to the list
                            uniqueProductsByParentId.add(pairedItemKey)
                            return true
                        }
                        // If a regular item is already in the set
                        return false
                    }

                    // else add the item to the set
                    uniqueProductsByParentId.add(key)
                    return true
                })
        )
    },
)

/**
 *  Filter out products that the user shouldn't be able to access in the UI & combinable children
 */
export const getNonCombinableShoppableProductData = createSelector(
    [getSelectedCompositionShoppableProductData],
    (allProductData) => allProductData.filter((item) => !item.isCombinableChild),
)

// Get product list key'd by localItemNumber and a value of number of items
export const getProductListWithNumbers = createSelector(
    [getSelectedCompositionShoppableProductData],
    (allProductData) => {
        if (!allProductData || !allProductData.length) {
            return {}
        }
        return allProductData.reduce((accumulator, thisProduct) => {
            const { localItemNumber } = thisProduct
            if (!accumulator[localItemNumber]) {
                accumulator[localItemNumber] = 1
            } else {
                accumulator[localItemNumber] += 1
            }
            return accumulator
        }, {})
    },
)

// Get the furniture data of the selected rendered item plus the uniqueId field
export const getSelectedCompositionRenderedFurnitureItem = createSelector(
    [getSelectedCompositionProductData, getSelectedRenderItemId],
    (renderItems, selectedRenderItemId) => {
        if (!selectedRenderItemId) {
            return null
        }

        const renderItem = renderItems.find((i) => i.uniqueId === selectedRenderItemId)

        return renderItem || null
    },
)

// Get furnitureIds of missing furniture in the selected composition
export const getSelectedCompositionMissingFurnitureIds = createSelector(
    [getSelectedCompositionData, getFurnitureById],
    (selectedCompositionData, furnitureDataById) => {
        if (!selectedCompositionData || !selectedCompositionData.renderItems) {
            return []
        }
        return Object.values(selectedCompositionData.renderItems)
            .map((renderItem) => {
                const renderItemData = furnitureDataById[renderItem.id]
                if (!renderItemData) {
                    return renderItem.id
                }
                return null
            })
            .filter((i) => !!i)
    },
)

export const getSelectedCompositionTrackingRoomInfo = createSelector(
    [getSelectedScene, getSelectedCompositionData, getSelectedView],
    (scene, composition, selectedView) => {
        if (!scene) {
            return {}
        }

        const isMultiView = isMultiviewScene(scene)

        const compData = {
            DesignId: null,
            DesignSource: null,
            DesignTitle: null,
            ItemInRoomCount: null,
        }

        if (composition) {
            if (composition.id !== NEW_COMPOSITION_ID) {
                compData.DesignId = composition.id
            }
            compData.DesignSource = composition.isStock ? DESIGN_SOURCE_STOCK : DESIGN_SOURCE_USERDESIGNED
            if (composition.name) {
                compData.DesignTitle = composition.name
            }
        }

        return {
            ...compData,
            RoomTitle: scene.name,
            RoomId: scene.sceneId,
            RoomSource: getRoomSourceFromScene(scene),
            RoomSourceDetail: getRoomSourceDetailFromScene(scene),
            RoomSourceType: getSourceTypeLabel(scene),
            RoomViewType: getRoomViewTypeFromScene(scene),
            CurrentView: isMultiView ? selectedView : null,
            ItemInRoomCount: Object.entries(composition?.renderItems ?? {}).length,
        }
    },
)

// Get the total price of all render items in the selected composition
export const getSelectedCompositionRenderedItemsTotalPrice = createSelector(
    [getSelectedCompositionShoppableProductData],
    (productData) => {
        const totalPrice = productData.reduce((total, product) => total + product.priceNumeral, 0)
        return getLocalizedCurrencyString(totalPrice, getLocale())
    },
)

export const getSelectedCompositionRenderedItemsNumeralPrice = createSelector(
    [getSelectedCompositionShoppableProductData],
    (productData) => productData.reduce((total, product) => total + product.priceNumeral, 0),
)

// Get a unique set of localItemNumbers for the selected composition
export const getSelectedCompositionShoppableLocalIds = createSelector(
    [getSelectedCompositionProductData],
    (renderItemsWithProductData) => [
        ...new Set(renderItemsWithProductData.filter((item) => !item.hidden).map((i) => i.localItemNumber)),
    ],
)

export const getSelectedSceneWallsLegacy = createSelector([getSelectedScene], (sceneData) => {
    const walls =
        sceneData?.manifest &&
        sceneData.manifest.plane_orientation_0 &&
        sceneData.manifest.plane_orientation_0.planeData
            .map((plane, idx) => ({
                class: plane.class,
                planeIdx: idx,
            }))
            .filter((plane) => plane.class === 'wall')

    return walls || null
})

export const getSelectedSceneWalls = createSelector([getSelectedScene], (sceneData) => {
    const walls = (
        sceneData?.manifest?.plane_polygon_0?.plane_polygons || sceneData?.manifest?.plane_orientation_0?.planeData
    )
        ?.map((polygonOrPlane, idx) => ({
            class: polygonOrPlane.class,
            planeIdx: polygonOrPlane.id !== undefined ? polygonOrPlane.id : idx,
        }))
        .filter((plane) => plane.class === 'wall')

    return walls || null
})

export const getSelectedSceneWallsInpaint = createSelector([getSelectedScene], (sceneData) => {
    const walls = (
        sceneData?.manifest?.plane_polygon_0?.plane_polygons ||
        sceneData?.manifest?.plane_orientation_inpaint_0?.planeData
    )
        ?.map((polygonOrPlane, idx) => ({
            class: polygonOrPlane.class,
            planeIdx: polygonOrPlane.id !== undefined ? polygonOrPlane.id : idx,
        }))
        .filter((plane) => plane.class === 'wall')

    return walls || null
})

export const getSelectedSceneWallColorsList = createSelector([getSelectedScene], (sceneData) => {
    const colors = sceneData?.manifest && sceneData.manifest.plane_color_0 && sceneData.manifest.plane_color_0.colors

    return (colors && colors.wall) || null
})

export const getSelectedSceneWallMarkers = createSelector([getSelectedScene], (sceneData) => {
    const colors = sceneData?.manifest && sceneData.manifest.plane_color_0 && sceneData.manifest.plane_color_0.markers

    return colors || null
})

/**
 * Helper function to determine scene state based on state and jobState fields
 */
const getSceneState = (scene: Scene): SceneState => {
    // Check jobState first (more specific for Kreativ Lite scenes)
    if (scene.jobState === SCENE_STATE_PROCESSING || scene.jobState === SCENE_STATE_QUEUED) {
        return SCENE_STATE_PROCESSING
    }
    if (scene.jobState === SCENE_STATE_FAILED || scene.jobState === SCENE_STATE_ERROR) {
        return SCENE_STATE_FAILED
    }

    // For Kreativ Lite scenes (sourceType 5), "Uploaded" means waiting for processing
    // For other scene types, "Uploaded" is a valid final state (scene is ready)
    const isKreativLiteScene = scene.sourceType === SOURCETYPE_LITE_SCAN

    // Then check state field
    if (
        scene.state === SCENE_STATE_PROCESSING ||
        scene.state === SCENE_STATE_QUEUED ||
        (scene.state === SCENE_STATE_UPLOADED && isKreativLiteScene)
    ) {
        return SCENE_STATE_PROCESSING
    }
    if (scene.state === SCENE_STATE_FAILED || scene.state === SCENE_STATE_ERROR) {
        return SCENE_STATE_FAILED
    }

    return SCENE_STATE_SUCCESS
}

export const getCompositionsGroupedByScene = createSelector(
    [getUserSceneItems, getShowrooms, getUserCompositionsData],
    (scenes: Scene[], showrooms, compositions): RoomGroup[] => {
        const compositionsBySceneId = groupBy(compositions, (c) => c.sceneId)

        const groups: RoomGroup[] = []

        // First pick out all the compositions that we have a user scene for
        scenes.forEach((scene) => {
            const unsortedComps = compositionsBySceneId[scene.sceneId] ?? []
            const backupThumb = isRoomBuilderScene(scene) ? ROOM_BUILDER_SCENE_THUMBNAIL : null
            const comps = sortCompositionsByLastModified(unsortedComps)
            const firstComp = comps[0]
            const thumbUrl = firstComp?.thumbUrl ?? scene.thumbUrl ?? backupThumb
            const sceneState = getSceneState(scene)
            groups.push({
                id: scene.sceneId,
                sceneId: scene.sceneId,
                name: scene.name,
                thumbUrl,
                creationDate: scene.creationDate,
                lastModifiedDate: firstComp?.lastModifiedDate ?? scene.lastModifiedDate ?? '',
                canDeleteScene: true,
                roomSource: ROOM_SOURCE_USERCAPTURED,
                roomViewType: getRoomViewTypeFromScene(scene),
                compositions: comps,
                sceneState,
            })
            delete compositionsBySceneId[scene.sceneId]
        })

        // Next pick out all the compositions that come from active showrooms
        showrooms.forEach((showroom) => {
            const unsortedComps = compositionsBySceneId[showroom.scene]
            if (unsortedComps) {
                const comps = sortCompositionsByLastModified(unsortedComps)
                const firstComp = comps[0]
                groups.push({
                    id: showroom.scene,
                    sceneId: showroom.scene,
                    name: showroom.name,
                    thumbUrl: firstComp.thumbUrl,
                    lastModifiedDate: firstComp.lastModifiedDate,
                    canDeleteScene: false,
                    roomSource: ROOM_SOURCE_STOCK,
                    compositions: comps,
                    roomViewType: ROOM_VIEW_TYPE_MULTI, // Assume showrooms are multiview
                })
                delete compositionsBySceneId[showroom.scene]
            }
        })

        // Finally, the remaining compositions should still show on the dashboard
        // but we'll pull data from the first composition instead of the scene or showroom
        Object.values(compositionsBySceneId).forEach((unsortedComps) => {
            const comps = sortCompositionsByLastModified(unsortedComps)
            const firstComp = comps[0]
            groups.push({
                id: firstComp.sceneId,
                sceneId: firstComp.sceneId,
                name: firstComp.name,
                thumbUrl: firstComp.thumbUrl,
                creationDate: firstComp.creationDate,
                lastModifiedDate: firstComp.lastModifiedDate,
                canDeleteScene: false,
                roomSource: ROOM_SOURCE_OTHER,
                compositions: comps,
                roomViewType: ROOM_VIEW_TYPE_UNKNOWN,
            })
        })

        return groups
    },
)

export const getSortedCompositionsGroupedByScene = createSelector(
    [getCompositionsGroupedByScene],
    (groups: RoomGroup[]): RoomGroup[] => sortByDateProperty(groups, 'lastModifiedDate'),
)

export const getDesignsCount = createSelector([getUserCompositionsData], (comps) => comps.length)

export const getHasErrorLoading = createSelector(
    [
        getIsCompositionDataLoadedRaw,
        getIsSceneDataLoaded,
        getSelectedCompositionId,
        getFetchState,
        getSelectedComposition,
        getIsLoadingCompiledComposition,
    ],
    (
        isCompositionLoaded,
        isSceneLoaded,
        selectedCompositionId,
        sceneFetchState,
        composition,
        isLoadingCompiledComposition,
    ) => {
        const isNewComposition = selectedCompositionId === NEW_COMPOSITION_ID

        // If a compiled composition is being loaded, then there is no error
        if (!isNewComposition && !composition && isLoadingCompiledComposition) {
            return false
        }
        const isLoaded = isNewComposition ? isSceneLoaded : isCompositionLoaded

        // If fetching the scene returned a 401 (logged out user accessing a scene)
        // or 403 (logged in user accessing a scene they do not own),
        // we set the sceneFetchState to STATE_NOMINAL in the scene reducer
        // and the hasError is calculated here using the isLoaded variable.
        return (isLoaded && !composition) || sceneFetchState === STATE_ERROR
    },
)

export const getSelectedItemStackableLocalItemNos = createSelector(
    [getSelectedComposition, getSelectedRenderItem],
    (selectedComposition, selectedRenderItem) => {
        if (!selectedComposition || !selectedRenderItem) {
            return []
        }

        const selectedId = selectedRenderItem.uniqueId

        return selectedComposition.renderItems
            .filter((item) => item.uniqueId !== selectedId && item.parentId === selectedId)
            .map((item) => item.localItemNumber)
    },
)

export const getRenderItemById = createSelector([getSelectedComposition, (state, id) => id], (compositionItem, id) => {
    if (!compositionItem || id < 0) {
        return null
    }
    const renderItem = compositionItem.renderItems.find((i) => i.uniqueId === id)

    return renderItem || null
})

export const getSmartaRecommendedPlacementData = createSelector(
    [getSelectedCompositionData, getActiveSceneId, getFurnitureById],
    (compositionData, selectedSceneId, productsById) => {
        const filteredRenderItems = Object.values(compositionData.renderItems)
            .filter((item) => !item.hidden)
            .filter((item) => item.x !== null && item.y !== null)

        const placedFurniture = filteredRenderItems.map((item) => ({
            furnitureId: item.id,
            localItemNumber: productsById[item.id]?.localItemNumber,
            uniqueId: String(item.uniqueId),

            x: item.placement?.location3.localPos.x,
            y: item.placement?.location3.localPos.y,
            z: item.placement?.location3.localPos.z,
            heading: item.heading,
            headingI: item.placement?.rotation.x,
            headingJ: item.placement?.rotation.y,
            headingK: item.placement?.rotation.z,
            heading: item.placement?.rotation.w,
            parentAttachment: item.parentAttachment,
            parentId: item.parentIdOrSurface,

            gfxAttributes: {
                additionalContacts: item.additionalContacts,
                stackedPlane: item.stackedPlane,
                combinablePlacement: item.combinablePlacement,
                mirrorOptionEnabled: item.mirrorOptionEnabled,
                anchorCombinationIndex: item.anchorCombinationIndex,
                artData: {
                    sizeId: item.sizeId,
                    frameId: item.frameId,
                    colorId: item.colorId,
                    matteId: item.matteId,
                },
                placingBehavior: item.placingBehavior,
            },
            socket: item.socket,
            socketSet: item.socketSet,
        }))

        return {
            placedFurniture,
            sceneId: selectedSceneId,
            savedProperties: { ...compositionData.savedProperties },
        }
    },
)

export const getCompositionSavedProperties = createSelector([getSelectedCompositionData], (compositionData) => {
    if (!compositionData) {
        return {}
    }

    return compositionData.savedProperties
})

export const getSelectedFurnitureSwappableItemsData = createSelector(
    [getSelectedSwapFurnitureData, getFurnitureById],
    (selectedFurnitureData, itemsById) => {
        if (!selectedFurnitureData || !selectedFurnitureData.swappableItems) {
            return null
        }

        const { swappableItems: swappableItemIds } = selectedFurnitureData

        const swappableItemsData = swappableItemIds.map((swapId) => itemsById[swapId]).filter((item) => !!item)
        return swappableItemsData
    },
)
export const isSubcategoryInShoppableSelection = (subcategoryId: string) =>
    createSelector([getSelectedCompositionShoppableProductData], (furniture: ProductData[]) =>
        furniture.some((f) => f.subCategoryIds?.includes(subcategoryId)),
    )

export const getSelectedRenderItemGroup = createSelector(
    [getSelectedRenderItem, getSelectedComposition],
    (renderItem, composition) => {
        if (!renderItem || !composition) {
            return []
        }

        const { renderItems } = composition

        // If no parent, assume that the selected item is already the parent
        const parentId = renderItem.combinablePlacement?.parentId ?? renderItem.uniqueId

        const parentItem = renderItems.find((i) => i.uniqueId === parentId)

        const getSortString = (a) => a.combinablePlacement?.linkGroupName ?? ''

        const children = renderItems
            .filter((i) => i.combinablePlacement?.parentId === parentId)
            .filter((i) => !i.isNoninteractable && !i.hidden)
            .sort((a, b) => getSortString(b).localeCompare(getSortString(a)))

        return [parentItem, ...children]
    },
)

export const getIsMinimumExpertCheckCartValue = createSelector(
    [getSelectedCompositionRenderedItemsNumeralPrice],
    (totalPrice) => totalPrice >= expertCheckMinimumCartValues[getCountryCode()],
)

export const getIsMinimumExpertCheckItemCount = createSelector(
    [getNonCombinableShoppableProductData],
    (items) => items.length >= 8,
)

export const getIsMinimumExpertCheckCalloutTimeoutItemCount = createSelector(
    [getNonCombinableShoppableProductData],
    (items) => items.length >= 3,
)

export const getProductsFromLocalItemNumbers = createSelector(
    [getSelectedCompositionProductData, (_state: RootState, localItemNumbers: string[]) => localItemNumbers],
    (items, localItemNumbers): ProductData[] =>
        localItemNumbers
            .map((localItemNumber) => items.find((item) => item.localItemNumber === localItemNumber))
            .filter((item) => !!item),
)
