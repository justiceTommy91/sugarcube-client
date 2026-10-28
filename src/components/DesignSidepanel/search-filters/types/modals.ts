/**
 * Modal-specific types for filter modal components and hooks
 */

import type { RawFilter } from './core'
import type { SortState, SortOptionId } from './sort'

// Modal filter component props
export type FilterProps = {
    filter: RawFilter
    selectedValues: string[]
    onSelectionChange: (values: string[]) => void
}

export type FilterModalActions = {
    onApplyFilters: (filters: Record<string, string[]>) => void
    onClearAllFilters: () => void
    onSortChange: (sortOptionId: SortOptionId) => void
}

export type AllFiltersModalHook = {
    expandedFilters: Record<string, boolean>
    hasActiveFilters: boolean
    handleSelectionChange: (filterId: string, values: string[]) => void
    handleToggleExpansion: (filterId: string) => void
    getSelectedSortOptionName: () => string | undefined
}

export type AllFiltersModalContentProps = {
    rawFilters: RawFilter[]
    selectedFilterOptions: Record<string, string[]>
    expandedFilters: Record<string, boolean>
    sortState: SortState
    getSelectedSortOptionName: () => string | undefined
    onSelectionChange: (filterId: string, values: string[]) => void
    onToggleExpansion: (filterId: string) => void
    onSortChange: (sortOptionId: SortOptionId) => void
}
