import { useCallback, useEffect, useRef, useState } from 'react'
import { GeomViewer } from '@gatsby/Renderer/geomviewer/geom_init'
import { NOTIFY_SCENE_ITEM_UPDATE } from '@gatsby/Renderer/geomviewer'
import type {
    SceneItemUpdateNotification,
    NotificationObserver,
} from '@gatsby/Renderer/geomviewer'
import { getGrandCentral } from '@gatsby/Renderer/GrandCentral'
import { gvCurrentScene } from '@gatsby/Renderer/foundation/geom_app'
import { isFurnitureItem3D } from '@gatsby/Renderer/rendering/scene_utils'

const TAP_MAX_DISTANCE = 10
const TAP_MAX_DURATION = 300

// The renderer's InputHandler processes synthetic pointer events natively for
// hit-testing, hover, select/deselect, and GrandCentral notifications.
function forwardTapToCanvas(clientX: number, clientY: number) {
    const canvas = document.getElementById(`ViewportCanvas`)
    if (!canvas) return

    const shared = { clientX, clientY, bubbles: true, cancelable: true, pointerId: 1, pointerType: `touch` as const }
    canvas.dispatchEvent(new PointerEvent(`pointerdown`, { ...shared, button: 0, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent(`pointerup`, { ...shared, button: 0, buttons: 0 }))
}

// Forwards taps to the viewer canvas for native selection and tracks
// selection state locally. We don't read useSelectedItemId because items
// removed from the scene during edit mode don't emit a Deselected
// notification, leaving that source stuck on a zombie id. Instead we keep
// session-scoped state: cleared whenever isActive flips, and updated from
// Selected/Deselected notifications only while active.
export function useItemSelection(isActive: boolean) {
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
    const isActiveRef = useRef(isActive)
    isActiveRef.current = isActive

    // Reset on every session boundary and nudge the backend to drop any
    // lingering selection it may still be holding.
    useEffect(() => {
        setSelectedItemId(null)
        GeomViewer.bindings?.doAction('deselect-all')
    }, [isActive])

    // Observer is mounted once; it reads `isActiveRef` so out-of-session
    // notifications are ignored without having to rebind.
    useEffect(() => {
        const gc = getGrandCentral()
        const observer = (n: SceneItemUpdateNotification) => {
            if (!isActiveRef.current) return
            if (n.payload.stateInfo === 'Selected') setSelectedItemId(n.payload.itemId)
            else if (n.payload.stateInfo === 'Deselected') setSelectedItemId(null)
        }
        gc.addObserver(NOTIFY_SCENE_ITEM_UPDATE, observer as NotificationObserver)
        return () => gc.removeObserver(observer as NotificationObserver)
    }, [])

    const isItemSelected = !!selectedItemId

    useEffect(() => {
        if (!selectedItemId) return undefined

        const scene = gvCurrentScene()
        const renderItem = scene?.getRenderItem(selectedItemId)
        if (renderItem && isFurnitureItem3D(renderItem)) {
            const productDimensions = renderItem.getProductDimensions()
            productDimensions.setEnabled(true)
            productDimensions.setVisible(true)
            scene?.setIsDirty(true)
        }

        return () => {
            if (renderItem && isFurnitureItem3D(renderItem)) {
                const productDimensions = renderItem.getProductDimensions()
                productDimensions.setVisible(false)
                productDimensions.setEnabled(false)
                gvCurrentScene()?.setIsDirty(true)
            }
        }
    }, [selectedItemId])

    const deselectAll = useCallback(() => {
        GeomViewer.bindings?.doAction('deselect-all')
    }, [])

    const tapRef = useRef<{ x: number; y: number; time: number } | null>(null)

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        tapRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    }, [])

    const handlePointerUp = useCallback(
        (e: React.PointerEvent) => {
            if (!tapRef.current || !isActive) return
            const dx = e.clientX - tapRef.current.x
            const dy = e.clientY - tapRef.current.y
            const elapsed = Date.now() - tapRef.current.time
            const { x, y } = tapRef.current
            tapRef.current = null

            if (Math.abs(dx) > TAP_MAX_DISTANCE || Math.abs(dy) > TAP_MAX_DISTANCE || elapsed > TAP_MAX_DURATION)
                return

            forwardTapToCanvas(x, y)
            // Clear dynamic measurement lines that onHover() triggered.
            // On touch, selection (not drag) should not show wall distances.
            gvCurrentScene()?.getDynamicMeasurements()?.setTrackingItem(null)
        },
        [isActive],
    )

    return { selectedItemId, isItemSelected, deselectAll, handlePointerDown, handlePointerUp }
}
