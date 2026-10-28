import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import InlineMessage from '@ingka/inline-message'
import informationCircleIcon from '@ingka/ssr-icon/paths/information-circle'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { useAppDispatch, useAppSelector } from 'hooks'
import { useAdminFilter } from 'hooks/admin/useAdminFilter'

import * as sessionActions from 'models/sessionStorage/actions'
import * as sessionSelectors from 'models/sessionStorage/selectors'
import { isInRoomTypeSearchMode } from 'models/furniture/selectors'
import { getSelectedScene } from 'models/compositions/selectors'

import type { SubCategory } from 'models/roomTypes/types'
import { useProductSearch } from '../../search-filters/hooks/useProductSearch'

import { PillsContainer } from '../../search-filters/components/pills/PillsContainer'

import { AdminFilter, DEFAULT_SALES_END_DATE_FILTER } from './admin'
import { ProductQuickFilters } from './ProductQuickFilters'
import { ProductSearchCombobox } from './ProductSearchCombobox'
import { AllFiltersModal } from '../../search-filters/components/modals/AllFiltersModal'
import { RoomTypeSelector, SubCategoryPills, useRoomTypeFilters } from '../../RoomTypes'

require('./ProductSearch.scss')

type ProductSearchProps = {
    hasScrolled?: boolean
}

export const ProductSearch = ({ hasScrolled }: ProductSearchProps): React.ReactElement => {
    const { isUpptacka } = useSugarcubeContext()

    const {
        filters,
        rawFilters,
        selectedFilterOptions,
        sortState,
        updateSortOrder,
        isSearchLoading,
        clearAllFilters,
        results,
    } = useProductSearch()
    const [, setSearchQuery] = useState(filters.query)
    const scene = useAppSelector(getSelectedScene)
    const isBedroom = scene?.roomType === 'BEDROOM'
    const { shouldShow: showAdminFilter, filter: adminFilter, setFilter: setAdminFilter } = useAdminFilter()
    // Only show admin filter when there's an active search query
    const shouldShowAdminFilter = showAdminFilter && !!filters.query
    const isRoomTypeSearchMode = useAppSelector(isInRoomTypeSearchMode)

    // Room Types functionality
    const {
        shouldShowRoomTypeUI,
        shouldShowSubCategoryPills,
        selectedSubCategory,
        isDebugSelected,
        onRoomTypeSelect,
        onSubCategorySelect: originalOnSubCategorySelect,
    } = useRoomTypeFilters()

    const hasFilters = rawFilters.length > 0
    const hasFiltersOrResults = hasFilters || results.length > 0
    const isRegularSearchActive = !!filters.query && !isRoomTypeSearchMode && !isSearchLoading

    // Wrapper for subcategory selection that also clears filters when deselecting
    const onSubCategorySelect = (subCategory: SubCategory | null) => {
        if (subCategory === null && hasFilters) {
            clearAllFilters()
        }
        originalOnSubCategorySelect(subCategory)
    }

    // Keep the searchQuery in sync with the query filter so that when the filter changes due to external actions the
    // search query is updated to match what the query has been changed to.
    useEffect(() => {
        setSearchQuery(filters.query)
    }, [filters.query])

    // Reset admin filter when search query change
    useEffect(() => {
        setAdminFilter(DEFAULT_SALES_END_DATE_FILTER)
    }, [filters.query, setAdminFilter])

    const hasSeenPriceDisclaimer = useAppSelector(sessionSelectors.getSeenFinalPriceMessage)
    const dispatch = useAppDispatch()
    const dismissPriceDisclaimer = () => dispatch(sessionActions.dismissFinalPriceMessage())

    const { t } = useTranslation()

    // Show filter pills when: (regular search AND has filters) OR (subcategory selected AND has filters/results)
    // Hide when: in room type search mode (before subcategory selection)
    const shouldShowFilterPills =
        (isRegularSearchActive && hasFilters) || (!!selectedSubCategory && hasFiltersOrResults)

    return (
        <div className={classNames('ProductSearch', { isUpptacka, 'ProductSearch--scrolled': hasScrolled })}>
            <div className="ProductSearch__searchArea">
                <ProductSearchCombobox />
            </div>

            {shouldShowRoomTypeUI && <RoomTypeSelector onRoomTypeSelect={onRoomTypeSelect} />}

            {shouldShowSubCategoryPills && <SubCategoryPills onSubCategorySelect={onSubCategorySelect} />}

            {isBedroom && isUpptacka && <ProductQuickFilters />}

            {shouldShowAdminFilter && <AdminFilter value={adminFilter} onSalesEndDateFilterChange={setAdminFilter} />}

            {!hasSeenPriceDisclaimer && !isSearchLoading && (
                <InlineMessage
                    className="ProductSearch__price-disclaimer"
                    title={t('design.final pricing')}
                    body={t('design.review price')}
                    dismissable
                    ssrIcon={informationCircleIcon}
                    collapseWhenClosed
                    onDismissClick={dismissPriceDisclaimer}
                    labelCloseButton={t('aria.close')}
                />
            )}

            {shouldShowFilterPills && !isDebugSelected && (
                <PillsContainer
                    rawFilters={rawFilters}
                    selectedFilterOptions={selectedFilterOptions}
                    sortState={sortState}
                    onSortChange={updateSortOrder}
                />
            )}
            {!isDebugSelected && <AllFiltersModal />}
        </div>
    )
}
