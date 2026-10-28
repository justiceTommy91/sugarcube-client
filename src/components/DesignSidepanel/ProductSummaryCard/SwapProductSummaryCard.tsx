import React from 'react'
import { useStore } from 'react-redux'
import { useTranslation } from 'react-i18next'
import arrowLeftArrowRightIcon from '@ingka/ssr-icon/paths/arrow-left-arrow-right'
import * as Sentry from '@sentry/react'

import type { RenderItemComplete } from 'models/compositions'
import * as compositionsActions from 'models/compositions/actions'
import * as compositionsSelectors from 'models/compositions/selectors'
import * as furnitureSelectors from 'models/furniture/selectors'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import { ProductSummaryCard } from './ProductSummaryCard'
import { ProductSummaryDetails } from './ProductSummaryDetails'
import { UndoSwapButton } from './UndoSwapButton'

export type SwapProductSummaryCardProps = {
    productId: number
    thumbnailLoading?: HTMLImageElement['loading'] | undefined
}

export const SwapProductSummaryCard: React.FunctionComponent<SwapProductSummaryCardProps> = ({
    productId,
    thumbnailLoading = 'eager',
}) => {
    const dispatch = useAppDispatch()
    const store = useStore()
    const swapFurnitureWith = (otherProductId: number) => {
        const state = store.getState()
        const selectedItem = compositionsSelectors.getSelectedRenderItem(state)
        const selectedItemId = selectedItem?.uniqueId
        if (!selectedItemId) {
            Sentry.captureMessage(
                `user attempted to swap furniture with product ${productId} but no furniture was selected`,
                'error',
            )
            return
        }

        const swapParams: compositionsActions.SwapRenderItemArgs = {
            furnitureToSwapOut: selectedItemId,
            productToSwapIn: otherProductId,
            trackingInfo: {
                actionType: `click`,
                from: TRACKING_ADDED_FROM.PRODUCT_SWAP,
            }
        }

        const newFurnitureProductData = furnitureSelectors.getFurnitureById(state)[otherProductId]
        if (selectedItem?.materialUrl && newFurnitureProductData?.materialUrl) {
            dispatch(compositionsActions.softSwapRenderItem(swapParams))
        } else {
            dispatch(compositionsActions.swapRenderItem(swapParams))
        }
    }
    const wasJustSwappedIn = useAppSelector((state) => {
        const furnitureSwappedOut = furnitureSelectors.getSelectedFurnitureBeforeSwap(
            state,
        ) as RenderItemComplete | null
        if (furnitureSwappedOut == null) {
            return false
        }

        const swappedProduct = furnitureSelectors.getSelectedFurnitureData(state) as RenderItemComplete | null
        return swappedProduct?.id === productId
    })

    const { t } = useTranslation()
    
    // Add aria props for currently selected product
    const ariaProps = wasJustSwappedIn
        ? {
            'aria-current': true as const,
            'aria-label': t('aria.currently selected product'),
        }
        : {}
    
    return (
        <ProductSummaryCard
            productId={productId}
            onClickThumbnail={() => swapFurnitureWith(productId)}
            thumbnailButtonDisabled={wasJustSwappedIn}
            thumbnailActionLabel={t('design.swap products')}
            thumbnailActionIcon={arrowLeftArrowRightIcon}
            thumbnailLoading={thumbnailLoading}
            {...ariaProps}
        >
            {wasJustSwappedIn ? <UndoSwapButton /> : <ProductSummaryDetails productId={productId} />}
        </ProductSummaryCard>
    )
}
