import React from 'react'
import { BasePill } from '../BasePill'
import { Dropdown } from '../shared/Dropdown'
import { DropdownItem } from '../shared/DropdownItem'
import { useDropdownPillBehavior } from '../hooks/useDropdownPillBehavior'
import { RawFilter } from '../../../types/core'
import { FILTER_IDS } from '../../../constants'

require('./StandardFilterPill.scss')

export interface StandardFilterPillProps {
    filterId: string
    filterData: RawFilter
    selectedValues: string[]
}

/**
 * Standard multi-select filter component that shows a list of checkbox options.
 * Used for most filter types with multiple selectable options displayed as a vertical list.
 */
export const StandardFilterPill = ({
    filterId,
    filterData,
    selectedValues,
}: StandardFilterPillProps): React.ReactElement => {
    const availableOptions = filterData.values || []

    const { pillProps, dropdownProps, optionHelpers } = useDropdownPillBehavior({
        filterId,
        filterData,
        selectedValues,
        availableOptions,
    })

    return (
        <div className="StandardFilterPill">
            <BasePill {...pillProps} />

            <Dropdown {...dropdownProps}>
                {availableOptions.map((option, index) => {
                    const { isKeyboardFocused, optionId } = optionHelpers.getKeyboardFocusProps(option, index)
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
                            showStarRating={filterData.id === FILTER_IDS.RATINGS}
                        />
                    )
                })}
            </Dropdown>
        </div>
    )
}
