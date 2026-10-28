import { useCallback, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import {
  WALL_ELEMENT_ASSET_STATUS_LOADING,
  WALL_ELEMENT_ASSET_STATUS_ERROR,
  WALL_ELEMENT_ASSET_STATUS_DONE,
} from 'Planner/api_constants'
import type { WallAssetLoadingStatus, WallElementSize, TemplateWallElementType } from 'Planner/api_types'
import { GLTf } from 'Renderer/gltf/gltf'

type AssetLoadState = {
  uuid: string
  promise: Promise<string>
  status: WallAssetLoadingStatus
  error: Error | null
}

type ReadyElement = {
  uuid: string
  elementId: string
}

export const useWallElementAssets = () => {
  const { plannerApi } = usePlannerApi()
  const [loadStates, setLoadStates] = useState<AssetLoadState[]>([])
  const [readyElements, setReadyElements] = useState<ReadyElement[]>([])

  const handleAssetLoadingState = useCallback((uuid: string, prevStates: AssetLoadState[],
    loadingPromise: Promise<string>) => {
    const prevIdx = prevStates.findIndex(s => s.uuid === uuid)
    const loadState: AssetLoadState = {
      uuid,
      promise: loadingPromise,
      status: WALL_ELEMENT_ASSET_STATUS_LOADING,
      error: null
    }
    const newStates = [...prevStates]
      if (prevIdx !== -1) {
        newStates[prevIdx] = loadState
      } else {
        newStates.push(loadState)
      }

    loadingPromise.then((result) => {
      setLoadStates(currentStates =>
        currentStates.map(s => s.uuid === uuid ? { ...s, status: WALL_ELEMENT_ASSET_STATUS_DONE } : s)
      )
      setReadyElements([...readyElements, { uuid, elementId: result }])
    }).catch((err) => {
      setLoadStates(currentStates =>
        currentStates.map(s => s.uuid === uuid ? { ...s, status: WALL_ELEMENT_ASSET_STATUS_ERROR, error: err } : s)
      )
    })
    return newStates
  }, [])

  const addWallElementFromGltfObject = useCallback((uuid: string, gltf: GLTf, baseUrl: string,
    type: TemplateWallElementType, viewerId?: string, initialSize?: WallElementSize) => {
    setLoadStates((prevStates) => {
      const promise = plannerApi.addWallElement(gltf, baseUrl, uuid, type, viewerId, initialSize)
      return handleAssetLoadingState(uuid, prevStates, promise)
    })
  },  [plannerApi, handleAssetLoadingState])

  return {
    addWallElementFromGltfObject,
    loadStates,
    readyElements,
  }
}
