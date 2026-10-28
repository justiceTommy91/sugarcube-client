import { useEffect, useState } from 'react'
import { getGrandCentral } from 'Renderer/GrandCentral'
import * as gv from 'Renderer/geomviewer'

export function useHoveredItemId() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  useEffect(() => {
    const gc = getGrandCentral()
    const observer = (notification: gv.SceneItemUpdateNotification) => {
      if (notification.payload.stateInfo === 'HoverStart') {
        setHoveredItem(notification.payload.itemId)
      } else if (notification.payload.stateInfo === 'HoverEnd') {
        setHoveredItem(null)
      }
    }
    gc.addObserver(gv.NOTIFY_SCENE_ITEM_UPDATE, observer as gv.NotificationObserver)
    return () => gc.removeObserver(observer as gv.NotificationObserver)
  }, [])

  return hoveredItem
}
