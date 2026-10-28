import { useEffect, useState, useCallback } from 'react'
import { getGrandCentral } from 'Renderer/GrandCentral'
import * as gv from 'Renderer/geomviewer'

type ProductPinInfo = {
  uniqueId: string
  hidePin?: boolean
  itemIsHidden?: boolean
  x?: number
  y?: number
}

export function useProductPins() {
  const [productCorners, setProductCorners] = useState<Record<string, ProductPinInfo>>({})

  const addProduct = useCallback((productInfo: ProductPinInfo): void => {
    setProductCorners(prev => ({ ...prev, [productInfo.uniqueId]: productInfo }))
  }, [])

  useEffect(() => {
    const gc = getGrandCentral()
    const observer = (notification: gv.SceneItemUpdateNotification) => {
      if (notification.payload.stateInfo === 'PinInfo') {
        addProduct({ uniqueId: notification.payload.itemId, ...notification.payload.itemData })
      }
    }
    gc.addObserver(gv.NOTIFY_SCENE_ITEM_UPDATE, observer as gv.NotificationObserver)
    return () => gc.removeObserver(observer as gv.NotificationObserver)
  }, [addProduct])

  return productCorners
}
