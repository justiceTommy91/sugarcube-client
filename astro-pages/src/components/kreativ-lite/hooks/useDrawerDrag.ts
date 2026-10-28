import { useCallback, useEffect, useRef } from 'react'

const EASING = 'cubic-bezier(0.2, 0, 0, 1)'
const DURATION = '350ms'
// Always include transform so inline style never suppresses the CSS open/close animation.
const TRANSITION_NONE = `top 0s, transform ${DURATION} ${EASING}`
const TRANSITION_SNAP = `top ${DURATION} ${EASING}, transform ${DURATION} ${EASING}`

/**
 * Encapsulates the drag-to-snap gesture for bottom sheets.
 *
 * Uses Touch Events as the primary input path on touch devices (reliable on all iOS versions)
 * and Pointer Events as the input path for mouse/pen (desktop). Pointer events with
 * pointerType === 'touch' are skipped to avoid double-handling on Android/Chrome.
 *
 * A non-passive native touchmove listener is attached to the handle element so that
 * preventDefault() can be called, preventing iOS from triggering its rubber-band overscroll
 * and thereby cancelling the touchmove sequence mid-drag.
 *
 * @param collapsedTop  - px position when the drawer is collapsed (below canvas)
 * @param expandedTop   - px position when the drawer is fully expanded (top of page)
 * @param scrollRef     - optional ref to the scrollable results container; when provided,
 *                        a downward swipe from scrollTop===0 will drag and collapse the drawer
 * @param onDismiss     - when provided, the hook operates in 'dismiss' mode: a downward swipe
 *                        that would normally snap to collapsed instead calls onDismiss()
 * @returns drawerRef, handleRef, touch event handlers, pointer event handlers, and
 *          programmatic expand/collapse helpers
 */
export function useDrawerDrag(
    collapsedTop: number,
    expandedTop: number,
    scrollRef?: React.RefObject<HTMLDivElement | null>,
    onDismiss?: () => void,
    open?: boolean,
) {
    const drawerRef = useRef<HTMLDivElement>(null)
    const handleRef = useRef<HTMLDivElement>(null)
    const isExpandedRef = useRef(false)

    // Keep onDismiss in a ref so callbacks never cause the positioning effect to re-run.
    const onDismissRef = useRef(onDismiss)
    useEffect(() => {
        onDismissRef.current = onDismiss
    })
    const isDismissMode = onDismiss !== undefined

    const setTopImmediate = useCallback((top: number) => {
        const el = drawerRef.current
        if (!el) return
        el.style.transition = TRANSITION_NONE
        el.style.top = `${top}px`
    }, [])

    const snapTo = useCallback(
        (top: number) => {
            const el = drawerRef.current
            if (!el) return
            // In dismiss mode any target below expandedTop means the user swiped the drawer away.
            if (onDismissRef.current && top > expandedTop) {
                onDismissRef.current()
                return
            }
            el.style.transition = TRANSITION_SNAP
            el.style.top = `${top}px`
            isExpandedRef.current = top === expandedTop
        },
        [expandedTop],
    )

    // Set initial position on mount and when snap positions change.
    // - Dismiss mode: always start at expandedTop (sheet is always fully open).
    // - Snap mode: start collapsed (unless the user has already dragged it open).
    // onDismiss is intentionally excluded from deps — use onDismissRef instead
    // so a new callback reference on the parent never re-runs this effect and
    // interrupts an ongoing CSS transition.
    useEffect(() => {
        const el = drawerRef.current
        if (!el) return
        if (isDismissMode) {
            // Only reset position when opening. On close, leave top where it is — the CSS
            // transform exit animation handles the visual dismissal from wherever the drag ended.
            if (!open) return
            el.style.transition = TRANSITION_NONE
            el.style.top = `${expandedTop}px`
            isExpandedRef.current = true
            return
        }
        if (!collapsedTop) return
        if (!isExpandedRef.current) {
            el.style.transition = TRANSITION_NONE
            el.style.top = `${collapsedTop}px`
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collapsedTop, expandedTop, isDismissMode, open])

    const dragState = useRef<{
        startY: number
        startTop: number
        lastY: number
        lastTime: number
    } | null>(null)

    // Non-passive native touchmove on the handle: calling preventDefault() stops iOS from
    // activating its WKScrollView rubber-band effect, which would otherwise fire touchcancel
    // and kill the drag sequence before the user has finished moving their finger.
    // Native touchcancel listener clears dragState so system gestures (e.g. notification
    // pull-down) don't leave dangling drag state that affects the next gesture.
    useEffect(() => {
        const el = handleRef.current
        if (!el) return undefined
        const preventScroll = (e: TouchEvent) => {
            if (dragState.current) e.preventDefault()
        }
        const cancelDrag = () => {
            dragState.current = null
        }
        el.addEventListener('touchmove', preventScroll, { passive: false })
        el.addEventListener('touchcancel', cancelDrag, { passive: true })
        return () => {
            el.removeEventListener('touchmove', preventScroll)
            el.removeEventListener('touchcancel', cancelDrag)
        }
    }, [])

    const computeSnap = useCallback(
        (startTop: number, currentTop: number, lastY: number, lastTime: number, endY: number, endTime: number) => {
            const dt = endTime - lastTime
            const dy = endY - lastY
            const velocity = dt > 0 ? dy / dt : 0
            const dragDelta = currentTop - startTop
            const SNAP_PX = 40
            if (onDismiss) {
                // Dismiss mode: snap back to expanded, or dismiss if dragged/flicked far enough.
                // Return expandedTop + 1 as a sentinel that snapTo interprets as "dismiss".
                const shouldDismiss = dragDelta > SNAP_PX || velocity > 0.15
                return shouldDismiss ? expandedTop + 1 : expandedTop
            }
            const startedExpanded = startTop <= expandedTop + 1
            if (startedExpanded) {
                return dragDelta > SNAP_PX || velocity > 0.15 ? collapsedTop : expandedTop
            }
            return dragDelta < -SNAP_PX || velocity < -0.15 ? expandedTop : collapsedTop
        },
        [collapsedTop, expandedTop, onDismiss],
    )

    // ─── Shared drag helpers (used by both Touch and Pointer handlers) ───────────

    const dragStart = useCallback(
        (clientY: number, timestamp: number) => {
            const el = drawerRef.current
            if (!el) return
            const currentTop = parseFloat(el.style.top) || (onDismiss ? expandedTop : collapsedTop)
            dragState.current = {
                startY: clientY,
                startTop: currentTop,
                lastY: clientY,
                lastTime: timestamp,
            }
        },
        [collapsedTop, expandedTop, onDismiss],
    )

    const dragMove = useCallback(
        (clientY: number, timestamp: number) => {
            if (!dragState.current) return
            const delta = clientY - dragState.current.startY
            const rawTop = dragState.current.startTop + delta
            // Dismiss mode: drawer only moves downward from expandedTop (no lower bound clamp).
            // Snap mode: drawer clamps between expandedTop and collapsedTop.
            const clamped = onDismiss
                ? Math.max(expandedTop, rawTop)
                : Math.max(expandedTop, Math.min(collapsedTop, rawTop))
            setTopImmediate(clamped)
            dragState.current.lastY = clientY
            dragState.current.lastTime = timestamp
        },
        [collapsedTop, expandedTop, onDismiss, setTopImmediate],
    )

    const dragEnd = useCallback(
        (clientY: number, timestamp: number) => {
            if (!dragState.current) return
            const el = drawerRef.current
            if (!el) {
                dragState.current = null
                return
            }
            const currentTop = parseFloat(el.style.top) || (onDismiss ? expandedTop : collapsedTop)
            const target = computeSnap(
                dragState.current.startTop,
                currentTop,
                dragState.current.lastY,
                dragState.current.lastTime,
                clientY,
                timestamp,
            )
            snapTo(target)
            dragState.current = null
        },
        [collapsedTop, expandedTop, onDismiss, computeSnap, snapTo],
    )

    // ─── Touch Events (primary path for iOS and Android touch) ───────────────────

    const onTouchStart = useCallback(
        (e: React.TouchEvent<HTMLDivElement>) => {
            if (e.touches.length !== 1) return
            dragStart(e.touches[0].clientY, e.timeStamp)
        },
        [dragStart],
    )

    const onTouchMove = useCallback(
        (e: React.TouchEvent<HTMLDivElement>) => {
            if (!dragState.current || e.touches.length !== 1) return
            dragMove(e.touches[0].clientY, e.timeStamp)
        },
        [dragMove],
    )

    const onTouchEnd = useCallback(
        (e: React.TouchEvent<HTMLDivElement>) => {
            if (!dragState.current) return
            const changed = e.changedTouches[0]
            dragEnd(changed?.clientY ?? dragState.current.lastY, e.timeStamp)
        },
        [dragEnd],
    )

    // ─── Pointer Events (mouse / pen on desktop; skip touch pointers) ────────────

    const onPointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            // Touch input is handled by the Touch Event handlers above to ensure
            // reliable behaviour on iOS Safari.
            if (e.pointerType === 'touch') return
            e.currentTarget.setPointerCapture(e.pointerId)
            dragStart(e.clientY, e.timeStamp)
        },
        [dragStart],
    )

    const onPointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (e.pointerType === 'touch' || !dragState.current) return
            dragMove(e.clientY, e.timeStamp)
        },
        [dragMove],
    )

    const onPointerUp = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (e.pointerType === 'touch' || !dragState.current) return
            dragEnd(e.clientY, e.timeStamp)
        },
        [dragEnd],
    )

    const expand = useCallback(() => snapTo(expandedTop), [snapTo, expandedTop])
    const collapse = useCallback(() => snapTo(collapsedTop), [snapTo, collapsedTop])

    // ─── Overscroll-to-collapse (scroll container reaches top, swipe down) ────────
    // When the results are scrolled to the very top and the user continues swiping
    // downward, we take over the gesture to drag and snap the drawer closed.
    //
    // We always arm the state on touchstart (regardless of scrollTop) so we can also
    // handle the case where the user scrolls up to the top mid-gesture and then keeps
    // swiping. `overscrollEntryY` is set the first moment scrollTop === 0 and the
    // swipe is downward; drawer movement is computed relative to that point so there
    // is no jump even when the take-over happens mid-gesture.

    const overscrollState = useRef<{
        startY: number
        /** Drawer top at the moment we entered overscroll-drag mode. */
        drawerTopAtEntry: number
        /** The touch Y position when scrollTop first became 0 during a downward swipe.
         *  null until overscroll-drag mode is actually entered. */
        overscrollEntryY: number | null
        lastY: number
        lastTime: number
    } | null>(null)

    useEffect(() => {
        const el = scrollRef?.current
        if (!el) return undefined

        const onOverscrollTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return
            const touch = e.touches[0]
            overscrollState.current = {
                startY: touch.clientY,
                drawerTopAtEntry: 0,
                overscrollEntryY: null,
                lastY: touch.clientY,
                lastTime: e.timeStamp,
            }
        }

        const onOverscrollTouchMove = (e: TouchEvent) => {
            if (!overscrollState.current || e.touches.length !== 1) return
            const touch = e.touches[0]
            const dy = touch.clientY - overscrollState.current.startY

            if (el.scrollTop > 0) {
                // Content is still scrolling — reset entry state so any previous
                // partial overscroll doesn't linger.
                overscrollState.current.overscrollEntryY = null
                return
            }

            // scrollTop === 0 but swipe is upward — let native scroll handle it
            // (nothing to scroll, but don't block).
            if (dy <= 0) {
                overscrollState.current.overscrollEntryY = null
                return
            }

            // scrollTop === 0 AND swipe is downward — take over the gesture.
            if (overscrollState.current.overscrollEntryY === null) {
                // First frame entering overscroll mode: snapshot the current drawer
                // position and the Y where the take-over begins so motion is relative.
                const drawerEl = drawerRef.current
                overscrollState.current.overscrollEntryY = touch.clientY
                overscrollState.current.drawerTopAtEntry = drawerEl
                    ? parseFloat(drawerEl.style.top) || (onDismiss ? expandedTop : collapsedTop)
                    : onDismiss
                    ? expandedTop
                    : collapsedTop
            }

            const dySinceEntry = touch.clientY - overscrollState.current.overscrollEntryY
            if (dySinceEntry <= 0) return

            e.preventDefault()
            const rawTop = overscrollState.current.drawerTopAtEntry + dySinceEntry
            const clamped = onDismiss
                ? Math.max(expandedTop, rawTop)
                : Math.max(expandedTop, Math.min(collapsedTop, rawTop))
            setTopImmediate(clamped)
            overscrollState.current.lastY = touch.clientY
            overscrollState.current.lastTime = e.timeStamp
        }

        const onOverscrollTouchEnd = (e: TouchEvent) => {
            if (!overscrollState.current) return
            // Only snap if we actually entered overscroll-drag mode.
            if (overscrollState.current.overscrollEntryY === null) {
                overscrollState.current = null
                return
            }
            const drawerEl = drawerRef.current
            if (!drawerEl) {
                overscrollState.current = null
                return
            }
            const currentTop = parseFloat(drawerEl.style.top) || (onDismiss ? expandedTop : collapsedTop)
            const changed = e.changedTouches[0]
            const endY = changed?.clientY ?? overscrollState.current.lastY
            const target = computeSnap(
                overscrollState.current.drawerTopAtEntry,
                currentTop,
                overscrollState.current.lastY,
                overscrollState.current.lastTime,
                endY,
                e.timeStamp,
            )
            snapTo(target)
            overscrollState.current = null
        }

        el.addEventListener('touchstart', onOverscrollTouchStart, { passive: true })
        // Non-passive so we can call preventDefault() to block native overscroll.
        el.addEventListener('touchmove', onOverscrollTouchMove, { passive: false })
        el.addEventListener('touchend', onOverscrollTouchEnd, { passive: true })
        el.addEventListener('touchcancel', onOverscrollTouchEnd, { passive: true })

        return () => {
            el.removeEventListener('touchstart', onOverscrollTouchStart)
            el.removeEventListener('touchmove', onOverscrollTouchMove)
            el.removeEventListener('touchend', onOverscrollTouchEnd)
            el.removeEventListener('touchcancel', onOverscrollTouchEnd)
        }
    }, [scrollRef, collapsedTop, expandedTop, setTopImmediate, snapTo, computeSnap, onDismiss])

    return {
        drawerRef,
        handleRef,
        isExpandedRef,
        expand,
        collapse,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onPointerDown,
        onPointerMove,
        onPointerUp,
    }
}
