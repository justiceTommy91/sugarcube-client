import React from 'react'
import { GeomViewer } from 'Renderer/geomviewer'
import { adaptSyntheticEventToNative, attachDocDragListeners } from 'utils/events'

/**
 * Event handler utilities for forwarding UI events to GeomViewer.
 * These handle the bridge between React's synthetic events and the native events
 * expected by the GeomViewer rendering engine.
 */
export const isMouseEvent = (event: React.MouseEvent | React.KeyboardEvent): event is React.MouseEvent =>
    'button' in event

export const forwardEventToViewer = (event: React.MouseEvent | React.KeyboardEvent, renderItemId?: number) => {
    if (
        isMouseEvent(event) &&
        (event.type === 'mousedown' || event.type === 'pointerdown' || event.type === 'mouseenter')
    ) {
        event.stopPropagation()
        if (event.button === 1) event.preventDefault() // Middle button
    }

    const { buttons } = event as React.MouseEvent
    if (event.type === 'mousedown' || event.type === 'pointerdown') {
        // Drag started on an overlay above the canvas; attach against the canvas so an
        // off-canvas release routes a pointerup back to it.
        const canvas = document.getElementById('PreviewCanvas')
        if (canvas) attachDocDragListeners(canvas)
    }

    GeomViewer.bindings?.handleUIEvent(adaptSyntheticEventToNative(event), renderItemId, buttons)
}

export const stopPropagationFunc = (e: React.MouseEvent) => e.stopPropagation()
