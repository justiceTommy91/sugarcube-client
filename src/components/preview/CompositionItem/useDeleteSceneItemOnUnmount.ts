import { useEffect } from 'react'
import { GeomViewer } from 'Renderer/geomviewer'

export function useDeleteSceneItemOnUnmount(uniqueId: number) {
    useEffect(() => () => {
        GeomViewer.bindings?.deleteSceneItem(String(uniqueId))
    }, [uniqueId])
}
