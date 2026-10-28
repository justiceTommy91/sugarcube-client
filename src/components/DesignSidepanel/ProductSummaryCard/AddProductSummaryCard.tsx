import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import plusIcon from '@ingka/ssr-icon/paths/plus'

import * as compositionActions from 'models/compositions/actions'
import type { RenderItemComplete } from 'models/compositions'
import * as furnitureSelectors from 'models/furniture/selectors'
import { TrackingAddedFrom } from 'models/tracking/constants'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'
import { useGetPriceString } from 'hooks/useGetPriceString'
import AriaLiveAnnouncer from 'components/accessibility/AriaLiveAnnouncer'

import { ProductSummaryCard } from './ProductSummaryCard'
import { ProductSummaryDetails } from './ProductSummaryDetails'

export type AddProductSummaryCardProps = {
    productId: number
    addedFrom: TrackingAddedFrom
    onClickDetails?: React.MouseEventHandler<HTMLElement> | undefined
    thumbnailLoading?: HTMLImageElement['loading'] | undefined
    searchContext?: {
        searchQueryDetails: string
        searchResultPosition: number | null
    }
} & React.HTMLAttributes<HTMLElement>

export const AddProductSummaryCard: React.FunctionComponent<AddProductSummaryCardProps> = ({
    productId,
    addedFrom,
    onClickDetails,
    thumbnailLoading = 'eager',
    searchContext,
    ...htmlProps
}) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const product = useAppSelector(
        (state) => furnitureSelectors.getFurnitureById(state)[productId],
    ) as RenderItemComplete

    const [productAddedMessage, setProductAddedMessage] = useState('')

    const addProductToComposition = () => {
        dispatch(
            compositionActions.addProductToComposition(productId, {
                AddedFrom: addedFrom,
                // Add search context for tracking if available
                ...(searchContext && { searchContext }),
            }),
        )

        // Set the announcement message for screen readers
        const message = t('aria.product added to room', {
            productName: product.name,
        })
        setProductAddedMessage(message as string)

        // Clear the message after announcement
        setTimeout(() => setProductAddedMessage(''), 3000)
    }

    const { getPriceString } = useGetPriceString()

    // ACCESSIBILITY: Generate unique aria-label for "Add to room" button
    // Problem: Generic "Add to room" labels make it impossible for screen reader users
    // to distinguish between products when browsing multiple items
    // Solution: Include product name, description (when available), and price in aria-label
    // while keeping visual text as "Add to room" for design consistency

    const priceString = getPriceString(product.price)
    const buttonAriaLabel = product?.description
        ? t('aria.add-product-to-room-with-price', {
              productName: product.name,
              description: product.description,
              price: priceString,
          })
        : t('aria.add-product-to-room-name-price-only', {
              productName: product?.name || '',
              price: priceString,
          })

    return (
        <>
            <AriaLiveAnnouncer message={productAddedMessage} politeness="polite" clearAfter={3000} />
            <ProductSummaryCard
                {...htmlProps}
                productId={productId}
                thumbnailActionLabel={t('design.add to room')}
                thumbnailActionIcon={plusIcon}
                onClickThumbnail={() => addProductToComposition()}
                thumbnailLoading={thumbnailLoading}
                aria-label={buttonAriaLabel} // ACCESSIBILITY: Descriptive label instead of generic "Add to room"
            >
                <ProductSummaryDetails productId={productId} onClickDetails={onClickDetails} />
            </ProductSummaryCard>
        </>
    )
}
