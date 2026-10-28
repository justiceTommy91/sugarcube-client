import React, { useEffect, useRef } from 'react'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import cross from '@ingka/ssr-icon/paths/cross'
import { useTranslation } from 'react-i18next'
import { func } from 'prop-types'
import Icon from 'components/uiElements/Icon'

import FavoriteButtonContainer from 'containers/uiElements/FavoriteButtonContainer'
import { TRACKING_ADDED_FROM, TRACK_LOCATION_DESIGN_SUMMARY } from 'models/tracking/constants'
import { ToastType } from 'services/toasts'
import Button from '@ingka/button'
import { ORIENTATION_LANDSCAPE, PRODUCT_ITEM_WIDE } from 'models/ui/constants'
import { useToastsMutations } from 'toasts/ToastsProvider'
import { useShoppingBag } from 'features/shopping-bag'
import ProductItemContainer from 'components/design/ProductItemContainer'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'
import { useCheckoutSummary } from './use-checkout-summary'

require('./DesignSummaryModalMobile.scss')

const DesignSummaryModalMobile = ({ openExitPopup, exitDesignSummary, closeModal }) => {
    const panoImageRef = useRef(null)
    const { showToast, hideToast } = useToastsMutations()
    const { addRoomToBag, isAddingToCart, isRoomAdded } = useShoppingBag()
    const {
        hasLandscapeOrientation,
        orientation,
        compositionName,
        totalPrice,
        hasProductsInRoom,
        hasItemsToFavorite,
        localItemNumbers,
        addedToRoomItems,
    } = useCheckoutSummary()

    useEffect(() => {
        if (orientation !== ORIENTATION_LANDSCAPE) {
            return undefined
        }

        // When orientation is landscape display a warning toast.
        const toastId = showToast({ toastType: ToastType.ROTATE_PHONE })

        return () => {
            hideToast(toastId)
        }
    }, [orientation])

    const { t } = useTranslation()

    const onAddRoomToBagClick = () => {
        addRoomToBag({
            trackingInfoAddedFrom: TRACKING_ADDED_FROM.DESIGN_SUMMARY,
            blockRedirect: true,
            hideToast: true,
        })
        openExitPopup()
    }

    return (
        <div
            className={classNames('DesignSummaryModalMobile', {
                landscape: hasLandscapeOrientation,
            })}
        >
            <div className="modalHeader">
                <Icon svg code="logo_ikea" className="logoHome" />
                <button onClick={exitDesignSummary} aria-label={t('design.cancel')}>
                    <SSRIcon paths={cross} />
                </button>
            </div>

            <div className="modalBody">
                <div className="modalBodyHeader">
                    <button onClick={closeModal} className="backButton" aria-label={t('design.go back')}>
                        <SSRIcon paths={arrowLeft} />
                    </button>
                    <div className="compositionName">{compositionName}</div>
                </div>
                <div className="modalCompositionImage">
                    <img src="" alt="" ref={panoImageRef} />
                </div>
                <div className="shopDesign">{t('designSummary.shop this design')}</div>
                <div className="totalPrice centerSpacedItems">
                    <div className="priceText">{t('designSummary.total price')}</div>
                    <div className="priceValue">{totalPrice}</div>
                </div>
                <div className="ctas">
                    <Button
                        className="DesignSummaryModalMobile__add-room-button"
                        loading={isAddingToCart}
                        aria-busy={isAddingToCart ? true : undefined}
                        aria-live={isAddingToCart ? 'polite' : undefined}
                        onClick={() => {
                            if (isAddingToCart || isRoomAdded) {
                                return
                            }
                            onAddRoomToBagClick()
                        }}
                        type="emphasised"
                        text={
                            isAddingToCart ? '' : isRoomAdded ? t('design.added') : t('design.add room to shopping bag')
                        }
                        ssrIcon={isRoomAdded ? checkmarkIcon : undefined}
                    />
                    {hasItemsToFavorite && (
                        <div className="favoriteAllCta">
                            <FavoriteButtonContainer
                                localItemNumbers={localItemNumbers}
                                location={TRACK_LOCATION_DESIGN_SUMMARY}
                            />
                        </div>
                    )}
                </div>

                {hasProductsInRoom && (
                    <div className="productsInRoom">
                        {addedToRoomItems.map((productData) => (
                            <ProductItemContainer
                                furnitureData={productData}
                                key={productData.uniqueId || productData.id}
                                isInDesignSummaryView
                                trackingInfoAddedFrom={TRACKING_ADDED_FROM.DESIGN_SUMMARY}
                                format={PRODUCT_ITEM_WIDE}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

DesignSummaryModalMobile.propTypes = {
    openExitPopup: func.isRequired,
    exitDesignSummary: func.isRequired,
    closeModal: func.isRequired,
}

export default DesignSummaryModalMobile
