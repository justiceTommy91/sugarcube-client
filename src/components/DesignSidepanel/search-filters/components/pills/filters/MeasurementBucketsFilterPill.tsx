import React from 'react'
import { useTranslation } from 'react-i18next'
import { BasePill } from '../BasePill'
import { Dropdown } from '../shared/Dropdown'
import { DropdownItem } from '../shared/DropdownItem'
import { useDropdownPillBehavior } from '../hooks/useDropdownPillBehavior'
import type { RawFilter, FilterValue } from '../../../types/core'
import { getAllMeasurementOptions } from '../../../utils/filters'

require('./MeasurementBucketsFilterPill.scss')

export interface MeasurementBucketsFilterPillProps {
    filterId: string
    filterData: RawFilter
    selectedValues: string[]
}

/**
 * Measurement buckets filter pill that displays a dropdown with grouped sections and headings.
 * Supports both typed format (with dimension groups) and simple format (flat values).
 */
export const MeasurementBucketsFilterPill = ({
    filterId,
    filterData,
    selectedValues,
}: MeasurementBucketsFilterPillProps): React.ReactElement => {
    const { t } = useTranslation()
    const availableOptions = getAllMeasurementOptions(filterData)

    const { pillProps, dropdownProps, optionHelpers } = useDropdownPillBehavior({
        filterId,
        filterData,
        selectedValues,
        availableOptions,
    })

    /**
     * Renders a single dropdown option item
     */
    const renderOption = (option: FilterValue, index: number) => {
        const { isKeyboardFocused } = optionHelpers.getKeyboardFocusProps(option, index)
        const { selected, disabled } = optionHelpers.getOptionState(option)

        return (
            <DropdownItem
                key={option.id}
                value={option.id}
                label={option.name}
                disabled={disabled}
                count={option.count}
                checked={selected}
                onClick={() => optionHelpers.handleOptionClick(option.id)}
                id={`${filterId}-option-${index}`}
                data-keyboard-focused={isKeyboardFocused}
            />
        )
    }

    const renderMeasurementBuckets = () => {
        let globalIndex = 0
        const elements: React.ReactElement[] = []

        // Handle both formats: typed (with types array) and simple (with values array)
        if (filterData.types && filterData.types.length > 0) {
            // Typed format: render with dimension headings
            filterData.types.forEach((dimensionType) => {
                const availableOptionsInType = dimensionType.values || []

                // Add heading element
                elements.push(
                    <div
                        key={`${dimensionType.id}-title`}
                        className="MeasurementBucketsFilterPill__dimensionTitle"
                        role="heading"
                        aria-level={3}
                        tabIndex={-1}
                    >
                        {dimensionType.name}
                    </div>,
                )

                // Add filter options
                availableOptionsInType.forEach((option) => {
                    elements.push(renderOption(option, globalIndex))
                    globalIndex += 1
                })
            })
        } else if (filterData.values && filterData.values.length > 0) {
            // Simple format: render values directly without headings
            filterData.values.forEach((option) => {
                elements.push(renderOption(option, globalIndex))
                globalIndex += 1
            })
        }

        return (
            <div
                className="MeasurementBucketsFilterPill__measurementBuckets"
                role="group"
                aria-label={t('aria.labels.sizeFilterOptions')}
            >
                {elements}
            </div>
        )
    }

    return (
        <div className="MeasurementBucketsFilterPill">
            <BasePill {...pillProps} />

            <Dropdown {...dropdownProps}>{renderMeasurementBuckets()}</Dropdown>
        </div>
    )
}
