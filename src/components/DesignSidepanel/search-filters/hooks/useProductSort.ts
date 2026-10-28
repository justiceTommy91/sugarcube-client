import { useMemo, useCallback } from 'react'
import * as furnitureActions from 'models/furniture/actions'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'
import { getSortOrders } from 'models/furniture/selectors'
import type { SortState, SortOptionId } from '../types/sort'
import type { ProductFilters } from '../types/hooks'
import { createSortState } from '../utils/api'
import { DEFAULT_SORT_OPTION_ID } from '../constants'

export type UseProductSortResult = {
    /** Current sort state with options and selection (null if no sort orders available) */
    sortState: SortState | null
    /** Updates the sort order and triggers a new search */
    updateSortOrder: (sortOptionId: SortOptionId) => void
}

/**
 * Custom hook for managing product sort state
 *
 * @param filters - Current filter state to access sort order
 */
export const useProductSort = (filters: ProductFilters): UseProductSortResult => {
    const dispatch = useAppDispatch()
    const sortOrders = useAppSelector(getSortOrders)

    // Create sort state from API sort orders and current sort option
    const sortState = useMemo(() => {
        if (!sortOrders) {
            return null
        }

        // Use DEFAULT_SORT_OPTION_ID as default if no sort order is set
        const currentSortOrder = filters.sortOrder || DEFAULT_SORT_OPTION_ID
        return createSortState(sortOrders, currentSortOrder)
    }, [sortOrders, filters.sortOrder])

    /**
     * Updates the sort order and triggers a new search.
     */
    const updateSortOrder = useCallback(
        (sortOptionId: SortOptionId) => {
            // Don't update if the same sort option is already selected
            if (filters.sortOrder === sortOptionId) {
                return
            }

            // Apply sort parameter change
            dispatch(furnitureActions.updateFurnitureFilter({ sortOrder: sortOptionId }))
        },
        [filters.sortOrder, dispatch, sortState?.options],
    )

    return {
        sortState,
        updateSortOrder,
    }
}
