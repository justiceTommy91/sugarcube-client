import { useEffect, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { usePlannerApiState } from 'Planner/ui/hooks/usePlannerApiState'
import { WallInfo } from 'Planner/api_types'

export const useRoomWallsInfo = () => {
  const { plannerApi } = usePlannerApi()
  const apiState = usePlannerApiState()
  const [wallsInfo, setWallsInfo] = useState<WallInfo[]>(plannerApi.getAllWallsInfo() || [])

  useEffect(() => {
    const updateInfo = () => {
      const info = plannerApi.getAllWallsInfo()
      if (info) {
        setWallsInfo(info)
      }
    }
    plannerApi.addWallGraphObserver(updateInfo)
    return () => plannerApi.removeWallGraphObserver(updateInfo)
  }, [apiState])

  return wallsInfo
}