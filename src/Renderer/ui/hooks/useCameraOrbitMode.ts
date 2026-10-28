import { useEffect, useState } from 'react'
import { getGrandCentral } from 'Renderer/GrandCentral'
import * as gv from 'Renderer/geomviewer'

/**
 * Hook for tracking camera orbit mode state.
 * Listens to OrbitModeBegin/OrbitModeEnd and OrbitMoveStart/OrbitMoveEnd.
 */
export function useCameraOrbitMode() {
  const [isInOrbitMode, setIsInOrbitMode] = useState(false)
  const [isOrbitMoving, setIsOrbitMoving] = useState(false)

  useEffect(() => {
    const gc = getGrandCentral()
    const observer = (notification: gv.ViewerStateUpdateNotification) => {
      switch (notification.payload.stateInfo) {
        case 'OrbitModeBegin':
          setIsInOrbitMode(true)
          break
        case 'OrbitModeEnd':
          setIsInOrbitMode(false)
          break
        case 'OrbitMoveStart':
          setIsOrbitMoving(true)
          break
        case 'OrbitMoveEnd':
          setIsOrbitMoving(false)
          break
        default:
          break
      }
    }
    gc.addObserver(gv.NOTIFY_VIEWER_STATE_UPDATE, observer as gv.NotificationObserver)
    return () => gc.removeObserver(observer as gv.NotificationObserver)
  }, [])

  return { isInOrbitMode, isOrbitMoving }
}
