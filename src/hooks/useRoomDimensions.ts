import { useState, useEffect } from 'react'

import { GeomViewer, type RoomDimensionsInfo } from 'Renderer/geomviewer'
import { getGrandCentral } from 'Renderer/GrandCentral'
import { NOTIFY_CAMERA_TRANSFORM_UPDATE } from 'Renderer/geomviewer'

export const useRoomDimensions = () => {
  const [dimensionsInfo, setDimensionsInfo] = useState<RoomDimensionsInfo | undefined>(undefined)

  useEffect(() => {
    const refreshDimensionsInfo = () => setDimensionsInfo(GeomViewer.bindings?.queryRoomDimensionsInfo())
    getGrandCentral().addObserver(NOTIFY_CAMERA_TRANSFORM_UPDATE, refreshDimensionsInfo)
    return () => {
      getGrandCentral().removeObserver(refreshDimensionsInfo)
    }
  }, [])

  return dimensionsInfo
}