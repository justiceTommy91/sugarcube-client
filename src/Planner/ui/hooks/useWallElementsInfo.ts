import { useEffect, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { usePlannerApiState } from 'Planner/ui/hooks/usePlannerApiState'
import { WallElementInfo } from 'Planner/api_types'

export const useWallElementsInfo = () => {
  const { plannerApi } = usePlannerApi()
  const apiState = usePlannerApiState()
  const [elementsInfo, setElementsInfo] = useState<WallElementInfo[]>(plannerApi.getAllWallElementsInfo() || [])

  useEffect(() => {
    const updateInfo = () => {
      const info = plannerApi.getAllWallElementsInfo()
      if (info) {
        setElementsInfo(info)
      }
    }
    plannerApi.addWallGraphObserver(updateInfo)
    return () => plannerApi.removeWallGraphObserver(updateInfo)
  }, [apiState])

  return elementsInfo
}