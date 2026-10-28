import { useEffect, useMemo, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import type { WallElementProjectionInfo } from 'Planner/api_types'

export const useWallElementProjection = (elementId: string, viewerId: string) => {
  const { plannerApi } = usePlannerApi()
  const [projectionInfo, setProjectionInfo] = useState<WallElementProjectionInfo | undefined>(undefined)

  useEffect(() => {
    const updateProjection = () => {
      const projection = plannerApi.getWallElementProjection(viewerId, elementId)
      setProjectionInfo(projection)
    }
    plannerApi.addWallGraphObserver(updateProjection)
    plannerApi.addCameraObserver(viewerId, updateProjection)
    plannerApi.addViewerUIObserver(viewerId, updateProjection)
    updateProjection()
    return () => {
      plannerApi.removeWallGraphObserver(updateProjection)
      plannerApi.removeCameraObserver(viewerId, updateProjection)
    }
  }, [elementId, plannerApi, viewerId])

  const centerPixels = useMemo(() => plannerApi.relativePointToPixels(viewerId, projectionInfo?.center),
    [projectionInfo])

  const cornersPixels = useMemo(() => {
    if (!projectionInfo) {
      return undefined
    }
    return projectionInfo.corners.map(p => plannerApi.relativePointToPixels(viewerId, p))
  }, [projectionInfo])

  const intersectionsPixels = useMemo(() => {
    if (!projectionInfo) {
      return undefined
    }
    return projectionInfo.roomIntersections.map(p => plannerApi.relativePointToPixels(viewerId, p))
  }, [projectionInfo])

  const middlePointsRelative = useMemo(() => {
    if (!projectionInfo) {
      return undefined
    }
    const c1 = projectionInfo.corners[0] // Bottom-left.
    const c2 = projectionInfo.corners[1] // Top-left.
    const c3 = projectionInfo.corners[2] // Top-right.
    const c4 = projectionInfo.corners[3] // Bottom-right.

    return [
      (c1 && c2) ? { x: 0.5 * (c1.x + c2.x), y: 0.5 * (c1.y + c2.y) } : undefined, // Left.
      (c2 && c3) ? { x: 0.5 * (c2.x + c3.x), y: 0.5 * (c2.y + c3.y) } : undefined, // Top.
      (c3 && c4) ? { x: 0.5 * (c3.x + c4.x), y: 0.5 * (c3.y + c4.y) } : undefined, // Right.
      (c4 && c1) ? { x: 0.5 * (c4.x + c1.x), y: 0.5 * (c4.y + c1.y) } : undefined, // Bottom.
    ]
  }, [projectionInfo])

  const distancePointsRelative = useMemo(() => {
    if (!middlePointsRelative || !projectionInfo) {
      return undefined
    }
    const l = middlePointsRelative[0]
    const t = middlePointsRelative[1]
    const r = middlePointsRelative[2]
    const b = middlePointsRelative[3]

    const tInt = projectionInfo.roomIntersections[0]
    const bInt = projectionInfo.roomIntersections[1]
    const lInt = projectionInfo.roomIntersections[2]
    const rInt = projectionInfo.roomIntersections[3]

    return [
      (l && lInt) ? { x: 0.5 * (l.x + lInt.x), y: 0.5 * (l.y + lInt.y) } : undefined, // Left.
      (r && rInt) ? { x: 0.5 * (r.x + rInt.x), y: 0.5 * (r.y + rInt.y) } : undefined, // Right.
      (t && tInt) ? { x: 0.5 * (t.x + tInt.x), y: 0.5 * (t.y + tInt.y) } : undefined, // Top.
      (b && bInt) ? { x: 0.5 * (b.x + bInt.x), y: 0.5 * (b.y + bInt.y) } : undefined, // Bottom.
    ]

  }, [middlePointsRelative])

  const middlePointsPixels = useMemo(() => {
    if (!middlePointsRelative) {
      return undefined
    }
    return middlePointsRelative.map(p => plannerApi.relativePointToPixels(viewerId, p))
  }, [middlePointsRelative])

  const distancePointsPixels = useMemo(() => {
    if (!distancePointsRelative) {
      return undefined
    }
    return distancePointsRelative.map(p => plannerApi.relativePointToPixels(viewerId, p))
  }, [distancePointsRelative])

  return {
    centerRelative: projectionInfo?.center,
    cornersRelative: projectionInfo?.corners,
    intersectionsRelative: projectionInfo?.roomIntersections,
    centerPixels,
    cornersPixels,
    intersectionsPixels,
    middlePointsRelative,
    middlePointsPixels,
    distancePointsRelative,
    distancePointsPixels,
    backFacing: projectionInfo?.backFacing || false,
    isHovered: projectionInfo?.isHovered || false,
    isSelected: projectionInfo?.isSelected || false,
    isDragged: projectionInfo?.isDragged || false,
    verticalDraggingAxisState: projectionInfo?.verticalDraggingAxisState || false,
    horizontalDraggingAxisState: projectionInfo?.horizontalDraggingAxisState || false
  }
}