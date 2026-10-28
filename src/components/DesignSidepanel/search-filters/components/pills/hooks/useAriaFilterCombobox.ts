import React, { useEffect, useCallback, useMemo, useId } from 'react'

/**
 * Hook for managing ARIA attributes and keyboard navigation for filter comboboxes.
 * Supports both single-select (boolean) and multi-select filter patterns.
 */

export type HtmlAttributeBag<T extends HTMLElement> = Omit<React.AriaAttributes, 'aria-multiselectable'> &
    Omit<React.DOMAttributes<T>, 'children'> & {
        ref?: React.RefObject<T> | undefined
        id?: string | undefined
        // Override aria-multiselectable to be boolean instead of React's Booleanish type
        // This ensures compatibility with components that expect strict boolean values
        'aria-multiselectable'?: boolean | undefined
    }

export type UseAriaFilterComboboxArgs = {
    isOpen: boolean
    /** Whether this is a multi-select filter */
    isMultiSelect: boolean
    /** Filter ID for generating unique IDs */
    filterId: string
    onClose: () => void
    onOpen: () => void
    optionCount: number
    /** Currently selected option index for keyboard navigation */
    selectedIndex: number
    onSelectedIndexChange: (index: number) => void
    onOptionActivate: (index: number) => void
}

export type UseAriaFilterComboboxResult = {
    /** Props for the trigger button (pill) */
    triggerProps: HtmlAttributeBag<HTMLButtonElement>
    /** Props for the dropdown container */
    dropdownProps: HtmlAttributeBag<HTMLUListElement>
    /** Function to get props for individual options */
    getOptionProps: <T extends HTMLElement>(index: number) => HtmlAttributeBag<T>
    /** Current active descendant ID */
    activeDescendantId: string | undefined
}

export function useAriaFilterCombobox({
    isOpen,
    isMultiSelect,
    filterId,
    onClose,
    onOpen,
    optionCount,
    selectedIndex,
    onSelectedIndexChange,
    onOptionActivate,
}: UseAriaFilterComboboxArgs): UseAriaFilterComboboxResult {
    const baseId = useId()
    const triggerId = `${baseId}-${filterId}-pill`
    const dropdownId = `${baseId}-${filterId}-dropdown`
    const optionIdBase = `${baseId}-${filterId}-option`

    const getOptionId = (index: number) => `${optionIdBase}-${index}`

    const activeDescendantId = selectedIndex >= 0 ? getOptionId(selectedIndex) : undefined

    // Scroll focused option into view when keyboard navigation changes
    useEffect(() => {
        if (isOpen && selectedIndex >= 0) {
            const optionId = getOptionId(selectedIndex)
            const optionElement = document.getElementById(optionId)
            if (optionElement) {
                try {
                    // Try scrollIntoView with options
                    optionElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                    })
                } catch (error) {
                    // Fallback for older browsers or unsupported options
                    try {
                        optionElement.scrollIntoView()
                    } catch (fallbackError) {
                        // If scrollIntoView is completely unsupported, fail silently
                        // The option will still be keyboard navigatable, just without auto-scroll
                    }
                }
            }
        }
    }, [selectedIndex, isOpen, filterId])

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault()
                    if (!isOpen) {
                        onOpen()
                        // showOptions() will set selectedIndex to 0, but we need to ensure it happens
                    } else {
                        const nextIndex = selectedIndex + 1
                        onSelectedIndexChange(nextIndex >= optionCount ? 0 : nextIndex)
                    }
                    break

                case 'ArrowUp':
                    event.preventDefault()
                    if (!isOpen) {
                        onOpen()
                        // Override the default selectedIndex to last option
                        onSelectedIndexChange(optionCount - 1)
                    } else {
                        const prevIndex = selectedIndex - 1
                        onSelectedIndexChange(prevIndex < 0 ? optionCount - 1 : prevIndex)
                    }
                    break

                case 'Home':
                    if (isOpen) {
                        event.preventDefault()
                        onSelectedIndexChange(0)
                    }
                    break

                case 'End':
                    if (isOpen) {
                        event.preventDefault()
                        onSelectedIndexChange(optionCount - 1)
                    }
                    break

                case 'Enter':
                case ' ':
                    event.preventDefault()
                    if (isOpen && selectedIndex >= 0) {
                        onOptionActivate(selectedIndex)
                        if (!isMultiSelect) {
                            onClose()
                        }
                    } else if (!isOpen) {
                        onOpen()
                    }
                    break

                case 'Escape':
                    if (isOpen) {
                        event.preventDefault()
                        onClose()
                    }
                    break

                case 'Tab':
                    if (isOpen) {
                        // Close dropdown and allow natural tab navigation
                        onClose()
                    }
                    break

                default:
                    // Handle other keys normally
                    break
            }
        },
        [isOpen, selectedIndex, optionCount, onOpen, onClose, onSelectedIndexChange, onOptionActivate, isMultiSelect],
    )

    const handleBlur = useCallback(
        (event: React.FocusEvent<HTMLButtonElement>) => {
            // Close dropdown when focus moves away from the trigger button
            // unless focus is moving to an element within the dropdown
            if (isOpen) {
                if (!event.relatedTarget) {
                    // Focus moved outside the document, close dropdown
                    onClose()
                    return
                }

                const dropdownElement = document.getElementById(dropdownId)
                if (!dropdownElement?.contains(event.relatedTarget as Node)) {
                    // Focus moved to element outside the dropdown, close it
                    onClose()
                }
            }
        },
        [isOpen, dropdownId, onClose],
    )

    const triggerProps: HtmlAttributeBag<HTMLButtonElement> = useMemo(
        () => ({
            id: triggerId,
            'aria-haspopup': `listbox`,
            'aria-expanded': isOpen,
            'aria-controls': dropdownId,
            'aria-activedescendant': activeDescendantId,
            onKeyDown: handleKeyDown,
            onBlur: handleBlur,
        }),
        [triggerId, isOpen, dropdownId, activeDescendantId, handleKeyDown, handleBlur],
    )

    const dropdownProps: HtmlAttributeBag<HTMLUListElement> = useMemo(
        () => ({
            id: dropdownId,
            'aria-labelledby': triggerId,
            'aria-multiselectable': isMultiSelect,
        }),
        [dropdownId, triggerId, isMultiSelect],
    )

    const getOptionProps = useCallback(
        <T extends HTMLElement>(index: number): HtmlAttributeBag<T> => {
            const clickHandler: React.MouseEventHandler<T> = () => {
                onOptionActivate(index)
                if (!isMultiSelect) {
                    onClose()
                }
            }

            return {
                id: getOptionId(index),
                onClick: clickHandler,
            }
        },
        [selectedIndex, onOptionActivate, isMultiSelect, onClose],
    )

    return {
        triggerProps,
        dropdownProps,
        getOptionProps,
        activeDescendantId,
    }
}
