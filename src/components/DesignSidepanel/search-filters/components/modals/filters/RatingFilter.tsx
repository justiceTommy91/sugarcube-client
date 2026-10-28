import React from 'react'
import Checkbox from '@ingka/checkbox'
import { useTranslation } from 'react-i18next'
import { useFilterOptimizations } from '../hooks/useFilterOptimizations'
import { getFilterCaption } from '../../../utils/filters'
import { AccordionWrapper } from '../shared/AccordionWrapper'
import { FieldsetWrapper } from '../shared/FieldsetWrapper'
import { StarRating } from '../../shared/StarRating'
import type { FilterProps } from '../../../types/modals'

require('../shared/FilterBase.scss')

export const RatingFilter = React.memo(
    ({ filter, selectedValues, onSelectionChange }: FilterProps): React.ReactElement => {
        const { t } = useTranslation()
        const { toggleFilterOption, getOptionState } = useFilterOptimizations(selectedValues, onSelectionChange, filter)
        const filterCaption = getFilterCaption(selectedValues, filter)

        return (
            <AccordionWrapper filter={filter} filterCaption={filterCaption}>
                <FieldsetWrapper filterId={filter.id} filterName={filter.name}>
                    {filter.values?.map((rating) => {
                        const { selected, disabled } = getOptionState(rating)
                        return (
                            <label
                                htmlFor={`${filter.id}-${rating.id}`}
                                key={rating.id}
                                className={`FilterOption ${disabled ? 'FilterOption--disabled' : ''}`}
                                tabIndex={disabled ? -1 : undefined}
                                aria-disabled={disabled}
                            >
                                <StarRating
                                    rating={Number.isNaN(parseInt(rating.name, 10)) ? 0 : parseInt(rating.name, 10)}
                                />{' '}
                                <span className="FilterOption__count">{rating.count}</span>
                                <Checkbox
                                    id={`${filter.id}-${rating.id}`}
                                    subtle
                                    value={rating.id}
                                    checked={selected}
                                    disabled={disabled}
                                    onChange={(event) => toggleFilterOption(rating.id, event.target.checked)}
                                    aria-describedby={`${filter.id}-${rating.id}-description`}
                                />
                            </label>
                        )
                    })}
                </FieldsetWrapper>
                <div id={`${filter.id}-description`} className="sr-only">
                    {t('aria.descriptions.ratingFilter', { filterName: filter.name })}
                </div>
            </AccordionWrapper>
        )
    },
)
