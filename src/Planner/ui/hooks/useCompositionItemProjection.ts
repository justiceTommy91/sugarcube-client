import { useEffect, useMemo, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import type { CompositionItemProjectionInfo } from 'Planner/api_types'

export const useCompositionItemProjection = (elementId: string, viewerId: string) => {
  const { plannerApi } = usePlannerApi()
  const [projectionInfo, setProjectionInfo] = useState<CompositionItemProjectionInfo | undefined>(undefined)

  useEffect(() => {
    const updateProjection = () => {
      const projection = plannerApi.getCompositionItemProjection(viewerId, elementId)
      setProjectionInfo(projection)
    }
    plannerApi.addWallGraphObserver(updateProjection)
    plannerApi.addCameraObserver(viewerId, updateProjection)
    plannerApi.addViewerUIObserver(viewerId, updateProjection)
    updateProjection()
    return () => {
      plannerApi.removeViewerUIObserver(viewerId, updateProjection)
      plannerApi.removeCameraObserver(viewerId, updateProjection)
      plannerApi.removeWallGraphObserver(updateProjection)
    }
  }, [elementId, plannerApi, viewerId])

  const positionPixels = useMemo(() => plannerApi.relativePointToPixels(viewerId, projectionInfo?.position) ||
    { x: 0, y: 0 },
    [projectionInfo])

  const cornersPixels = useMemo(() => {
    if (!projectionInfo) {
      return undefined
    }
    return projectionInfo.corners.map(p => plannerApi.relativePointToPixels(viewerId, p) || { x: 0, y: 0 })
  }, [projectionInfo])

  const rectRelative = useMemo(() => {
    if (!projectionInfo) {
      return undefined
    }
    const top = Math.min(...projectionInfo.corners.map(c => c?.y ?? 0))
    const bottom = Math.max(...projectionInfo.corners.map(c => c?.y ?? 0))
    const left = Math.min(...projectionInfo.corners.map(c => c?.x ?? 0))
    const right = Math.max(...projectionInfo.corners.map(c => c?.x ?? 0))
    return {
      top,
      bottom,
      left,
      right,
    }
  }, [projectionInfo])

  const rectPixels = useMemo(() => {
    if (!cornersPixels) {
      return undefined
    }
    const top = Math.min(...cornersPixels.map(c => c?.y ?? 0))
    const bottom = Math.max(...cornersPixels.map(c => c?.y ?? 0))
    const left = Math.min(...cornersPixels.map(c => c?.x ?? 0))
    const right = Math.max(...cornersPixels.map(c => c?.x ?? 0))
    return {
      top,
      bottom,
      left,
      right,
    }
  }, [cornersPixels])

  return {
    positionRelative: projectionInfo?.position,
    cornersRelative: projectionInfo?.corners,
    positionPixels,
    cornersPixels,
    rectRelative,
    rectPixels,
    isHovered: projectionInfo?.isHovered || false,
    isSelected: projectionInfo?.isSelected || false,
    isDragged: projectionInfo?.isDragged || false,
  }
}