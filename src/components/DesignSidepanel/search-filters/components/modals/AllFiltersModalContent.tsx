import React from 'react'
import { useTranslation } from 'react-i18next'
import Accordion, { AccordionItem } from '@ingka/accordion'
import { ModalFilterSwitch } from './ModalFilterSwitch'
import { AvailabilityFilters } from './filters/AvailabilityFilters'
import { SortFilter } from '../shared/SortFilter'
import type { RawFilter } from '../../types/core'
import type { SortState, SortOptionId } from '../../types/sort'

export type AllFiltersModalContentProps = {
    rawFilters: RawFilter[]
    selectedFilterOptions: Record<string, string[]>
    sortState: SortState | null
    getSelectedSortOptionName: () => string | undefined
    onSelectionChange: (filterId: string, values: string[]) => void
    onSortChange: (sortOptionId: SortOptionId) => void
}

export const AllFiltersModalContent = ({
    rawFilters,
    selectedFilterOptions,
    sortState,
    getSelectedSortOptionName,
    onSelectionChange,
    onSortChange,
}: AllFiltersModalContentProps): React.ReactElement => {
    const { t } = useTranslation()

    return (
        <>
            <div className="AllFiltersModal__filterList">
                <Accordion>
                    {/* Sort filter as first accordion item - only show if sortState is available */}
                    {sortState && (
                        <AccordionItem
                            id="sort"
                            title={t('search.filters.sort')}
                            caption={getSelectedSortOptionName()}
                            aria-describedby="sort-description"
                        >
                            <SortFilter options={sortState.options} onSortChange={onSortChange} name={sortState.name} />
                        </AccordionItem>
                    )}

                    {/* Regular filters */}
                    {rawFilters.map((filter) => (
                        <ModalFilterSwitch
                            key={filter.id}
                            filter={filter}
                            selectedValues={selectedFilterOptions[filter.id] || []}
                            onSelectionChange={(values) => onSelectionChange(filter.id, values)}
                        />
                    ))}

                    {/* Availability filters at the bottom - separate filters not derived from filterOptions of SIK API */}
                    <AvailabilityFilters />
                </Accordion>
            </div>

            {/* Screen reader descriptions */}
            <div className="sr-only">
                <div id="clear-all-description">{t('aria.descriptions.searchFilterClearAll')}</div>
                <div id="view-results-description">{t('aria.descriptions.searchFilterViewResults')}</div>
                <div id="sort-description">{t('aria.descriptions.searchFilterSort')}</div>
            </div>
        </>
    )
}
