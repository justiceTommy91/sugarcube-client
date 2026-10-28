import React from 'react'
import { BasePill } from '../BasePill'
import { Dropdown } from '../shared/Dropdown'
import { ColorSwatch } from '../../shared/ColorSwatch'
import { useDropdownPillBehavior } from '../hooks/useDropdownPillBehavior'
import { RawFilter } from '../../../types/core'

require('./ColorFilterPill.scss')

export interface ColorFilterPillProps {
    filterId: string
    filterData: RawFilter
    selectedValues: string[]
}

/**
 * Color filter component that shows color swatches in a grid dropdown.
 * Displays colors as interactive swatches arranged in a 4-column grid for easy selection.
 */
export const ColorFilterPill = ({ filterId, filterData, selectedValues }: ColorFilterPillProps): React.ReactElement => {
    const availableOptions = filterData.values || []

    const { pillProps, dropdownProps, optionHelpers } = useDropdownPillBehavior({
        filterId,
        filterData,
        selectedValues,
        availableOptions,
    })

    return (
        <div className="ColorFilterPill">
            <BasePill {...pillProps} />

            <Dropdown {...dropdownProps}>
                <div className="ColorFilterPill__colorGrid">
                    {availableOptions.map((color, index) => {
                        const { isKeyboardFocused, optionId } = optionHelpers.getKeyboardFocusProps(color, index)
                        const { selected, disabled } = optionHelpers.getOptionState(color)

                        return (
                            <ColorSwatch
                                key={color.id}
                                id={optionId}
                                name={color.name}
                                hex={color.hex || '000000'}
                                count={color.count}
                                selected={selected}
                                disabled={disabled}
                                onToggle={() => optionHelpers.handleOptionClick(color.id)}
                                tabbable={false}
                                data-keyboard-focused={isKeyboardFocused}
                            />
                        )
                    })}
                </div>
            </Dropdown>
        </div>
    )
}
