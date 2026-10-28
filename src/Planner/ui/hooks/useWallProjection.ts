import { useEffect, useMemo, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import type { Vector2Like } from 'Planner/api_types'

export const useWallProjection = (wallId: string, viewerId: string) => {
  const { plannerApi } = usePlannerApi()
  
  const [vertex1Relative, setVertex1] = useState<Vector2Like | undefined>(undefined)
  const [vertex2Relative, setVertex2] = useState<Vector2Like | undefined>(undefined)
  const [isSelected, setIsSelected] = useState(false)

  useEffect(() => {
    const updateWallProjection = () => {
      const wallProjection = plannerApi.getWallProjection(viewerId, wallId)
      if (!wallProjection) {
        return
      }
      setVertex1(wallProjection.vertex1)
      setVertex2(wallProjection.vertex2)
      setIsSelected(wallProjection.isSelected)
    }
    plannerApi.addWallGraphObserver(updateWallProjection)
    plannerApi.addCameraObserver(viewerId, updateWallProjection)
    plannerApi.addViewerUIObserver(viewerId, updateWallProjection)
    updateWallProjection()
    return () => {
      plannerApi.removeWallGraphObserver(updateWallProjection)
      plannerApi.removeCameraObserver(viewerId, updateWallProjection)
      plannerApi.removeViewerUIObserver(viewerId, updateWallProjection)
    }
  }, [wallId, plannerApi, viewerId])

  const middlePointRelative = useMemo(() => {
    const v1x = vertex1Relative?.x || 0.0
    const v1y = vertex1Relative?.y || 0.0
    const v2x = vertex2Relative?.x || 0.0
    const v2y = vertex2Relative?.y || 0.0

    const result: Vector2Like = {
      x: 0.5 * (v1x + v2x),
      y: 0.5 * (v1y + v2y),
    }
    return result
  }, [vertex1Relative, vertex2Relative])

  const vertex1Pixels = useMemo(() => plannerApi.relativePointToPixels(viewerId, vertex1Relative),
    [vertex1Relative])
  const vertex2Pixels = useMemo(() => plannerApi.relativePointToPixels(viewerId, vertex2Relative),
    [vertex2Relative])
  const middlePointPixels = useMemo(() => plannerApi.relativePointToPixels(viewerId, middlePointRelative),
    [middlePointRelative])

  return {
    vertex1Relative,
    vertex2Relative,
    middlePointRelative,
    vertex1Pixels,
    vertex2Pixels,
    middlePointPixels,
    isSelected,
  }
}