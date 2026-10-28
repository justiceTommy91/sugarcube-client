import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import shoppingBagAddIcon from '@ingka/ssr-icon/paths/shopping-bag-add'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'

import { useTracker, withTrackingBoundary } from 'apps/TrackingBoundary'

import { ProductDetails } from 'components/DesignSidepanel/ProductDetails'
import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import Tooltip from 'components/Tooltip'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import { addProductToComposition } from 'models/compositions/actions'
import { ProductData } from 'models/furniture'
import { getFurnitureById } from 'models/furniture/selectors'
import { TRACKING_ADDED_FROM, TRACK_LOCATION_SIDEPANEL } from 'models/tracking/constants'
import { getProductTrackingInfo } from 'models/tracking/utils'

import { useShoppingBag, AddToBagSource } from 'features/shopping-bag'

import { DesignSidepanelOverlayPanel } from '../DesignSidepanelOverlayPanel'

import './ProductDetailsOverlayPanel.scss'

export type ProductDetailsOverlayPanelProps = {
    productId?: number | undefined
}

export const ProductDetailsOverlayPanel = withTrackingBoundary('ProductDetails')(
    ({ productId }: ProductDetailsOverlayPanelProps): React.ReactElement => {
        const { addItemToBag, isAddingProductToBag, isProductAdded } = useShoppingBag()
        const { dismissOverlay } = useDesignSidebarContext()
        const product = useAppSelector((state) =>
            productId != null ? (getFurnitureById(state)[productId] as ProductData) : undefined,
        )
        const dispatch = useAppDispatch()
        const addProductToRoom = () => {
            if (product == null) {
                return
            }
            dispatch(
                addProductToComposition(product.id, {
                    ...getProductTrackingInfo(product),
                    AddedFrom: TRACK_LOCATION_SIDEPANEL,
                }),
            )
        }

        const { t } = useTranslation()
        /* eslint-disable i18next/no-literal-string */
        const backButtonTextKey = 'design.back'
        const addToRoomKey = 'design.add to room'
        const addToBagKey = 'design.add to bag'

        const addToBagId = React.useId()

        const isAddingThisProduct =
            productId != null ? isAddingProductToBag(productId, AddToBagSource.PRODUCT_DETAILS) : false
        const isThisProductAdded = productId != null ? isProductAdded(productId, AddToBagSource.PRODUCT_DETAILS) : false

        const track = useTracker()
        React.useEffect(() => {
            track('DecorateRoom.DesignSidepanel.ItemDetails.View', {
                hints: {
                    productId,
                },
            })
        }, [])

        return (
            <DesignSidepanelOverlayPanel
                open={productId != null}
                heading={t('design.item details')}
                backButtonProps={{
                    text: t(backButtonTextKey),
                }}
                onClickBack={(event) => {
                    track('DecorateRoom.DesignSidepanel.ItemDetails.Dismiss', {
                        hints: {
                            userInteraction: {
                                event,
                                elementName: backButtonTextKey,
                            },
                            productId,
                        },
                    })
                    dismissOverlay()
                }}
            >
                {productId != null && (
                    <ProductDetails
                        productId={productId}
                        actions={
                            <>
                                <Button
                                    type="emphasised"
                                    size="small"
                                    fluid
                                    loading={product?.isCombinableChild && isAddingThisProduct}
                                    aria-busy={product?.isCombinableChild && isAddingThisProduct ? true : undefined}
                                    aria-live={product?.isCombinableChild && isAddingThisProduct ? 'polite' : undefined}
                                    ssrIcon={
                                        product?.isCombinableChild && isThisProductAdded ? checkmarkIcon : undefined
                                    }
                                    text={
                                        product?.isCombinableChild && isThisProductAdded
                                            ? t('design.added')
                                            : product?.isCombinableChild && isAddingThisProduct
                                            ? ''
                                            : t(!product?.isCombinableChild ? addToRoomKey : addToBagKey)
                                    }
                                    onClick={() => {
                                        if ((product?.isCombinableChild && isAddingThisProduct) || isThisProductAdded) {
                                            return
                                        }
                                        if (!product?.isCombinableChild) {
                                            addProductToRoom()
                                        } else {
                                            addItemToBag({
                                                productId,
                                                trackingInfoAddedFrom: TRACKING_ADDED_FROM.SIDEPANEL_PRODUCT_DETAILS,
                                                source: AddToBagSource.PRODUCT_DETAILS,
                                            })
                                        }
                                    }}
                                />
                                {!product?.isCombinableChild && (
                                    <Tooltip
                                        describedById={addToBagId}
                                        title={t(addToBagKey)}
                                        boundaryContainerID="DesignSidepanelOverlayPanel"
                                    >
                                        <Button
                                            className="DesignSidepanelOverlayPanel__add-to-bag-button"
                                            ssrIcon={
                                                isThisProductAdded
                                                    ? checkmarkIcon
                                                    : isAddingThisProduct
                                                    ? undefined
                                                    : shoppingBagAddIcon
                                            }
                                            type="tertiary"
                                            loading={isAddingThisProduct}
                                            iconOnly
                                            size="small"
                                            aria-busy={isAddingThisProduct ? true : undefined}
                                            aria-live={isAddingThisProduct ? 'polite' : undefined}
                                            text={
                                                isThisProductAdded
                                                    ? t('design.added')
                                                    : isAddingThisProduct
                                                    ? ''
                                                    : t(addToBagKey)
                                            }
                                            onClick={() => {
                                                addItemToBag({
                                                    productId,
                                                    trackingInfoAddedFrom:
                                                        TRACKING_ADDED_FROM.SIDEPANEL_PRODUCT_DETAILS,
                                                    source: AddToBagSource.PRODUCT_DETAILS,
                                                })
                                            }}
                                        />
                                    </Tooltip>
                                )}
                            </>
                        }
                    />
                )}
            </DesignSidepanelOverlayPanel>
        )
    },
)
