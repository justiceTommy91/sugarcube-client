import React from 'react'
import SSRIcon, { SSRIconProps } from '@ingka/ssr-icon'
import Image from '@ingka/image'

import { useAppSelector } from 'hooks/useAppSelector'
import { useGetPriceString } from 'hooks/useGetPriceString'

import type { RenderItemComplete } from 'models/compositions'
import * as furnitureSelectors from 'models/furniture/selectors'
import { ProductAvailability } from './ProductAvailability'

import './ProductSummaryCard.scss'

export type ProductSummaryCardProps = {
    productId: number
    thumbnailActionLabel: string
    thumbnailActionIcon: SSRIconProps['paths']
    onClickThumbnail: React.MouseEventHandler<HTMLElement>
    onClickDetails?: React.MouseEventHandler<HTMLElement>
    thumbnailButtonDisabled?: boolean
    thumbnailLoading?: HTMLImageElement['loading'] | undefined
    children?: React.ReactNode | undefined
} & React.HTMLAttributes<HTMLElement>

export const ProductSummaryCard = React.forwardRef<HTMLElement, ProductSummaryCardProps>(
    (
        {
            productId,
            onClickThumbnail,
            thumbnailActionLabel,
            thumbnailActionIcon,
            onClickDetails,
            thumbnailButtonDisabled,
            thumbnailLoading = 'eager',
            children,
            ...htmlProps
        },
        ref,
    ): React.ReactElement => {
        const product = useAppSelector(
            (state) => furnitureSelectors.getFurnitureById(state)[productId],
        ) as RenderItemComplete
        const { getPriceString } = useGetPriceString()

        return (
            <article
                {...htmlProps}
                ref={ref}
                className={`ProductSummaryCard${htmlProps.className ? ` ${htmlProps.className}` : ''}`}
            >
                <button
                    className="ProductSummaryCard__thumbnailWrapper"
                    aria-label={htmlProps['aria-label'] || thumbnailActionLabel}
                    disabled={thumbnailButtonDisabled}
                    onClick={onClickThumbnail}
                >
                    <Image
                        className="ProductSummaryCard__thumbnail"
                        width="160"
                        height="160"
                        loading={thumbnailLoading}
                        // NOTE: the url param ?f=u selects a smaller variant of the thumbnail suitable for display in the sidebar.
                        src={`${product.thumbUrl}?f=u`}
                        alt={product.name}
                    />

                    <div className="ProductSummaryCard__thumbnailOverlay" role="presentation" aria-hidden="true">
                        <div className="ProductSummaryCard__thumbnailOverlayIcon">
                            <SSRIcon paths={thumbnailActionIcon} />
                        </div>

                        <div className="ProductSummaryCard__thumbnailOverlayText">{thumbnailActionLabel}</div>
                    </div>
                </button>

                {children || (
                    <>
                        {onClickDetails ? (
                            <button
                                className="ProductSummaryCard__productDetails"
                                aria-label="View product details"
                                onClick={onClickDetails}
                            >
                                <div className="ProductSummaryCard__name">{product.name}</div>

                                <div className="ProductSummaryCard__description">
                                    {product.description}
                                    <div className="ProductSummaryCard__fullDescription">{product.description}</div>
                                </div>

                                <div className="ProductSummaryCard__price">{getPriceString(product.price)}</div>
                            </button>
                        ) : (
                            <div className="ProductSummaryCard__productDetails">
                                <div className="ProductSummaryCard__name">{product.name}</div>

                                <div className="ProductSummaryCard__description">
                                    {product.description}
                                    <div className="ProductSummaryCard__fullDescription">{product.description}</div>
                                </div>

                                <div className="ProductSummaryCard__price">{getPriceString(product.price)}</div>
                            </div>
                        )}
                        <ProductAvailability productId={productId} />
                    </>
                )}
            </article>
        )
    },
)
