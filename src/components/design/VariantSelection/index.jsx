import React from 'react'
import classNames from 'classnames'
import { func, string } from 'prop-types'
import { variantOptionsType } from 'models/propTypes'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import Button from '@ingka/button'
import cross from '@ingka/ssr-icon/paths/cross'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import { useTranslation } from 'react-i18next'
import './styles.scss'
import { getProcessedItemsFinal, productDataAccessor } from 'models/compositions/helpers'
import { getTotalPricePreview } from 'models/variants/helpers'

const VariantSelection = ({ selectedVariant, onSwap, onClose, selectedRenderItemPlacingBehavior }) => {
    const { t } = useTranslation()
    const { isUpptacka } = useSugarcubeContext()
    if (!selectedVariant) {
        return null
    }
    const { options, showThumbnail, typeName, selectedFurniturePrice } = selectedVariant
    const selectedOption = options.filter(({ selected }) => !!selected)
    const needsItemFiltering = !!(selectedOption || options) && options?.length > 0
    const optionsProcessed = needsItemFiltering
        ? getProcessedItemsFinal(productDataAccessor(selectedOption), options, selectedRenderItemPlacingBehavior)
        : options

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
        <div className={classNames('VariantSelection', { isUpptacka })}>
            <div className="variantsWrapper">
                {isUpptacka ? (
                    <Button
                        className="variantSelectionClose--upptacka"
                        onClick={onClose}
                        iconOnly
                        ssrIcon={arrowLeft}
                        text={t('aria.close')}
                    />
                ) : (
                    <Button
                        className="variantSelectionClose"
                        onClick={onClose}
                        text={t('aria.close')}
                        iconOnly
                        ssrIcon={cross}
                        type="tertiary"
                    />
                )}
                <div className="variantTitle">{t('variant.choose variant', { variant: typeName })}</div>
                <div className="variantValues">
                    {sortedOptions.map(({ valueKey, selected, productId, thumbUrl, furnitureData, disabled }) => {
                        const variantTypeValueKey = `variant-list-${typeName}-${valueKey.replace('"', '')}`
                        const valueKeyText = valueKey === '-' ? t('variant.none') : valueKey

                        const onSwapClick = () => {
                            if (productId) {
                                onSwap(furnitureData)
                            }
                            onClose()
                        }
                        return (
                            <div className="variantValue" key={variantTypeValueKey}>
                                <button className={classNames('variantSwapButton', { selected })} onClick={onSwapClick}>
                                    {showThumbnail && <img src={thumbUrl} alt="" className="variantThumbImage" />}
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
                                            {getTotalPricePreview(furnitureData?.priceNumeral, selectedFurniturePrice)}
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

VariantSelection.defaultProps = {
    selectedVariant: null,
}

VariantSelection.propTypes = {
    selectedVariant: variantOptionsType,
    onSwap: func.isRequired,
    onClose: func.isRequired,
    selectedRenderItemPlacingBehavior: string.isRequired,
}

export default VariantSelection
