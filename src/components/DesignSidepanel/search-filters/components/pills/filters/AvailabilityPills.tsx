import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from 'hooks/useAppSelector'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { useSearchTracking, SEARCH_TYPES } from 'hooks/useSearchTracking'
import { SEARCH_CHANGE_TYPES } from 'utils/searchTracking'
import * as furnitureSelectors from 'models/furniture/selectors'
import * as furnitureActions from 'models/furniture/actions'
import { BasePill } from '../BasePill'
import { RawFilter } from '../../../types/core'

/**
 * Renders active availability filters as pills that can be clicked to toggle them off.
 * Only shows pills when the corresponding availability filters are active.
 */
export const AvailabilityPills = (): React.ReactElement => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const filters = useAppSelector(furnitureSelectors.getFilter)
    const { storeName } = useAppSelector(furnitureSelectors.getLocation)
    const { trackSearchResult } = useSearchTracking()

    const handleToggleInStockStore = () => {
        const actionValue = `REMOVE(inStockStore:true)`

        trackSearchResult(SEARCH_TYPES.QUICK_FILTER, {
            type: SEARCH_CHANGE_TYPES.FILTER,
            value: actionValue,
            filterId: `inStockStore`,
        })

        dispatch(furnitureActions.updateFurnitureFilter({ inStockStore: false }))
    }

    const handleToggleAvailableOnline = () => {
        const actionValue = `REMOVE(availableOnline:true)`

        trackSearchResult(SEARCH_TYPES.QUICK_FILTER, {
            type: SEARCH_CHANGE_TYPES.FILTER,
            value: actionValue,
            filterId: `availableOnline`,
        })

        dispatch(furnitureActions.updateFurnitureFilter({ availableOnline: false }))
    }

    const storeLabel = storeName ? t('availability.storeFilter-store', { storeName }) : t('availability.storeFilter')

    // Create synthetic filter data for the pills (only when active)
    const activePills: Array<{ filter: RawFilter; onClick: () => void }> = []

    if (filters.inStockStore) {
        activePills.push({
            filter: {
                id: 'inStockStore',
                name: storeLabel,
                type: 'BOOLEAN',
                enabled: true,
                count: 0,
            },
            onClick: handleToggleInStockStore,
        })
    }

    if (filters.availableOnline) {
        activePills.push({
            filter: {
                id: 'availableOnline',
                name: t('availability.online.BUYABLE_ONLINE'),
                type: 'BOOLEAN',
                enabled: true,
                count: 0,
            },
            onClick: handleToggleAvailableOnline,
        })
    }

    return (
        <>
            {activePills.map(({ filter, onClick }) => (
                <BasePill
                    key={filter.id}
                    selectedValues={[filter.id]} // Always selected when rendered
                    filterData={filter}
                    onClick={onClick}
                />
            ))}
        </>
    )
}
