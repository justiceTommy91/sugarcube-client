import React from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import arrowCounterclockwise from '@ingka/ssr-icon/paths/arrow-counterclockwise'

import type { ProductData } from 'models/furniture'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { useTracker } from 'apps/TrackingBoundary'
import Button from '@ingka/button'
import Tooltip from 'components/Tooltip'
import informationCircle from '@ingka/ssr-icon/paths/information-circle'
import { ACTION_SWAP_PRODUCT } from 'models/tracking/constants'
import { getProductTrackingInfo } from 'models/tracking/utils'

import ProductItemDetail from './ProductItemDetail'
import ProductItemImage from './ProductItemImage'
import ProductAvailability from './ProductAvailability'

require('./ProductItem.scss')

const MAX_UNDO_BUTTON_LENGTH = 9

type ProductItemInSwapProps = {
    swappableItemData: ProductData
    onSelect: React.MouseEventHandler<HTMLDivElement>
    onSwap: (event: React.MouseEvent<HTMLButtonElement>) => void
    selectedFurnitureData: ProductData
    viewDetails: React.MouseEventHandler<HTMLElement>
    onUndoSwap: React.MouseEventHandler<HTMLButtonElement>
}

const ProductItemInSwap: React.FunctionComponent<ProductItemInSwapProps> = ({
    swappableItemData,
    onSelect,
    onSwap,
    selectedFurnitureData,
    viewDetails,
    onUndoSwap,
}) => {
    const { t } = useTranslation()
    const isSelected = swappableItemData?.id === selectedFurnitureData?.id
    const { name, price, thumbUrl, description, localItemNumber } = swappableItemData

    const { isMobile, isTouchDevice } = useSugarcubeContext()
    const threeColumns = !isMobile
    const onDetailsClick = isMobile || isSelected ? undefined : viewDetails
    const swapButtonTranslationKey = `design.swap`
    const swapButtonAriaLabel = `${t(swapButtonTranslationKey)} ${name} ${description}`
    const viewDetailsAriaLabel = `${t('aria.product details')} ${name} ${description}`
    const hasLongString = t('design.undo').length > MAX_UNDO_BUTTON_LENGTH

    const track = useTracker()
    const swapItem = (event: React.MouseEvent<HTMLButtonElement>) => {
        track.click({
            target: swapButtonTranslationKey,
            intendedAction: ACTION_SWAP_PRODUCT,
            attributes: { ...getProductTrackingInfo(swappableItemData) },
        })
        onSwap(event)
    }

    return (
        <div
            className={classNames('ProductItem ProductItemInSwap', {
                threeColumns,
                isSelected,
                mobile: isMobile || isTouchDevice,
            })}
        >
            {isMobile && (
                <div className="itemImageContainerMobile">
                    <button className="infoButton" onClick={viewDetails} aria-label={viewDetailsAriaLabel}>
                        <SSRIcon paths={informationCircle} />
                    </button>
                    <button
                        className="swapButton mobile"
                        onClick={swapItem}
                        data-testid="product-item-image-btn"
                        aria-label={swapButtonAriaLabel}
                    >
                        <div>
                            <div className={classNames('selectedTag', { isSelected, mobile: isMobile })} />
                        </div>
                        <ProductItemImage thumbUrl={thumbUrl} name={name} isInSwap articleId={localItemNumber} />
                    </button>
                </div>
            )}
            {!isMobile && (
                <div
                    className={classNames('itemImageContainer', { isSelected, mobile: isMobile || isTouchDevice })}
                    onClick={isSelected ? undefined : onSelect}
                    data-img-title={t('tooltip.swap product')}
                >
                    <button
                        className="swapButton"
                        onClick={isSelected ? undefined : swapItem}
                        data-testid="product-item-image-btn"
                        aria-label={swapButtonAriaLabel}
                    >
                        <ProductItemImage
                            thumbUrl={thumbUrl}
                            name={name}
                            isInSwap
                            showIcon
                            articleId={localItemNumber}
                        />
                    </button>
                </div>
            )}
            <div className={classNames('itemDetailContainer', { mobile: isMobile })} onClick={onDetailsClick}>
                {isSelected ? (
                    <div className="swappedDetails">
                        <div className="swappedText">{t('design.product swapped')}</div>
                        <Tooltip
                            describedById="swap-undo-button"
                            title={t('design.undo')}
                            place="bottom"
                            hide={!hasLongString}
                        >
                            <Button
                                onClick={onUndoSwap}
                                type="secondary"
                                text={hasLongString ? undefined : t('design.undo')}
                                size="small"
                                iconOnly={!!hasLongString}
                                ssrIcon={arrowCounterclockwise}
                                className={hasLongString ? 'iconOnlyButton' : undefined}
                            />
                        </Tooltip>
                    </div>
                ) : (
                    <>
                        <ProductItemDetail name={name} price={price} description={description} isInSwap />
                        <ProductAvailability productData={swappableItemData} />
                    </>
                )}
            </div>
        </div>
    )
}

export default ProductItemInSwap
