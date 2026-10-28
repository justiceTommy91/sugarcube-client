import { useMemo, useCallback } from 'react'
import { useSearchTracking, SEARCH_TYPES } from 'hooks/useSearchTracking'
import { SEARCH_CHANGE_TYPES } from 'utils/searchTracking'
import { getFilterOptionState } from '../../../utils/filters'
import type { RawFilter } from '../../../types/core'

/**
 * Hook for optimizing filter operations with memoized state and callbacks
 */
export const useFilterOptimizations = (
    selectedValues: string[],
    onSelectionChange: (values: string[]) => void,
    filter?: RawFilter,
) => {
    const { trackSearchResult } = useSearchTracking()

    // Memoize selected values set for O(1) lookups
    const selectedValuesSet = useMemo(() => new Set(selectedValues), [selectedValues])

    // Memoize toggle function to prevent unnecessary re-renders
    const toggleFilterOption = useCallback(
        (optionId: string, checked: boolean) => {
            // Track filter selection/deselection if filter info is available
            if (filter) {
                const option = filter.values?.find((opt) => opt.id === optionId)

                if (option) {
                    // Track the filter change (modal filter)
                    // Use explicit format to indicate add or remove action
                    const actionValue = checked ? option.name : `REMOVE(${filter.id}:${option.name})`
                    trackSearchResult(SEARCH_TYPES.FILTER, {
                        type: SEARCH_CHANGE_TYPES.FILTER,
                        value: actionValue,
                        filterId: filter.id,
                    })
                } else {
                    // For boolean filters, the filter itself is the option - use 'true' instead of filter name
                    const actionValue = checked ? `true` : `REMOVE(${filter.id}:true)`
                    trackSearchResult(SEARCH_TYPES.FILTER, {
                        type: SEARCH_CHANGE_TYPES.FILTER,
                        value: actionValue,
                        filterId: filter.id,
                    })
                }
            }

            const newValues = checked ? [...selectedValues, optionId] : selectedValues.filter((id) => id !== optionId)
            onSelectionChange(newValues)
        },
        [selectedValues, onSelectionChange, filter, trackSearchResult],
    )

    // Combined helper to get both selected and disabled state for a filter option
    const getOptionState = (item: { id: string; count?: number }) => getFilterOptionState(item, selectedValuesSet)

    return { selectedValuesSet, toggleFilterOption, getOptionState }
}
