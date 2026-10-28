import React, { useRef, useState } from 'react'

import { useSearchTracking, SEARCH_TYPES } from 'hooks/useSearchTracking'
import { SEARCH_CHANGE_TYPES } from 'utils/searchTracking'
import { useDropdownManager } from '../hooks/useDropdownManager'
import { useSmartDropdownPosition } from '../hooks/useSmartDropdownPosition'
import { useAriaFilterCombobox } from '../hooks/useAriaFilterCombobox'
import { Dropdown } from '../shared/Dropdown'
import { BasePill } from '../BasePill'
import { SortFilter } from '../../shared/SortFilter'
import { SortState, SortOptionId } from '../../../types/sort'
import { DEFAULT_SORT_OPTION_ID } from '../../../constants'

export type SortPillProps = {
    sortState: SortState
    onSortChange: (sortOptionId: SortOptionId) => void
}

/**
 * Sort filter pill that displays current sort option and provides dropdown for changing sort order.
 * Shows "Sort" when default option is selected, otherwise displays the selected sort option name.
 */
export const SortPill = ({ sortState, onSortChange }: SortPillProps): React.ReactElement => {
    const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(-1)
    const { isOpen, openDropdown, closeDropdown } = useDropdownManager(`sort`)
    const { trackSearchResult } = useSearchTracking()

    const hideOptions = () => {
        closeDropdown()
        setKeyboardSelectedIndex(-1)
    }

    const showOptions = () => {
        openDropdown()
        // Don't auto-focus any option - let keyboard navigation handle this
        // Visual focus should only appear when using keyboard navigation
        setKeyboardSelectedIndex(-1)
    }

    const showOptionsWithKeyboardFocus = () => {
        openDropdown()
        // Focus the currently selected option, or first option if none selected (for keyboard navigation)
        const selectedIndex = sortState.options.findIndex((option) => option.selected)
        setKeyboardSelectedIndex(selectedIndex >= 0 ? selectedIndex : 0)
    }

    const pillRef = useRef<HTMLButtonElement>(null)
    const dropdownRef = useRef<HTMLUListElement>(null)

    const dropdownPosition = useSmartDropdownPosition({
        triggerRef: pillRef,
        dropdownRef,
        isOpen,
        offset: 8,
    })

    const handleSortChange = (sortOptionId: SortOptionId) => {
        const sortOption = sortState.options.find((option) => option.id === sortOptionId)
        if (sortOption) {
            trackSearchResult(SEARCH_TYPES.QUICK_FILTER, {
                type: SEARCH_CHANGE_TYPES.SORT,
                value: sortOption.name,
            })
        }

        onSortChange(sortOptionId)
        hideOptions() // Close dropdown after selection
    }

    const handleOptionActivateByIndex = (index: number) => {
        const option = sortState.options[index]
        if (option) {
            handleSortChange(option.id)
        }
    }

    // Initialize aria combobox for keyboard navigation
    const { triggerProps, dropdownProps, getOptionProps } = useAriaFilterCombobox({
        isOpen,
        isMultiSelect: false, // Sort is single-select
        filterId: `sort`,
        onClose: hideOptions,
        onOpen: showOptionsWithKeyboardFocus, // Keyboard navigation should show focus
        optionCount: sortState.options.length,
        selectedIndex: keyboardSelectedIndex,
        onSelectedIndexChange: setKeyboardSelectedIndex,
        onOptionActivate: handleOptionActivateByIndex,
    })

    const selectedOption = sortState.options.find((option) => option.selected)
    const defaultOptionSelected = selectedOption?.id === DEFAULT_SORT_OPTION_ID
    // Show generic "Sort" text when default option is selected, otherwise show option name
    const displayName = defaultOptionSelected ? sortState.name : selectedOption?.name || sortState.name

    // Create filter data format for GenericFilterPill compatibility
    // Convert sort options to values format that GenericFilterPill expects
    const sortAsFilterData = {
        id: sortState.name.toLowerCase(),
        name: displayName,
        type: 'SORT' as const,
        enabled: true,
        values: sortState.options.map((option) => ({
            id: option.id,
            name: option.name,
            count: 0,
        })),
    }

    return (
        <div className="SortPill">
            <BasePill
                ref={pillRef}
                {...triggerProps}
                selectedValues={defaultOptionSelected ? [] : [selectedOption?.id || '']}
                filterData={sortAsFilterData}
                onClick={isOpen ? hideOptions : showOptions}
                active={isOpen}
            />

            <Dropdown
                key={`${sortAsFilterData.id}-dropdown`}
                {...dropdownProps}
                ref={dropdownRef}
                onClose={hideOptions}
                excludeRefs={[pillRef]}
                position={dropdownPosition}
                // Keep dropdown rendered for positioning calculations and ARIA accessibility
                style={{ display: isOpen ? 'block' : 'none' }}
            >
                <SortFilter
                    options={sortState.options}
                    onSortChange={handleSortChange}
                    name={sortState.name}
                    getOptionProps={getOptionProps}
                    selectedIndex={keyboardSelectedIndex}
                />
            </Dropdown>
        </div>
    )
}
