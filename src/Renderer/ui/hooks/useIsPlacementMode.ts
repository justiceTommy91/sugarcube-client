import { useEffect, useState } from 'react'
import { getGrandCentral } from 'Renderer/GrandCentral'
import * as gv from 'Renderer/geomviewer'

/**
 * Hook for tracking whether the viewer is in placement mode (for stackables).
 * Listens to BeginPlacementModeWithItem/EndPlacementModeWithItem notifications.
 */
export function useIsPlacementMode() {
  const [isPlacementMode, setIsPlacementMode] = useState(false)

  useEffect(() => {
    const gc = getGrandCentral()
    const observer = (notification: gv.SceneItemUpdateNotification) => {
      if (notification.payload.stateInfo === 'BeginPlacementModeWithItem') {
        setIsPlacementMode(true)
      } else if (notification.payload.stateInfo === 'EndPlacementModeWithItem') {
        setIsPlacementMode(false)
      }
    }
    gc.addObserver(gv.NOTIFY_SCENE_ITEM_UPDATE, observer as gv.NotificationObserver)
    return () => gc.removeObserver(observer as gv.NotificationObserver)
  }, [])

  return isPlacementMode
}
