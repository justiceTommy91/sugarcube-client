/* eslint-disable i18next/no-literal-string */
import React, { useState, useEffect } from 'react'

import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import ellipsesHorizontal from '@ingka/ssr-icon/paths/ellipses-horizontal'
import crosshairIcon from '@ingka/ssr-icon/paths/crosshair'
import classNames from 'classnames'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { useRoomWall } from 'Planner/ui/hooks/useRoomWall'
import { useWallProjection } from 'Planner/ui/hooks/useWallProjection'
import { convertMetersToParts } from 'utils/convertDimensions'

import './WallOverlay.scss'
import { getShouldShowImperialMeasurements } from 'models/ui/selectors'
import { drop } from 'utils/tracker'
import { useAppSelector } from 'hooks/useAppSelector'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'
import { useAppDispatch } from 'hooks'
import { vertexAdded } from 'models/planner/slice'

type WallOverlayProps = {
    wallId: string
    viewerId: string
    onPointerDown?: (wallId: string, event: React.PointerEvent<HTMLDivElement>) => void
    onPointerUp?: (wallId: string, event: React.PointerEvent<HTMLDivElement>) => void
    isBeingDragged: boolean
    showDimensions: boolean
    forceShowTooltip: boolean
    isInteractive: boolean
    nodeEditingEnabled: boolean
}

const INV_SQRT2 = 1 / Math.sqrt(2)
const TRANSLATE_PRESETS = [
    { v: [ 1,  0], t: [ 50,    0] },
    { v: [-1,  0], t: [-50,    0] },
    { v: [ 0,  1], t: [   0,  50] },
    { v: [ 0, -1], t: [   0, -50] },

    { v: [ INV_SQRT2,  INV_SQRT2], t: [ 50,  50] },
    { v: [ INV_SQRT2, -INV_SQRT2], t: [ 50, -50] },
    { v: [-INV_SQRT2,  INV_SQRT2], t: [-50,  50] },
    { v: [-INV_SQRT2, -INV_SQRT2], t: [-50, -50] },
];

const translateFromNormal = (nx: number, ny: number) => {
    if (nx === 0 && ny === 0) {
        return [0, 0]
    }

    let best = TRANSLATE_PRESETS[0]
    let bestDot = -Infinity
    TRANSLATE_PRESETS.forEach((d) => {
        const dot = nx * d.v[0] + ny * d.v[1]
        if (dot > bestDot) {
            bestDot = dot
            best = d
        }
    })
    return best.t
}

export const WallOverlay = ({wallId, viewerId, onPointerDown, onPointerUp,
    isBeingDragged, isInteractive, showDimensions, forceShowTooltip, nodeEditingEnabled }: WallOverlayProps) => {
    const [wallSplitDistance, setWallSplitDistance] = useState(0.0)
    const [canSplitWall, setCanSplitWall] = useState(false)
    const { t } = useTranslation('dashboard')
    const dispatch = useAppDispatch()
    const { plannerApi } = usePlannerApi()
    const plannerTrackingInfo = usePlannerTrackingInfo()

    const { wallLength, testSplitWall, splitWall, getAutoSplitDistance } = useRoomWall(wallId)
    const {
        middlePointRelative,
        vertex1Pixels,
        vertex2Pixels,
        isSelected,
    } = useWallProjection(
        wallId,
        viewerId,
    )
    const shouldShowImperialMeasurements = useAppSelector(getShouldShowImperialMeasurements)

    useEffect(() => {
        const autoPoint = getAutoSplitDistance()
        if (!isSelected || autoPoint === undefined) {
            setCanSplitWall(false)
            return
        }
        const canSplit = testSplitWall(autoPoint)
        setCanSplitWall(canSplit)
        if (canSplit) {
            setWallSplitDistance(autoPoint)
        }
    }, [isSelected, getAutoSplitDistance, testSplitWall])

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!onPointerDown) {
            return
        }
        onPointerDown(wallId, event)
    }

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!onPointerUp) {
            return
        }
        onPointerUp(wallId, event)
    }

    if (!vertex1Pixels || !vertex2Pixels) {
        return null
    }

    const { x: x1, y: y1 } = vertex1Pixels
    const { x: x2, y: y2 } = vertex2Pixels

    const deltaX = x2 - x1
    const deltaY = y2 - y1
    const length = Math.sqrt(deltaX ** 2 + deltaY ** 2)
    const wallAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    const wallLineStyle = {
        top: `${100 * middlePointRelative.y}%`,
        left: `${100 * middlePointRelative.x}%`,
        width: `${length}px`,
        transform: `translate(-50%, -50%) rotate(${wallAngle}deg)`,
    }
    const splitMarkerStyle = {
        top: `${100 * (middlePointRelative?.y || 0)}%`,
        left: `${100 * (middlePointRelative?.x || 0)}%`,
    }

    const absAngle = Math.abs(wallAngle)
    // Bias is needed to make sure measurements of vertical "vertical" wall (i.e. close to 90 degrees),
    // don't flip too often and follow the wall winding.
    const biasDeg = 1
    const textRotation = absAngle <= (90 + biasDeg) ? 0 : 180
    const measurementStyle = {
        // Ensure that text on the measurement is always in a consistent reading angle
        transform: `rotate(${textRotation}deg)`,
    }

    const { wallLengthFeetPart, wallLengthInchesPart, wallLengthCm } = convertMetersToParts(
        wallLength,
        shouldShowImperialMeasurements,
    )
    // TODO: need to get translations for cm!
    const lengthText = shouldShowImperialMeasurements
        ? `${wallLengthFeetPart}' ${wallLengthInchesPart}"`
        : `${wallLengthCm} cm`
    const isHighlighted = isBeingDragged

    const ellipsisThresholdPixels = 60
    const hasOverflow = length < ellipsisThresholdPixels

    const outNormalX = length > 0 ? (-deltaY / length) : 0
    const outNormalY = length > 0 ? ( deltaX / length) : 0
    const gapPixels = 20
    const translate = translateFromNormal(outNormalX, outNormalY)
    const xTranslate = `calc(${translate[0] - 50}% + ${outNormalX} * ${gapPixels}px)`
    const yTranslate = `calc(${translate[1] - 50}% + ${outNormalY} * ${gapPixels}px)`
    const splitButtonTranslate = `translate(${xTranslate}, ${yTranslate})`
    const splitButtonStyle = {
        transform: `${splitButtonTranslate}`,
    }

    const onSplit = () => {
        if (!canSplitWall) {
            return
        }
        const result = splitWall(wallSplitDistance)
        if (result) {
            plannerApi.clearCurrentSelection(viewerId)

            drop(`RoomBuilder.WallSplit`, {
                ...plannerTrackingInfo,
                itemId: wallId,
                wallCreatedId: result.newWallId,
                verticesCreatedId: result.newVertexId,
            })
            dispatch(vertexAdded())
        }
    }

    return (
        <div className={classNames('WallOverlay', { isHighlighted, isInteractive })}>
            <div
                className={classNames('WallLine', { selected: isSelected })}
                style={wallLineStyle}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
            />
            { nodeEditingEnabled && (
                <div
                    className={classNames('WallSplitMarker', { visible: canSplitWall })}
                    style={splitMarkerStyle}
                >
                    <button className="SplitButton" style={splitButtonStyle} onClick={onSplit}>
                        <SSRIcon className="SplitIcon" paths={crosshairIcon} />
                        <div>{t('dashboard.planner.add point')}</div>
                    </button>
                </div>
            )}
            { showDimensions && (
                <div
                    className={classNames('WallOverlay__measurement', {
                        WallOverlay__measurement_collapsed: hasOverflow,
                    })}
                    style={wallLineStyle}
                >
                    <div className="WallOverlay__measurementLine" />
                    <div className="WallOverlay__measurementText" style={measurementStyle}>
                        {hasOverflow ? (
                            <>
                                <SSRIcon paths={ellipsesHorizontal} />
                                <div
                                    className={classNames('WallOverlay__measurementTooltip', { forceShow: forceShowTooltip })}
                                >
                                    {lengthText}
                                </div>
                            </>
                        ) : (
                            lengthText
                        )}
                    </div>
                    <div className="WallOverlay__measurementLine" />
                </div>
            )}
        </div>
    )
}
