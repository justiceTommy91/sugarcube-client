import React from 'react'
import { useTranslation } from 'react-i18next'

import SSRIcon from '@ingka/ssr-icon'
import linkOutIcon from '@ingka/ssr-icon/paths/link-out'

import { useAppSelector } from 'hooks/useAppSelector'
import { useGetPriceString } from 'hooks/useGetPriceString'

import FavoriteButtonContainer from 'containers/uiElements/FavoriteButtonContainer'

import type { FurnitureRenderItemComplete } from 'models/compositions'
import { getFurnitureById } from 'models/furniture/selectors'
import { TRACK_LOCATION_SIDEPANEL } from 'models/tracking/constants'

import AdminProductDetails from './AdminProductDetails'
import { ProductAvailabilityFull } from './ProductAvailabilityFull'
import { Rating } from './Rating'
import { ProductThumbnails } from './ProductThumbnails'

require('./ProductDetails.scss')

export type ProductDetailsProps = {
    productId: number
    actions?: React.ReactNode
}

export const ProductDetails = ({ productId, actions }: ProductDetailsProps): React.ReactElement => {
    const product = useAppSelector((state) => getFurnitureById(state)[productId]) as FurnitureRenderItemComplete

    const { t } = useTranslation()
    const { getPriceString } = useGetPriceString()
    return (
        <div className="ProductDetails">
            <div className="ProductDetails__details">
                <div>
                    <h3 className="ProductDetails__name">{product.name}</h3>
                    <p className="ProductDetails__description">{product.description}</p>
                </div>

                <FavoriteButtonContainer
                    localItemNumber={product.localItemNumber}
                    location={TRACK_LOCATION_SIDEPANEL}
                />

                <div className="ProductDetails__priceWrapper">
                    <div className="ProductDetails__price">{getPriceString(product.price)}</div>

                    {product.rating != null && <Rating rating={Number(product.rating)} />}
                </div>

                {product.ratingCount && product.ratingCount > 0 && (
                    <div className="ProductDetails__ratingCount">({product.ratingCount})</div>
                )}

                <a
                    className="ProductDetails__moreDetailsLink"
                    href={product.ecommerceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <SSRIcon paths={linkOutIcon} /> {t('design.show more details')}
                </a>
            </div>

            <div className="ProductDetails__actions">{actions}</div>

            <div className="ProductDetails__thumbnails">
                <ProductThumbnails productId={productId} />
            </div>

            <AdminProductDetails productData={product} />

            <div className="ProductDetails__availability">
                <div className="ProductDetails__availabilityHeader">{t('design.how to get it')}</div>

                <ProductAvailabilityFull productId={productId} />
            </div>
        </div>
    )
}
