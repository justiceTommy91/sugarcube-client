import { GeomViewer } from 'Renderer/geomviewer'

/**
 * Document-level pointer handlers for a viewer drag started on the canvas. Call
 * attachDocDragListeners(canvas) on canvas pointerdown so pointermove keeps firing once
 * the cursor leaves the canvas, and a release outside the canvas still ends the drag.
 */
let activeDragCanvas: HTMLElement | null = null

function handleDocPointerMove(e: PointerEvent) {
    // Forward off-canvas moves so the drag keeps going. The viewer recognises
    // currentTarget === Document and skips canvas-rect-dependent handling.
    GeomViewer.bindings?.handleUIEvent(e, undefined, e.buttons)
}

function handleDocPointerUp(e: PointerEvent) {
    document.removeEventListener('pointermove', handleDocPointerMove)
    document.removeEventListener('pointerup', handleDocPointerUp)
    const canvas = activeDragCanvas
    activeDragCanvas = null
    // Release on the canvas is handled by the canvas's own onPointerUp.
    if (!canvas || e.target === canvas) return
    // Release outside: re-dispatch on the canvas so onPointerUp fires with a valid
    // currentTarget. Forwarding the document event directly would leave the viewer's
    // pointerup handler with no canvas rect to compute coordinates against.
    // eslint-disable-next-line i18next/no-literal-string
    canvas.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        clientX: e.clientX,
        clientY: e.clientY,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        button: e.button,
        buttons: e.buttons,
    }))
}

export function attachDocDragListeners(canvas: HTMLElement) {
    activeDragCanvas = canvas
    document.addEventListener('pointermove', handleDocPointerMove)
    document.addEventListener('pointerup', handleDocPointerUp)
}

/**
 * Return a Proxy that adapts a React.SyntheticEvent to it's underlaying native event, safely
 * satisfying interfaces for callers that require a native browser event but only use interfaces
 * in common with both.
 *
 * Calls to methods and properties that exist on syntheticEvent will be delegated to it,
 * while all other methods and properties will be delegated to the native event.
 *
 * Note that is it potentially unsafe to call native event methods and properties that aren't
 * supported by React synthetic events since it might bypass React event handling, but in most
 * cases this should never be an issue (stopPropagation is the only method known to be unsafe
 * and it is safely delegated to the synthetic event in the current implementation).
 *
 * @param syntheticEvent event from React to adapt to it's underlaying native event.
 * @returns A proxy to the underlaying native event that delegates to it's partent syntheticEvent.
 */
export function adaptSyntheticEventToNative<S extends React.SyntheticEvent>(syntheticEvent: S): S['nativeEvent'] {
    return new Proxy(syntheticEvent.nativeEvent, {
        get: (target, prop, receiver) => {
            if (prop in syntheticEvent) {
                return syntheticEvent[prop as keyof S]
            }
            // FIXME: should this be logged with a third-party service?
            // eslint-disable-next-line no-console
            console.warn(`getting nativeEvent property "${String(prop)}" on React.SyntheticEvent: `, syntheticEvent)
            return Reflect.get(target, prop, receiver)
        },
        set: (target, prop, newValue, reciever) => {
            if (prop in syntheticEvent) {
                // eslint-disable-next-line no-param-reassign --- Perfectly fine to assign to the proxied syntheticEvent
                syntheticEvent[prop as keyof S] = newValue
            }
            // FIXME: should this be logged with a third-party service?
            // eslint-disable-next-line no-console
            console.warn(`setting nativeEvent property "${String(prop)}" on React.SyntheticEvent: `, syntheticEvent)
            return Reflect.set(target, prop, newValue, reciever)
        },
    })
}

export type SyntheticOrNativeEvent<E extends React.SyntheticEvent> = E | E['nativeEvent']

export function isMultiTouchEvent(event: SyntheticOrNativeEvent<React.MouseEvent | React.TouchEvent>) {
    if ('touches' in event) {
        return event.touches.length >= 2
    }
    return false
}

export function getClientEventCoords(event: SyntheticOrNativeEvent<React.MouseEvent | React.TouchEvent>) {
    let clientX
    let clientY
    let isTouch = false

    if ('touches' in event) {
        if (event.touches.length) {
            clientX = event.touches[0].clientX
            clientY = event.touches[0].clientY
            isTouch = true
        }
    } else {
        clientX = event.clientX
        clientY = event.clientY
    }

    return { clientX, clientY, isTouch }
}

export function getMultiTouchAngle(event: SyntheticOrNativeEvent<React.TouchEvent>) {
    if (!isMultiTouchEvent(event)) {
        return 0
    }

    const { clientX: x1, clientY: y1 } = event.touches[0]
    const { clientX: x2, clientY: y2 } = event.touches[1]

    return Math.atan2(y2 - y1, x2 - x1)
}
