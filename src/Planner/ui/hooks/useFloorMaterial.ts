import { useCallback, useState } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { MATERIAL_STATUS_LOADING, MATERIAL_STATUS_ERROR, MATERIAL_STATUS_DONE } from 'Planner/api_constants'
import type { MaterialLoadingStatus } from 'Planner/api_types'
import { GLTf } from 'Renderer/gltf/gltf'

type MaterialLoadState = {
  uuid: string
  promise: Promise<void>
  status: MaterialLoadingStatus
  error: Error | null
}

export const useFloorMaterial = () => {
  const { plannerApi } = usePlannerApi()
  const [ materialsStates, setMaterialsStates ] = useState<MaterialLoadState[]>([])

  const handleMaterialLoadingState = useCallback((uuid: string, prevStates: MaterialLoadState[],
    loadingPromise: Promise<void>) => {
    const prevIdx = prevStates.findIndex(s => s.uuid === uuid)
    const materialState: MaterialLoadState = {
      uuid,
      promise: loadingPromise,
      status: MATERIAL_STATUS_LOADING,
      error: null
    }
    const newStates = [...prevStates]
      if (prevIdx !== -1) {
        newStates[prevIdx] = materialState
      } else {
        newStates.push(materialState)
      }

    loadingPromise.then(() => {
      setMaterialsStates(currentStates =>
        currentStates.map(s => s.uuid === uuid ? { ...s, status: MATERIAL_STATUS_DONE } : s)
      )
    }).catch((err) => {
      setMaterialsStates(currentStates =>
        currentStates.map(s => s.uuid === uuid ? { ...s, status: MATERIAL_STATUS_ERROR, error: err } : s)
      )
    })
    return newStates
  }, [])

  const setMaterialFromGltfObject = useCallback((uuid: string, gltf: GLTf, baseUrl: string) => {
    setMaterialsStates((prevStates) => {
      const promise = plannerApi.setFloorMaterialFromGltfObject(uuid, gltf, baseUrl)
      return handleMaterialLoadingState(uuid, prevStates, promise)
    })
  },  [plannerApi, handleMaterialLoadingState])

  const setMaterialFromUrl = useCallback((uuid: string, gltfUrl: string) => {
    setMaterialsStates((prevStates) => {
      const promise = plannerApi.setFloorMaterialFromUrl(uuid, gltfUrl)
      return handleMaterialLoadingState(uuid, prevStates, promise)
    })
  }, [plannerApi, handleMaterialLoadingState])

  return {
    setMaterialFromUrl, setMaterialFromGltfObject, materialsStates
  }
}
