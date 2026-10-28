import React from 'react'
import { BooleanFilter } from './filters/BooleanFilter'
import { RatingFilter } from './filters/RatingFilter'
import { ColorFilter } from './filters/ColorFilter'
import { StandardFilter } from './filters/StandardFilter'
import { MeasurementBucketsFilter } from './filters/MeasurementBucketsFilter'
import { TypedClassFilter } from './filters/TypedClassFilter'
import type { RawFilter } from '../../types/core'
import { FILTER_IDS, FILTER_TYPES } from '../../constants'

export type ModalFilterSwitchProps = {
    filter: RawFilter
    selectedValues: string[]
    onSelectionChange: (values: string[]) => void
}

const getFilterComponent = (filter: RawFilter) => {
    if (filter.type === FILTER_TYPES.BOOLEAN) {
        return BooleanFilter
    }

    if (filter.type === FILTER_TYPES.TYPED_CLASS_FILTER) {
        return TypedClassFilter
    }

    if (filter.id === FILTER_IDS.RATINGS) {
        return RatingFilter
    }

    if (filter.id === FILTER_IDS.COLOR) {
        return ColorFilter
    }

    if (filter.id === FILTER_IDS.MEASUREMENT_BUCKETS) {
        return MeasurementBucketsFilter
    }

    return StandardFilter
}

export const ModalFilterSwitch = (props: ModalFilterSwitchProps): React.ReactElement | null => {
    const FilterComponent = getFilterComponent(props.filter)
    return <FilterComponent {...props} />
}
