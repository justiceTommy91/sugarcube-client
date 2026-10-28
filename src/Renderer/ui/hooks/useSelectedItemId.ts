import { useEffect, useState } from 'react'
import { getGrandCentral } from 'Renderer/GrandCentral'
import * as gv from 'Renderer/geomviewer'

// Hook for getting the unique id for selected item
export function useSelectedItemId() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  useEffect(() => {
    const gc = getGrandCentral()
    const observer = (notification: gv.SceneItemUpdateNotification) => {
      if (notification.payload.stateInfo === 'Selected') {
        setSelectedItem(notification.payload.itemId)
      } else if (notification.payload.stateInfo === 'Deselected') {
        setSelectedItem(null)
      }
    }
    gc.addObserver(gv.NOTIFY_SCENE_ITEM_UPDATE, observer as gv.NotificationObserver)
    return () => gc.removeObserver(observer as gv.NotificationObserver)
  }, [])

  return selectedItem
}
