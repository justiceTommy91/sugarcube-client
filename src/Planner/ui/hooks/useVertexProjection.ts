import { useEffect, useMemo, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import type { Vector2Like, VertexProjectionInfo } from 'Planner/api_types'

export const useVertexProjection = (vertexId: string, viewerId: string) => {
  const { plannerApi } = usePlannerApi()

  const [positionRelative, setPositionRelative] = useState<Vector2Like | undefined>(undefined)
  const [vertexInfo, setVertexInfo] = useState<VertexProjectionInfo | undefined>(undefined)

  useEffect(() => {
    const updateProjection = () => {
      const vertexProjection = plannerApi.getVertexProjection(viewerId, vertexId)
      setVertexInfo(vertexProjection)
      if (vertexProjection) {
        setPositionRelative(vertexProjection.position)
      }
    }
    plannerApi.addWallGraphObserver(updateProjection)
    plannerApi.addCameraObserver(viewerId, updateProjection)
    plannerApi.addViewerUIObserver(viewerId, updateProjection)
    updateProjection()
    return () => {
      plannerApi.removeWallGraphObserver(updateProjection)
      plannerApi.removeCameraObserver(viewerId, updateProjection)
      plannerApi.removeViewerUIObserver(viewerId, updateProjection)
    }
  }, [vertexId, plannerApi, viewerId])

  const positionPixels = useMemo(() => plannerApi.relativePointToPixels(viewerId, positionRelative),
    [vertexId, positionRelative])

  return {
    positionRelative,
    positionPixels,
    isSelected: vertexInfo?.isSelected ?? false,
  }
}