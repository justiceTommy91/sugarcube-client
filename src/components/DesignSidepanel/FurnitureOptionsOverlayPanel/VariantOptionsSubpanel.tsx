import React from 'react'
import classNames from 'classnames'
import Button from '@ingka/button'
import cross from '@ingka/ssr-icon/paths/cross'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import { useTranslation } from 'react-i18next'

import type { PlacingBehavior } from 'Renderer/geomviewer'

import { useSugarcubeContext } from 'apps/SugarcubeContext'

import { useAppDispatch } from 'hooks/useAppDispatch'

import { getProcessedItemsFinal, productDataAccessor } from 'models/compositions/helpers'
import { getTotalPricePreview } from 'models/variants/helpers'
import type { VariantItem } from 'models/variants'
import * as variantsActions from 'models/variants/actions'
import * as compositionActions from 'models/compositions/actions'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'

import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'

import { useEditFurnitureTab } from '../useEditFurnitureTab'

import './VariantOptionsSubpanel.scss'

export const VariantOptionsSubpanel: React.FunctionComponent = () => {
    const { t } = useTranslation()
    const { isUpptacka } = useSugarcubeContext()

    const { blurProductVariantCategory } = useDesignSidebarContext()
    const { selectedVariantCategory, selectedFurniture, selectedRenderItem } = useEditFurnitureTab()

    const dispatch = useAppDispatch()
    const onClose = () => {
        dispatch(variantsActions.setVariantSelected(null))
        blurProductVariantCategory()
    }
    const onSwap = (productId: number) => {
        if (!selectedFurniture) {
            return
        }
        dispatch(
            compositionActions.swapRenderItem({
                furnitureToSwapOut: selectedFurniture,
                productToSwapIn: productId,
                trackingInfo: {
                    actionType: 'click',
                    from: TRACKING_ADDED_FROM.PRODUCT_SWAP,
                },
            }),
        )
    }

    const selectedOption = selectedVariantCategory.options.filter(({ selected }) => !!selected)
    const needsItemFiltering =
        !!(selectedOption || selectedVariantCategory.options) && selectedVariantCategory.options?.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionsProcessed: any[] = needsItemFiltering
        ? getProcessedItemsFinal(
            productDataAccessor(selectedOption as unknown as VariantItem[]),
            selectedVariantCategory.options as unknown as VariantItem[],
            (selectedRenderItem?.placingBehavior as PlacingBehavior) || '',
        )
        : selectedVariantCategory.options

    // Moving disabled items to the end of the options
    const sortedOptions = optionsProcessed?.sort((a, b) => {
        if (a.disabled === b.disabled) {
            return 0
        }
        if (a.disabled) {
            return 1
        }

        return -1
    })

    return (
        <div className={classNames('VariantOptionsSubpanel', { isUpptacka })}>
            <div className="variantsWrapper">
                <Button
                    className={classNames('variantSelectionClose', { isUpptacka })}
                    onClick={onClose}
                    text={t('aria.close')}
                    iconOnly
                    ssrIcon={isUpptacka ? arrowLeft : cross}
                    type={isUpptacka ? undefined : 'tertiary'}
                />
                <div className="variantTitle">
                    {t('variant.choose variant', { variant: selectedVariantCategory.typeName })}
                </div>
                <div className="variantValues">
                    {sortedOptions.map(({ valueKey, selected, productId, thumbUrl, furnitureData, disabled }) => {
                        const variantTypeValueKey = `variant-list-${selectedVariantCategory.typeName
                            }-${valueKey.replace('"', '')}`
                        const valueKeyText = valueKey === '-' ? t('variant.none') : valueKey

                        const onSwapClick = () => {
                            if (productId) {
                                onSwap(furnitureData.id)
                            }
                            blurProductVariantCategory()
                        }
                        return (
                            <div className="variantValue" key={variantTypeValueKey}>
                                <button className={classNames('variantSwapButton', { selected })} onClick={onSwapClick}>
                                    {selectedVariantCategory.showThumbnail && (
                                        <img src={thumbUrl} alt="" className="variantThumbImage" />
                                    )}
                                    <div className="variantValueOptions">
                                        <div className="valueWrapper">
                                            <span className={classNames('variantValueKey')}>{valueKeyText}</span>
                                            {disabled && (
                                                <span className="variantDisabledValue">
                                                    {t('variant.product different style')}
                                                </span>
                                            )}
                                        </div>
                                        <span className="variantCurrencyText">
                                            {' '}
                                            {getTotalPricePreview(
                                                furnitureData?.priceNumeral,
                                                selectedVariantCategory.selectedFurniturePrice,
                                            )}
                                        </span>
                                    </div>
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
