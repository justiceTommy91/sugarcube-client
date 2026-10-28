import { useState, useEffect } from 'react'

import { GeomViewer, type DynamicMeasurementsInfo } from 'Renderer/geomviewer'
import { getGrandCentral } from 'Renderer/GrandCentral'
import { NOTIFY_CAMERA_TRANSFORM_UPDATE } from 'Renderer/geomviewer'

export const useDynamicMeasurements = () => {
  const [measurementsInfo, setMeasurementsInfo] = useState<DynamicMeasurementsInfo | undefined>(undefined)

  useEffect(() => {
    const refreshDimensionsInfo = () => setMeasurementsInfo(GeomViewer.bindings?.queryDynamicMeasurementsInfo())
    getGrandCentral().addObserver(NOTIFY_CAMERA_TRANSFORM_UPDATE, refreshDimensionsInfo)
    return () => {
      getGrandCentral().removeObserver(refreshDimensionsInfo)
    }
  }, [])

  return measurementsInfo
}
