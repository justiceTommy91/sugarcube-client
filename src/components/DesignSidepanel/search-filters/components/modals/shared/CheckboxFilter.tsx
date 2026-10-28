import React from 'react'
import Checkbox from '@ingka/checkbox'
import { useTranslation } from 'react-i18next'

require('./CheckboxFilter.scss')

export type CheckboxFilterProps = {
    id: string
    name: string
    checked: boolean
    disabled?: boolean
    count?: number | string
    showCount?: boolean
    onChange: (checked: boolean) => void
    ariaDescription?: string
}

/**
 * Generic checkbox filter component that can be used for both API filters and client-side filters.
 *
 * Used by:
 * - BooleanFilter: API-driven filters with count-based disabled state
 * - AvailabilityFilter: Client-side availability filters (always enabled, no counts)
 */
export const CheckboxFilter = React.memo(
    ({
        id,
        name,
        checked,
        disabled = false,
        count,
        showCount = false,
        onChange,
        ariaDescription,
    }: CheckboxFilterProps): React.ReactElement => {
        const { t } = useTranslation()

        return (
            <li className="FilterOption--boolean">
                <fieldset role="group" aria-labelledby={`${id}-legend`}>
                    <legend id={`${id}-legend`} className="sr-only">
                        {t('aria.legends.checkboxFilter', { name })}
                    </legend>
                    <label
                        htmlFor={id}
                        className={`FilterOption ${disabled ? 'FilterOption--disabled' : ''}`}
                        tabIndex={disabled ? -1 : undefined}
                        aria-disabled={disabled}
                    >
                        <span className="FilterOption__name">{name}</span>
                        <span className="FilterOption__count">{showCount && count !== undefined ? count : ''}</span>
                        <Checkbox
                            id={id}
                            value={id}
                            subtle
                            checked={checked}
                            disabled={disabled}
                            onChange={(event) => onChange(event.target.checked)}
                            aria-describedby={`${id}-description`}
                        />
                    </label>
                    <div id={`${id}-description`} className="sr-only">
                        {ariaDescription || t('aria.legends.checkboxFilter', { name })}
                    </div>
                </fieldset>
            </li>
        )
    },
)
