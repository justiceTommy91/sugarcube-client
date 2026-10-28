import React from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import plus from '@ingka/ssr-icon/paths/plus'
import shoppingBagAdd from '@ingka/ssr-icon/paths/shopping-bag-add'
import trashCan from '@ingka/ssr-icon/paths/trash-can'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { useTracker } from 'apps/TrackingBoundary'
import FavoriteButtonContainer from 'containers/uiElements/FavoriteButtonContainer'
import { useShoppingBag, AddToBagSource } from 'features/shopping-bag'
import { useAppSelector } from 'hooks'
import { getIsAddingProduct, getIsProductAdded } from 'features/shopping-bag/redux/selectors'
import { useGetPriceString } from 'hooks/useGetPriceString'
import { getLocale } from 'models/location/selectors'
import type { RenderItemComplete } from 'models/compositions'
import { ACTION_ADD_PRODUCT, TRACK_LOCATION_SIDEPANEL, type TrackingAddedFrom } from 'models/tracking/constants'
import { getProductTrackingInfo } from 'models/tracking/utils'
import { GeomViewer } from 'Renderer/geomviewer'
import { getLocalizedCurrencyString } from 'utils/convertCurrency'

import ProductAvailability from './ProductAvailability'
import ProductItemDetail from './ProductItemDetail'
import ProductItemImage from './ProductItemImage'

require('./ProductItem.scss')

type ProductItemWideProps = {
    productData: RenderItemComplete
    onSelect: () => void
    viewDetails?: (() => void) | null
    addToRoom?: (() => void) | null
    trackingInfoAddedFrom?: TrackingAddedFrom
    removeFromComposition?: (() => void) | null
}

const ProductItemWide: React.FunctionComponent<ProductItemWideProps> = ({
    productData,
    onSelect,
    viewDetails = null,
    addToRoom = null,
    trackingInfoAddedFrom,
    removeFromComposition = null,
}) => {
    const { t } = useTranslation()
    const { isMobile, isKiosk } = useSugarcubeContext()
    const { getPriceString } = useGetPriceString()
    const { name, description, thumbUrl, price, priceNumeral, localItemNumber, uniqueId } = productData
    const viewDetailsClick = () => {
        onSelect()
        viewDetails?.()
        GeomViewer.bindings?.selectSceneItem(String(uniqueId))
    }
    const { addItemToBag, invalidLocalItemNumbers } = useShoppingBag()
    const isProductInvalid = invalidLocalItemNumbers.includes(localItemNumber)
    const isAddingThisProduct = useAppSelector((state) =>
        getIsAddingProduct(productData.id, AddToBagSource.SUMMARY, uniqueId)(state),
    )
    const isThisProductAdded = useAppSelector((state) =>
        getIsProductAdded(productData.id, AddToBagSource.SUMMARY, uniqueId)(state),
    )
    const track = useTracker()
    const convertedPrice =
        priceNumeral === 0 ? getPriceString(price) : getLocalizedCurrencyString(priceNumeral, getLocale())
    const isInDesignSummaryView = !viewDetails
    const addToRoomButtonTranslationKey = `design.add to room`

    return (
        <div className={classNames('ProductItem ProductItemWide', { isMobile })}>
            <div className={classNames('itemImageContainer', { isStaticImage: isInDesignSummaryView })}>
                <ProductItemImage thumbUrl={thumbUrl} name={name} articleId={localItemNumber} />
            </div>

            <div className="itemDetailContainer">
                <ProductItemDetail
                    name={name}
                    price={convertedPrice}
                    description={description}
                    wide
                    viewDetails={isInDesignSummaryView ? null : viewDetailsClick}
                />
                <ProductAvailability productData={productData} />
                <div className="productCTAs">
                    {addToRoom && (
                        <Button
                            className="primaryCTA"
                            onClick={() => {
                                track.click({
                                    target: addToRoomButtonTranslationKey,
                                    intendedAction: ACTION_ADD_PRODUCT,
                                    attributes: { ...getProductTrackingInfo(productData) },
                                })
                                addToRoom()
                            }}
                            type="secondary"
                            text={t(addToRoomButtonTranslationKey)}
                            aria-label={`${t(addToRoomButtonTranslationKey)} - ${name}`}
                            ssrIcon={plus}
                            size="small"
                            disabled={isProductInvalid}
                        />
                    )}
                    {!addToRoom && !isKiosk && (
                        <Button
                            className="primaryCTA"
                            loading={isAddingThisProduct}
                            aria-busy={isAddingThisProduct ? true : undefined}
                            aria-live={isAddingThisProduct ? 'polite' : undefined}
                            onClick={() => {
                                if (isThisProductAdded) {
                                    return
                                }
                                addItemToBag({
                                    productId: productData.id,
                                    trackingInfoAddedFrom,
                                    source: AddToBagSource.SUMMARY,
                                    hideToast: true,
                                    uniqueId,
                                })
                            }}
                            type="secondary"
                            text={
                                isThisProductAdded
                                    ? t('design.added')
                                    : isAddingThisProduct
                                    ? ''
                                    : t('design.add to bag')
                            }
                            aria-label={`${t('design.add to bag')} - ${name} ${description}`}
                            ssrIcon={isThisProductAdded ? checkmarkIcon : shoppingBagAdd}
                            size="small"
                            disabled={isProductInvalid}
                        />
                    )}
                    <div className="secondaryCTAs">
                        {addToRoom && !isKiosk && (
                            <Button
                                loading={isAddingThisProduct}
                                aria-busy={isAddingThisProduct ? true : undefined}
                                aria-live={isAddingThisProduct ? 'polite' : undefined}
                                onClick={() => {
                                    if (isAddingThisProduct) {
                                        return
                                    }
                                    addItemToBag({
                                        productId: productData.id,
                                        trackingInfoAddedFrom,
                                        source: AddToBagSource.SUMMARY,
                                        hideToast: true,
                                        uniqueId,
                                    })
                                }}
                                type="tertiary"
                                ssrIcon={isThisProductAdded ? checkmarkIcon : shoppingBagAdd}
                                iconOnly
                                size="small"
                                text={
                                    isThisProductAdded
                                        ? t('design.added')
                                        : isAddingThisProduct
                                        ? ''
                                        : t('design.add to bag')
                                }
                                aria-label={`${t('design.add to bag')} - ${name} ${description}`}
                                disabled={isProductInvalid}
                            />
                        )}
                        {isProductInvalid ? (
                            <Button
                                aria-label={t('design.remove from design')}
                                iconOnly
                                type="tertiary"
                                size="small"
                                ssrIcon={trashCan}
                                onClick={removeFromComposition ?? undefined}
                                text={t('design.remove from design')}
                            />
                        ) : (
                            <FavoriteButtonContainer
                                localItemNumber={localItemNumber}
                                location={TRACK_LOCATION_SIDEPANEL}
                                productLabel={`${name} ${description}`}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProductItemWide
