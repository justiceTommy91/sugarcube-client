import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import classNames from 'classnames'

import SSRIcon from '@ingka/ssr-icon'
import trashCan from '@ingka/ssr-icon/paths/trash-can'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { useVertexProjection } from 'Planner/ui/hooks/useVertexProjection'

import { drop } from 'utils/tracker'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'
import { useAppDispatch } from 'hooks'
import { vertexDeleted } from 'models/planner/slice'

import './VertexOverlay.scss'

type VertexOverlayProps = {
  vertexId: string
  viewerId: string
  interactive: boolean
  isDragging: boolean
  onPointerDown?: (vertexId: string, event: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp?: (vertexId: string, event: React.PointerEvent<HTMLDivElement>) => void
}

export const VertexOverlay = ({ vertexId, viewerId, interactive, isDragging, onPointerDown, onPointerUp }: VertexOverlayProps ) => {
  const { t } = useTranslation('dashboard')
  const plannerTrackingInfo = usePlannerTrackingInfo()

  const { positionPixels, positionRelative, isSelected } = useVertexProjection(vertexId, viewerId)
  const { plannerApi } = usePlannerApi()
  const dispatch = useAppDispatch()

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || !onPointerDown) {
        return
      }
      onPointerDown(vertexId, event)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || !onPointerUp) {
        return
      }
      onPointerUp(vertexId, event)
  }

  const onDelete = useCallback(() => {
    const prevVertexInfo = plannerApi.getVertexInfo(vertexId)
    const result = plannerApi.deleteVertex(vertexId)
    if (result.success === false && result.obstacleType && result.obstacleItemsIds) {
      const { obstacleType } = result
      result.obstacleItemsIds.forEach(id => plannerApi.blinkObject(obstacleType, id))
    }
    if (result.success && prevVertexInfo) {
        drop(`RoomBuilder.NodeDelete`, {
          ...plannerTrackingInfo,
          itemId: vertexId,
          wallMergedIds: prevVertexInfo.wallIds,
          wallDeletedId: result.deletedWallId,
          wallRetainedId: result.retainedWallId,
        })
        dispatch(vertexDeleted())
    }
  }, [])

  const pointStyle = {
      top: `${positionPixels?.y || 0.0}px`,
      left: `${positionPixels?.x || 0.0}px`,
  }
  const positionOnTop = positionRelative && positionRelative.y > 0.9

  return (
      <>
        <div
            className={classNames('WallVertex', { interactive, selected: isSelected })}
            style={pointStyle}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
        />
        { isSelected && !isDragging && (
          <div className="DeleteButtonContainer" style={pointStyle}>
              <button className={classNames('DeleteButton', { top: positionOnTop })} onClick={onDelete}>
                  <SSRIcon className="TrashCanIcon" paths={trashCan} />
                  <div>{t('dashboard.delete')}</div>
              </button>
          </div>
        )}
      </>
  )
}