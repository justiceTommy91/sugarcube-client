import React, { PropsWithChildren, useEffect, useCallback } from 'react'
import classNames from 'classnames'
import * as gv from 'Renderer/geomviewer'
import { adaptSyntheticEventToNative, attachDocDragListeners } from 'utils/events'
import type { ViewId } from '../types'
import { useViewerContext } from './ViewerContext'

type ViewportProps = {
  view?: ViewId
  cameraMode?: gv.CameraMode
  cameraFocus?: string
  // Canvas state classes
  isItemHovered?: boolean
  isPlacementMode?: boolean
  isDragging?: boolean
  cannotPlaceStackable?: boolean
  cameraInOrbitMode?: boolean
  cameraInOrbitModeMoving?: boolean
  // Event handlers
  onCanvasClick?: (e: React.MouseEvent) => void
  onCanvasMouseEnter?: (e: React.MouseEvent) => void
  onCanvasPointerMove?: (e: React.PointerEvent) => void
  onCanvasPointerDown?: (e: React.PointerEvent) => void
  onCanvasPointerUp?: (e: React.PointerEvent) => void
  onCanvasPointerLeave?: (e: React.PointerEvent) => void
  onCanvasKeyDown?: (e: React.KeyboardEvent) => void
  onCanvasKeyUp?: (e: React.KeyboardEvent) => void
  onCanvasWheel?: (e: React.WheelEvent) => void
  canvasId?: string
  draggingRenderItemId?: number
}

const isMouseEvent = (e: React.MouseEvent | React.KeyboardEvent): e is React.MouseEvent => 'button' in e

export const Viewport = ({
  children,
  view = 'mainView',
  cameraMode = 'default',
  cameraFocus,
  isItemHovered = false,
  isPlacementMode = false,
  isDragging = false,
  cannotPlaceStackable = false,
  cameraInOrbitMode = false,
  cameraInOrbitModeMoving = false,
  onCanvasClick,
  onCanvasMouseEnter,
  onCanvasPointerMove,
  onCanvasPointerDown,
  onCanvasPointerUp,
  onCanvasPointerLeave,
  onCanvasKeyDown,
  onCanvasKeyUp,
  onCanvasWheel,
  canvasId = 'ViewportCanvas',
  draggingRenderItemId
}: PropsWithChildren<ViewportProps>) => {

  const { containerRef, canvasRef, canvasDimensions: { width, height }, canvasElement, restartKey } = useViewerContext()

  // View and camera mode
  useEffect(() => { gv.GeomViewer.bindings?.setCurrentView?.(view) }, [view])
  useEffect(() => { gv.GeomViewer.bindings?.setCameraMode?.({ mode: cameraMode, itemId: cameraFocus }) },
    [cameraMode, cameraFocus])

  // Prevent default wheel to avoid page scroll, and prevent iOS rubber-band overscroll
  // from firing pointercancel during drag gestures on the canvas.
  useEffect(() => {
    if (!canvasElement) return undefined
    const preventWheel = (e: WheelEvent) => e.preventDefault()
    const preventTouchScroll = (e: TouchEvent) => e.preventDefault()
    canvasElement.addEventListener('wheel', preventWheel, { passive: false })
    // non-passive: required so preventDefault() actually suppresses the iOS scroll/bounce
    canvasElement.addEventListener('touchmove', preventTouchScroll, { passive: false })
    return () => {
      canvasElement.removeEventListener('wheel', preventWheel)
      canvasElement.removeEventListener('touchmove', preventTouchScroll)
    }
  }, [canvasElement])

  // Default event handler that forwards to GeomViewer
  const viewerHandleUiEvent = useCallback((
    event: React.MouseEvent | React.KeyboardEvent | React.WheelEvent,
    renderItemId?: number
  ) => {
    if (isMouseEvent(event) && ['mousedown', 'pointerdown', 'mouseenter'].includes(event.type)) {
      event.stopPropagation()
      if (event.button === 1) event.preventDefault() // Middle button
    }
    if (event.type === 'mousedown' || event.type === 'pointerdown') {
      attachDocDragListeners(event.currentTarget as HTMLElement)
    }
    gv.GeomViewer.bindings?.handleUIEvent(
      adaptSyntheticEventToNative(event), renderItemId, (event as React.MouseEvent).buttons
    )
  }, [])

  const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), [])
  const preventDefault = useCallback((e: React.MouseEvent) => e.preventDefault(), [])

  // Event handlers that forward to GeomViewer then call optional callbacks
  const handleClick = useCallback((e: React.MouseEvent) => { viewerHandleUiEvent(e); onCanvasClick?.(e) }, [viewerHandleUiEvent, onCanvasClick])
  const handleMouseEnter = useCallback((e: React.MouseEvent) => { viewerHandleUiEvent(e); onCanvasMouseEnter?.(e) }, [viewerHandleUiEvent, onCanvasMouseEnter])
  const handlePointerMove = useCallback((e: React.PointerEvent) => { viewerHandleUiEvent(e); onCanvasPointerMove?.(e) }, [viewerHandleUiEvent, onCanvasPointerMove])
  const handlePointerDown = useCallback((e: React.PointerEvent) => { viewerHandleUiEvent(e); onCanvasPointerDown?.(e) }, [viewerHandleUiEvent, onCanvasPointerDown])
  const handlePointerUp = useCallback((e: React.PointerEvent) => { viewerHandleUiEvent(e); onCanvasPointerUp?.(e) }, [viewerHandleUiEvent, onCanvasPointerUp])
  const handlePointerCancel = useCallback((e: React.PointerEvent) => { viewerHandleUiEvent(e) }, [viewerHandleUiEvent])
  const handlePointerLeave = useCallback((e: React.PointerEvent) => { viewerHandleUiEvent(e, draggingRenderItemId); onCanvasPointerLeave?.(e) }, [viewerHandleUiEvent, onCanvasPointerLeave, draggingRenderItemId])
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => { viewerHandleUiEvent(e); onCanvasKeyDown?.(e) }, [viewerHandleUiEvent, onCanvasKeyDown])
  const handleKeyUp = useCallback((e: React.KeyboardEvent) => { viewerHandleUiEvent(e); onCanvasKeyUp?.(e) }, [viewerHandleUiEvent, onCanvasKeyUp])
  const handleWheel = useCallback((e: React.WheelEvent) => { viewerHandleUiEvent(e); onCanvasWheel?.(e) }, [viewerHandleUiEvent, onCanvasWheel])

  return (
    <div
      ref={containerRef}
      className="ViewportContainer"
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center'
      }}
    >
      <canvas
        key={restartKey}
        id={canvasId}
        ref={canvasRef}
        className={classNames({
          isItemHovered,
          isPlacementMode: isDragging || isPlacementMode,
          cannotPlaceStackable,
          cameraInOrbitMode: cameraInOrbitMode && !(isItemHovered || isPlacementMode || isDragging),
          cameraInOrbitModeMoving: cameraInOrbitModeMoving && !(isItemHovered || isPlacementMode || isDragging),
        })}
        style={{
          width,
          height,
          position: 'absolute',
          userSelect: 'none',
          touchAction: 'none'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={stopPropagation}
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
        onMouseLeave={stopPropagation}
        onContextMenu={preventDefault}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onWheel={handleWheel}
        tabIndex={-1}
      />
      {/* Overlay container for children */}
      <div
        className="ViewportOverlay"
        style={{ width: '100%', height: '100%', position: 'absolute', pointerEvents: 'none', top: 0, bottom: 0 }}
      >
        {children}
      </div>
    </div>
  )
}
