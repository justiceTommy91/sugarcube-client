import { useCallback, useEffect, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'

export const useRoomWall = (wallId: string) => {
  const { plannerApi } = usePlannerApi()
  const [wallLength, setInternalWallLength] = useState(plannerApi?.getWallInfo(wallId)?.length || 0)
  const [originalLength, setInternalOriginalLength] = useState(plannerApi?.getWallInfo(wallId)?.originalLength || 0)
  const [wallColor, setWallColor] = useState<string>(plannerApi?.getWallInfo(wallId)?.color || '')

  const updateWallInfo = useCallback(() => {
    const wallInfo = plannerApi.getWallInfo(wallId)
    if (!wallInfo) {
      return
    }
    setInternalWallLength(wallInfo.length)
    setInternalOriginalLength(wallInfo.originalLength)
    setWallColor(wallInfo.color)
  }, [plannerApi, wallId])

  useEffect(() => {
    updateWallInfo()
    plannerApi.addWallGraphObserver(updateWallInfo)
    return () => plannerApi?.removeWallGraphObserver(updateWallInfo)
  }, [wallId, plannerApi])

  const setWallLength = (length: number) => {
    plannerApi.setWallLength(wallId, length)
  }

  const splitWall = useCallback((distance: number) => plannerApi.splitWall(wallId, distance),
    [plannerApi, wallId])
  const testSplitWall = useCallback((distance: number) => plannerApi.testSplitWall(wallId, distance),
    [plannerApi, wallId])
  const getAutoSplitDistance = useCallback(() => plannerApi.getAutoSplitDistance(wallId),
    [plannerApi, wallId])

  return {
    wallLength,
    originalLength,
    wallColor,
    setWallLength,
    splitWall,
    testSplitWall,
    getAutoSplitDistance,
  }
}