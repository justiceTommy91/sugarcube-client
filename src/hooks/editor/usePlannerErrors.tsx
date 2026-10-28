import { useEffect, useState } from 'react'

import * as tracker from 'utils/tracker'

import { usePlannerViewer } from 'Planner/ui/hooks/usePlannerViewer'
import { usePlannerApiState } from 'Planner/ui/hooks/usePlannerApiState'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'
import {
  ERROR_WEBGL_CONTEXT_LOST,
  API_INITIALIZED,
  API_INITIALIZATION_ERROR,
  VIEWER_INITIALIZATION_ERROR,
  VIEWER_INITIALIZED,
  ERROR_ACQUIRING_WEBGL_CONTEXT,
  API_INITIALIZING,
  VIEWER_INITIALIZING,
} from 'Planner/api_constants'

import type { LowPerformanceCause } from 'models/renderer/constants'
import { PreviewErrorTypeTracking } from 'models/preview/constants'

export const usePlannerErrors = (viewerId: string) => {
  const [isLowPerformanceDevice, setIsLowPerformanceDevice] = useState(false)
  const [failedToAcquireContext, setFailedToAcquireContext] = useState(false)
  const [webGlContextLost, setWebGlContextLost] = useState(false)
  const plannerTrackingInfo = usePlannerTrackingInfo()

  const errorHandler = (defaultErrorTitle: string) => ((error: unknown) => {
    let errMessage = ''
    let errCause = ''
    let trackingTitle = defaultErrorTitle
    if (error instanceof Error) {
        errMessage = `${error.name}: ${error.message}`
        if (typeof error.cause === 'string' || error.cause instanceof String) {
            errCause = String(error.cause)
        }
        if (error.message === ERROR_WEBGL_CONTEXT_LOST) {
          trackingTitle = 'WebglContextLost'
          setWebGlContextLost(true)
        }
        if (error.message === ERROR_ACQUIRING_WEBGL_CONTEXT) {
          setFailedToAcquireContext(true)
        }
    } else if (typeof error === 'string' || error instanceof String) {
        errMessage = String(error)
    }
    tracker.error(`RoomBuilder.${trackingTitle}`, {
      ...plannerTrackingInfo,
      ErrorMessage: errMessage,
      ErrorCause: errCause,
    })
  })

  const apiState = usePlannerApiState(errorHandler('InitError'))
  const { viewerState, getSystemInfo } = usePlannerViewer(viewerId, errorHandler('ViewerError'))

  useEffect(() => {
    if (apiState === API_INITIALIZING || viewerState === VIEWER_INITIALIZING) {
      setIsLowPerformanceDevice(false)
      setFailedToAcquireContext(false)
    }
    if (apiState === API_INITIALIZED || apiState === API_INITIALIZATION_ERROR ||
      viewerState === VIEWER_INITIALIZED || viewerState === VIEWER_INITIALIZATION_ERROR) {
        const systemInfo = getSystemInfo()
        if (systemInfo) {
          setIsLowPerformanceDevice(systemInfo.software)
          if (systemInfo.software) {
            tracker.error(`RoomBuilder.ViewerError`, {
              ...plannerTrackingInfo,
              ErrorType: PreviewErrorTypeTracking.LowPerformanceDevice,
            })
          }
        }
      }
  }, [apiState, viewerState, getSystemInfo])

  const showLowPerformanceDialog = failedToAcquireContext || isLowPerformanceDevice || webGlContextLost
  let lowPerformanceCause: LowPerformanceCause = 'low-performance-device'
  if (failedToAcquireContext) {
    lowPerformanceCause = 'low-graphics-memory'
  }
  if (webGlContextLost) {
    lowPerformanceCause = 'too-many-context-losses'
  }
  return {
    showLowPerformanceDialog,
    lowPerformanceCause,
  }
}