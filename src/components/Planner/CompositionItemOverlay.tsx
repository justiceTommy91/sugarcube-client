/* eslint-disable react/require-default-props */
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import Button from '@ingka/button'
import trashCan from '@ingka/ssr-icon/paths/trash-can'

import Tooltip from 'components/Tooltip'
import { useAppDispatch } from 'hooks'
import { track } from 'utils/tracker'
import { compositionItemDeleted } from 'models/planner/slice'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { useCompositionItemProjection } from 'Planner/ui/hooks/useCompositionItemProjection'
import { ViewerUIEvent } from 'Planner/api_types'
import { OBJECT_TYPE_COMPOSITION_ITEM, VIEWER_UI_EVENT_ITEM_DELETED } from 'Planner/api_constants'

import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'

import './CompositionItemOverlay.scss'

type CompositionItemOverlayProps = {
  itemId: string
  viewerId: string
}

export const CompositionItemOverlay = ({itemId, viewerId }: CompositionItemOverlayProps) => {
  const { t } = useTranslation('translation')
  const dispatch = useAppDispatch()

  const { plannerApi } = usePlannerApi()
  const { positionRelative, cornersPixels, isDragged,
    isSelected } = useCompositionItemProjection(itemId, viewerId)
  const plannerTrackingInfo = usePlannerTrackingInfo()

  const onDelete = useCallback(() => { plannerApi.deleteCompositionItem(itemId) }, [])

  useEffect(() => {
    const deletionObserver = (uiEvent: ViewerUIEvent) => {
      const isThisElement = uiEvent.type === VIEWER_UI_EVENT_ITEM_DELETED &&
        uiEvent.objectType === OBJECT_TYPE_COMPOSITION_ITEM &&
        uiEvent.objectId === itemId
      if (isThisElement) {
        const eventInfo = uiEvent.isInternal
          ? {
              ActionType: `KeyPress`,
              KeyPressed: `Delete`,
            }
          : {
              ActionType: `Click`,
            }
        dispatch(compositionItemDeleted())
        track('RoomBuilder.DeleteProduct', {
          ...eventInfo,
          ...plannerTrackingInfo,
        })
      }
    }
    plannerApi.addViewerUIObserver(viewerId, deletionObserver)
    return () => plannerApi.removeViewerUIObserver(viewerId, deletionObserver)
  }, [viewerId, plannerApi])

  const topPoint = cornersPixels && Math.min(...cornersPixels.map(c => c.y))
  const deleteButtonStyle = {
    top: `${(topPoint || 0) - 32}px`,
    left: `${100 * (positionRelative?.x || 0)}%`,
  }

  return (
      <div>
        {isSelected && !isDragged && (
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
      </div>
  )
}