import { useState, useEffect } from 'react'

import { GeomViewer, type ProductDimensionsInfo } from 'Renderer/geomviewer'
import { getGrandCentral } from 'Renderer/GrandCentral'
import { NOTIFY_CAMERA_TRANSFORM_UPDATE, NOTIFY_SCENE_ITEM_UPDATE } from 'Renderer/geomviewer'

export const useProductDimensions = (itemId: string) => {
  const [dimensionsInfo, setDimensionsInfo] = useState<ProductDimensionsInfo | undefined>(undefined)

  useEffect(() => {
    const refreshDimensionsInfo = () => setDimensionsInfo(GeomViewer.bindings?.queryProductDimensionsInfo(itemId))
    // eslint-disable-next-line no-bitwise
    getGrandCentral().addObserver(NOTIFY_CAMERA_TRANSFORM_UPDATE | NOTIFY_SCENE_ITEM_UPDATE, refreshDimensionsInfo)
    return () => {
      getGrandCentral().removeObserver(refreshDimensionsInfo)
    }
  }, [])

  return dimensionsInfo
}