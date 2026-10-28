import { useAppSelector } from 'hooks/useAppSelector'
import * as furnitureSelectors from 'models/furniture/selectors'
import type { RenderItemComplete } from 'models/compositions'

import { useProductSearchState } from './useProductSearchState'
import { useProductFilters } from './useProductFilters'
import { useProductSort } from './useProductSort'
import type { RawFilter, FilterSelections } from '../types/core'
import type { SortState, SortOptionId } from '../types/sort'
import type { AsyncStatus, ProductSearchError, ProductFilters } from '../types/hooks'

export type UseProductSearchResults = {
    results: RenderItemComplete[]
    status: AsyncStatus
    filters: ProductFilters
    filterBy: (filters: Partial<ProductFilters>) => void
    clearFilters: () => void
    fetchNextPage: () => Promise<void>
    haveMore: boolean
    rawFilters: RawFilter[]
    selectedFilterOptions: FilterSelections
    updateSelectedFilterOptions: (filters: FilterSelections | ((prev: FilterSelections) => FilterSelections)) => void
    clearAllFilters: () => void
    sortState: SortState | null
    updateSortOrder: (sortOptionId: SortOptionId) => void
    /** Current number of results in page/response (pagination-aware) */
    count: number
    /** Maximum total results available for current search/filter criteria */
    maxCount: number
    /** Whether we're currently loading due to a new search query (as opposed to filtering) */
    isSearchLoading: boolean
    error: ProductSearchError | null
}

/**
 * Main product search hook that orchestrates search state, filters, and sorting.
 * This is a coordinating hook that combines three focused sub-hooks for better maintainability.
 */
export const useProductSearch = (): UseProductSearchResults => {
    const apiFilters = useAppSelector(furnitureSelectors.getFilter)
    const selectedRoomTypeId = useAppSelector(furnitureSelectors.getSelectedRoomTypeId)
    const selectedSubCategoryId = useAppSelector(furnitureSelectors.getSelectedSubCategoryId)
    const subCategoryNames = useAppSelector(furnitureSelectors.getSubCategoryNames)

    // Compose complete filter state including API params, UI state, and tracking data
    const filters = {
        ...apiFilters,
        selectedRoomTypeId,
        selectedSubCategoryId,
        subCategoryNames,
    } as ProductFilters

    const searchState = useProductSearchState(filters)
    const { rawFilters, selectedFilterOptions, updateSelectedFilterOptions, clearAllFilters, filterBy, clearFilters } =
        useProductFilters(filters)
    const sortState = useProductSort(filters)

    return {
        results: searchState.results,
        status: searchState.status,
        count: searchState.count,
        maxCount: searchState.maxCount,
        haveMore: searchState.haveMore,
        fetchNextPage: searchState.fetchNextPage,
        isSearchLoading: searchState.isSearchLoading,
        error: searchState.error,
        filters: { ...filters, query: filters.query ?? '' },
        rawFilters,
        selectedFilterOptions,
        updateSelectedFilterOptions,
        clearAllFilters,
        filterBy,
        clearFilters,
        sortState: sortState.sortState,
        updateSortOrder: sortState.updateSortOrder,
    }
}
