import React from 'react'
import type { RawFilter } from '../../types/core'
import { FILTER_IDS, FILTER_TYPES } from '../../constants'
import { BooleanFilterPill } from './filters/BooleanFilterPill'
import { ColorFilterPill } from './filters/ColorFilterPill'
import { MeasurementBucketsFilterPill } from './filters/MeasurementBucketsFilterPill'
import { StandardFilterPill } from './filters/StandardFilterPill'
import { TypedClassFilterPill } from './filters/TypedClassFilterPill'

export type FilterPillSwitchProps = {
    filterId: string
    filterData: RawFilter
    selectedValues: string[]
}

/**
 * Filter pill factory component that determines which specific filter pill to render
 * based on filter type and ID. Acts as a router between different filter pill implementations.
 *
 * @param filterId - Unique identifier for the filter
 * @param filterData - Filter configuration data including type, values, and metadata
 * @param selectedValues - Currently selected filter values
 * @returns The appropriate filter pill component (Boolean, Color, MeasurementBuckets, or Standard)
 */
export const FilterPillSwitch = ({
    filterId,
    filterData,
    selectedValues,
}: FilterPillSwitchProps): React.ReactElement => {
    if (filterData.type === FILTER_TYPES.BOOLEAN) {
        return <BooleanFilterPill filterId={filterId} filterData={filterData} selectedValues={selectedValues} />
    }

    if (filterData.type === FILTER_TYPES.TYPED_CLASS_FILTER) {
        return <TypedClassFilterPill filterId={filterId} filterData={filterData} selectedValues={selectedValues} />
    }

    if (filterData.id === FILTER_IDS.COLOR) {
        return <ColorFilterPill filterId={filterId} filterData={filterData} selectedValues={selectedValues} />
    }

    if (filterData.id === FILTER_IDS.MEASUREMENT_BUCKETS) {
        return (
            <MeasurementBucketsFilterPill filterId={filterId} filterData={filterData} selectedValues={selectedValues} />
        )
    }

    return <StandardFilterPill filterId={filterId} filterData={filterData} selectedValues={selectedValues} />
}
