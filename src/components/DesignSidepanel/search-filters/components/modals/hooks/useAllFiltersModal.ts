import { useCallback } from 'react'
import { useAppSelector } from 'hooks/useAppSelector'
import * as furnitureSelectors from 'models/furniture/selectors'
import { SortState, SortOption } from '../../../types/sort'
import { DEFAULT_SORT_OPTION_ID } from '../../../constants'

export type AllFiltersModalHook = {
    hasActiveFilters: boolean
    handleSelectionChange: (filterId: string, values: string[]) => void
    getSelectedSortOptionName: () => string | undefined
}

export type UseAllFiltersModalProps = {
    selectedFilterOptions: Record<string, string[]>
    resultCount: number
    sortState: SortState | null
    onApplyFilters: (filters: Record<string, string[]>) => void
}

export const useAllFiltersModal = ({
    selectedFilterOptions,
    sortState,
    onApplyFilters,
}: UseAllFiltersModalProps): AllFiltersModalHook => {
    const filters = useAppSelector(furnitureSelectors.getFilter)

    const handleSelectionChange = useCallback(
        (filterId: string, values: string[]) => {
            const newFilters = {
                ...selectedFilterOptions,
                [filterId]: values.length > 0 ? values : [],
            }

            // Remove empty filter arrays before applying
            const cleanedFilters = Object.fromEntries(
                Object.entries(newFilters).filter(([, filterValues]) => filterValues.length > 0),
            )
            onApplyFilters(cleanedFilters)
        },
        [selectedFilterOptions, onApplyFilters],
    )

    const getSelectedSortOptionName = (): string | undefined => {
        if (!sortState) return undefined

        const selectedOption = sortState.options.find((option: SortOption) => option.selected)
        // Only show caption when non-default sort option is selected
        return selectedOption && selectedOption.id !== DEFAULT_SORT_OPTION_ID ? selectedOption.name : undefined
    }

    // Check if any filters are currently applied or if a non-default sort option is selected
    const hasActiveFilters =
        Object.values(selectedFilterOptions).some((values) => values.length > 0) ||
        filters.inStockStore ||
        filters.availableOnline ||
        Boolean(
            sortState &&
                sortState.options.some((option: SortOption) => option.selected && option.id !== DEFAULT_SORT_OPTION_ID),
        )

    return {
        hasActiveFilters,
        handleSelectionChange,
        getSelectedSortOptionName,
    }
}
