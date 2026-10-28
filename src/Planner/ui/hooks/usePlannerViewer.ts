import { useState, useEffect, useCallback } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { ViewerErrorObserver, CameraViewName, Vector2Like, ViewerState } from 'Planner/api_types'

export const usePlannerViewer = (viewerId: string, errorHandler?: ViewerErrorObserver) => {
  const { plannerApi } = usePlannerApi()
  const [viewerState, setViewerState] = useState(plannerApi.getViewerState(viewerId))

  useEffect(() => {
    const observer = (newState: ViewerState) => setViewerState(newState)
    plannerApi.addViewerStateOserver(viewerId, observer)
    if (errorHandler) {
      plannerApi.addViewerErrorObserver(viewerId, errorHandler)
    }
    return () => {
      plannerApi.removeViewerStateObserver(viewerId, observer)
      if (errorHandler) {
        plannerApi.removeViewerErrorObserver(viewerId, errorHandler)
      }
    }
  }, [viewerId])

  const setTopDownCameraView = useCallback((animate = false) =>
    plannerApi.setTopDownCameraView(viewerId, animate), [viewerId])
  const setDollhouseCameraView = useCallback((animate = false) =>
    plannerApi.setDollhouseCameraView(viewerId, animate), [viewerId])
  const setCameraView = useCallback((viewName: CameraViewName, animate = false) =>
    plannerApi.setCameraView(viewerId, viewName, animate), [viewerId])

  const startMoveWallScreenSpace = useCallback((wallId: string, relativePoint: Vector2Like) => 
    plannerApi.startMoveWallScreenSpace(viewerId, wallId, relativePoint), [viewerId])
  const stopMoveWallScreenSpace = useCallback(() => 
    plannerApi.stopMoveWallScreenSpace(viewerId), [viewerId])
  const moveWallInScreenSpace = useCallback((wallId: string, toRelative: Vector2Like) => 
    plannerApi.moveWallInScreenSpace(viewerId, wallId, toRelative), [viewerId])

  const moveVertexInScreenSpace = useCallback((vertexId: string, toRelative: Vector2Like) => 
    plannerApi.moveVertexInScreenSpace(viewerId, vertexId, toRelative), [viewerId])
  const moveWallElementInScreenSpace = useCallback((elementId: string, toRelative: Vector2Like) => 
    plannerApi.moveWallElementInScreenSpace(viewerId, elementId, toRelative), [viewerId])

  const refreshCameraView = useCallback(() => plannerApi.refreshCameraView(viewerId), [viewerId])
  const setWallsInteractive = useCallback((enable: boolean) => 
    plannerApi.setWallsInteractive(viewerId, enable), [viewerId])
  const setWallElementsInteractive = useCallback((enable: boolean) =>
    plannerApi.setWallElementsInteractive(viewerId, enable), [viewerId])
  const getWallsInteractive = useCallback(() => plannerApi.getWallsInteractive(viewerId), [viewerId])
  const getWallElementsInteractive = useCallback(() => plannerApi.getWallElementsInteractive(viewerId), [viewerId])
  const forceHoverWallElement = useCallback((elementId: string | null) =>
    plannerApi.forceHoverWallElement(viewerId, elementId), [viewerId])
  const forceSelectedWallElement = useCallback((elementId: string | null) =>
    plannerApi.forceSelectedWallElement(viewerId, elementId), [viewerId])
  const forceDraggedWallElement = useCallback((elementId: string | null) =>
    plannerApi.forceDraggedWallElement(viewerId, elementId), [viewerId])

  const setCameraOrbitControlsAllowed = useCallback((enable: boolean) =>
    plannerApi.setCameraOrbitControlsAllowed(viewerId, enable), [viewerId])
  const getCameraOrbitControlsAllowed = useCallback(() =>
    plannerApi.getCameraOrbitControlsAllowed(viewerId), [viewerId])

  const getSystemInfo = useCallback(() => 
    plannerApi.getViewerSystemInfo(viewerId), [viewerId])

  return {
    viewerState,
    getSystemInfo,
    setTopDownCameraView,
    setDollhouseCameraView,
    setCameraView,
    moveWallInScreenSpace,
    moveVertexInScreenSpace,
    startMoveWallScreenSpace,
    stopMoveWallScreenSpace,
    moveWallElementInScreenSpace,
    refreshCameraView,
    setWallsInteractive,
    setWallElementsInteractive,
    getWallsInteractive,
    getWallElementsInteractive,
    forceHoverWallElement,
    forceSelectedWallElement,
    forceDraggedWallElement,
    setCameraOrbitControlsAllowed,
    getCameraOrbitControlsAllowed,
  }
}