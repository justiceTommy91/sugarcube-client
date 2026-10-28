import { useState, useCallback, useMemo } from 'react'
import type { HtmlAttributeBag } from 'hooks/aria/common'
import type { SubCategory } from 'models/roomTypes/types'
import { useDropdownManager } from '../../search-filters/components/pills/hooks/useDropdownManager'
import { useAriaFilterCombobox } from '../../search-filters/components/pills/hooks/useAriaFilterCombobox'
import type { DropdownPosition } from '../../search-filters/components/pills/hooks/useSmartDropdownPosition'

export interface UseSubCategoryDropdownBehaviorParams {
    subCategories: SubCategory[]
    selectedSubCategory: SubCategory | null
    onSubCategorySelect: (subCategory: SubCategory | null) => void
}

export interface UseSubCategoryDropdownBehaviorReturn {
    pillProps: {
        ref: React.RefObject<HTMLButtonElement>
        onClick: () => void
        id?: string
        'aria-haspopup'?: React.AriaAttributes['aria-haspopup']
        'aria-expanded'?: React.AriaAttributes['aria-expanded']
        'aria-controls'?: React.AriaAttributes['aria-controls']
        onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>
        onBlur?: React.FocusEventHandler<HTMLButtonElement>
    }
    dropdownProps: {
        ref: React.RefObject<HTMLUListElement>
        onClose: () => void
        excludeRefs: React.RefObject<HTMLElement>[]
        position: DropdownPosition
        'aria-labelledby'?: string
        id?: string
        'aria-multiselectable'?: boolean
    }
    isOpen: boolean
    availableOptions: Array<{ id: string; name: string }>
    handleOptionClick: (categoryId: string) => void
    getOptionProps: <T extends HTMLElement>(index: number) => HtmlAttributeBag<T>
    keyboardSelectedIndex: number
}

export const useSubCategoryDropdownBehavior = ({
    subCategories,
    selectedSubCategory,
    onSubCategorySelect,
}: UseSubCategoryDropdownBehaviorParams): UseSubCategoryDropdownBehaviorReturn => {
    const dropdownId = `room-type-subcategories`

    const { isOpen, pillRef, dropdownRef, dropdownPosition, toggleDropdown, closeDropdown } =
        useDropdownManager(dropdownId)

    const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(-1)

    // Convert subcategories to dropdown options format
    const availableOptions = useMemo(
        () => subCategories.map((sc) => ({ id: sc.categoryId, name: sc.name })),
        [subCategories],
    )

    // Find initial focus index based on selected values
    const findFocusIndex = useCallback(() => {
        if (!selectedSubCategory) return 0
        const selectedIndex = availableOptions.findIndex((option) => option.id === selectedSubCategory.categoryId)
        return selectedIndex >= 0 ? selectedIndex : 0
    }, [selectedSubCategory, availableOptions])

    // Dropdown lifecycle handlers
    const handleClose = useCallback(() => {
        closeDropdown()
        setKeyboardSelectedIndex(-1)
    }, [closeDropdown])

    const handleOpen = useCallback(() => {
        if (!isOpen) {
            toggleDropdown()
        }
        const focusIndex = findFocusIndex()
        setTimeout(() => setKeyboardSelectedIndex(focusIndex), 0)
    }, [findFocusIndex, isOpen, toggleDropdown])

    // Option selection
    const handleOptionClick = useCallback(
        (categoryId: string) => {
            const category = subCategories.find((sc) => sc.categoryId === categoryId)
            if (category) {
                onSubCategorySelect(category)
            }
            closeDropdown()
        },
        [subCategories, onSubCategorySelect, closeDropdown],
    )

    const handleOptionActivateByIndex = useCallback(
        (index: number) => {
            const option = availableOptions[index]
            if (option) {
                handleOptionClick(option.id)
            }
        },
        [availableOptions, handleOptionClick],
    )

    // ARIA setup
    const {
        triggerProps,
        dropdownProps: ariaDropdownProps,
        getOptionProps,
    } = useAriaFilterCombobox({
        isOpen,
        isMultiSelect: false,
        filterId: dropdownId,
        onClose: handleClose,
        onOpen: handleOpen,
        optionCount: availableOptions.length,
        selectedIndex: keyboardSelectedIndex,
        onSelectedIndexChange: setKeyboardSelectedIndex,
        onOptionActivate: handleOptionActivateByIndex,
    })

    return {
        pillProps: {
            ref: pillRef,
            onClick: toggleDropdown,
            id: triggerProps.id,
            'aria-haspopup': triggerProps['aria-haspopup'],
            'aria-expanded': triggerProps['aria-expanded'],
            'aria-controls': triggerProps['aria-controls'],
            onKeyDown: triggerProps.onKeyDown,
            onBlur: triggerProps.onBlur,
        },
        dropdownProps: {
            ref: dropdownRef,
            onClose: closeDropdown,
            excludeRefs: [pillRef],
            position: dropdownPosition,
            'aria-labelledby': ariaDropdownProps['aria-labelledby'],
            id: ariaDropdownProps.id,
            'aria-multiselectable': Boolean(ariaDropdownProps['aria-multiselectable']),
        },
        isOpen,
        availableOptions,
        handleOptionClick,
        getOptionProps,
        keyboardSelectedIndex,
    }
}
