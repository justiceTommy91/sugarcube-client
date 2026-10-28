import { useEffect, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { usePlannerApiState } from 'Planner/ui/hooks/usePlannerApiState'
import { CompositionItemInfo } from 'Planner/api_types'

export const useComposition = () => {
  const { plannerApi } = usePlannerApi()
  const apiState = usePlannerApiState()
  const [itemsInfo, setItemsInfo] = useState<CompositionItemInfo[]>(plannerApi.getAllCompositionItemsInfo() || [])

  useEffect(() => {
    const updateInfo = () => {
      const info = plannerApi.getAllCompositionItemsInfo()
      if (info) {
        setItemsInfo(info)
      }
    }
    plannerApi.addWallGraphObserver(updateInfo)
    return () => plannerApi.removeWallGraphObserver(updateInfo)
  }, [apiState])

  return itemsInfo
}