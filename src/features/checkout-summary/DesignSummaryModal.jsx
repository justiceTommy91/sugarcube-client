import React, { useEffect } from 'react'
import { func } from 'prop-types'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import arrowUp from '@ingka/ssr-icon/paths/arrow-up-from-base'
import headsetActive from '@ingka/ssr-icon/paths/headset-active'
import cross from '@ingka/ssr-icon/paths/cross'
import shoppingBag from '@ingka/ssr-icon/paths/shopping-bag'
import shoppingBagActive from '@ingka/ssr-icon/paths/shopping-bag-active'
import { useTranslation } from 'react-i18next'
import Icon from 'components/uiElements/Icon'
import FavoriteButtonContainer from 'containers/uiElements/FavoriteButtonContainer'
import {
    TRACKING_ADDED_FROM,
    TRACK_LOCATION_DESIGN_SUMMARY,
    ACTION_OPEN_EXPERT_CHECK_PANEL,
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_ACTION_OPEN_EXPERT_CHECK_PANEL,
    GA_LABEL_EXPERT_CHECK_SUMMARY_BUTTON,
    GA_ACTION_EXPOSE_EXPERT_CHECK,
} from 'models/tracking/constants'
import Button from '@ingka/button'
import { getRenderer } from 'models/refStore/selectors'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import Tooltip from 'components/Tooltip'
import Modal, { ModalBody, ModalHeader, Sheets } from '@ingka/modal'
import { PRODUCT_ITEM_WIDE } from 'models/ui/constants'
import { useTracker } from 'apps/TrackingBoundary'
import { useShoppingBag } from 'features/shopping-bag'
import ProductItemContainer from 'components/design/ProductItemContainer'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'
import { useAppDispatch, useAppSelector } from 'hooks'
import { getShouldShowExpertCheck } from 'models/ui/selectors'
import { getSelectedComposition } from 'models/compositions/selectors'
import { getDebugSettings } from 'models/admin/selectors'
import { saveSelectedComposition } from 'models/compositions/actions'

import { useCheckoutSummary } from './use-checkout-summary'

require('./DesignSummaryModal.scss')

const DesignSummaryModal = ({ closeModal, onShareClick, onExpertCheckClick }) => {
    const { t } = useTranslation()
    const track = useTracker()
    const { openBag, addRoomToBag, hasAddedSomethingToBag, isAddingToCart, isRoomAdded } = useShoppingBag()
    const {
        isModified,
        compositionName,
        totalPrice,
        hasProductsInRoom,
        hasItemsToFavorite,
        localItemNumbers,
        addedToRoomItems,
        isSaving,
        isLoggedIn,
        roomInfo,
        panoImageRef,
    } = useCheckoutSummary()

    const dispatch = useAppDispatch()
    const shouldShowExpertCheck = useAppSelector(getShouldShowExpertCheck)

    const composition = useAppSelector(getSelectedComposition)
    const debugSettings = useAppSelector(getDebugSettings)
    const isReadOnly = composition?.isGLTF && debugSettings.disable3DCompositionSave

    useEffect(() => {
        if (shouldShowExpertCheck) {
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: GA_ACTION_EXPOSE_EXPERT_CHECK,
                label: 'summary',
            })
        }
    }, [])

    if (!getRenderer()) {
        return null
    }

    const onSaveClick = () => {
        if (isModified) {
            // if the user is logged out, login prompt will appear to log in or sign up
            dispatch(
                saveSelectedComposition({
                    SavedFrom: TRACKING_ADDED_FROM.DESIGN_SUMMARY,
                }),
            )
        }
    }

    const saveButtonText = isSaving ? t('designSummary.saving') : t('designSummary.save')
    const onEditDesignClick = () => {
        closeModal()
        if (roomInfo) {
            click('DecorateRoom.BackToEditDesign', roomInfo)
        }
    }

    return (
        <Modal className="DesignSummaryModal" handleCloseBtn={() => closeModal()} visible>
            <Sheets
                aria-label={t('aria.design summary modal')}
                size="large"
                className="modalSheets"
                header={<ModalHeader floating className="outerHeader" />}
            >
                <div className="modalHeaderContainer">
                    <div className="modalHeader">
                        <Icon svg code="logo_ikea" className="logoHome" />
                        <div className="ctasGroup">
                            <Button
                                onClick={() => openBag()}
                                type="tertiary"
                                iconOnly
                                ssrIcon={hasAddedSomethingToBag ? shoppingBagActive : shoppingBag}
                                text={t('aria.shopping bag')}
                            />
                            <Button
                                onClick={() => closeModal()}
                                type="tertiary"
                                iconOnly
                                ssrIcon={cross}
                                text={t('design.cancel')}
                            />
                        </div>
                    </div>
                    <div className="modalSubHeader">
                        <Button
                            onClick={onEditDesignClick}
                            type="secondary"
                            ssrIcon={arrowLeft}
                            text={t('design.edit design')}
                        />
                        <div className="modalSubheaderRightCTAs">
                            {shouldShowExpertCheck && (
                                <Button
                                    onClick={() => {
                                        trackGoogleAnalytics({
                                            category: GA_CATEGORY_DYH_SUGARCUBE,
                                            action: GA_ACTION_OPEN_EXPERT_CHECK_PANEL,
                                            label: GA_LABEL_EXPERT_CHECK_SUMMARY_BUTTON,
                                        })
                                        track.click({
                                            target: 'expertCheck.design summary button',
                                            intendedAction: ACTION_OPEN_EXPERT_CHECK_PANEL,
                                        })
                                        onExpertCheckClick()
                                    }}
                                    text={t('expertCheck.design summary button')}
                                    aria-label={t('expertCheck.design summary button')}
                                    ssrIcon={headsetActive}
                                />
                            )}
                            {isModified && (
                                <Button
                                    onClick={onSaveClick}
                                    disabled={isSaving || !isModified || isReadOnly}
                                    type="secondary"
                                    text={saveButtonText}
                                    data-testid="design-summary-save-button"
                                    className="saveDesignButton"
                                />
                            )}
                            {isLoggedIn && (
                                <Tooltip
                                    describedById="summary-share-design"
                                    title={
                                        isReadOnly ? t('tooltip.scene is read-only') : t('tooltip.share this design')
                                    }
                                >
                                    <Button
                                        onClick={onShareClick}
                                        disabled={isReadOnly}
                                        aria-label={t('tooltip.share this design')}
                                        data-testid="summary-share-btn"
                                        type="tertiary"
                                        iconOnly
                                        ssrIcon={arrowUp}
                                        text={t('tooltip.share this design')}
                                    />
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>
                <ModalBody className="modalBody">
                    <div className="compositionImgContainer">
                        <div className="compositionName">{compositionName}</div>
                        <img className="modalCompositionImage" src="" alt="" ref={panoImageRef} />
                    </div>

                    <div>
                        <div className="shopHeader">
                            <h2 className="shopDesign">{t('designSummary.shop this design')}</h2>
                            <div className="priceValue">{totalPrice}</div>
                        </div>

                        <div className="ctas">
                            <Button
                                className="DesignSummaryModal__add-room-button"
                                loading={isAddingToCart}
                                aria-busy={isAddingToCart ? true : undefined}
                                aria-live={isAddingToCart ? 'polite' : undefined}
                                onClick={() => {
                                    if (isAddingToCart || isRoomAdded) {
                                        return
                                    }
                                    addRoomToBag({
                                        trackingInfoAddedFrom: TRACKING_ADDED_FROM.DESIGN_SUMMARY,
                                        hideToast: true,
                                    })
                                }}
                                type="emphasised"
                                text={
                                    isAddingToCart
                                        ? ''
                                        : isRoomAdded
                                        ? t('design.added')
                                        : t('design.add room to shopping bag')
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
                </ModalBody>
            </Sheets>
        </Modal>
    )
}

DesignSummaryModal.propTypes = {
    closeModal: func.isRequired,
    onShareClick: func.isRequired,
    onExpertCheckClick: func.isRequired,
}

export default DesignSummaryModal
