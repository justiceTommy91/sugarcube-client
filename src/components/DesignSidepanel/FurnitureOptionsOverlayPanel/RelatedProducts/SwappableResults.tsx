import React from 'react'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import * as compositionActions from 'models/compositions/actions'
import { getSelectedFurnitureSwappableItemsData } from 'models/compositions/selectors'
import { getProcessedItemsFinal } from 'models/compositions/helpers'
import * as furnitureSelectors from 'models/furniture/selectors'
import { SWAPPABLE_PAGE_SIZE } from 'models/furniture/constants'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'
import type { ProductData } from 'models/furniture'

import * as uiActions from 'models/ui/actions'

import { UpptackaProductCard } from 'components/upptacka/UpptackaProductCard'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

import { SwapProductSummaryCard } from '../../ProductSummaryCard'

import { ProductList } from './ProductList'

export const SwappableResults = (): React.ReactElement => {
    const { isUpptacka } = useSugarcubeContext()
    const swappableRef = React.useRef<HTMLDivElement | null>(null)
    const isLoading = useAppSelector(furnitureSelectors.getIsSwappablesLoading) as boolean
    const selectedFurniture = useAppSelector(furnitureSelectors.getSelectedFurnitureData)
    const swapAnchor = useAppSelector(furnitureSelectors.getSelectedSwapFurnitureData)

    const swappableProducts = useAppSelector(getSelectedFurnitureSwappableItemsData)
    const needsItemFiltering = !!(swapAnchor || swappableProducts) && swappableProducts?.length > 0
    const filteredSwapFurnitureData = needsItemFiltering
        ? getProcessedItemsFinal(swapAnchor, swappableProducts, selectedFurniture?.placingBehavior)
        : swappableProducts

    // TODO: Add pagination of swappable items and decrease SWAPPABLE_PAGE_SIZE.
    // See https://geomagical.atlassian.net/browse/GFX-5381
    const swappableProductIds = filteredSwapFurnitureData?.map((product: ProductData) => product.id).slice(0, SWAPPABLE_PAGE_SIZE) || []

    const dispatch = useAppDispatch()
    const swapFurnitureWith = (otherProductId: number) => {
        if (!selectedFurniture) {
            return
        }

        dispatch(
            compositionActions.swapRenderItem({
                furnitureToSwapOut: selectedFurniture,
                productToSwapIn: otherProductId,
                trackingInfo: {
                    actionType: 'click',
                    from: TRACKING_ADDED_FROM.PRODUCT_SWAP,
                },
            }),
        )
    }

    React.useEffect(() => {
        if (swappableRef.current && filteredSwapFurnitureData?.length) {
            dispatch(uiActions.swappableItemsRendered())
        }
    }, [filteredSwapFurnitureData])

    return (
        <div className="SwappableResults" ref={swappableRef}>
            <ProductList loading={isLoading}>
                {swappableProductIds.map((pid: number) =>
                    isUpptacka ? (
                        <UpptackaProductCard key={pid} productId={pid} onClick={() => swapFurnitureWith(pid)} />
                    ) : (
                        <SwapProductSummaryCard key={pid} productId={pid} />
                    ),
                )}
            </ProductList>
        </div>
    )
}
