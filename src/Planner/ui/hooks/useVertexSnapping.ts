import { useEffect, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import type { Line2 } from 'Planner/api_types'

export const useVertexSnapping = (vertexId: string | undefined | null, viewerId: string) => {
  const { plannerApi } = usePlannerApi()

  const [snapLinesRelative, setSnapLinesRelative] = useState<Line2[]>([])
  const [angleSnapsRelative, setAngleSnapsRelative] = useState<{
    line1: Line2
    line2: Line2
    isOnVertex: boolean
  }[]>([])
  const [parallelSnapsRelative, setParallelSnapsRelative] = useState<{ line1: Line2, line2: Line2 }[]>([])

  useEffect(() => {
    const updateInfo = () => {
      if (!vertexId) {
        setSnapLinesRelative([])
        setAngleSnapsRelative([])
        setParallelSnapsRelative([])
        return
      }
      const info = plannerApi.getVertexSnappingInfo(viewerId, vertexId)
      if (info) {
        setSnapLinesRelative(info.snapLines)
        setAngleSnapsRelative(info.snapAngles)
        setParallelSnapsRelative(info.snapParallels)
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
  }, [vertexId, plannerApi, viewerId])

  const snapLinesPixels: Line2[] = snapLinesRelative.map((line) => ({
    p1: plannerApi.relativePointToPixels(viewerId, line.p1) ?? { x: 0.0, y: 0.0 },
    p2: plannerApi.relativePointToPixels(viewerId, line.p2) ?? { x: 0.0, y: 0.0 },
  }))

  const angleSnapsPixels: { line1: Line2, line2: Line2, isOnVertex: boolean }[] = angleSnapsRelative.map((pair) => ({
    line1: {
      p1: plannerApi.relativePointToPixels(viewerId, pair.line1.p1) ?? { x: 0.0, y: 0.0 },
      p2: plannerApi.relativePointToPixels(viewerId, pair.line1.p2) ?? { x: 0.0, y: 0.0 },
    },
    line2: {
      p1: plannerApi.relativePointToPixels(viewerId, pair.line2.p1) ?? { x: 0.0, y: 0.0 },
      p2: plannerApi.relativePointToPixels(viewerId, pair.line2.p2) ?? { x: 0.0, y: 0.0 },
    },
    isOnVertex: pair.isOnVertex,
  }))

  const parallelSnapsPixels: { line1: Line2, line2: Line2 }[] = parallelSnapsRelative.map((pair) => ({
    line1: {
      p1: plannerApi.relativePointToPixels(viewerId, pair.line1.p1) ?? { x: 0.0, y: 0.0 },
      p2: plannerApi.relativePointToPixels(viewerId, pair.line1.p2) ?? { x: 0.0, y: 0.0 },
    },
    line2: {
      p1: plannerApi.relativePointToPixels(viewerId, pair.line2.p1) ?? { x: 0.0, y: 0.0 },
      p2: plannerApi.relativePointToPixels(viewerId, pair.line2.p2) ?? { x: 0.0, y: 0.0 },
    },
  }))

  return {
    snapLinesRelative,
    snapLinesPixels,
    angleSnapsRelative,
    angleSnapsPixels,
    parallelSnapsRelative,
    parallelSnapsPixels,
  }
}