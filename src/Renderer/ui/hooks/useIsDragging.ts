import { useEffect, useState } from 'react'
import { getGrandCentral } from 'Renderer/GrandCentral'
import * as gv from 'Renderer/geomviewer'

/**
 * Hook for tracking whether a render item is currently being dragged.
 * Listens to DragStart/DragEnd notifications from GeomViewer.
 */
export function useIsDragging() {
  const [isDragging, setIsDragging] = useState(false)
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)

  useEffect(() => {
    const gc = getGrandCentral()
    const observer = (notification: gv.SceneItemUpdateNotification) => {
      if (notification.payload.stateInfo === 'DragStart') {
        setIsDragging(true)
        setDraggingItemId(notification.payload.itemId)
      } else if (notification.payload.stateInfo === 'DragEnd') {
        setIsDragging(false)
        setDraggingItemId(null)
      }
    }
    gc.addObserver(gv.NOTIFY_SCENE_ITEM_UPDATE, observer as gv.NotificationObserver)
    return () => gc.removeObserver(observer as gv.NotificationObserver)
  }, [])

  return { isDragging, draggingItemId }
}
