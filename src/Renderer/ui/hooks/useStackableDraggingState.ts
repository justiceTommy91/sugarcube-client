import { useEffect, useState } from 'react'
import { getGrandCentral } from 'Renderer/GrandCentral'
import * as gv from 'Renderer/geomviewer'

/**
 * Hook for tracking stackable dragging state.
 * Listens to BeginStackableDraggingMode/EndStackableDraggingMode and ValidOrInvalidDestinationCursor.
 */
export function useStackableDraggingState() {
  const [isStackableDragging, setIsStackableDragging] = useState(false)
  const [isDragDestinationValid, setIsDragDestinationValid] = useState(true)

  useEffect(() => {
    const gc = getGrandCentral()
    const observer = (notification: gv.ViewerStateUpdateNotification) => {
      switch (notification.payload.stateInfo) {
        case 'BeginStackableDraggingMode':
          setIsStackableDragging(true)
          break
        case 'EndStackableDraggingMode':
          setIsStackableDragging(false)
          break
        case 'ValidOrInvalidDestinationCursor':
          setIsDragDestinationValid(notification.payload.isDragDestinationValid ?? true)
          break
        default:
          break
      }
    }
    gc.addObserver(gv.NOTIFY_VIEWER_STATE_UPDATE, observer as gv.NotificationObserver)
    return () => gc.removeObserver(observer as gv.NotificationObserver)
  }, [])

  return { isStackableDragging, isDragDestinationValid }
}
