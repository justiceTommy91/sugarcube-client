import React, {
  PropsWithChildren,
  useMemo,
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  useCallback
} from 'react'
import * as gv from 'Renderer/geomviewer'
import { getGrandCentral } from 'Renderer/GrandCentral'
import type { CompositionExport, SceneInfo, PersistUserData } from 'Renderer/geomviewer/geom_types'
import {
  NOTIFY_VIEWER_STATE_UPDATE,
  NOTIFY_CAMERA_TRANSFORM_UPDATE,
  NOTIFY_GPU_STATS,
} from 'Renderer/geomviewer/geom_constants'
import { StartupWarden, SCENE_BUILD_COMPLETE } from 'Renderer/StartupWarden'
import useResizableCanvas from '../hooks/useResizableCanvas'
import { defaultDebugSettings, defaultViewerSettings } from '../settings'

export type ViewerContextProps = {
  scene: SceneInfo | undefined
  viewerSettings: gv.ViewerSettings | undefined
  debugSettings: gv.DebugSettings | undefined
  persistUserData?: PersistUserData
  onSaveDataUpdate?: (userProps: PersistUserData) => void
  onInitialized?: () => void
  onContextLost?: (evt: Event) => void
  onContextRestored?: (evt: Event) => void
  onContextCreationError?: (evt: WebGLContextEvent) => void
  // Change to force a canvas remount and a startViewer re-fire.
  externalRestartKey?: string
}

type ViewerContextState = {
  canvasRef: React.RefCallback<HTMLCanvasElement>
  containerRef: React.RefCallback<HTMLDivElement>
  canvasElement: HTMLCanvasElement | null
  canvasDimensions: { width: number, height: number }
  compositionState: CompositionExport | null
  viewerApi: gv.GeomViewerType | undefined
  isViewerReady: boolean
  isSceneReady: boolean
  /**
   * Bumps when the viewer needs to restart (e.g. WebGL context loss recovery).
   *
   * **Contract:** any component that renders the canvas under this provider
   * MUST pass this value as the React `key` of the `<canvas>` element.
   * Without it, WebGL context loss recovery will silently stop working.
   */
  restartKey: number
  refreshCompositionState: () => void
}

const ViewerPropsContext = createContext<ViewerContextState>({
  canvasRef: () => { },
  containerRef: () => { },
  canvasElement: null,
  canvasDimensions: { width: 0, height: 0 },
  compositionState: null,
  viewerApi: undefined,
  isViewerReady: false,
  isSceneReady: false,
  restartKey: 0,
  refreshCompositionState: () => { }
})

export const useViewerContext = () => useContext(ViewerPropsContext)

// Exclude the high-frequency camera and GPU-telemetry notifications so composition
// consumers don't re-render on every orbit, pan, or stats tick.
// eslint-disable-next-line no-bitwise
const NON_COMPOSITION_NOTIFICATIONS = NOTIFY_VIEWER_STATE_UPDATE | NOTIFY_CAMERA_TRANSFORM_UPDATE | NOTIFY_GPU_STATS
// eslint-disable-next-line no-bitwise
const COMPOSITION_NOTIFICATION_MASK = 0xFFFFFFFF & ~NON_COMPOSITION_NOTIFICATIONS

/**
 * ViewerContext manages the GeomViewer lifecycle and provides 
 * context for Viewport components.
 *
 * It handles:
 * - GeomViewer initialization and shutdown
 * - Canvas setup and event handling
 * - Settings updates (viewerSettings, debugSettings)
 * - Composition state tracking
 */
export const ViewerContext = ({
  children,
  scene,
  viewerSettings,
  debugSettings,
  persistUserData,
  onSaveDataUpdate,
  onInitialized,
  onContextLost,
  onContextRestored,
  onContextCreationError,
  externalRestartKey
}: PropsWithChildren<ViewerContextProps>) => {

  const { canvasRef, containerRef, canvasDimensions, canvasElement } = useResizableCanvas()
  // Tracks which canvas element the viewer was last started on. Used as a guard
  // to prevent calling startViewer() twice on the same element.
  const startedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  // Flag exposed via context to signal the viewer is ready for interaction.
  const [isViewerReady, setIsViewerReady] = useState(false)
  // Skips the initial mount render, replicating componentDidUpdate semantics.
  // Prevents startViewer from firing on a transient mount that is unmounted
  // before the next commit (e.g. when a parent wrapper component changes type).
  const [mountStable, setMountStable] = useState(false)
  // Ref for onInitialized to decouple it from effect dependency arrays.
  // The callback may be an unstable reference (e.g. inline arrow from
  // mapDispatchToProps) whose identity changes on every parent render.
  const onInitializedRef = useRef(onInitialized)
  onInitializedRef.current = onInitialized
  const [isSceneReady, setIsSceneReady] = useState(false)
  const [compositionState, setCompositionState] = useState<CompositionExport | null>(null)
  const [restartKey, setRestartKey] = useState(0)

  // Stable refs for external callbacks so the listener effect below does not
  // depend on potentially unstable prop references.
  const onContextLostRef = useRef(onContextLost)
  onContextLostRef.current = onContextLost
  const onContextRestoredRef = useRef(onContextRestored)
  onContextRestoredRef.current = onContextRestored
  const onContextCreationErrorRef = useRef(onContextCreationError)
  onContextCreationErrorRef.current = onContextCreationError

  const triggerRestart = useCallback(() => {
    setIsViewerReady(false)
    setIsSceneReady(false)
    setRestartKey(k => k + 1)
  }, [])

  // If an externalRestartKey is wired in, that path drives the canvas remount via the
  // effect below; bumping locally too would remount twice and tear down startViewer
  // mid-init. Reset the readiness flags either way so the loading UI shows immediately.
  const externalRestartKeyRef = useRef(externalRestartKey)
  externalRestartKeyRef.current = externalRestartKey
  const handleContextLost = useCallback((evt: Event) => {
    onContextLostRef.current?.(evt)
    setIsViewerReady(false)
    setIsSceneReady(false)
    if (externalRestartKeyRef.current === undefined) {
      setRestartKey(k => k + 1)
    }
  }, [])

  // Skip the initial render so a stable mount does not self-restart.
  const isFirstExternalKeyRef = useRef(true)
  useEffect(() => {
    if (isFirstExternalKeyRef.current) {
      isFirstExternalKeyRef.current = false
      return
    }
    triggerRestart()
  }, [externalRestartKey, triggerRestart])

  const setCompositionStateFromViewerAPI = useCallback(() => {
    const exportedComposition = gv.GeomViewer?.bindings?.exportComposition()
    setCompositionState(exportedComposition ?? null)
  }, [])

  // Initialize GeomViewer library on mount.
  useEffect(() => {
    if (!gv.GeomViewer?.bindings) {
      gv.initGeomViewerLib()
    }

    return () => {
      gv.GeomViewer?.bindings?.shutdownViewer()
      startedCanvasRef.current = null
      setIsViewerReady(false)
    }
  }, [])

  // Ideally the viewer API would be robust to rapid start/stop cycles, but
  // internally it uses complex async chains to load heavy resources (scene
  // building, asset downloading, camera initialization) that are not
  // cancellable. Rather than making that entire pipeline robust to
  // interruption, we replicate the legacy class component's
  // componentDidUpdate semantics here: skip the initial mount so that
  // transient mounts never call startViewer. The setMountStable(true) call
  // is batched by React with any other setState calls from the same effect
  // flush, so if this instance is unmounted in that commit the update is
  // discarded and startViewer never fires.
  useEffect(() => { setMountStable(true) }, [])

  // Start viewer when canvas and scene are ready.
  useEffect(() => {
    if (startedCanvasRef.current !== canvasElement && mountStable && canvasElement && gv.GeomViewer.bindings && scene) {
      startedCanvasRef.current = canvasElement

      gv.GeomViewer.bindings.startViewer(
        canvasElement,
        scene,
        persistUserData ?? {},
        viewerSettings ?? defaultViewerSettings,
        debugSettings ?? defaultDebugSettings,
        onSaveDataUpdate ?? (() => { })
      )

      setCompositionStateFromViewerAPI()
      setIsViewerReady(true)
    }

    return undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountStable, canvasElement, scene, persistUserData, viewerSettings, debugSettings,
     onSaveDataUpdate, setCompositionStateFromViewerAPI])

  // Attach WebGL context event listeners independently of the start-viewer
  // lifecycle. Two reasons this lives in its own effect:
  //   1. The start-viewer effect's dependency list includes settings props
  //      that change during normal operation; if the listeners lived there,
  //      every settings change would remove them (via cleanup) and never
  //      re-add them (because the startedCanvasRef guard prevents re-entry).
  //   2. Listeners should be attached BEFORE startViewer creates the GL
  //      context, so this is intentionally NOT gated on isViewerReady.
  //      A canvas without a GL context never fires these events, so attaching
  //      early is harmless; attaching late risks missing an event in the
  //      window between startViewer() and the next render commit.
  useEffect(() => {
    if (!canvasElement) return undefined

    const onRestored = (evt: Event) => onContextRestoredRef.current?.(evt)
    const onCreationError = (evt: Event) => onContextCreationErrorRef.current?.(evt as WebGLContextEvent)

    canvasElement.addEventListener('webglcontextlost', handleContextLost, false)
    canvasElement.addEventListener('webglcontextrestored', onRestored, false)
    canvasElement.addEventListener('webglcontextcreationerror', onCreationError as EventListener, false)

    return () => {
      canvasElement.removeEventListener('webglcontextlost', handleContextLost, false)
      canvasElement.removeEventListener('webglcontextrestored', onRestored, false)
      canvasElement.removeEventListener('webglcontextcreationerror', onCreationError as EventListener, false)
    }
  }, [canvasElement, handleContextLost])

  // Call onInitialized immediately after startViewer, matching legacy Preview
  // behaviour. Composition items are gated by isSceneReady (not by
  // onInitialized timing), so this is safe to fire early. Uses a ref so
  // that unstable callback references from the parent don't re-trigger.
  useEffect(() => {
    if (isViewerReady) {
      onInitializedRef.current?.()
    }
  }, [isViewerReady])

  // Track scene build completion for isSceneReady context value.
  useEffect(() => {
    if (!isViewerReady) return undefined
    const onSceneReady = () => setIsSceneReady(true)
    StartupWarden.getCurrentInstance()?.registerCallback(SCENE_BUILD_COMPLETE, onSceneReady)
    return () => {
      StartupWarden.getCurrentInstance()?.unregisterCallback(SCENE_BUILD_COMPLETE, onSceneReady)
    }
  }, [isViewerReady])

  // Update viewer settings when they change.
  useEffect(() => {
    if (isViewerReady && viewerSettings) {
      gv.GeomViewer?.bindings?.changeViewerSettings(viewerSettings)
    }
  }, [viewerSettings, isViewerReady])

  // Update debug settings when they change.
  useEffect(() => {
    if (isViewerReady && debugSettings) {
      gv.GeomViewer?.bindings?.changeDebugSettings(debugSettings)
    }
  }, [debugSettings, isViewerReady])

  // Subscribe to GrandCentral notifications for composition state updates.
  useEffect(() => {
    const gc = getGrandCentral()
    const observer = () => {
      setCompositionStateFromViewerAPI()
    }
    gc.addObserver(COMPOSITION_NOTIFICATION_MASK, observer as gv.NotificationObserver)

    return () => {
      gc.removeObserver(observer as gv.NotificationObserver)
    }
  }, [setCompositionStateFromViewerAPI])

  const contextValue = useMemo(() => ({
    canvasRef,
    containerRef,
    canvasElement,
    canvasDimensions,
    compositionState,
    viewerApi: gv.GeomViewer?.bindings,
    isViewerReady,
    isSceneReady,
    restartKey,
    refreshCompositionState: setCompositionStateFromViewerAPI
  }), [
    canvasRef,
    containerRef,
    canvasElement,
    canvasDimensions,
    compositionState,
    isViewerReady,
    isSceneReady,
    restartKey,
    setCompositionStateFromViewerAPI])

  return (
    <ViewerPropsContext.Provider value={contextValue}>
      {children}
    </ViewerPropsContext.Provider>
  )
}
