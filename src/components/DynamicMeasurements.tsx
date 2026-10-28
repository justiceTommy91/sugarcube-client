import React from 'react'
import { useDynamicMeasurements } from 'hooks/useDynamicMeasurements'
import { convertMetersToParts } from 'utils/convertDimensions'
import { useAppSelector } from 'hooks'
import { getShouldShowImperialMeasurements } from 'models/ui/selectors'

require('./DynamicMeasurements.scss')

const DynamicMeasurements = () => {
    const dimensionsInfo = useDynamicMeasurements()
    const shouldShowImperialMeasurements = useAppSelector(getShouldShowImperialMeasurements)

    const visible = !!dimensionsInfo?.trackedItemId
    if (!visible) {
        return null
    }
    const dimensionValues = dimensionsInfo.measurements.map((info) => {
        if (
            info.relativeMiddlePoint.x > 1.0 ||
            info.relativeMiddlePoint.x < 0.0 ||
            info.relativeMiddlePoint.y > 1.0 ||
            info.relativeMiddlePoint.y < 0.0
        ) {
            return null
        }
        const style = {
            top: `${info.relativeMiddlePoint.y * 100.0}%`,
            left: `${info.relativeMiddlePoint.x * 100.0}%`,
            transform: `translate(-50%, -50%))`,
        }

        const { wallLengthFeetPart, wallLengthInchesPart, wallLengthCm } = convertMetersToParts(
            info.length,
            shouldShowImperialMeasurements,
        )
        const lengthText = shouldShowImperialMeasurements
            ? `${wallLengthFeetPart}' ${wallLengthInchesPart}"`
            : `${wallLengthCm} cm`

        return (
            <div key={info.type} className="MeasurementLength" style={style}>
                {lengthText}
            </div>
        )
    })
    return <div>{dimensionValues}</div>
}

export default DynamicMeasurements
