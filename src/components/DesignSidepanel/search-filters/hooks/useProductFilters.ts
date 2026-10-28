import { useMemo, useCallback } from 'react'
import * as furnitureActions from 'models/furniture/actions'
import * as furnitureSelectors from 'models/furniture/selectors'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'
import { initialState } from 'models/furniture/reducers'
import { clearQueryTerm } from 'models/referrer/slice'
import { getIsQueryContext } from 'models/referrer/selector'
import type { RawFilter, FilterSelections } from '../types/core'
import type { SearchApiParams } from '../types/api'
import type { ProductFilters } from '../types/hooks'
import { convertSelectionsToParams } from '../utils/api'
import { FILTER_IDS } from '../constants'

export type UseProductFiltersResult = {
    /** Raw filter definitions from the API */
    rawFilters: RawFilter[]
    /** Currently selected filter options */
    selectedFilterOptions: FilterSelections
    /** Updates filter selections and triggers new search */
    updateSelectedFilterOptions: (filters: FilterSelections | ((prev: FilterSelections) => FilterSelections)) => void
    /** Clears all filter selections while preserving search query */
    clearAllFilters: () => void
    /** Updates basic search parameters (query, category, room type) */
    filterBy: (filters: Partial<ProductFilters>) => void
    /** Clears all filters completely */
    clearFilters: () => void
}

/**
 * Custom hook for managing product filter state and API parameter conversion
 *
 * @param filters - Current filter state
 * @returns Filter management object with state and update functions
 */
export const useProductFilters = (filters: ProductFilters): UseProductFiltersResult => {
    const dispatch = useAppDispatch()

    const rawFiltersFromStore = useAppSelector(furnitureSelectors.getRawFilters)
    const selectedFilterOptions = useAppSelector(furnitureSelectors.getSelectedFilterOptions)

    const isQueryContext = useAppSelector(getIsQueryContext)

    // Process raw filters to sort ratings in descending order (5,4,3,2,1)
    const rawFilters = useMemo(
        () =>
            rawFiltersFromStore.map((filter) => {
                if (filter.id === FILTER_IDS.RATINGS && filter.values) {
                    return {
                        ...filter,
                        values: [...filter.values].sort((a, b) => parseInt(b.name, 10) - parseInt(a.name, 10)),
                    }
                }
                return filter
            }),
        [rawFiltersFromStore],
    )

    /**
     * Updates filter selections (color, size, price) from UI interactions.
     * Converts selections to API parameters and triggers new search.
     */
    const updateSelectedFilterOptions = useCallback(
        (newSelections: FilterSelections | ((prev: FilterSelections) => FilterSelections)) => {
            const finalSelections =
                typeof newSelections === 'function' ? newSelections(selectedFilterOptions) : newSelections

            dispatch(furnitureActions.updateSelectedFilterOptions(finalSelections))

            // Convert UI selections to API parameters and apply
            const updatedParams = convertSelectionsToParams(finalSelections, rawFilters, filters)

            dispatch(furnitureActions.updateFurnitureFilter(updatedParams))
        },
        [rawFilters, selectedFilterOptions, dispatch, filters],
    )

    /**
     * Clears all filter selections while preserving the search query and room type subcategories.
     * Resets both UI state and API parameters to initial values.
     */
    const clearAllFilters = useCallback(() => {
        // Reset to initial state but preserve current search query and room type context
        const baseSearchParams = {
            ...(initialState.filter as SearchApiParams),
            query: filters.query,
            subCategoryIds: filters.subCategoryIds, // Preserve room type subcategories
        }

        // Clear all filter selection parameters by passing empty selections
        const clearedParams = convertSelectionsToParams({}, rawFilters, baseSearchParams)

        dispatch(furnitureActions.updateFurnitureFilter(clearedParams))
        dispatch(furnitureActions.updateSelectedFilterOptions({}))
    }, [dispatch, filters, rawFilters])

    /**
     * Updates basic search parameters (search query, category, room type) directly.
     * Used for core navigation and search functionality, not UI filter selections.
     */
    const filterBy = useCallback(
        (searchUpdates: Partial<ProductFilters>) => {
            // If user is clearing the query input, clear the referrer query term so it will filter by first item of the query room type
            if (searchUpdates.query === '' && isQueryContext) {
                dispatch(clearQueryTerm())
                return
            }

            // Clear filter selections when search query changes
            if (searchUpdates.query !== undefined && searchUpdates.query !== filters.query) {
                dispatch(furnitureActions.updateSelectedFilterOptions({}))
            }

            // Apply search parameter changes directly (no selection conversion needed)
            dispatch(furnitureActions.updateFurnitureFilter(searchUpdates))
        },
        [dispatch, filters, isQueryContext],
    )

    /**
     * Clears all filters completely with room type context restoration
     */
    const clearFilters = () => {
        if (isQueryContext) {
            dispatch(clearQueryTerm())
        }
        dispatch(furnitureActions.clearSearchKeepContext())
    }

    return {
        rawFilters,
        selectedFilterOptions,
        updateSelectedFilterOptions,
        clearAllFilters,
        filterBy,
        clearFilters,
    }
}
