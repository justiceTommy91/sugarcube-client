import { useCallback, useEffect, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'

export const useCompositionItem = (itemId: string) => {
  const { plannerApi } = usePlannerApi()
  const [info, setInfo] = useState(plannerApi?.getCompositionItemInfo(itemId) || undefined)

  const updateInfo = useCallback(() => {
    setInfo(plannerApi.getCompositionItemInfo(itemId))
  }, [itemId])

  useEffect(() => {
    updateInfo()
    plannerApi.addWallGraphObserver(updateInfo)
    return () => plannerApi.removeWallGraphObserver(updateInfo)
  }, [itemId])

  return {
    worldPosition: info?.worldPosition,
    worldCorners: info?.corners || [],
  }
}