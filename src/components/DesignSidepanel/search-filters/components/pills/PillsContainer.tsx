import React from 'react'

import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import { DropdownProvider } from './hooks/useDropdownManager'
import { FilterPillSwitch } from './FilterPillSwitch'
import { ShowAllFiltersPill } from './ShowAllFiltersPill'
import { SortPill } from './filters/SortPill'
import { AvailabilityPills } from './filters/AvailabilityPills'
import { RawFilter } from '../../types/core'
import { SortState, SortOptionId } from '../../types/sort'
import { DEFAULT_FILTER_IDS } from '../../constants'

export type PillsContainerProps = {
    rawFilters: RawFilter[]
    selectedFilterOptions: Record<string, string[]>
    sortState: SortState | null
    onSortChange: (sortOptionId: SortOptionId) => void
}

/**
 * Container component that renders filter pills including sort, active filters, availability filters, and "All filters" button.
 * Shows default filters (color, size), any applied filters, and active availability filters as interactive pills.
 *
 * @param rawFilters - Array of available filter configurations
 * @param selectedFilterOptions - Currently selected filter values
 * @param sortState - Current sort configuration and options
 * @param onSortChange - Callback when sort order changes
 */
export const PillsContainer = ({
    rawFilters,
    selectedFilterOptions,
    sortState,
    onSortChange,
}: PillsContainerProps): React.ReactElement => {
    const { openAllFiltersModal } = useDesignSidebarContext()
    // Get all filters that should be displayed (applied + default filters)
    const visibleFilters = rawFilters.filter((filterData) => {
        if (!filterData.enabled) return false
        const values = selectedFilterOptions[filterData.id] || []
        const isApplied = values.length > 0
        const isDefault = DEFAULT_FILTER_IDS.includes(filterData.id)
        return isApplied || isDefault
    })

    return (
        <DropdownProvider>
            <div className="ProductSearch__filters">
                {sortState && <SortPill sortState={sortState} onSortChange={onSortChange} />}

                {/* All visible filters (applied + default) */}
                {visibleFilters.map((filterData) => (
                    <FilterPillSwitch
                        key={filterData.id}
                        filterId={filterData.id}
                        selectedValues={selectedFilterOptions[filterData.id] || []}
                        filterData={filterData}
                    />
                ))}

                {/* Active availability filter pills */}
                <AvailabilityPills />

                <ShowAllFiltersPill onClick={openAllFiltersModal} />
            </div>
        </DropdownProvider>
    )
}
