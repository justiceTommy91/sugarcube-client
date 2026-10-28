import React from 'react'

import classNames from 'classnames'
import { useAppDispatch, useAppSelector } from 'hooks'
import { RenderItemComplete } from 'models/compositions'
import { DesignSidepanelView, useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'
import * as compositionActions from 'models/compositions/actions'
import * as compositionSelectors from 'models/compositions/selectors'
import * as variantSelectors from 'models/variants/selectors'
import * as variantActions from 'models/variants/actions'
import Button from '@ingka/button'
import Image from '@ingka/image'
import Price from '@ingka/price'
import ProductIdentifier from '@ingka/product-identifier'
import Status from '@ingka/status'
import cross from '@ingka/ssr-icon/paths/cross'
import VariantSelection from 'components/design/VariantSelection'
import { ProductVariants } from 'components/DesignSidepanel/FurnitureOptionsOverlayPanel/ProductVariants'
import { RelatedProducts } from 'components/DesignSidepanel/FurnitureOptionsOverlayPanel/RelatedProducts'
import { useProductOptions } from 'hooks/useProductOptions'
import { useTranslation } from 'react-i18next'
import { statusColor } from 'utils/statusColor'
import { formatCurrency } from 'utils/convertCurrency'
import { convertProductId } from 'utils/convertProductId'

require('./UpptackaEditFurniturePanelContent.scss')

export const UpptackaEditFurniturePanelContent = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { displaySidepanelView } = useDesignSidebarContext()

    const selectedFurniture = useAppSelector(
        (state) => compositionSelectors.getSelectedCompositionRenderedFurnitureItem(state) as RenderItemComplete,
    )
    const furnitureId = selectedFurniture?.uniqueId
    const productId = selectedFurniture?.id
    // KLUDGE: need to invoke useFurnitureOptions as recommendation and swappables call has been moved into this hook
    useProductOptions(furnitureId)

    const { currency, currencyPosition, currencyScriptType, decimal, fraction, integer } = formatCurrency(
        selectedFurniture?.priceNumeral || 0,
    )
    const selectedVariantCategory = useAppSelector((state) =>
        variantSelectors.getSelectedFurnitureVariantCategory(state),
    )

    const onSwapVariant = (swappedFurnitureData: RenderItemComplete) => {
        if (furnitureId) {
            dispatch(
                compositionActions.swapRenderItem({
                    furnitureToSwapOut: furnitureId,
                    productToSwapIn: swappedFurnitureData.id,
                    trackingInfo: {
                        actionType: 'click',
                        from: TRACKING_ADDED_FROM.SIDEPANEL_FURNITURE_OPTIONS,
                    },
                }),
            )
        }
    }

    return (
        <div
            className={classNames('UpptackaEditFurniturePanelContent', {
                selectingVariants: !!selectedVariantCategory,
            })}
        >
            <div className="UpptackaEditFurniturePanelContent__container--left">
                <Button
                    className="UpptackaEditFurniturePanelContent__close"
                    iconOnly
                    ssrIcon={cross}
                    type="tertiary"
                    onClick={() => {
                        displaySidepanelView(DesignSidepanelView.ADD)
                        dispatch(compositionActions.selectCompositionRenderItem(-1))
                    }}
                    text={t('aria.close')}
                />

                <div className="UpptackaEditFurniturePanelContent__selected-product">
                    <div className="UpptackaEditFurniturePanelContent__status-stock-container">
                        <ProductIdentifier
                            className="UpptackaEditFurniturePanelContent__identifier"
                            value={convertProductId(selectedFurniture.localItemNumber)}
                            subtle
                        />
                        <Status
                            className="UpptackaEditFurniturePanelContent__status"
                            label={t(`availability.store.${selectedFurniture.availability.store}`)}
                            statusColor={statusColor(selectedFurniture.availability.store)}
                            statusDotPosition="leading"
                        />
                    </div>
                    <div className="UpptackaEditFurniturePanelContent__image-text-container">
                        <Image className="UpptackaEditFurniturePanelContent__image" src={selectedFurniture.thumbUrl} />
                        <div className="UpptackaEditFurniturePanelContent__text-container">
                            <h4 className="UpptackaEditFurniturePanelContent__name">{selectedFurniture.name}</h4>
                            <span className="UpptackaEditFurniturePanelContent__description">
                                {selectedFurniture.description}
                            </span>
                            <Price
                                className="UpptackaEditFurniturePanelContent__price"
                                currencyLabel={currency}
                                currencyPosition={currencyPosition === 'before' ? 'leading' : 'trailing'}
                                currencySpacing="thin"
                                currencyVerticalAlignment={currencyScriptType === 'superscript' ? 'super' : 'base'}
                                decimalSign={decimal}
                                decimalValue={fraction}
                                integerValue={integer}
                                size="large"
                            />
                        </div>
                    </div>
                </div>
                <ProductVariants productId={productId} />
                <RelatedProducts productId={productId} />
            </div>
            <div className="UpptackaEditFurniturePanelContent__container--right">
                <VariantSelection
                    selectedVariant={selectedVariantCategory}
                    onClose={() => dispatch(variantActions.setVariantSelected(null))}
                    onSwap={onSwapVariant}
                    selectedRenderItemPlacingBehavior={selectedFurniture?.placingBehavior || ''}
                />
            </div>
        </div>
    )
}
