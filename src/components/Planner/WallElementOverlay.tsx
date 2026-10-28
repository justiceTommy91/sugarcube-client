import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import Button from '@ingka/button'
import trashCan from '@ingka/ssr-icon/paths/trash-can'
import { convertMetersToParts } from 'utils/convertDimensions'
import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { useWallElementProjection } from 'Planner/ui/hooks/useWallElementProjection'
import { useWallElement } from 'Planner/ui/hooks/useWallElement'
import { STEPS, type Step } from 'models/planner/index'
import { useAppSelector, useAppDispatch } from 'hooks'
import { wallElementDeleted } from 'models/planner/slice'
import Tooltip from 'components/Tooltip'
import * as plannerSelectors from 'models/planner/selectors'
import { track } from 'utils/tracker'

import './WallElementOverlay.scss'
import { getShouldShowImperialMeasurements } from 'models/ui/selectors'
import { ViewerUIEvent } from 'Planner/api_types'
import { WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED } from 'Planner/planner_constants'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'
import { OBJECT_TYPE_WALL_ELEMENT, VIEWER_UI_EVENT_ITEM_DELETED } from 'Planner/api_constants'

type WallElementOverlayProps = {
    elementId: string
    viewerId: string
    onPointerDown?: (elementId: string, event: React.PointerEvent<HTMLDivElement>) => void
    onPointerOver?: (elementId: string, event: React.PointerEvent<HTMLDivElement>) => void
    onPointerLeave?: (elementId: string, event: React.PointerEvent<HTMLDivElement>) => void
    step: Step
}

export const WallElementOverlay = ({
    elementId,
    viewerId,
    onPointerDown,
    onPointerOver,
    onPointerLeave,
    step,
}: WallElementOverlayProps) => {
    const { t } = useTranslation('translation')
    const dispatch = useAppDispatch()
    const { plannerApi } = usePlannerApi()
    const {
        centerRelative,
        cornersPixels,
        backFacing,
        distancePointsPixels,
        isSelected,
        isDragged,
        verticalDraggingAxisState,
        horizontalDraggingAxisState,
    } = useWallElementProjection(elementId, viewerId)
    const { leftDistance, rightDistance, topDistance, bottomDistance, assetUuid } = useWallElement(elementId)
    const assetInfo = useAppSelector((state) => plannerSelectors.getAssetInfo(state, assetUuid))
    const shouldShowImperialMeasurements = useAppSelector(getShouldShowImperialMeasurements)
    const plannerTrackingInfo = usePlannerTrackingInfo()

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!onPointerDown) {
            return
        }
        onPointerDown(elementId, event)
    }

    const handlePointerOver = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!onPointerOver) {
            return
        }
        onPointerOver(elementId, event)
    }

    const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!onPointerLeave) {
            return
        }
        onPointerLeave(elementId, event)
    }

    useEffect(() => {
        const deletionObserver = (uiEvent: ViewerUIEvent) => {
            const isThisElement = uiEvent.type === VIEWER_UI_EVENT_ITEM_DELETED &&
                uiEvent.objectType === OBJECT_TYPE_WALL_ELEMENT &&
                uiEvent.objectId === elementId
            if (isThisElement) {
                const eventInfo = uiEvent.isInternal
                ? {
                    ActionType: `KeyPress`,
                    KeyPressed: `Delete`,
                }
                : {
                    ActionType: `Click`,
                } 
                const trackingInfo = {
                    ...eventInfo,
                    AssetUuid: '',
                    AssetName: '',
                    SemanticClass: '',
                    ...plannerTrackingInfo,
                }
                // assetInfo is null if assetUuid is undefined
                if (assetInfo) {
                    const { uuid, semanticClass, name } = assetInfo
                    const assetSemanticClass = semanticClass[0]
                    trackingInfo.AssetUuid = uuid
                    trackingInfo.AssetName = name
                    trackingInfo.SemanticClass = assetSemanticClass
                    dispatch(wallElementDeleted({ semanticType: assetSemanticClass }))
                }
                // Note: when assetUuid is undefined, the trackingInfo values will be empty strings.
                // assetUuid is undefined for exisiting doors/windows in a given template (non user added doors/windows).
                // We will fix eventually fix this data but for now having empty values will allow us to
                // accurately count the number of delete's.
                track('RoomBuilder.RemoveWallElement', {
                    ...trackingInfo
                })
            }
        }
        plannerApi.addViewerUIObserver(viewerId, deletionObserver)
        return () => plannerApi.removeViewerUIObserver(viewerId, deletionObserver)
    }, [plannerApi])

    const onDelete = useCallback(() => {
        plannerApi.deleteWallElement(elementId)
    }, [])

    // Filter out undefined c Vector values and get the minimum or maximum of y values.
    // These values are then used to determine whether the delete button will appear above
    // or below the wall element.
    const topPoint = cornersPixels && Math.min(...cornersPixels.map((c) => (c ? c.y : 0)))
    const bottomPoint = cornersPixels && Math.max(...cornersPixels.map((c) => (c ? c.y : 0)))

    let deleteTop = `${(topPoint || 0) - 48}px`

    // If the wall element's top point does not have space to show the delete button, move the button to below the element.
    // The TOP_THRESHOLD_VALUE value is the size of the button 40px plus spacing below, 48 px.
    const TOP_THRESHOLD_VALUE = 88
    const moveDeleteButtonBelow = topPoint && topPoint < TOP_THRESHOLD_VALUE

    if (moveDeleteButtonBelow) {
        deleteTop = `${(bottomPoint || 0) + 48}px`
    }
    const deleteButtonStyle = {
        top: deleteTop,
        left: `${100 * (centerRelative?.x || 0)}%`,
    }
    const showDeleteButton = step === STEPS.doorWindow && isSelected && !isDragged
    const pointStyle = {
        top: `${100 * (centerRelative?.y || 0)}%`,
        left: `${100 * (centerRelative?.x || 0)}%`,
    }

    const leftStyle = distancePointsPixels && {
        top: `${distancePointsPixels[0]?.y || 0}px`,
        left: `${distancePointsPixels[0]?.x || 0}px`,
    }
    const rightStyle = distancePointsPixels && {
        top: `${distancePointsPixels[1]?.y || 0}px`,
        left: `${distancePointsPixels[1]?.x || 0}px`,
    }

    const topStyle = distancePointsPixels && {
        top: `${distancePointsPixels[2]?.y || 0}px`,
        left: `${distancePointsPixels[2]?.x || 0}px`,
    }
    const bottomStyle = distancePointsPixels && {
        top: `${distancePointsPixels[3]?.y || 0}px`,
        left: `${distancePointsPixels[3]?.x || 0}px`,
    }

    const visibility = backFacing || isDragged ? `invisible` : ''
    const distanceVisibilityVertical =
        isDragged &&
        verticalDraggingAxisState &&
        verticalDraggingAxisState !== WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED
            ? ''
            : `invisible`

    const distanceVisibilityHorizontal =
        isDragged &&
        horizontalDraggingAxisState &&
        horizontalDraggingAxisState !== WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED
            ? ''
            : `invisible`

    const {
        wallLengthFeetPart: leftFeetPart,
        wallLengthInchesPart: leftInchesPart,
        wallLengthCm: leftCm,
    } = convertMetersToParts(leftDistance, shouldShowImperialMeasurements)
    const leftText = shouldShowImperialMeasurements ? `${leftFeetPart}' ${leftInchesPart}"` : `${leftCm} cm`

    const {
        wallLengthFeetPart: rightFeetPart,
        wallLengthInchesPart: rightInchesPart,
        wallLengthCm: rightCm,
    } = convertMetersToParts(rightDistance, shouldShowImperialMeasurements)
    const rightText = shouldShowImperialMeasurements ? `${rightFeetPart}' ${rightInchesPart}"` : `${rightCm} cm`

    const {
        wallLengthFeetPart: topFeetPart,
        wallLengthInchesPart: topInchesPart,
        wallLengthCm: topCm,
    } = convertMetersToParts(topDistance, shouldShowImperialMeasurements)
    const topText = shouldShowImperialMeasurements ? `${topFeetPart}' ${topInchesPart}"` : `${topCm} cm`

    const {
        wallLengthFeetPart: bottomFeetPart,
        wallLengthInchesPart: bottomInchesPart,
        wallLengthCm: bottomCm,
    } = convertMetersToParts(bottomDistance, shouldShowImperialMeasurements)
    const bottomText = shouldShowImperialMeasurements ? `${bottomFeetPart}' ${bottomInchesPart}"` : `${bottomCm} cm`

    return (
        <div className="WallElementOverlay">
            <div
                className={classNames('Marker', visibility)}
                style={pointStyle}
                onPointerDown={handlePointerDown}
                onPointerOver={handlePointerOver}
                onPointerLeave={handlePointerLeave}
            >
                <div className="outerDot">
                    <div className="innerDot" />
                </div>
            </div>
            {showDeleteButton && (
                <div className="DeleteIcon" style={deleteButtonStyle}>
                    <Tooltip describedById="design-delete" title={t('design.delete')} place="top">
                        <Button
                            className="TrashCanIcon"
                            onClick={onDelete}
                            ssrIcon={trashCan}
                            iconOnly
                            type="primary"
                            size="small"
                            text={t('design.delete')}
                        />
                    </Tooltip>
                </div>
            )}
            <div
                className={classNames('WallElementOverlay__measurement', distanceVisibilityHorizontal)}
                style={leftStyle}
                onPointerDown={handlePointerDown}
            >
                {leftText}
            </div>

            <div
                className={classNames('WallElementOverlay__measurement', distanceVisibilityHorizontal)}
                style={rightStyle}
                onPointerDown={handlePointerDown}
            >
                {rightText}
            </div>

            <div
                className={classNames('WallElementOverlay__measurement', distanceVisibilityVertical)}
                style={topStyle}
                onPointerDown={handlePointerDown}
            >
                {topText}
            </div>

            <div
                className={classNames('WallElementOverlay__measurement', distanceVisibilityVertical)}
                style={bottomStyle}
                onPointerDown={handlePointerDown}
            >
                {bottomText}
            </div>
        </div>
    )
}
