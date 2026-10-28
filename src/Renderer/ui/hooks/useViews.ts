import { useEffect, useState } from 'react'
import { getGrandCentral } from 'Renderer/GrandCentral'
import * as gv from 'Renderer/geomviewer'

type ViewportInfo = { id: string; name: string }

// Hook for getting a list of available views in the loaded scene.
export function useViews() {
  const [views, setViews] = useState<ViewportInfo[]>([])

  useEffect(() => {
    const updateViews = () => {
      const viewerInfo = gv.GeomViewer.bindings?.queryViewerInfo()
      if (viewerInfo?.views) {
        setViews(viewerInfo.views.map((view) => ({ id: view, name: view })))
      }
    }
    const gc = getGrandCentral()
    const observer = (notification: gv.ViewerStateUpdateNotification) => {
      if (notification.payload.stateInfo === 'ViewerReady') updateViews()
    }
    updateViews()
    gc.addObserver(gv.NOTIFY_VIEWER_STATE_UPDATE, observer as gv.NotificationObserver)
    return () => gc.removeObserver(observer as gv.NotificationObserver)
  }, [])

  return views
}
