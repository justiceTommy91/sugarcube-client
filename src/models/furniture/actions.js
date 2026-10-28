import { createAction } from '@reduxjs/toolkit'
import * as types from 'models/actionTypes'
import { DEBUG_CATEGORY } from 'models/furniture/constants'

export const requestFurniture = () => ({
    type: types.REQUEST_FURNITURE_SAGA,
})

// This is receiving a filtered, paginated result
export const receiveFurniture = (furniture, filter, count, hasNext, moreToken, rawFilters, maxCount, sortOrders) => ({
    type: types.RECEIVE_FURNITURE,
    furniture,
    filter,
    count,
    hasNext,
    moreToken,
    rawFilters,
    maxCount,
    sortOrders,
})

export const failedReceiveFurniture = () => ({
    type: types.FAILED_RECEIVE_FURNITURE,
})

export const receiveAdditionalFurniture = (furniture) => ({
    type: types.RECEIVE_ADDITIONAL_FURNITURE,
    furniture,
})

export const receiveSocketFurniture = (furniture) => ({
    type: types.RECEIVE_SOCKET_FURNITURE,
    furniture,
})

export const requestFurnitureByIds = (ids) => ({
    type: types.REQUEST_FURNITURE_BY_IDS_SAGA,
    ids,
})

export const receiveFurnitureByIds = (furniture) => ({
    type: types.RECEIVE_FURNITURE_BY_IDS,
    furniture,
})

export const failedReceiveFurnitureByIds = () => ({
    type: types.FAILED_RECEIVE_FURNITURE_BY_IDS,
})

export const requestFurnitureByLocalItemNos = (localItemNos) => ({
    type: types.REQUEST_FURNITURE_BY_LOCALITEMNOS_SAGA,
    localItemNos,
})

export const receiveFurnitureByLocalItemNos = (furniture) => ({
    type: types.RECEIVE_FURNITURE_BY_LOCALITEMNOS,
    furniture,
})

export const failedReceiveFurnitureByLocalItemNos = () => ({
    type: types.FAILED_RECEIVE_FURNITURE_BY_LOCALITEMNOS,
})

export const requestFurnitureBySetId = (setId) => ({
    type: types.REQUEST_FURNITURE_BY_SET_ID_SAGA,
    setId,
})

export const receiveFurnitureBySetId = (furniture, localItemNumbers, setItems) => ({
    type: types.RECEIVE_FURNITURE_BY_SET_ID,
    furniture,
    localItemNumbers,
    setItems,
})

export const failedReceiveFurnitureBySetId = () => ({
    type: types.FAILED_RECEIVE_FURNITURE_BY_SET_ID,
})

export const requestPlaceProduct = (localItemNo) => ({
    type: types.REQUEST_PLACE_PRODUCT_SAGA,
    localItemNo,
})

export const receivePlaceProduct = createAction(types.RECEIVE_PLACE_PRODUCT, (product) => ({
    payload: {
        product,
    },
}))

export const failedReceivePlaceProduct = createAction(types.FAILED_RECEIVE_PLACE_PRODUCT)

export const requestFurnitureCategories = (region) => ({
    type: types.REQUEST_FURNITURE_CATEGORIES_SAGA,
    region,
})

export const receiveFurnitureCategories = (categories) => ({
    type: types.RECEIVE_FURNITURE_CATEGORIES,
    categories,
})

export const failedReceiveFurnitureCategories = () => ({
    type: types.FAILED_RECEIVE_FURNITURE_CATEGORIES,
})

export const requestFurnitureSwappables = (id) => ({
    type: types.REQUEST_FURNITURE_SWAPPABLES_SAGA,
    id,
})

export const receiveFurnitureSwappables = (furniture, id, hasNext) => ({
    type: types.RECEIVE_FURNITURE_SWAPPABLES,
    furniture,
    id,
    hasNext,
})

export const failedReceiveFurnitureSwappables = () => ({
    type: types.FAILED_RECEIVE_FURNITURE_SWAPPABLES,
})

export const requestFurnitureGoesWith = (id) => ({
    type: types.REQUEST_FURNITURE_GOES_WITH_SAGA,
    id,
})

export const receiveFurnitureGoesWith = (furniture, id) => ({
    type: types.RECEIVE_FURNITURE_GOES_WITH,
    furniture,
    id,
})

export const failedReceiveFurnitureGoesWith = () => ({
    type: types.FAILED_RECEIVE_FURNITURE_GOES_WITH,
})

export const requestFurnitureCombinables = (id, uniqueId, slotCategory, size, variant, nodeIndex) => ({
    type: types.REQUEST_FURNITURE_COMBINABLES_SAGA,
    id,
    uniqueId,
    slotCategory,
    size,
    variant,
    nodeIndex,
})

export const receiveFurnitureCombinables = (furniture, parentId, parentUniqueId, nodeIndex) => ({
    type: types.RECEIVE_FURNITURE_COMBINABLES,
    furniture,
    parentId,
    parentUniqueId,
    nodeIndex,
})

export const failedReceiveFurnitureCombinables = () => ({
    type: types.FAILED_RECEIVE_FURNITURE_COMBINABLES,
})

export const selectFurniture = createAction(types.SELECT_FURNITURE, (id) => ({
    payload: {
        id,
    },
}))

export const selectSwapFurnitureForDetails = (id) => ({
    type: types.SELECT_FURNITURE_SWAP_DETAILS,
    id,
})

export const updateFurnitureFilter = (filter, trackingInfo) => ({
    type: types.FURNITURE_FILTER_UPDATE,
    filter,
    trackingInfo,
})

export const clearFurnitureFilter = () => ({
    type: types.FURNITURE_FILTER_CLEAR,
})

export const clearSearchKeepContext = () => ({
    type: types.CLEAR_SEARCH_KEEP_CONTEXT,
})

export const updateSelectedFilterOptions = (selectedFilterOptions) => ({
    type: types.UPDATE_SELECTED_FILTER_OPTIONS,
    selectedFilterOptions,
})

// Room type selection actions
export const selectRoomTypeInFilter = (roomTypeId, subCategoryIds, subCategoryNames, roomTypeSearchQuery) => ({
    type: types.SELECT_ROOM_TYPE_IN_FILTER,
    roomTypeId,
    subCategoryIds,
    subCategoryNames,
    roomTypeSearchQuery,
})

export const filterBySubCategory = (subCategoryId, subCategoryName, roomTypeId) => ({
    type: types.FILTER_BY_SUB_CATEGORY,
    subCategoryId,
    subCategoryIds: subCategoryId.toString(), // For single subcategory, API gets just that ID
    subCategoryNames: subCategoryName, // For single subcategory, tracking gets just that name
    roomTypeId, // Store which room type this subcategory belongs to
})

export const clearSubCategoryFilter = (allSubCategoryIds, allSubCategoryNames, restoreQuery) => ({
    type: types.CLEAR_SUB_CATEGORY_FILTER,
    subCategoryIds: allSubCategoryIds, // Restore all subcategories for current room type
    subCategoryNames: allSubCategoryNames, // Restore all subcategory names for tracking
    restoreQuery, // NEW: Query to restore (from roomTypeTranslatedName)
})

export const clearSearchAndRestoreRoomType = (roomTypeId, subCategoryIds) => ({
    type: types.CLEAR_SEARCH_AND_RESTORE_ROOM_TYPE,
    roomTypeId,
    subCategoryIds,
})

export const clearFurnitureSearch = () => ({
    type: types.FURNITURE_SEARCH_CLEAR,
})

export const requestFurnitureVariants = (id) => ({
    type: types.REQUEST_FURNITURE_VARIANTS_SAGA,
    id,
})

export const receiveFurnitureVariants = (furnitures, selectedIndices, id) => ({
    type: types.RECEIVE_FURNITURE_VARIANTS,
    furnitures,
    selectedIndices,
    id,
})

export const failedReceiveFurnitureVariants = () => ({
    type: types.FAILED_RECEIVE_FURNITURE_VARIANTS,
})

export const requestStoreSelection = () => ({
    type: types.REQUEST_STORE_SELECTION,
})

export const requestStoreSelectionChange = (isZip = false) => ({
    type: types.REQUEST_STORE_SELECTION_CHANGE,
    isZip,
})

export const updateLocation = ({ zipcode, storeId }) => ({
    type: types.UPDATE_LOCATION,
    zipcode,
    storeId,
})

export const receiveCombinablesWithMetadata = (furniture) => ({
    type: types.RECEIVE_COMBINABLES_WITH_METADATA,
    furniture,
})

export const requestFurnitureByComposition = (id, forceLegacyManifest) => ({
    type: types.REQUEST_FURNITURE_BY_COMPOSITION_SAGA,
    id,
    forceLegacyManifest,
})

export const requestPersonalizedProductRecommendations = createAction(
    types.REQUEST_PERSONALIZED_PRODUCT_RECOMMENDATIONS,
)
export const receivePersonalizedProductRecommendations = createAction(
    types.RECEIVE_PERSONALIZED_PRODUCT_RECOMMENDATIONS,
)
export const failedReceivePersonalizedProductRecommendations = createAction(
    types.FAILED_RECEIVE_PERSONALIZED_PRODUCT_RECOMMENDATIONS,
)

export const selectDebugCategory = () => updateFurnitureFilter({ category: DEBUG_CATEGORY, subCategoryIds: null })
