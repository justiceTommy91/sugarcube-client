import React, { PropsWithChildren, useState, useEffect, useRef } from 'react'
import classNames from 'classnames'

import {
    API_INITIALIZED,
    VIEWER_INITIALIZED,
    ORBIT_CAMERA_STATE_ENABLED,
    ORBIT_CAMERA_STATE_DRAGGING,
} from 'Planner/api_constants'
import { ViewerState } from 'Planner/api_types'
import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { usePlannerApiState } from 'Planner/ui/hooks/usePlannerApiState'
import { usePlannerViewerUIState } from 'Planner/ui/hooks/usePlannerViewerUIState'

import './PlannerViewer.scss'

type PlannerViewerProps = {
    viewerId: string
    width: number
    height: number
    isInteractive?: boolean
    canvasInvisible?: boolean
}

const adaptDocumentEvent = (event: PointerEvent, canvas: HTMLCanvasElement ) => 
    new Proxy(event, {
        get: (target, prop) => {
            if (prop === 'target' || prop === 'currentTarget') {
                return canvas
            }
            return target[prop as keyof PointerEvent]
        }
    })

export const PlannerViewer = ({
    viewerId,
    width,
    height,
    children,
    isInteractive,
    canvasInvisible,
}: PropsWithChildren<PlannerViewerProps>) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const { plannerApi } = usePlannerApi()
    const apiState = usePlannerApiState()
    const [viewerState, setViewerState] = useState(plannerApi.getViewerState(viewerId))
    const {hoverObjectId, draggingObjectId, orbitCameraState } = usePlannerViewerUIState(viewerId)

    useEffect(() => {
        if (apiState === API_INITIALIZED && canvasRef.current) {
            const observer = (newState: ViewerState) => setViewerState(newState)
            plannerApi.addViewer(canvasRef.current, viewerId, observer)
            return () => {
                plannerApi.removeViewerStateObserver(viewerId, observer)
                plannerApi.removeViewer(viewerId)
            }
        }
        return () => {}
    }, [apiState, plannerApi, canvasRef])

    useEffect(() => {
        plannerApi.onCanvasResized(viewerId)
    }, [width, height])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !isInteractive) {
            return () => {}
        }

        const onPointerMove = (event: PointerEvent) =>
            plannerApi.onPointerMove(viewerId, adaptDocumentEvent(event, canvas))

        const onPointerUp = (e: PointerEvent) => {
            plannerApi.onPointerUp(viewerId, adaptDocumentEvent(e, canvas))
            plannerApi.refreshCameraView(viewerId)
            document.removeEventListener('pointerup', onPointerUp)
        }

        const onPointerDown = (e: PointerEvent) => {
            plannerApi.onPointerDown(viewerId, e)
            document.addEventListener('pointerup', onPointerUp)
        }

        const onKeyDown = (e: KeyboardEvent) => {
            plannerApi.onKeyDown(viewerId, e)
        }

        document.addEventListener('keydown', onKeyDown)

        canvas.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('pointermove', onPointerMove)
        return () => {
            canvas.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('pointermove', onPointerMove)
            document.removeEventListener('pointerup', onPointerUp)
        }
      }, [viewerState, canvasRef, isInteractive])

    const showCanvas = !canvasInvisible && viewerState === VIEWER_INITIALIZED
    const isHoveringWallElement = !!hoverObjectId
    const isDraggingWallElement = !!draggingObjectId
    const isOrbitCameraEnabled = !isHoveringWallElement && !isDraggingWallElement &&
        (orbitCameraState === ORBIT_CAMERA_STATE_ENABLED)
    const isOrbitCameraDragging = !isHoveringWallElement && !isDraggingWallElement &&
        orbitCameraState === ORBIT_CAMERA_STATE_DRAGGING
    return (
        <div className="PlannerViewer">
            <canvas
                id="ViewportCanvas"
                ref={canvasRef}
                style={{ width, height, visibility: showCanvas ? 'visible' : 'hidden' }}
                width={width}
                height={height}
                className={classNames('PlannerViewerCanvas', {
                    isHoveringWallElement,
                    isDraggingWallElement,
                    isOrbitCameraEnabled,
                    isOrbitCameraDragging,
                })}
            />
            <div className="children" style={{ width, height }}>
                {children}
            </div>
        </div>
    )
}
