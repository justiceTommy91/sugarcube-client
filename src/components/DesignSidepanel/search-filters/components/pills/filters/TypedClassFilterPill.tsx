import React from 'react'
import { BasePill } from '../BasePill'
import { Dropdown } from '../shared/Dropdown'
import { DropdownItem } from '../shared/DropdownItem'
import { useDropdownPillBehavior } from '../hooks/useDropdownPillBehavior'
import { RawFilter, FilterValue } from '../../../types/core'

require('./TypedClassFilterPill.scss')

export interface TypedClassFilterPillProps {
    filterId: string
    filterData: RawFilter
    selectedValues: string[]
}

/**
 * Typed class filter component that shows grouped options by type.
 * Used for filters like REFERENCE_MEASUREMENTS that have a types array with grouped values.
 * Displays type headers (e.g., "Pictures", "Frames") with their respective options.
 */
export const TypedClassFilterPill = ({
    filterId,
    filterData,
    selectedValues,
}: TypedClassFilterPillProps): React.ReactElement => {
    // Flatten all values from all types into a single array for the behavior hook
    const availableOptions: FilterValue[] = (filterData.types || []).flatMap((type) => type.values || [])

    const { pillProps, dropdownProps, optionHelpers } = useDropdownPillBehavior({
        filterId,
        filterData,
        selectedValues,
        availableOptions,
    })

    return (
        <div className="TypedClassFilterPill">
            <BasePill {...pillProps} />

            <Dropdown {...dropdownProps}>
                {(filterData.types || []).map((type) => (
                    <div key={type.id} className="TypedClassFilterPill__typeGroup">
                        <div className="TypedClassFilterPill__typeHeader">{type.name}</div>
                        <div className="TypedClassFilterPill__typeValues">
                            {(type.values || []).map((option) => {
                                // Calculate the global index for keyboard navigation
                                const globalIndex = availableOptions.findIndex((opt) => opt.id === option.id)
                                const { isKeyboardFocused, optionId } = optionHelpers.getKeyboardFocusProps(
                                    option,
                                    globalIndex,
                                )
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
                                        id={optionId}
                                        data-keyboard-focused={isKeyboardFocused}
                                    />
                                )
                            })}
                        </div>
                    </div>
                ))}
            </Dropdown>
        </div>
    )
}
