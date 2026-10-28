import { createSelector } from 'reselect'

import { DEFAULT_SORT_OPTION_ID } from 'components/DesignSidepanel/search-filters/constants'
import { getIsAdmin, getSubCatalogs as getUserSubCatalogs } from 'models/user/selectors'
import { getAllRoomTypeOptions, getRoomTypes } from 'models/roomTypes/selectors'
import { findDefaultRoomType } from 'models/roomTypes/utils'
import { reorderByUniqueName } from 'utils/productReordering'
import sortByArray from 'utils/sortByArray'
import { SEARCH_CATEGORY_PAGE_SIZE } from 'models/furniture/constants'
import { getIsLivingRoomContext } from 'models/location/selectors'

const getById = (state) => state.furniture.byId
const getSelectedId = (state) => state.furniture.selectedId
const getRecommendations = (state) => state.furniture.recommendations

export const getLocation = (state) => state.furniture.location
export const getSwapAnchorId = (state) => state.furniture.swapAnchorId
export const getSelectedSwapDetailsId = (state) => state.furniture.selectedSwapDetailsId
export const getStackEnabled = (state) => state.furniture.stackEnabled
export const getFilterResult = (state) => state.furniture.filterResult
/** @returns {import('../components/DesignSidepanel/search-filters/types').RawFilter[]} */
export const getRawFilters = (state) => state.furniture.rawFilters || []
/** @returns {Record<string, string[]>} */
export const getSelectedFilterOptions = (state) => state.furniture.selectedFilterOptions || {}
/** @returns {import('../components/DesignSidepanel/search-filters/types').ApiSortOrders | null} */
export const getSortOrders = (state) => state.furniture.sortOrders
export const getPlaceProductId = (state) => state.compositions.placeProductId
export const getFurnitureIsLoading = (state) => state.furniture.isLoading
export const getFurnitureIsLoadingByIds = (state) => state.furniture.isLoadingByIds
export const getFurnitureIsLoadingByLocalItemNos = (state) => state.furniture.isLoadingByLocalItemNos
export const getIsSwappablesLoading = (state) => state.furniture.isSwappablesLoading
export const getIsGoesWithLoading = (state) => state.furniture.isGoesWithLoading
/** @returns {boolean} */
export const getIsCategoriesLoading = (state) => state.furniture.isCategoriesLoading
export const getFilter = (state) => state.furniture.filter
/** @returns {import('./types').Category[]} */
export const getCategories = (state) => state.furniture.categories
export const getHasLocation = (state) => !!(state.furniture.location.zipcode || state.furniture.location.storeId)
export const getHasStoreId = (state) => !!state.furniture.location.storeId
export const getHasAdditionalFurniture = (state) => state.furniture.hasAdditionalFurniture
export const getSwappablesLoadHasNext = (state) => state.furniture.swappablesLoadHasNext
export const getLastSelectedRoomTypeId = (state) => state.furniture.lastSelectedRoomTypeId
export const getSelectedRoomTypeId = (state) => state.furniture.selectedRoomTypeId
export const getSelectedSubCategoryId = (state) => state.furniture.selectedSubCategoryId
export const getSubCategoryNames = (state) => state.furniture.subCategoryNames
export const isLoadingBySetId = (state) => state.furniture.isLoadingBySetId

/** @type {(state: import('store').RootState, number) => number[]} */
export const getGoesWithProducts = createSelector(
    [getById, (state, productId) => productId],
    (furnitureById, productId) => {
        const product = furnitureById[productId]
        return product?.goesWithItems ?? []
    },
)

/** @type {(state: import('store').RootState, number) => number[]} */
export const getSwappableProducts = createSelector(
    [getById, (state, productId) => productId],
    (furnitureById, productId) => {
        const product = furnitureById[productId]
        return product?.swappableItems ?? []
    },
)

/** @type {(state: import('store').RootState, uniqueId: number) => import('models/compositions').RenderItemComplete | undefined} */
export const getFurnitureByUniqueId = createSelector(
    [getById, (state, uniqueId) => uniqueId],
    (furnitureById, uniqueId) => {
        const product = Object.values(furnitureById).find((item) => item.uniqueId === uniqueId)
        return product
    },
)

export const getFurnitureById = createSelector([getById], (itemsById) => itemsById)

export const getFurnitureByLocalItemNumber = createSelector(
    [getFurnitureById],
    (itemsById) => (localItemNumber) =>
        Object.values(itemsById).find((item) => item.localItemNumber === localItemNumber),
)

export const getRealFurnitureIds = createSelector([getFurnitureById], (itemsById) => {
    const ids = []
    Object.entries(itemsById).forEach(([id, item]) => {
        if (!item.hidden) {
            ids.push(id)
        }
    })
    return ids
})

export const getSubCatalogs = createSelector(
    [getById, getUserSubCatalogs, getIsAdmin],
    (itemsById, userSubCatalogs, isAdmin) => {
        if (isAdmin) {
            const result = new Set()
            Object.values(itemsById).forEach((item) => {
                if (item.subCatalogs) {
                    item.subCatalogs.forEach((subCat) => {
                        result.add(subCat)
                    })
                }
            })
            return sortByArray(Array.from(result), [(a) => a, userSubCatalogs], (a) => a)
        }
        return userSubCatalogs
    },
)

export const getPlacedProductData = createSelector(
    [getPlaceProductId, getFurnitureById],
    (placedProductId, furnitureDataById) => furnitureDataById[placedProductId] || null,
)

// Get the goes well with products for the auto placed product
export const getPlacedProductGoesWellWithItems = createSelector(
    [getPlacedProductData, getFurnitureById],
    (placedProductData, furnitureDataById) => {
        if (!placedProductData || !placedProductData.goesWithItems) {
            return null
        }
        const { goesWithItems: goesWithItemIds } = placedProductData

        const goesWithItemsData = goesWithItemIds
            .map((goesWithId) => furnitureDataById[goesWithId])
            .filter((item) => !!item)

        return goesWithItemsData
    },
)

export const getFurnitureByFilter = createSelector(
    [
        getFurnitureById,
        getFilterResult,
        getFilter,
        getIsGoesWithLoading,
        getPlacedProductGoesWellWithItems,
        getSelectedRoomTypeId,
        getSelectedSubCategoryId,
    ],
    (itemsById, filterResult, furnitureFilter, isGoesWithLoading, goesWellProducts, selectedRoomTypeId, selectedSubCategoryId) => {
        const isLivingRoomIntegration = getIsLivingRoomContext()
        const filteredFurniture = filterResult.ids.map((fId) => itemsById[fId]).filter((i) => !!i && !i.hidden)
        const isSearchActive = !!furnitureFilter?.query

        /*
            For category pages like /living-room, the design experience presents goes well with products in the add tab of the side panel. 
            We use this selector to return the goes well with products for the auto placed product, if there are more than 6 goes-well-with products.
        */
        if (isLivingRoomIntegration && !isGoesWithLoading && goesWellProducts?.length > 6 && !isSearchActive) {
            return goesWellProducts
        }

        // Apply reordering ONLY when in room type search mode AND sort order is RELEVANCE
        // AND no specific subcategory is selected (showing all subcategories)
        const isRoomTypeMode = selectedRoomTypeId !== null && selectedRoomTypeId !== '*'
        const isRelevanceSort = furnitureFilter?.sortOrder === DEFAULT_SORT_OPTION_ID || !furnitureFilter?.sortOrder
        const noSubCategorySelected = selectedSubCategoryId === null
        if (!isRoomTypeMode || !isRelevanceSort || !noSubCategorySelected || filteredFurniture.length === 0) {
            return filteredFurniture
        }

        // Split results into pages and reorder each page independently
        const pageSize = SEARCH_CATEGORY_PAGE_SIZE
        const reorderedResults = []

        for (let i = 0; i < filteredFurniture.length; i += pageSize) {
            const pageProducts = filteredFurniture.slice(i, i + pageSize)
            const reorderedPage = reorderByUniqueName(pageProducts)
            reorderedResults.push(...reorderedPage)
        }

        return reorderedResults
    },
)

// Get recommendations given items in the composition
export const getPersonalizedProductRecommendations = createSelector(
    [getFurnitureById, getRecommendations],
    (itemsById, recommendations) => ({
        ...recommendations,
        products: recommendations.data // Start with array of ids
            .reduce((acc, cur) => (acc.includes(cur) ? acc : [...acc, cur]), []) // Remove duplicates
            .map((productId) => itemsById[productId]) // Get product data
            .filter((i) => Boolean(i) && !i.hidden), // Remove unwanted products
    }),
)

export const getCanLoadMore = createSelector([getFilterResult], (filterResult) => filterResult.hasNext)

export const getNumberFurnitureItems = createSelector([getFilterResult], (filterResult) => filterResult.count)

export const getMaxFurnitureItems = createSelector([getFilterResult], (filterResult) => filterResult.maxCount)

export const getPaginationInfo = createSelector([getFilterResult], (filterResult) => {
    // Use accumulated IDs length as the true count of loaded results
    const actualCount = filterResult.ids.length
    return {
        currentPage: filterResult.currentPage,
        count: actualCount, // Use accumulated count, not the API response count
        pageResponseCount: filterResult.count, // Keep the original for debugging
        maxCount: filterResult.maxCount,
        hasNext: filterResult.hasNext,
        moreToken: filterResult.moreToken,
        // Calculate start/end based on results loaded so far
        start: 0, // Always starts from 0 for accumulated results
        end: actualCount, // Actual accumulated count is the end position
        progress: filterResult.maxCount > 0 ? (actualCount / filterResult.maxCount) * 100 : 0,
    }
})

export const getIsFilterActive = createSelector(
    getFilter,
    (filter) => filter.category !== '*' || filter.subCategory !== '*' || filter.subCatalog !== '*',
)

export const getSelectedRoomTypeFromFilter = createSelector(
    [getSelectedRoomTypeId, getAllRoomTypeOptions, getRoomTypes],
    (selectedRoomTypeId, allRoomTypeOptions, roomTypes) => {
        // No room types available
        if (!allRoomTypeOptions || allRoomTypeOptions.length === 0) {
            return null
        }

        // No room type selected yet, return bedroom (or first room type as fallback)
        if (!selectedRoomTypeId) {
            return findDefaultRoomType(roomTypes)
        }

        // Try to find match (including complete-my-room option if flag is enabled)
        const matchedRoomType = allRoomTypeOptions.find((rt) => rt.humanId === selectedRoomTypeId)

        // If match fails but room types exist, return bedroom as fallback
        return matchedRoomType || findDefaultRoomType(roomTypes)
    },
)

export const getSelectedSubCategoryFromFilter = createSelector(
    [getSelectedSubCategoryId, getSelectedRoomTypeFromFilter],
    (selectedSubCategoryId, selectedRoomType) => {
        if (!selectedSubCategoryId || !selectedRoomType?.categories) return null
        return selectedRoomType.categories.find((cat) => cat.categoryId === selectedSubCategoryId) || null
    },
)

export const getSubCategoryIdsFromFilter = createSelector(
    [getSelectedRoomTypeFromFilter, getSelectedSubCategoryFromFilter],
    (selectedRoomType, selectedSubCategory) => {
        if (!selectedRoomType) return null

        if (selectedSubCategory) {
            // Return single selected sub-category ID
            return selectedSubCategory.categoryId
        }
        // Return all sub-category IDs for the selected room type
        return selectedRoomType.categoryIds
    },
)

export const getSelectedFurnitureData = createSelector([getFurnitureById, getSelectedId], (furniture, selectedId) => {
    if (!furniture || !furniture[selectedId]) {
        return null
    }
    return {
        ...furniture[selectedId],
    }
})

export const getSelectedSwapFurnitureData = createSelector(
    [getFurnitureById, getSwapAnchorId],
    (furniture, selectedId) => furniture[selectedId] || null,
)

export const getSelectedSwapDetailsFurnitureData = createSelector(
    [getFurnitureById, getSelectedSwapDetailsId],
    (furniture, selectedId) => furniture[selectedId] || null,
)

export const getSelectedFurnitureRecommendedListData = createSelector(
    [getSelectedFurnitureData, getFurnitureById],
    (selectedFurnitureData, itemsById) => {
        if (!selectedFurnitureData || !selectedFurnitureData.recommended) {
            return null
        }
        const { recommended } = selectedFurnitureData
        return Object.values(itemsById).filter(({ id: itemId }) => recommended.includes(itemId))
    },
)

export const getSelectedFurnitureGoesWithItemsData = createSelector(
    [getSelectedFurnitureData, getFurnitureById],
    (selectedFurnitureData, itemsById) => {
        if (!selectedFurnitureData || !selectedFurnitureData.goesWithItems) {
            return null
        }

        const { goesWithItems: goesWithItemIds } = selectedFurnitureData

        const goesWithItemsData = goesWithItemIds.map((goesWithId) => itemsById[goesWithId]).filter((item) => !!item)

        return goesWithItemsData
    },
)

export const getSelectedFurnitureHasGoesWithProducts = createSelector(
    [getSelectedFurnitureGoesWithItemsData, getIsGoesWithLoading],
    (goesWithFurnitureData, isLoadingGoesWith) =>
        !!(goesWithFurnitureData && goesWithFurnitureData.length) && !isLoadingGoesWith,
)

export const getProductsMissingAvailabilityIds = createSelector(
    [getFurnitureById, getHasLocation, getLocation],
    (itemsById, hasLocation, location) => {
        // No location so we don't expect any item to have availability data
        if (!hasLocation) {
            return []
        }

        const { zipcode, storeId } = location

        return Object.values(itemsById)
            .filter((item) => {
                // Skip anything (like hidden items) that don't support availability
                if (!item.availability || item.hidden) {
                    return false
                }

                if (zipcode && !item.availability.online) {
                    return true
                }
                if (storeId && !item.availability.store) {
                    return true
                }
                if (storeId && item.availability.pickup === null) {
                    return true
                }

                return false
            })
            .map((item) => item.id)
    },
)

export const getFurnitureSubCategory = createSelector([getFurnitureByFilter], (filteredFurniture) => {
    if (!filteredFurniture || !filteredFurniture.length) {
        return {
            category: '',
            subCategory: '',
        }
    }

    return {
        category: filteredFurniture[0].categories?.[0] || '',
        subCategory: filteredFurniture[0].subCategories?.[0] || '',
    }
})

export const getSelectedFurnitureBeforeSwap = createSelector(
    [getSelectedSwapFurnitureData, getSelectedFurnitureData],
    (previouslySelectedFurniture, currentlySelectedFurniture) => {
        if (
            !previouslySelectedFurniture ||
            !currentlySelectedFurniture ||
            previouslySelectedFurniture.id === currentlySelectedFurniture.id
        ) {
            return null
        }

        return previouslySelectedFurniture
    },
)

/**
 * Returns the stored translated room type name for restoration purposes when switching selected room type filter, to search, then clearing the search (the previously selected room type should be restored)
 */
export const getRoomTypeTranslatedName = (state) => state.furniture.roomTypeTranslatedName

/**
 * Returns true if currently in room type 'search' mode
 * (search initiated from room type dropdown, not user typing in the search input)
 */
export const isInRoomTypeSearchMode = (state) => state.furniture.filter.isRoomTypeSearch === true

/**
 * Returns true if room type UI should be visible
 * Used by components to determine when to show room type selector and pills
 */
export const shouldShowRoomTypeUI = createSelector(
    [getFilter, isInRoomTypeSearchMode, getRoomTypes],
    (filter, isRoomTypeMode, roomTypes) => {
        const query = filter.query
        return roomTypes.length > 0 && (!query || query.trim().length === 0 || isRoomTypeMode)
    },
)
