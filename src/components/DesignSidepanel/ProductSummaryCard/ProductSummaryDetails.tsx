import React from 'react'
import { useTranslation } from 'react-i18next'

import { useAppSelector } from 'hooks/useAppSelector'
import { useGetPriceString } from 'hooks/useGetPriceString'

import type { RenderItemComplete } from 'models/compositions'
import * as furnitureSelectors from 'models/furniture/selectors'

import { ProductAvailability } from './ProductAvailability'

import './ProductSummaryDetails.scss'

export type ProductSummaryDetailsProps = {
    productId: number
    onClickDetails?: React.MouseEventHandler<HTMLElement> | undefined
}

export const ProductSummaryDetails: React.FunctionComponent<ProductSummaryDetailsProps> = ({
    productId,
    onClickDetails,
}) => {
    const product = useAppSelector(
        (state) => furnitureSelectors.getFurnitureById(state)[productId],
    ) as RenderItemComplete
    const { getPriceString } = useGetPriceString()
    const { t } = useTranslation()

    // ACCESSIBILITY: Create descriptive aria-label for product details button
    // Problem: Product details section reads all content (name, description, price) 
    // but doesn't indicate it's clickable to view more details
    // Solution: Provide clear aria-label indicating action and include key info (name, price)
    // while hiding redundant visual content from screen readers
    const priceString = getPriceString(product.price)
    const detailsAriaLabel = t('aria.view-product-details', {
        productName: product.name,
        price: priceString,
    })

    const details = (
        <>
            {/* ACCESSIBILITY: Use aria-hidden to prevent redundant reading since info is in button aria-label
                When onClickDetails exists, this content is wrapped in a button with a descriptive aria-label
                that includes the key information. We hide the visual content to prevent screen readers
                from reading the same information twice. */}
            <div className="ProductSummaryDetails__name" aria-hidden={!!onClickDetails}>
                {product.name}
            </div>

            <div className="ProductSummaryDetails__description" aria-hidden={!!onClickDetails}>
                {product.description}
                <div className="ProductSummaryDetails__fullDescription">{product.description}</div>
            </div>

            <div className="ProductSummaryDetails__price" aria-hidden={!!onClickDetails}>
                {priceString}
            </div>
        </>
    )

    return (
        <div className="ProductSummaryDetails">
            {onClickDetails ? (
                <button 
                    className="ProductSummaryDetails__wrapper" 
                    onClick={onClickDetails}
                    aria-label={detailsAriaLabel} // ACCESSIBILITY: Descriptive action + key product info
                >
                    {details}
                </button>
            ) : (
                <div className="ProductSummaryDetails__wrapper">{details}</div>
            )}

            <ProductAvailability productId={productId} />
        </div>
    )
}
