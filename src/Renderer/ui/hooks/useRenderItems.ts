import { useMemo } from 'react'
import { useViewerContext } from '../components/ViewerContext'

export function useRenderItems() {
  const { compositionState } = useViewerContext()
  return useMemo(() => compositionState?.renderItems, [compositionState])
}
