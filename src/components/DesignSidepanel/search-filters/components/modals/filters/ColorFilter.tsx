import React from 'react'
import { useTranslation } from 'react-i18next'
import { useFilterOptimizations } from '../hooks/useFilterOptimizations'
import { getFilterCaption } from '../../../utils/filters'
import { AccordionWrapper } from '../shared/AccordionWrapper'
import { FieldsetWrapper } from '../shared/FieldsetWrapper'
import { ColorSwatch } from '../../shared/ColorSwatch'
import type { FilterProps } from '../../../types/modals'

require('./ColorFilter.scss')

export const ColorFilter = React.memo(
    ({ filter, selectedValues, onSelectionChange }: FilterProps): React.ReactElement => {
        const { t } = useTranslation()
        const { toggleFilterOption, getOptionState } = useFilterOptimizations(selectedValues, onSelectionChange, filter)
        const filterCaption = getFilterCaption(selectedValues, filter)

        return (
            <AccordionWrapper filter={filter} filterCaption={filterCaption}>
                <FieldsetWrapper
                    filterId={filter.id}
                    filterName={filter.name}
                    className="FilterOption--color"
                    legendSuffix={t('aria.legends.colorFilterOptions')}
                >
                    {filter.values?.map((color) => {
                        const { selected, disabled } = getOptionState(color)
                        return (
                            <ColorSwatch
                                key={color.id}
                                id={`${filter.id}-${color.id}`}
                                name={color.name}
                                hex={color.hex || '000000'}
                                count={color.count}
                                selected={selected}
                                disabled={disabled}
                                onToggle={() => toggleFilterOption(color.id, !selected)}
                                tabbable
                            />
                        )
                    })}
                </FieldsetWrapper>
                <div id={`${filter.id}-description`} className="sr-only">
                    {t('aria.descriptions.colorFilter', { filterName: filter.name })}
                </div>
            </AccordionWrapper>
        )
    },
)
