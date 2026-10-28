import React from 'react'
import { useRoomDimensions } from 'hooks/useRoomDimensions'
import { convertMetersToParts } from 'utils/convertDimensions'
import { clamp01 } from 'utils/math'
import { useAppSelector } from 'hooks'
import { getShouldShowImperialMeasurements } from 'models/ui/selectors'

require('./RoomDimensions.scss')

// Assuming incoming angle is -180..180 deg.
const correctTextAngle = (angleDeg: number): number => {
    if (angleDeg < -91) {
        return angleDeg + 180
    }
    if (angleDeg > 89) {
        return angleDeg - 180
    }
    return angleDeg
}

// Empirical numbers from testing:
const minFont = { canvasHeight: 50, fontSize: 0.25 }
const maxFont = { canvasHeight: 750, fontSize: 1 }
const calcFontSize = (canvasHeight: number) => {
    const t = clamp01((canvasHeight - minFont.canvasHeight) / (maxFont.canvasHeight - minFont.canvasHeight))
    return minFont.fontSize + (maxFont.fontSize - minFont.fontSize) * t
}

export type RoomDimensionsProps = {
    canvasHeight: number
}

const RoomDimensions = ({ canvasHeight }: RoomDimensionsProps) => {
    const dimensionsInfo = useRoomDimensions()
    const shouldShowImperialMeasurements = useAppSelector(getShouldShowImperialMeasurements)

    const visible = dimensionsInfo?.isEnabled && dimensionsInfo?.shouldBeVisible
    if (!dimensionsInfo || !visible) {
        return null
    }
    const dimensionValues = dimensionsInfo.dimensions
        .filter((info) => info.hasVisualLine)
        .map((info) => {
            if (
                info.pointMiddleBehindCamera ||
                info.relativeMiddlePoint.x > 1.0 ||
                info.relativeMiddlePoint.x < 0.0 ||
                info.relativeMiddlePoint.y > 1.0 ||
                info.relativeMiddlePoint.y < 0.0
            ) {
                return null
            }
            const deltaX = info.screenPoint2.x - info.screenPoint1.x
            const deltaY = info.screenPoint2.y - info.screenPoint1.y
            const wallAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
            const fontSize = calcFontSize(canvasHeight)
            const style = {
                top: `${info.relativeMiddlePoint.y * 100.0}%`,
                left: `${info.relativeMiddlePoint.x * 100.0}%`,
                transform: `translate(-50%, -50%) rotate(${correctTextAngle(wallAngle)}deg)`,
                opacity: dimensionsInfo.opacity,
                fontSize: `${fontSize}rem`,
            }
            const { wallLengthFeetPart, wallLengthInchesPart, wallLengthCm } = convertMetersToParts(
                info.length,
                shouldShowImperialMeasurements,
            )

            const lengthText = shouldShowImperialMeasurements
                ? `${wallLengthFeetPart}' ${wallLengthInchesPart}"`
                : `${wallLengthCm} cm`

            const minScreenLengthSq = 75 * 75
            const screenLengthSq = deltaX * deltaX + deltaY * deltaY
            const finalLengthText = screenLengthSq > minScreenLengthSq ? lengthText : `···`

            return (
                <div key={info.id} className="DimensionLength" style={style}>
                    {finalLengthText}
                </div>
            )
        })
    return <div>{dimensionValues}</div>
}

export default RoomDimensions
