import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import shoppingBagAddIcon from '@ingka/ssr-icon/paths/shopping-bag-add'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'

import { useTracker } from 'apps/TrackingBoundary'

import { useShoppingBag, AddToBagSource } from 'features/shopping-bag'

import { ProductType } from 'hooks/useCompositionFurniture'
import { useCatalogProductVariants } from 'hooks/useCatalogProductVariants'
import { useProduct } from 'hooks/useProduct'

import { TRACKING_ADDED_FROM } from 'models/tracking/constants'

import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'

import { idle } from 'utils/async'

import { ArtItemCustomizations } from './ArtItemCustomizations'
import { ProductDetails } from '../ProductDetails'
import { ProductVariants } from './ProductVariants'
import ProductMirror from './ProductMirror'

import './FurnitureOptions.scss'

export type FurnitureOptionsProps = {
    productId?: number | undefined
}

export const FurnitureOptions: React.FunctionComponent<FurnitureOptionsProps> = ({ productId }) => {
    const { addItemToBag, invalidLocalItemNumbers, isAddingProductToBag, isProductAdded } = useShoppingBag()

    const { t } = useTranslation()
    /* eslint-disable i18next/no-literal-string */
    const addToBagKey = 'design.add to bag'
    /* eslint-enable i18next/no-literal-string */

    const track = useTracker()

    const product = useProduct(productId ?? idle)
    const variants = useCatalogProductVariants(productId ?? idle)
    let content: React.ReactNode
    if (product.status === 'error' || variants.status === 'error') {
        content = <div>{t('common.errMessage')}</div>
    } else if (
        product.status === 'idle' ||
        variants.status === 'idle' ||
        product.status === 'loading' ||
        variants.status === 'loading'
    ) {
        content = (
            <div className="FurnitureOptions__loader">
                <BouncingBallLoader />
            </div>
        )
    } else {
        const isProductInvalid = invalidLocalItemNumbers.includes(product.result.id)
        const isAddingThisProduct = isAddingProductToBag(product.result.id, AddToBagSource.FURNITURE_OPTIONS)
        const isThisProductAdded = isProductAdded(product.result.id, AddToBagSource.FURNITURE_OPTIONS)
        content = (
            <>
                <ProductDetails
                    productId={product.result.id}
                    actions={
                        <Button
                            type="emphasised"
                            size="small"
                            disabled={isProductInvalid}
                            loading={isAddingThisProduct}
                            aria-busy={isAddingThisProduct ? true : undefined}
                            aria-live={isAddingThisProduct ? 'polite' : undefined}
                            ssrIcon={
                                isThisProductAdded
                                    ? checkmarkIcon
                                    : isAddingThisProduct
                                    ? undefined
                                    : shoppingBagAddIcon
                            }
                            fluid
                            text={isThisProductAdded ? t('design.added') : isAddingThisProduct ? '' : t(addToBagKey)}
                            onClick={() => {
                                if (isAddingThisProduct || isThisProductAdded) {
                                    return
                                }
                                track.click({
                                    target: addToBagKey,
                                    intendedAction: 'DecorateRoom.AddProductToBag',
                                    attributes: { LocalItemNumber: product.result.localItemNumber },
                                })
                                addItemToBag({
                                    productId: product.result.id,
                                    trackingInfoAddedFrom: TRACKING_ADDED_FROM.SIDEPANEL_FURNITURE_OPTIONS,
                                    source: AddToBagSource.FURNITURE_OPTIONS,
                                })
                            }}
                        />
                    }
                />

                {variants.result.length > 0 && (
                    <div className="FurnitureOptions__section">
                        <ProductVariants productId={product.result.id} />
                    </div>
                )}

                {product.result.productType === ProductType.ART_ITEM && <ArtItemCustomizations />}

                {product.result.canBeMirrored && (
                    <div className="FurnitureOptions__section">
                        <ProductMirror />
                    </div>
                )}
            </>
        )
    }

    return <div className="FurnitureOptions">{content}</div>
}
