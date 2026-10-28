import React from 'react'

import { useSugarcubeContext } from 'apps/SugarcubeContext'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import * as compositionActions from 'models/compositions/actions'
import * as furnitureSelectors from 'models/furniture/selectors'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'

import { UpptackaProductCard } from 'components/upptacka/UpptackaProductCard'
import { AddProductSummaryCard } from 'components/DesignSidepanel/ProductSummaryCard'

import { ProductList } from './ProductList'

export type GoesWellWithResultsProps = {
    productId?: number | undefined
}

export const GoesWellWithResults: React.FunctionComponent<GoesWellWithResultsProps> = ({ productId }) => {
    const { isUpptacka } = useSugarcubeContext()

    const isLoading = useAppSelector(furnitureSelectors.getIsGoesWithLoading)
    const goesWellWithProducts = useAppSelector((state) =>
        productId == null ? [] : (furnitureSelectors.getGoesWithProducts(state, productId) as number[]),
    ).slice(0, 30)

    const dispatch = useAppDispatch()
    const addProductToComposition = (otherProductId: number) =>
        dispatch(
            compositionActions.addProductToComposition(otherProductId, {
                AddedFrom: TRACKING_ADDED_FROM.GOES_WITH,
            }),
        )

    return (
        <ProductList loading={isLoading}>
            {goesWellWithProducts.map((pid) =>
                isUpptacka ? (
                    <UpptackaProductCard key={pid} onClick={() => addProductToComposition(pid)} productId={pid} />
                ) : (
                    <AddProductSummaryCard
                        key={pid}
                        productId={pid}
                        addedFrom={TRACKING_ADDED_FROM.GOES_WITH}
                        thumbnailLoading="lazy"
                    />
                ),
            )}
        </ProductList>
    )
}
