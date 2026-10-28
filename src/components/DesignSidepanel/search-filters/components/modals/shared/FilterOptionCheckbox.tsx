import React from 'react'
import Checkbox from '@ingka/checkbox'
import type { FilterValue } from '../../../types/core'

export type FilterOptionCheckboxProps = {
    filterId: string
    option: FilterValue
    selected: boolean
    disabled: boolean
    onToggle: (checked: boolean) => void
    describedById?: string
}

export const FilterOptionCheckbox = React.memo(
    ({
        filterId,
        option,
        selected,
        disabled,
        onToggle,
        describedById,
    }: FilterOptionCheckboxProps): React.ReactElement => {
        const id = `${filterId}-${option.id}`
        return (
            <label
                htmlFor={id}
                key={option.id}
                className={`FilterOption ${disabled ? 'FilterOption--disabled' : ''}`}
                tabIndex={disabled ? -1 : undefined}
                aria-disabled={disabled}
            >
                <span>{option.name}</span>
                <span className="FilterOption__count">{option.count}</span>
                <Checkbox
                    id={id}
                    subtle
                    value={option.id}
                    checked={selected}
                    disabled={disabled}
                    onChange={(event) => onToggle(event.target.checked)}
                    aria-describedby={describedById}
                />
            </label>
        )
    },
)
