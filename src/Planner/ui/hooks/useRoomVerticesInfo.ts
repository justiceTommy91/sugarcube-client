import { useEffect, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { usePlannerApiState } from 'Planner/ui/hooks/usePlannerApiState'
import { VertexInfo } from 'Planner/api_types'

export const useRoomVerticesInfo = () => {
  const { plannerApi } = usePlannerApi()
  const apiState = usePlannerApiState()
  const [verticesInfo, setVerticesInfo] = useState<VertexInfo[]>(plannerApi.getAllVerticesInfo() || [])

  useEffect(() => {
    const updateInfo = () => {
      const info = plannerApi.getAllVerticesInfo()
      if (info) {
        setVerticesInfo(info)
      }
    }
    plannerApi.addWallGraphObserver(updateInfo)
    return () => plannerApi.removeWallGraphObserver(updateInfo)
  }, [apiState])

  return verticesInfo
}