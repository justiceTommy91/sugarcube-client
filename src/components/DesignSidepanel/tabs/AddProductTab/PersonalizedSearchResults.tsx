import React, { useEffect } from 'react'
import { FixedSizeGrid, type GridChildComponentProps } from 'react-window'
import AutoSizer, { type Size } from 'react-virtualized-auto-sizer'
import { useTranslation } from 'react-i18next'

import { hasSameContents } from 'utils/array'

import { getSelectedCompositionShoppableLocalIds } from 'models/compositions/selectors'
import { requestPersonalizedProductRecommendations } from 'models/furniture/actions'
import { getPersonalizedProductRecommendations } from 'models/furniture/selectors'
import type { ProductData } from 'models/furniture'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'

import { useAppSelector, useAppDispatch, usePrevious } from 'hooks'

import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { AddProductSummaryCard } from 'components/DesignSidepanel/ProductSummaryCard'

import ConditionalDragWrapper from 'features/drag-and-drop-product/components/ConditionalDragWrapper'
import { NoResults } from './NoResults'

require('./ProductSearchResults.scss')

const N_COLUMNS = 3
const PRODUCT_HEIGHT = 335

// NOTE: react-window recommends defining the child components for virtualized lists/grids outside of the render
//       function to keep re-renders down to a minimum as an optimization, as otherwise components might mount and
//       unmount repeatedly which also makes debugging in the browser inspector annoying.
const SearchResult = ({
    columnIndex,
    rowIndex,
    style,
    data: { searchResults, onClickProduct },
}: GridChildComponentProps<{
    searchResults: ProductData[]
    onClickProduct?: (productId: number) => void
}>): React.ReactElement => {
    const columns = N_COLUMNS
    const product = searchResults[rowIndex * columns + columnIndex]
    return (
        <li
            className="ProductSearchResults__result"
            style={style}
            // KLUDGE: react-window grids expect every cell to be occupied by an element, so when this runs for an
            //  empty cell we'll ensure that screen readers ignore these extra placeholder li elements.
            role={product == null ? 'presentation' : undefined}
            aria-hidden={product == null}
        >
            {product && (
                <ConditionalDragWrapper productData={product}>
                    <AddProductSummaryCard
                        productId={product.id}
                        addedFrom={TRACKING_ADDED_FROM.COMPLETE_MY_ROOM}
                        onClickDetails={() => onClickProduct?.(product.id)}
                    />
                </ConditionalDragWrapper>
            )}
        </li>
    )
}

type PersonalizedSearchResultsProps = {
    onScroll?: (scrollOffset: number) => void
}

export const PersonalizedSearchResults = ({ onScroll }: PersonalizedSearchResultsProps): React.ReactElement => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()

    const localIds = useAppSelector(getSelectedCompositionShoppableLocalIds)
    const prevLocalIds = usePrevious(localIds)
    const shouldReloadRecs = !prevLocalIds || !hasSameContents(localIds, prevLocalIds)

    const { products, isFetching, isError } = useAppSelector(getPersonalizedProductRecommendations)
    const filteredProducts = products.filter((p: ProductData) => !localIds.includes(p.localItemNumber))

    const columns = N_COLUMNS
    const productHeight = PRODUCT_HEIGHT

    const { viewProductDetailsOverlay } = useDesignSidebarContext()

    useEffect(() => {
        if (shouldReloadRecs) {
            dispatch(requestPersonalizedProductRecommendations())
        }
    }, [shouldReloadRecs])

    if (isFetching) {
        return (
            <div className="PersonalizedSearchResults ProductSearchResults">
                <BouncingBallLoader />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="PersonalizedSearchResults ProductSearchResults ProductSearchResults_empty">
                <div className="ProductSearchResults__error">
                    <h3>{t('design.error loading recommendations')}</h3>
                    <p>{t('design.please try again later')}</p>
                </div>
            </div>
        )
    }

    if (filteredProducts.length === 0) {
        return (
            <div className="PersonalizedSearchResults ProductSearchResults ProductSearchResults_empty">
                <NoResults />
            </div>
        )
    }

    return (
        <div className="PersonalizedSearchResults ProductSearchResults">
            <AutoSizer>
                {({ height, width }: Size) => (
                    <FixedSizeGrid
                        className="ProductSearchResults__wrapper"
                        innerElementType="ul"
                        height={height}
                        width={width}
                        columnWidth={width / columns - 21}
                        rowHeight={productHeight}
                        columnCount={columns}
                        rowCount={Math.ceil(filteredProducts.length / columns)}
                        itemData={{ searchResults: filteredProducts, onClickProduct: viewProductDetailsOverlay }}
                        onScroll={({ scrollTop }) => onScroll?.(scrollTop)}
                    >
                        {SearchResult}
                    </FixedSizeGrid>
                )}
            </AutoSizer>
        </div>
    )
}
