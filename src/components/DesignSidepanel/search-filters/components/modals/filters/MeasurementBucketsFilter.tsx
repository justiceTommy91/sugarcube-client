import React from 'react'
import { AccordionItem } from '@ingka/accordion'
import { useTranslation } from 'react-i18next'
import { useFilterOptimizations } from '../hooks/useFilterOptimizations'
import { getFilterCaption } from '../../../utils/filters'
import { FilterOptionCheckbox } from '../shared/FilterOptionCheckbox'
import type { MeasurementType, FilterValue } from '../../../types/core'
import type { FilterProps } from '../../../types/modals'

require('./MeasurementBucketsFilter.scss')

/**
 * Specialized filter component for MEASUREMENT_BUCKETS that displays
 * grouped measurement ranges. Supports both typed format (with dimension groups)
 * and simple format (flat values).
 */
export const MeasurementBucketsFilter = ({
    filter,
    selectedValues,
    onSelectionChange,
}: FilterProps): React.ReactElement | null => {
    const { t } = useTranslation()
    const { toggleFilterOption, getOptionState } = useFilterOptimizations(selectedValues, onSelectionChange, filter)
    const filterCaption = getFilterCaption(selectedValues, filter)

    // Handle both formats: typed (with types) and simple (with values)
    const hasTypedFormat = filter?.types && filter.types.length > 0
    const hasSimpleFormat = filter?.values && filter.values.length > 0

    if (!hasTypedFormat && !hasSimpleFormat) {
        return null
    }

    const renderOptionCheckbox = (option: FilterValue) => {
        const { selected, disabled } = getOptionState(option)
        const isDisabled = !option.enabled || disabled
        return (
            <FilterOptionCheckbox
                key={option.id}
                filterId={filter.id}
                option={option}
                selected={selected}
                disabled={isDisabled}
                onToggle={(checked) => toggleFilterOption(option.id, checked)}
            />
        )
    }

    return (
        <AccordionItem
            id={filter.id}
            title={filter.name}
            caption={filterCaption}
            disabled={!filter.enabled}
            aria-describedby={`${filter.id}-description`}
        >
            <div className="FilterOption--measurement">
                {hasTypedFormat &&
                    filter.types?.map((dimensionType: MeasurementType) => (
                        <div key={dimensionType.id} className="dimension-group">
                            <h4 className="dimension-title">{dimensionType.name}</h4>
                            <fieldset
                                className="FilterOptions"
                                role="group"
                                aria-labelledby={`${filter.id}-${dimensionType.id}-legend`}
                            >
                                <legend id={`${filter.id}-${dimensionType.id}-legend`} className="sr-only">
                                    {t('aria.legends.measurementFilter', { dimensionType: dimensionType.name })}
                                </legend>
                                {(dimensionType.values || []).map(renderOptionCheckbox)}
                            </fieldset>
                        </div>
                    ))}
                {hasSimpleFormat && (
                    <div className="dimension-group">
                        <fieldset className="FilterOptions" role="group" aria-labelledby={`${filter.id}-legend`}>
                            <legend id={`${filter.id}-legend`} className="sr-only">
                                {t('aria.legends.measurementFilter', { dimensionType: filter.name })}
                            </legend>
                            {filter.values?.map(renderOptionCheckbox)}
                        </fieldset>
                    </div>
                )}
            </div>
            <div id={`${filter.id}-description`} className="sr-only">
                {t('aria.descriptions.measurementFilter', { filterName: filter.name })}
            </div>
        </AccordionItem>
    )
}
