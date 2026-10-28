import { useEffect, useState } from 'react'
import { getGrandCentral } from 'Renderer/GrandCentral'
import * as gv from 'Renderer/geomviewer'

/**
 * Hook for tracking placement indicator state (for stackable placement mode).
 * Tracks whether placement is invalid and whether there's a valid hover target.
 */
export function usePlacementIndicatorState() {
  const [isInvalidForStackable, setIsInvalidForStackable] = useState(false)
  const [isValidHoverForStackable, setIsValidHoverForStackable] = useState(false)

  useEffect(() => {
    const gc = getGrandCentral()
    const observer = (notification: gv.SceneItemUpdateNotification) => {
      switch (notification.payload.stateInfo) {
        case 'PlacementModeCanvasClicked':
          setIsInvalidForStackable(true)
          setIsValidHoverForStackable(false)
          break
        case 'HoverStart':
          setIsInvalidForStackable(false)
          setIsValidHoverForStackable(true)
          break
        case 'HoverEnd':
          setIsInvalidForStackable(false)
          setIsValidHoverForStackable(false)
          break
        default:
          break
      }
    }
    gc.addObserver(gv.NOTIFY_SCENE_ITEM_UPDATE, observer as gv.NotificationObserver)
    return () => gc.removeObserver(observer as gv.NotificationObserver)
  }, [])

  const resetInvalidState = () => setIsInvalidForStackable(false)

  return { isInvalidForStackable, isValidHoverForStackable, resetInvalidState }
}
