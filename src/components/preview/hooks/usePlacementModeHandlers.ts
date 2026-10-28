import React, { useEffect, useCallback } from 'react'
import { GeomViewer } from 'Renderer/geomviewer'
import { useIsPlacementMode, usePlacementIndicatorState } from 'Renderer/ui/hooks'

/**
 * Manages placement mode keyboard/mouse handlers and event listener lifecycle.
 * Adds global listeners when entering placement mode, removes them on exit/unmount.
 */
export function usePlacementModeHandlers() {
    const isPlacementMode = useIsPlacementMode()
    const { resetInvalidState } = usePlacementIndicatorState()

    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (isPlacementMode && e.key === 'Escape') {
                GeomViewer.bindings?.doAction('cancel-placement-mode')
            }
        },
        [isPlacementMode],
    )

    const onWindowMouseDown = useCallback(() => {
        if (isPlacementMode) {
            GeomViewer.bindings?.doAction('cancel-placement-mode')
        }
    }, [isPlacementMode])

    const onMouseLeave: React.MouseEventHandler = useCallback(() => {
        resetInvalidState()
    }, [resetInvalidState])

    useEffect(() => {
        if (isPlacementMode) {
            window.addEventListener('mousedown', onWindowMouseDown)
            document.addEventListener('keydown', onKeyDown)
            resetInvalidState()
        } else {
            window.removeEventListener('mousedown', onWindowMouseDown)
            document.removeEventListener('keydown', onKeyDown)
        }

        return () => {
            window.removeEventListener('mousedown', onWindowMouseDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [isPlacementMode, onWindowMouseDown, onKeyDown, resetInvalidState])

    return { onMouseLeave }
}
