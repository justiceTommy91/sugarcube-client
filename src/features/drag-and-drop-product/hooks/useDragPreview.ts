/* eslint-disable i18next/no-literal-string */
import { useRef, useCallback } from 'react'
import * as Sentry from '@sentry/react'
import { createDragPreview } from '../components/DragPreview'
import { DRAG_CONSTANTS } from '../constants/dragConstants'
import type { UseDragPreviewReturn, DragPreviewConfig } from '../types/dragTypes'

export const useDragPreview = (): UseDragPreviewReturn => {
    const previewElementRef = useRef<HTMLElement | null>(null)

    const hidePreview = useCallback(() => {
        if (previewElementRef.current?.parentNode) {
            previewElementRef.current.parentNode.removeChild(previewElementRef.current)
            previewElementRef.current = null
        }
    }, [])

    const showPreview = useCallback(
        (config: DragPreviewConfig) => {
            try {
                // Clean up any existing preview first
                hidePreview()

                // Create new preview
                const previewElement = createDragPreview(
                    config.productData,
                    config.sourceElement || undefined,
                    config.useExistingImage,
                )

                if (previewElement) {
                    previewElementRef.current = previewElement

                    // Configure preview styling
                    previewElement.style.position = 'fixed'
                    previewElement.style.pointerEvents = 'none'
                    previewElement.style.zIndex = DRAG_CONSTANTS.PREVIEW_Z_INDEX.toString()
                    previewElement.style.opacity = '0.8'

                    // Position at specified coordinates or current position
                    if (config.position) {
                        previewElement.style.left = `${config.position.x - DRAG_CONSTANTS.PREVIEW_OFFSET_X}px`
                        previewElement.style.top = `${config.position.y - DRAG_CONSTANTS.PREVIEW_OFFSET_Y}px`
                    } else {
                        // Default position if not specified
                        previewElement.style.left = '0px'
                        previewElement.style.top = '0px'
                    }

                    previewElement.style.display = 'block'

                    // Ensure the preview is visible in the DOM
                    if (!previewElement.parentNode) {
                        document.body.appendChild(previewElement)
                    }
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn(DRAG_CONSTANTS.ERROR_MESSAGES.DRAG_PREVIEW_CREATION_FAILED, error)
                Sentry.captureMessage(
                    `Drag preview creation warning: ${DRAG_CONSTANTS.ERROR_MESSAGES.DRAG_PREVIEW_CREATION_FAILED}`,
                    'warning',
                )
            }
        },
        [hidePreview],
    )

    const updatePreviewPosition = useCallback((x: number, y: number) => {
        if (previewElementRef.current) {
            previewElementRef.current.style.left = `${x - DRAG_CONSTANTS.PREVIEW_OFFSET_X}px`
            previewElementRef.current.style.top = `${y - DRAG_CONSTANTS.PREVIEW_OFFSET_Y}px`
        }
    }, [])

    return {
        previewElement: previewElementRef.current,
        showPreview,
        hidePreview,
        updatePreviewPosition,
    }
}
