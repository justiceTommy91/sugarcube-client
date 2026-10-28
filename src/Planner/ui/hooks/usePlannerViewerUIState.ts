import { useState, useEffect } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { ViewerUIEvent, OrbitCameraState, InteractableItemType, WallElementAxisDraggingState } from 'Planner/api_types'
import {
  VIEWER_UI_EVENT_DRAG_START,
  VIEWER_UI_EVENT_DRAG_END,
  VIEWER_UI_EVENT_WALL_ELEM_DRAG_DIR_CHANGE,
  VIEWER_UI_EVENT_HOVER_CHANGE,
  VIEWER_UI_EVENT_CAMERA_ORBIT_CHANGE,
  ORBIT_CAMERA_STATE_DISABLED,
  VIEWER_UI_EVENT_SELECTION_CHANGE,
} from 'Planner/api_constants'

export const usePlannerViewerUIState = (viewerId: string) => {
  const { plannerApi } = usePlannerApi()

  const [hoverObjectId, setHoverObjectId] = useState<string | undefined>()
  const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>()
  const [selectedObjectType, setSelectedObjectType] = useState<InteractableItemType | undefined>()
  const [hoverObjectType, setHoverObjectType] = useState<InteractableItemType | undefined>()
  const [draggingObjectId, setDraggingObjectId] = useState<string | undefined>()
  const [draggingObjectType, setDraggingObjectType] = useState<InteractableItemType | undefined>()
  const [verticalDraggingState, setVerticalDraggingState] = useState<WallElementAxisDraggingState | undefined>()
  const [horizontalDraggingState, setHorizontalDraggingState] = useState<WallElementAxisDraggingState | undefined>()
  const [orbitCameraState, setOrbitCameraState] = useState<OrbitCameraState>(ORBIT_CAMERA_STATE_DISABLED)

  useEffect(() => {
    const observer = (uiEvent: ViewerUIEvent) => {
      switch(uiEvent.type) {
        case VIEWER_UI_EVENT_HOVER_CHANGE:
          setHoverObjectId(uiEvent.objectId)
          setHoverObjectType(uiEvent.objectType)
          break
        case VIEWER_UI_EVENT_DRAG_START:
          setDraggingObjectId(uiEvent.objectId)
          setDraggingObjectType(uiEvent.objectType)
          break
        case VIEWER_UI_EVENT_DRAG_END:
          setDraggingObjectId(undefined)
          setDraggingObjectType(undefined)
          break
        case VIEWER_UI_EVENT_WALL_ELEM_DRAG_DIR_CHANGE:
          setVerticalDraggingState(uiEvent.verticalDraggingState)
          setHorizontalDraggingState(uiEvent.horizontalDraggingState)
          break
        case VIEWER_UI_EVENT_CAMERA_ORBIT_CHANGE:
          setOrbitCameraState(uiEvent.state)
          break
        case VIEWER_UI_EVENT_SELECTION_CHANGE:
          setSelectedObjectId(uiEvent.objectId)
          setSelectedObjectType(uiEvent.objectType)
          break
        default:
          break
      }
    }
    plannerApi.addViewerUIObserver(viewerId, observer)
    return () => plannerApi.addViewerUIObserver(viewerId, observer)
  }, [viewerId])

  return {
    hoverObjectId,
    hoverObjectType,
    selectedObjectId,
    selectedObjectType,
    draggingObjectId,
    draggingObjectType,
    verticalDraggingState,
    horizontalDraggingState,
    orbitCameraState,
  }
}