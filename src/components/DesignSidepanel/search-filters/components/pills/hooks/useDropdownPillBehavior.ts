import { useState, useMemo, useCallback } from 'react'
import { useSearchTracking, SEARCH_TYPES } from 'hooks/useSearchTracking'
import { SEARCH_CHANGE_TYPES } from 'utils/searchTracking'
import { useDropdownManager, DropdownPosition } from './useDropdownManager'
import { useAriaFilterCombobox } from './useAriaFilterCombobox'
import { useProductSearch } from '../../../hooks/useProductSearch'
import { getFilterOptionState } from '../../../utils/filters'
import { RawFilter, FilterValue } from '../../../types/core'

export interface UseDropdownPillBehaviorParams {
    filterId: string
    filterData: RawFilter
    selectedValues: string[]
    availableOptions: FilterValue[]
}

export interface UseDropdownPillBehaviorReturn {
    // BasePill props
    pillProps: {
        ref: React.RefObject<HTMLButtonElement>
        selectedValues: string[]
        filterData: RawFilter
        onClick: () => void
        active: boolean
        id?: string
        'aria-haspopup'?: React.AriaAttributes['aria-haspopup']
        'aria-expanded'?: React.AriaAttributes['aria-expanded']
        'aria-controls'?: React.AriaAttributes['aria-controls']
        'aria-activedescendant'?: React.AriaAttributes['aria-activedescendant']
        onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>
        onBlur?: React.FocusEventHandler<HTMLButtonElement>
    }

    dropdownProps: {
        key: string
        ref: React.RefObject<HTMLUListElement>
        onClose: () => void
        excludeRefs: React.RefObject<HTMLElement>[]
        position: DropdownPosition
        style: { display: string }
        'aria-labelledby'?: string
        id?: string
        'aria-multiselectable'?: boolean
    }

    // Helpers for option rendering
    optionHelpers: {
        handleOptionClick: (optionId: string) => void
        getOptionState: (item: { id: string; count?: number }) => { selected: boolean; disabled: boolean }
        getKeyboardFocusProps: (
            option: { id: string },
            index: number,
        ) => {
            isKeyboardFocused: boolean
            optionId: string
        }
        enabledOptions: FilterValue[]
        keyboardSelectedIndex: number
    }

    // State
    isOpen: boolean
}

/**
 * Custom hook that encapsulates all the shared dropdown pill behavior including:
 * - Dropdown state management
 * - Focus management and keyboard navigation
 * - Selection handling
 * - ARIA accessibility setup
 * - Event handlers for open/close
 */
export const useDropdownPillBehavior = ({
    filterId,
    filterData,
    selectedValues,
    availableOptions,
}: UseDropdownPillBehaviorParams): UseDropdownPillBehaviorReturn => {
    const { trackSearchResult } = useSearchTracking()

    // Dropdown state management
    const { isOpen, pillRef, dropdownRef, dropdownPosition, openDropdown, closeDropdown, toggleDropdown } =
        useDropdownManager(filterId)

    // Selection handling (inlined from useFilterSelection)
    const { updateSelectedFilterOptions } = useProductSearch()

    // Memoized because it's used in other components' dependency arrays
    const handleSelection = useCallback(
        (optionId: string) => {
            // Multi-select: add/remove from array
            const newValues = selectedValues.includes(optionId)
                ? selectedValues.filter((id) => id !== optionId)
                : [...selectedValues, optionId]

            updateSelectedFilterOptions((prev) => ({
                ...prev,
                [filterId]: newValues,
            }))

            return newValues
        },
        [selectedValues, updateSelectedFilterOptions, filterId],
    )

    const handleOptionClick = useCallback(
        (optionId: string) => {
            // Find the option to get its name for tracking
            const option = availableOptions.find((opt) => opt.id === optionId)
            if (option) {
                // Check if option is currently selected to determine if this is selection or deselection
                const isCurrentlySelected = selectedValues.includes(optionId)
                const actionValue = isCurrentlySelected ? `REMOVE(${filterId}:${option.name})` : option.name

                // Track the filter selection (quick filter since it's from pills)
                trackSearchResult(SEARCH_TYPES.QUICK_FILTER, {
                    type: SEARCH_CHANGE_TYPES.FILTER,
                    value: actionValue,
                    filterId,
                })
            }

            // Call the original selection handler
            handleSelection(optionId)
        },
        [handleSelection, availableOptions, trackSearchResult, filterId, selectedValues],
    )

    // Option state helper
    const getOptionState = (item: { id: string; count?: number }) => getFilterOptionState(item, selectedValues)

    // Focus management and keyboard navigation (inlined from useFocusManagement)
    const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(-1)

    // Get only enabled options for keyboard navigation
    const enabledOptions = useMemo(
        () => availableOptions.filter((option) => !getFilterOptionState(option, selectedValues).disabled),
        [availableOptions, selectedValues],
    )

    // Find initial focus index based on selected values
    const findFocusIndex = (values: string[]) => {
        const selectedOptionIndex = enabledOptions.findIndex((option) => values.includes(option.id))
        return selectedOptionIndex >= 0 ? selectedOptionIndex : 0
    }

    // Reset focus when dropdown opens
    const resetFocus = () => {
        setKeyboardSelectedIndex(-1)
    }

    // Set focus to the first selected option or first enabled option
    const initializeFocus = () => {
        const focusIndex = findFocusIndex(selectedValues)
        setTimeout(() => setKeyboardSelectedIndex(focusIndex), 0)
    }

    const handleOptionActivateByIndex = useCallback(
        (index: number) => {
            const option = enabledOptions[index]
            if (option) {
                handleOptionClick(option.id)
            }
        },
        [enabledOptions, handleOptionClick],
    )

    // Dropdown lifecycle handlers - memoized because they're passed to useAriaFilterCombobox
    // which uses them in dependency arrays for keyboard event handlers
    const handleClose = useCallback(() => {
        closeDropdown()
        resetFocus()
    }, [closeDropdown, resetFocus])

    const handleOpen = useCallback(() => {
        openDropdown()
        initializeFocus()
    }, [openDropdown, initializeFocus])

    // ARIA accessibility setup
    const { triggerProps, dropdownProps: ariaDropdownProps } = useAriaFilterCombobox({
        isOpen,
        isMultiSelect: true, // All dropdown pills are multi-select (boolean pills don't use this hook)
        filterId,
        onClose: handleClose,
        onOpen: handleOpen,
        optionCount: enabledOptions.length,
        selectedIndex: keyboardSelectedIndex,
        onSelectedIndexChange: setKeyboardSelectedIndex,
        onOptionActivate: handleOptionActivateByIndex,
    })

    // Helper for keyboard focus mapping (eliminates duplication in components)
    const getKeyboardFocusProps = (option: { id: string }, index: number) => {
        const enabledIndex = enabledOptions.findIndex((enabledOption) => enabledOption.id === option.id)
        const isKeyboardFocused = keyboardSelectedIndex === enabledIndex && enabledIndex !== -1

        return {
            isKeyboardFocused,
            optionId: `${filterId}-option-${index}`,
        }
    }

    return {
        pillProps: {
            ref: pillRef,
            selectedValues,
            filterData,
            onClick: toggleDropdown,
            active: isOpen,
            id: triggerProps.id,
            'aria-haspopup': triggerProps['aria-haspopup'],
            'aria-expanded': triggerProps['aria-expanded'],
            'aria-controls': triggerProps['aria-controls'],
            'aria-activedescendant': triggerProps['aria-activedescendant'],
            onKeyDown: triggerProps.onKeyDown,
            onBlur: triggerProps.onBlur,
        },
        dropdownProps: {
            key: `${filterId}-dropdown`,
            ref: dropdownRef as React.RefObject<HTMLUListElement>,
            onClose: closeDropdown,
            excludeRefs: [pillRef],
            position: dropdownPosition,
            style: { display: isOpen ? `block` : `none` },
            'aria-labelledby': ariaDropdownProps['aria-labelledby'],
            id: ariaDropdownProps.id,
            'aria-multiselectable': Boolean(ariaDropdownProps['aria-multiselectable']),
        },
        optionHelpers: {
            handleOptionClick,
            getOptionState,
            getKeyboardFocusProps,
            enabledOptions,
            keyboardSelectedIndex,
        },
        isOpen,
    }
}
