/* eslint-disable no-param-reassign */
import classNames from 'classnames'
import React, { useRef, useEffect } from 'react'
import { VariableSizeList, type ListChildComponentProps } from 'react-window'
import AutoSizer, { type Size } from 'react-virtualized-auto-sizer'
import InfiniteLoader from 'react-window-infinite-loader'
import { Trans } from 'react-i18next'

import type { RenderItemComplete } from 'models/compositions'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import * as compositionActions from 'models/compositions/actions'
import { formatSearchQueryDetails, calculateSearchResultPosition } from 'utils/searchTracking'
import * as furnitureSelectors from 'models/furniture/selectors'
import { isInRoomTypeSearchMode } from 'models/furniture/selectors'

import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { UpptackaProductCard } from 'components/upptacka/UpptackaProductCard'
import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import { AddProductSummaryCard } from 'components/DesignSidepanel/ProductSummaryCard'

import ConditionalDragWrapper from 'features/drag-and-drop-product/components/ConditionalDragWrapper'
import { useAdminFilter } from 'hooks/admin/useAdminFilter'
import { useFlags } from 'hooks/useFlags'

import { ConfigurableProductBanner } from 'components/configurableProducts/ConfigurableProductBanner'
import {
    CONFIGURABLE_PRODUCT_FAMILIES,
    PAX_SUBCATEGORY_IDS,
    type ProductFamily,
} from 'components/configurableProducts/constants'

import { useProductSearch } from '../../search-filters/hooks/useProductSearch'
import { useRoomTypeFilters } from '../../RoomTypes'

import { NoResults } from './NoResults'

require('./ProductSearchResults.scss')

const N_COLUMNS = 3
const N_COLUMNS_UPPTACKA = 2
const nColumns = (isUpptacka: boolean): number => (isUpptacka ? N_COLUMNS_UPPTACKA : N_COLUMNS)

const PRODUCT_HEIGHT = 335
const PRODUCT_HEIGHT_UPPTACKA = 500
const RESULTS_TEXT_HEIGHT = 56
const CONFIGURABLE_BANNER_HEIGHT = 152
const itemHeight = (isUpptacka: boolean): number => (isUpptacka ? PRODUCT_HEIGHT_UPPTACKA : PRODUCT_HEIGHT)

// NOTE: react-window recommends defining the child components for virtualized lists/grids outside of the render
//       function to keep re-renders down to a minimum as an optimization, as otherwise components might mount and
//       unmount repeatedly which also makes debugging in the browser inspector annoying.
const SearchResultRow = ({
    style,
    index: rowN,
    data: {
        results,
        isRowLoaded,
        onClickProduct,
        isUpptacka,
        query,
        isLoading,
        searchContext,
        configurableProductFamily,
        isRoomTypeSearchMode,
    },
}: ListChildComponentProps<{
    results: RenderItemComplete[]
    isUpptacka: boolean
    isRowLoaded: (rowN: number) => boolean
    onClickProduct?: (productId: number) => void
    query: string
    isLoading: boolean
    configurableProductFamily?: ProductFamily
    isRoomTypeSearchMode: boolean
    searchContext?: {
        searchQueryDetails: string
        currentPage: number
        pageSize: number
    }
}>): React.ReactElement => {
    const dispatch = useAppDispatch()

    const addProductToComposition = (productId: number) => {
        dispatch(compositionActions.addProductToComposition(productId, { AddedFrom: TRACKING_ADDED_FROM.SIDEPANEL }))
    }

    // Show "Showing results for 'XXX'" ONLY for regular user-typed searches
    // Hide for: room type search mode, no query, or loading state
    const shouldShowResultsHeader = query && !isLoading && !isRoomTypeSearchMode
    const bannerRow = shouldShowResultsHeader ? 1 : 0

    // row 0: results text (only when there's a query)
    if (rowN === 0 && shouldShowResultsHeader) {
        return (
            <div className="ProductSearchResults__headerRow" style={style}>
                <h3 className="ProductSearchResults__resultsText">
                    <Trans i18nKey="design.results from" searchQuery={query} shouldUnescape>
                        Results from <strong>&quot;{{ searchQuery: query }}&quot;</strong>
                    </Trans>
                </h3>
            </div>
        )
    }

    // banner row: immediately after results text (or at row 0 when no query)
    if (rowN === bannerRow && configurableProductFamily) {
        return (
            <div style={style}>
                <ConfigurableProductBanner productFamily={configurableProductFamily} />
            </div>
        )
    }

    // Adjust row index based on how many header rows are shown above product rows
    const headerRowCount = shouldShowResultsHeader
        ? configurableProductFamily
            ? 2
            : 1
        : configurableProductFamily
        ? 1
        : 0
    const actualRowN = rowN - headerRowCount

    if (!isRowLoaded(actualRowN)) {
        return (
            <li className="ProductSearchResults__result" style={style}>
                <BouncingBallLoader />
            </li>
        )
    }

    const startIndex = actualRowN * nColumns(isUpptacka)
    const products = results.slice(startIndex, startIndex + nColumns(isUpptacka))
    return (
        <>
            {products.map((product, i) => (
                <li
                    key={product?.id || i}
                    className="ProductSearchResults__result"
                    style={{
                        ...style,
                        width: `${100 / nColumns(isUpptacka)}%`,
                        left: `${(i / nColumns(isUpptacka)) * 100}%`,
                    }}
                >
                    {product &&
                        (isUpptacka ? (
                            <UpptackaProductCard
                                productId={product.id}
                                onClick={() => addProductToComposition(product.id)}
                            />
                        ) : (
                            <ConditionalDragWrapper productData={product}>
                                <AddProductSummaryCard
                                    productId={product.id}
                                    addedFrom={TRACKING_ADDED_FROM.SIDEPANEL}
                                    onClickDetails={() => onClickProduct?.(product.id)}
                                    searchContext={
                                        searchContext
                                            ? {
                                                  searchQueryDetails: searchContext.searchQueryDetails,
                                                  searchResultPosition: calculateSearchResultPosition(
                                                      product.id.toString(),
                                                      results.map((r) => ({ id: r.id.toString() })),
                                                      searchContext.currentPage,
                                                      searchContext.pageSize,
                                                  ),
                                              }
                                            : undefined
                                    }
                                />
                            </ConditionalDragWrapper>
                        ))}
                </li>
            ))}
        </>
    )
}

type ProductSearchResultsProps = {
    onScroll?: (scrollOffset: number) => void
}

export const ProductSearchResults = ({ onScroll }: ProductSearchResultsProps): React.ReactElement => {
    const { isUpptacka } = useSugarcubeContext()
    const { viewProductDetailsOverlay } = useDesignSidebarContext()
    const { flags } = useFlags()

    const searchResults = useProductSearch()
    const { filters } = searchResults
    const listRef = useRef<VariableSizeList | null>(null)
    const { filteredResults } = useAdminFilter(searchResults)
    const { selectedRoomType, selectedSubCategory, shouldShowRoomTypeUI, isInitializing } = useRoomTypeFilters()
    const isRoomTypeSearchMode = useAppSelector(isInRoomTypeSearchMode)
    // Use admin-filtered results if available, otherwise use original results.
    // Also filter out empty results.
    const resultsToDisplay = (filteredResults || searchResults.results).filter((result) => !!result?.id)
    const isFurnitureLoading = useAppSelector(furnitureSelectors.getFurnitureIsLoading)

    // Get current filters for search context
    const currentFilters = useAppSelector(furnitureSelectors.getFilter)
    const currentSelectedFilterOptions = useAppSelector(furnitureSelectors.getSelectedFilterOptions)
    const rawFilters = useAppSelector(furnitureSelectors.getRawFilters)
    const searchQueryDetails = formatSearchQueryDetails(currentFilters, currentSelectedFilterOptions, rawFilters)

    // Calculate pagination context from actual virtualized list state
    const pageSize = nColumns(isUpptacka) * Math.ceil(resultsToDisplay.length / nColumns(isUpptacka))
    const currentPage = 1

    // Include search context if there's any search activity (query or applied filters)
    const selectedFilterOptions = searchResults.selectedFilterOptions || {}
    const hasActiveFilters = Object.values(selectedFilterOptions).some(
        (filterValues) => Array.isArray(filterValues) && filterValues.length > 0,
    )

    const hasSearchActivity =
        !!filters.query ||
        hasActiveFilters ||
        !!filters.inStockStore ||
        !!filters.availableOnline ||
        ('sortOrder' in filters && filters.sortOrder && filters.sortOrder !== 'DEFAULT') ||
        shouldShowRoomTypeUI ||
        !!selectedRoomType ||
        !!selectedSubCategory

    const searchContext = hasSearchActivity
        ? {
              searchQueryDetails,
              currentPage,
              pageSize,
          }
        : undefined

    // Reset the list's cache when filters change to prevent height calculation issues
    useEffect(() => {
        if (listRef.current) {
            listRef.current.resetAfterIndex(0)
        }
    }, [filters])

    // Show loader during room types initialization, NoResults only after initialization is complete
    // Also don't show NoResults if we're currently loading (prevents flash when changing filters)
    // Check isFurnitureLoading to cover all filter changes, not just query changes
    if (searchResults.status === 'success' && !isInitializing && !isFurnitureLoading && resultsToDisplay.length === 0) {
        return (
            <div className="ProductSearchResults ProductSearchResults_empty">
                <NoResults />
            </div>
        )
    }

    const isLoading = searchResults.isSearchLoading
    const nRows = Math.ceil(resultsToDisplay.length / nColumns(isUpptacka))
    const isRowLoaded = (rowN: number) => rowN < nRows

    // Show "Showing results for 'XXX'" ONLY for regular user-typed searches
    // Hide for: room type search mode, no query, or loading state
    const shouldShowResultsHeader = filters.query && !isLoading && !isRoomTypeSearchMode

    const baseItemCount = searchResults.haveMore ? nRows + 1 : nRows

    // TODO: also resolve by product ID — if the user types a PAX item number, look up its family via the furniture
    // catalogue and map it here. Requirement not yet scoped.
    const configurableProductFamily = (() => {
        if (!flags?.ConfigurableProductBanner) return undefined
        const query = filters.query?.toUpperCase()
        if (query) {
            const matchedKey = Object.keys(CONFIGURABLE_PRODUCT_FAMILIES).find((family) => query.includes(family))
            if (matchedKey) return CONFIGURABLE_PRODUCT_FAMILIES[matchedKey]
        }
        if (selectedSubCategory && PAX_SUBCATEGORY_IDS.has(selectedSubCategory.categoryId)) {
            return 'PAX' as ProductFamily
        }
        return undefined
    })()

    const bannerExtraRows = configurableProductFamily ? 1 : 0
    const headerExtraRows = shouldShowResultsHeader ? 1 : 0
    // +1 for results text (query only), +1 more for the banner (query or subcategory match)
    const itemCount = baseItemCount + headerExtraRows + bannerExtraRows

    return (
        <div className={classNames('ProductSearchResults', { isUpptacka })} aria-busy={isLoading}>
            <AutoSizer>
                {({ height, width }: Size) => (
                    <InfiniteLoader
                        isItemLoaded={isRowLoaded}
                        itemCount={itemCount}
                        loadMoreItems={searchResults.fetchNextPage}
                        threshold={4}
                    >
                        {({ onItemsRendered, ref }) => (
                            <VariableSizeList
                                ref={(node) => {
                                    // Store the node in our own ref for calling resetAfterIndex
                                    ;(listRef as React.MutableRefObject<VariableSizeList | null>).current = node

                                    // Also forward the node to InfiniteLoader's ref
                                    if (typeof ref === 'function') {
                                        ref(node) // If ref is a function, call it with the node
                                    } else if (ref && typeof ref === 'object') {
                                        ;(ref as React.MutableRefObject<VariableSizeList | null>).current = node // If ref is a ref object, set its .current
                                    }
                                }}
                                onItemsRendered={onItemsRendered}
                                onScroll={({ scrollOffset }) => onScroll?.(scrollOffset)}
                                // eslint-disable-next-line i18next/no-literal-string
                                innerElementType="ul"
                                className="ProductSearchResults__wrapper"
                                height={height}
                                width={width}
                                itemSize={(index) => {
                                    if (index === 0 && shouldShowResultsHeader) return RESULTS_TEXT_HEIGHT
                                    if (index === (shouldShowResultsHeader ? 1 : 0) && configurableProductFamily)
                                        return CONFIGURABLE_BANNER_HEIGHT
                                    return itemHeight(isUpptacka)
                                }}
                                itemCount={itemCount}
                                itemData={{
                                    results: resultsToDisplay,
                                    isRowLoaded,
                                    onClickProduct: viewProductDetailsOverlay,
                                    isUpptacka,
                                    query: filters.query || '',
                                    isLoading,
                                    configurableProductFamily,
                                    isRoomTypeSearchMode,
                                    searchContext,
                                }}
                            >
                                {SearchResultRow}
                            </VariableSizeList>
                        )}
                    </InfiniteLoader>
                )}
            </AutoSizer>
        </div>
    )
}
