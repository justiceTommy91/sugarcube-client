import React from 'react'
import { useTranslation } from 'react-i18next'
import { useFilterOptimizations } from '../hooks/useFilterOptimizations'
import { CheckboxFilter } from '../shared/CheckboxFilter'
import type { FilterProps } from '../../../types/modals'

/**
 * API-driven boolean filter component that wraps CheckboxFilter with API filter logic.
 * Handles count-based disabled state and API filter selection patterns.
 */
export const BooleanFilter = React.memo(
    ({ filter, selectedValues, onSelectionChange }: FilterProps): React.ReactElement => {
        const { t } = useTranslation()
        const { getOptionState, toggleFilterOption } = useFilterOptimizations(selectedValues, onSelectionChange, filter)
        const { selected, disabled } = getOptionState(filter)

        return (
            <CheckboxFilter
                id={filter.id}
                name={filter.name}
                checked={selected}
                disabled={disabled}
                count={filter.count}
                showCount
                onChange={(checked) => toggleFilterOption(filter.id, checked)}
                ariaDescription={t('aria.descriptions.standardFilter', { filterName: filter.name })}
            />
        )
    },
)
