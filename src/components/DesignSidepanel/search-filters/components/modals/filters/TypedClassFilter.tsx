import React from 'react'
import { useTranslation } from 'react-i18next'
import type { FilterProps } from '../../../types/modals'
import { useFilterOptimizations } from '../hooks/useFilterOptimizations'
import { getFilterCaption } from '../../../utils/filters'
import { AccordionWrapper } from '../shared/AccordionWrapper'
import { FieldsetWrapper } from '../shared/FieldsetWrapper'
import { FilterOptionCheckbox } from '../shared/FilterOptionCheckbox'

require('./TypedClassFilter.scss')

export const TypedClassFilter = React.memo(
    ({ filter, selectedValues, onSelectionChange }: FilterProps): React.ReactElement => {
        const { t } = useTranslation()
        const { toggleFilterOption, getOptionState } = useFilterOptimizations(selectedValues, onSelectionChange, filter)
        const filterCaption = getFilterCaption(selectedValues, filter)

        return (
            <AccordionWrapper filter={filter} filterCaption={filterCaption}>
                <FieldsetWrapper filterId={filter.id} filterName={filter.name}>
                    {(filter.types || []).map((type) => (
                        <div key={type.id} className="TypedClassFilter__typeGroup">
                            <div className="TypedClassFilter__typeHeader">{type.name}</div>
                            <div className="TypedClassFilter__typeValues">
                                {(type.values || []).map((option) => {
                                    const { selected, disabled } = getOptionState(option)
                                    return (
                                        <FilterOptionCheckbox
                                            key={option.id}
                                            filterId={filter.id}
                                            option={option}
                                            selected={selected}
                                            disabled={disabled}
                                            onToggle={(checked) => toggleFilterOption(option.id, checked)}
                                            describedById={`${filter.id}-${option.id}-description`}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </FieldsetWrapper>
                <div id={`${filter.id}-description`} className="sr-only">
                    {t('aria.descriptions.standardFilter', { filterName: filter.name })}
                </div>
            </AccordionWrapper>
        )
    },
)
