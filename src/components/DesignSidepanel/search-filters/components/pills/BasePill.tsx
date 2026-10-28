import React from 'react'
import Pill from '@ingka/pill'
import chevronDownSmallIcon from '@ingka/ssr-icon/paths/chevron-down-small'
import chevronUpSmallIcon from '@ingka/ssr-icon/paths/chevron-up-small'
import { RawFilter } from '../../types/core'
import { FILTER_TYPES } from '../../constants'
import { getPillLabel } from '../../utils/display'

require('./BasePill.scss')

/**
 * Icon types for BasePill component
 */
export const PILL_ICON_TYPES = {
    CHEVRON: 'chevron',
    NONE: 'none',
} as const

export type PillIconType = (typeof PILL_ICON_TYPES)[keyof typeof PILL_ICON_TYPES]

/**
 * Base pill component that provides common styling and behavior for all filter pills.
 * Handles label formatting, selection state, and accessibility attributes for dropdown triggers.
 * Used as the foundation for all filter pill implementations in the system.
 */
export type BasePillProps = {
    selectedValues?: string[]
    filterData?: RawFilter
    onClick: () => void
    active?: boolean
    disabled?: boolean
    // Direct overrides for simple use cases
    label?: string
    isSelected?: boolean
    iconType?: PillIconType
    id?: string
    'aria-haspopup'?: React.AriaAttributes['aria-haspopup']
    'aria-expanded'?: React.AriaAttributes['aria-expanded']
    'aria-controls'?: React.AriaAttributes['aria-controls']
    'aria-activedescendant'?: React.AriaAttributes['aria-activedescendant']
    onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>
    onBlur?: React.FocusEventHandler<HTMLButtonElement>
}

export const BasePill = React.forwardRef<HTMLButtonElement, BasePillProps>(
    (
        {
            selectedValues = [],
            filterData,
            onClick,
            active = false,
            disabled = false,
            label: labelOverride,
            isSelected: isSelectedOverride,
            iconType,
            id,
            'aria-haspopup': ariaHaspopup,
            'aria-expanded': ariaExpanded,
            'aria-controls': ariaControls,
            'aria-activedescendant': ariaActivedescendant,
            onKeyDown,
            onBlur,
        },
        ref,
    ) => {
        // Use direct props if provided, otherwise fall back to existing logic
        const label = labelOverride ?? (filterData ? getPillLabel(filterData, selectedValues) : '')
        const hasSelections = isSelectedOverride ?? selectedValues.length > 0

        // Icon logic with override support
        let pillIcon
        if (iconType === PILL_ICON_TYPES.NONE) {
            pillIcon = undefined
        } else if (iconType === PILL_ICON_TYPES.CHEVRON) {
            // Explicitly requested chevron
            pillIcon = active ? chevronUpSmallIcon : chevronDownSmallIcon
        } else if (!iconType && filterData) {
            // Default dropdown behavior for search filters (existing logic)
            const isDropdownFilter = filterData.type !== FILTER_TYPES.BOOLEAN
            pillIcon = isDropdownFilter ? (active ? chevronUpSmallIcon : chevronDownSmallIcon) : undefined
        }

        const isDropdownFilter = filterData?.type !== FILTER_TYPES.BOOLEAN
        const pillAriaHaspopup = ariaHaspopup ?? (isDropdownFilter ? `listbox` : undefined)
        const pillAriaExpanded = ariaExpanded ?? (isDropdownFilter ? active : undefined)

        return (
            <Pill
                ref={ref}
                selected={hasSelections}
                onClick={onClick}
                label={label}
                className="BasePill"
                trailingIcon={pillIcon}
                disabled={disabled}
                id={id}
                aria-haspopup={pillAriaHaspopup}
                aria-expanded={pillAriaExpanded}
                aria-controls={ariaControls}
                aria-activedescendant={ariaActivedescendant}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
            />
        )
    },
)
