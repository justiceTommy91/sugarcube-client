import React from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'

import { useTracker } from 'apps/TrackingBoundary'
import { useAppSelector } from 'hooks'
import type { ProductData } from 'models/furniture'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { getIsPlacementMode } from 'models/renderer/selectors'
import { getProductTrackingInfo } from 'models/tracking/utils'
import { ACTION_ADD_PRODUCT } from 'models/tracking/constants'

import ProductItemDetail from './ProductItemDetail'
import ProductItemImage from './ProductItemImage'
import ProductAvailability from './ProductAvailability'
import ProductPlaceStackable from './ProductPlaceStackable'

require('./ProductItem.scss')

type ProductItemProps = {
    furnitureData: ProductData
    onSelect: React.MouseEventHandler<HTMLDivElement>
    addToRoom: () => void
    viewDetails: React.MouseEventHandler<HTMLDivElement>
    selectedOnPlacementModeId: number | null
    setSelectedOnPlacementModeId: (id: number) => void
    draggable?: boolean
    onDragStart?: React.DragEventHandler<HTMLDivElement>
    onDragEnd?: React.DragEventHandler<HTMLDivElement>
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect' | 'onDragStart' | 'onDragEnd' | 'draggable'>

const ProductItem: React.FunctionComponent<ProductItemProps> = ({
    furnitureData,
    onSelect,
    addToRoom,
    viewDetails,
    selectedOnPlacementModeId,
    setSelectedOnPlacementModeId,
    draggable,
    onDragStart,
    onDragEnd,
    ...otherProps
}) => {
    const { isMobile, isTouchDevice } = useSugarcubeContext()
    const isPlacementMode = useAppSelector(getIsPlacementMode)

    const { t } = useTranslation()
    const track = useTracker()
    const addToRoomButtonTranslationKey = `design.add to room`
    const addToRoomHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        track.click({
            target: addToRoomButtonTranslationKey,
            intendedAction: ACTION_ADD_PRODUCT,
            attributes: { ...getProductTrackingInfo(furnitureData) },
        })
        addToRoom()
        setSelectedOnPlacementModeId(furnitureData.id)
    }

    const { name, price, description, thumbUrl, stacks, localItemNumber } = furnitureData
    const addToRoomButtonAriaLabel = `${t(addToRoomButtonTranslationKey)} ${name} ${description}`
    const viewDetailsAriaLabel = `${t('aria.product details')} ${name} ${description}`
    const showPlaceStackableButton = isPlacementMode && selectedOnPlacementModeId === furnitureData.id

    const productItemClasses = classNames('ProductItem', 'product-item-group', { mobile: isMobile || isTouchDevice })

    return (
        <div
            className={productItemClasses}
            onClick={onSelect}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            {...otherProps}
        >
            <div className="itemImageContainer" data-img-title={t('design.add to room')}>
                <button
                    data-testid={!stacks ? 'product-item-image-btn' : ''}
                    aria-label={addToRoomButtonAriaLabel}
                    onClick={addToRoomHandler}
                    onMouseDown={(event) => {
                        event.preventDefault()
                    }}
                >
                    <ProductItemImage thumbUrl={thumbUrl} name={name} showIcon articleId={localItemNumber} />
                </button>
            </div>
            {stacks && showPlaceStackableButton ? (
                <div className="ProductItemStackable ProductPlaceStackableContainer">
                    <ProductPlaceStackable />
                    <div className="itemDetailContainer" onClick={viewDetails} aria-label={viewDetailsAriaLabel}>
                        <ProductItemDetail name={name} price={price} description={description} />
                        <ProductAvailability productData={furnitureData} />
                    </div>
                </div>
            ) : (
                <div className="itemDetailContainer" onClick={viewDetails} aria-label={viewDetailsAriaLabel}>
                    <ProductItemDetail name={name} price={price} description={description} />
                    <ProductAvailability productData={furnitureData} />
                </div>
            )}
        </div>
    )
}

export default ProductItem
