import React from 'react'
import { useSearchTracking, SEARCH_TYPES } from 'hooks/useSearchTracking'
import { SEARCH_CHANGE_TYPES } from 'utils/searchTracking'
import { BasePill } from '../BasePill'
import { useProductSearch } from '../../../hooks/useProductSearch'
import { RawFilter } from '../../../types/core'

export interface BooleanFilterPillProps {
    filterId: string
    filterData: RawFilter
    selectedValues: string[]
}

/**
 * Boolean filter component that toggles directly on the pill with no dropdown.
 * Used for simple on/off filters like "In stock" or "Available online" that don't require additional options.
 */
export const BooleanFilterPill = ({
    filterId,
    filterData,
    selectedValues,
}: BooleanFilterPillProps): React.ReactElement => {
    const { updateSelectedFilterOptions } = useProductSearch()
    const { trackSearchResult } = useSearchTracking()

    const handlePillClick = () => {
        // Check if filter is currently selected to determine if this is selection or deselection
        const isCurrentlySelected = selectedValues.includes(filterData.id)
        const actionValue = isCurrentlySelected ? `REMOVE(${filterId}:true)` : `true`

        // Track the boolean filter change (quick filter since it's from pills)
        trackSearchResult(SEARCH_TYPES.QUICK_FILTER, {
            type: SEARCH_CHANGE_TYPES.FILTER,
            value: actionValue,
            filterId,
        })

        // Boolean selection logic
        const newValues = selectedValues.includes(filterData.id) ? [] : [filterData.id]
        updateSelectedFilterOptions((prev) => ({
            ...prev,
            [filterId]: newValues,
        }))
    }

    return <BasePill selectedValues={selectedValues} filterData={filterData} onClick={handlePillClick} active={false} />
}
