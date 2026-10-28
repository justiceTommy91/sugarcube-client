import { useEffect, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import type { Line2 } from 'Planner/api_types'

export const useWallSnapping = (wallId: string | undefined | null, viewerId: string) => {
  const { plannerApi } = usePlannerApi()

  const [snapLinesRelative, setSnapLinesRelative] = useState<Line2[]>([])

  useEffect(() => {
    const updateInfo = () => {
      if (!wallId) {
        setSnapLinesRelative([])
        return
      }
      const info = plannerApi.getWallsSnappingInfo(viewerId, wallId)
      if (info) {
        setSnapLinesRelative(info.snapLines)
      }
    }
    plannerApi.addWallGraphObserver(updateInfo)
    plannerApi.addCameraObserver(viewerId, updateInfo)
    plannerApi.addViewerUIObserver(viewerId, updateInfo)
    updateInfo()
    return () => {
      plannerApi.removeWallGraphObserver(updateInfo)
      plannerApi.removeCameraObserver(viewerId, updateInfo)
      plannerApi.removeViewerUIObserver(viewerId, updateInfo)
    }
  }, [wallId, plannerApi, viewerId])

  const snapLinesPixels: Line2[] = snapLinesRelative.map((line) => ({
    p1: plannerApi.relativePointToPixels(viewerId, line.p1) ?? { x: 0.0, y: 0.0 },
    p2: plannerApi.relativePointToPixels(viewerId, line.p2) ?? { x: 0.0, y: 0.0 },
  }))

  return {
    snapLinesRelative,
    snapLinesPixels,
  }
}