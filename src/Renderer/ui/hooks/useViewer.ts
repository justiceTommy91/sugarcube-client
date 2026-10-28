import { useCallback, useRef } from 'react'
import * as gv from 'Renderer/geomviewer'
import { ItemId } from '../types'
import { useViewerContext } from '../components/ViewerContext'

// Wrapper for additional viewer API
export function useViewer() {
  const { refreshCompositionState } = useViewerContext()
  const nextUniqueIdRef = useRef(Math.floor(Date.now() / 2))

  const removeProduct = useCallback((id: ItemId) => {
    gv.GeomViewer.bindings?.deleteSceneItem(id)
    refreshCompositionState()
  }, [refreshCompositionState])

  const addProduct = useCallback((params: gv.SceneItemParameters, uniqueId?: string) => {
    const id = uniqueId ?? String(nextUniqueIdRef.current)
    nextUniqueIdRef.current += 1
    return gv.GeomViewer.bindings?.addSceneItem(id, params)
  }, [])

  const snapRotateProduct = useCallback((id: ItemId) =>
    gv.GeomViewer.bindings?.modifySceneItem(id, { modifyFurnitureItem: { toNextSnapRotation: true } }), [])

  const changeSurfaces = useCallback(() =>
    gv.GeomViewer.bindings?.doAction('enter-placement-mode'), [])

  const cancelChangeSurfaces = useCallback(() =>
    gv.GeomViewer.bindings?.doAction('cancel-placement-mode'), [])

  return { removeProduct, addProduct, snapRotateProduct, changeSurfaces, cancelChangeSurfaces }
}
