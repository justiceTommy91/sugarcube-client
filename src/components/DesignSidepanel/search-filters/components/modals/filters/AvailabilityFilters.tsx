import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from 'hooks/useAppSelector'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { useSearchTracking, SEARCH_TYPES } from 'hooks/useSearchTracking'
import { SEARCH_CHANGE_TYPES } from 'utils/searchTracking'
import * as furnitureSelectors from 'models/furniture/selectors'
import * as furnitureActions from 'models/furniture/actions'
import { CheckboxFilter } from '../shared/CheckboxFilter'

/**
 * Availability filters component that uses CheckboxFilter for consistent styling.
 * These filters are always enabled and don't show counts since they're not coming from the API as filter options
 */
export const AvailabilityFilters = (): React.ReactElement => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const filters = useAppSelector(furnitureSelectors.getFilter)
    const { storeName } = useAppSelector(furnitureSelectors.getLocation)
    const { trackSearchResult } = useSearchTracking()

    const storeLabel = storeName ? t('availability.storeFilter-store', { storeName }) : t('availability.storeFilter')

    const handleFilterChange = (filterUpdates: { inStockStore?: boolean; availableOnline?: boolean }) => {
        // Track availability filter changes
        Object.entries(filterUpdates).forEach(([key, checked]) => {
            const actionValue = checked ? `true` : `REMOVE(${key}:true)`

            trackSearchResult(SEARCH_TYPES.FILTER, {
                type: SEARCH_CHANGE_TYPES.FILTER,
                value: actionValue,
                filterId: key,
            })
        })

        dispatch(furnitureActions.updateFurnitureFilter(filterUpdates))
    }

    return (
        <>
            <CheckboxFilter
                id="availability-in-stock-store"
                name={storeLabel}
                checked={filters.inStockStore}
                disabled={false}
                showCount={false}
                onChange={(checked) => handleFilterChange({ inStockStore: checked })}
                ariaDescription={t('aria.descriptions.filterAvailabilityInstore')}
            />
            <CheckboxFilter
                id="availability-available-online"
                name={t('availability.online.BUYABLE_ONLINE')}
                checked={filters.availableOnline}
                disabled={false}
                showCount={false}
                onChange={(checked) => handleFilterChange({ availableOnline: checked })}
                ariaDescription={t('aria.descriptions.filterAvailabilityOnline')}
            />
        </>
    )
}
