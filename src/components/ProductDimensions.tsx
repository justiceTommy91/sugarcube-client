import React from 'react'

import { convertMetersToParts } from 'utils/convertDimensions'

import { useProductDimensions } from 'hooks/useProductDimensions'
import { useAppSelector } from 'hooks'
import { getShouldShowImperialMeasurements } from 'models/ui/selectors'

require('./ProductDimensions.scss')

export type RoomDimensionsProps = {
    itemId: string
}

const ProductDimensions = ({ itemId }: RoomDimensionsProps) => {
    const productDimensions = useProductDimensions(itemId)
    const shouldShowImperialMeasurements = useAppSelector(getShouldShowImperialMeasurements)

    if (!productDimensions) {
        return null
    }

    const dimensionValues = productDimensions.dimensions.map((info) => {
        const dx = info.relativePoint2.x - info.relativePoint1.x
        const dy = info.relativePoint2.y - info.relativePoint1.y
        const relDistanceSq = dx * dx + dy * dy
        const minRelDistanceSq = 0.0004
        if (
            relDistanceSq < minRelDistanceSq ||
            info.relativeMiddlePoint.x < 0.0 ||
            info.relativeMiddlePoint.x > 1.0 ||
            info.relativeMiddlePoint.y < 0.0 ||
            info.relativeMiddlePoint.y > 1.0
        ) {
            return null
        }
        const offsetPercents = 0.5
        const offsetX = offsetPercents * info.screenSpaceNormal.x
        const offsetY = offsetPercents * info.screenSpaceNormal.y
        const translateX = info.screenSpaceNormal.x > 0 ? 0 : -100
        const translateY = info.screenSpaceNormal.y > 0 ? 0 : -100
        const style = {
            top: `${info.relativeMiddlePoint.y * 100.0 + offsetY}%`,
            left: `${info.relativeMiddlePoint.x * 100.0 + offsetX}%`,
            transform: `translateX(${translateX}%) translateY(${translateY}%)`,
        }

        const { wallLengthFeetPart, wallLengthInchesPart, wallLengthCm } = convertMetersToParts(
            info.length,
            shouldShowImperialMeasurements,
        )
        const feet = wallLengthFeetPart && wallLengthFeetPart > 0 ? `${wallLengthFeetPart}' ` : ''
        const inches = wallLengthInchesPart && wallLengthInchesPart > 0 ? `${wallLengthInchesPart}"` : ''
        const lengthText = shouldShowImperialMeasurements ? `${feet}${inches}` : `${wallLengthCm} cm`

        return (
            <div key={`${itemId}-${info.typeStr}`} className="ProductDimensionValue" style={style}>
                {lengthText}
            </div>
        )
    })

    return <div>{dimensionValues}</div>
}

export default ProductDimensions
