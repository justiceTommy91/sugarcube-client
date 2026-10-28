import React from 'react'
import classNames from 'classnames'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { useAppSelector } from 'hooks'
import * as uiSelectors from 'models/ui/selectors'

require('./ProductPin.scss')

type ProductPinProps = {
    'data-product-name'?: string
    'data-product-description'?: string
    onClick(): void
    enabled: boolean
    visible: boolean
    positionRelative: { x: number; y: number }
    testId: string
}

const ProductPin = ({
    onClick,
    enabled,
    visible,
    positionRelative,
    testId,
    'data-product-description': productDescription,
    'data-product-name': productName,
}: ProductPinProps) => {
    const { isMobile, isUpptacka } = useSugarcubeContext()
    const arePinsVisible = useAppSelector((state) => uiSelectors.getPinsVisibility(state))

    if (!enabled) {
        return null
    }

    const { x, y } = positionRelative
    const positionStyle = { top: `${y}%`, left: `${x}%` }

    if (isMobile) {
        return (
            <div className="ProductPin dotWrapper mobileDot" style={positionStyle} onTouchStart={onClick}>
                <div className="outerDotContainerForMobile">
                    <div className="outerDot">
                        <div className="innerDot" />
                    </div>
                </div>
            </div>
        )
    }

    // openSettings(GET_INFO_CANVAS_PIN)

    return (
        <button
            data-testid={`product-pin-${testId}`}
            data-product-name={productName}
            data-product-description={productDescription}
            className={classNames('ProductPin dotWrapper', {
                revealDots: visible,
                // toggling pins visibility should only be possible for Upptacka currently
                showPins: isUpptacka && arePinsVisible,
            })}
            type="button"
            style={positionStyle}
            onClick={onClick}
        >
            <div className="outerDot">
                <div className="innerDot" />
            </div>
        </button>
    )
}

export default ProductPin
