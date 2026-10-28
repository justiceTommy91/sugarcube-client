/* eslint-disable i18next/no-literal-string */
import { useRef, useCallback, useState, useEffect } from 'react'
import { DRAG_CONSTANTS } from '../constants/dragConstants'
import type { UseDragGestureReturn, DragGestureState } from '../types/dragTypes'

/**
 * Cross-Browser Drag Gesture Detection Hook
 *
 * This hook implements a robust cross-browser solution for detecting drag gestures
 * that works reliably across Firefox, Chrome, and other browsers for both mouse
 * and touch interactions.
 *
 * ## Key Features:
 * - ✅ Firefox touch drag support (from buttons/images)
 * - ✅ Dynamic touch-action management for scroll vs drag
 * - ✅ Directional gesture detection (horizontal = drag, vertical = scroll)
 * - ✅ 8px threshold for reliable gesture detection
 * - ✅ Pointer capture for consistent event handling
 *
 * ## Cross-Browser Issues Solved:
 *
 * ### Firefox Touch Issues:
 * - Firefox immediately fires pointerup when touching buttons on touch devices
 * - Solution: Pointer capture + preventDefault on button touch events
 *
 * ### Scroll vs Drag Detection:
 * - Need to differentiate between scroll intent and drag intent
 * - Solution: Dynamic touch-action + directional movement analysis
 *
 * ### Touch Action Management:
 * - Static touch-action CSS can't handle dynamic gesture changes
 * - Solution: JavaScript-controlled touch-action switching based on gesture direction
 */

interface UseDragGestureOptions {
    enabled?: boolean
    dragThreshold?: number
    pointerType?: string
    onDragStart?: (position: { x: number; y: number }) => void
    onDragEnd?: (event?: PointerEvent) => void
    onDragMove?: (position: { x: number; y: number }) => void
}

export const useDragGesture = ({
    enabled = true,
    dragThreshold = DRAG_CONSTANTS.DEFAULT_DRAG_THRESHOLD,
    pointerType = 'touch',
    onDragStart,
    onDragEnd,
    onDragMove,
}: UseDragGestureOptions = {}): UseDragGestureReturn => {
    // State for drag gesture detection
    const [gestureState, setGestureState] = useState<DragGestureState>({
        isDragging: false,
        isPotentialDrag: false,
        startPosition: null,
        dragThreshold,
    })
    const [touchAction, setTouchAction] = useState<'pan-y' | 'none'>(DRAG_CONSTANTS.TOUCH_ACTION.PAN_Y)

    // Refs for gesture tracking
    const startPosRef = useRef<{ x: number; y: number; timeStamp?: number } | null>(null)
    const isDraggingRef = useRef(false)
    const isPotentialDragRef = useRef(false)
    const pointerIdRef = useRef<number | null>(null)
    const targetElementRef = useRef<HTMLElement | null>(null)

    // Global listeners cleanup
    const cleanupListenersRef = useRef<(() => void) | null>(null)

    const resetState = useCallback(() => {
        startPosRef.current = null
        isDraggingRef.current = false
        isPotentialDragRef.current = false
        pointerIdRef.current = null
        targetElementRef.current = null
        setTouchAction(DRAG_CONSTANTS.TOUCH_ACTION.PAN_Y)

        setGestureState((prev) => ({
            ...prev,
            isDragging: false,
            isPotentialDrag: false,
            startPosition: null,
        }))

        // Clean up global listeners
        if (cleanupListenersRef.current) {
            cleanupListenersRef.current()
            cleanupListenersRef.current = null
        }
    }, [])

    const activateDragMode = useCallback(
        (position: { x: number; y: number }) => {
            if (!enabled || isDraggingRef.current) {
                return
            }

            isDraggingRef.current = true
            isPotentialDragRef.current = false
            setTouchAction(DRAG_CONSTANTS.TOUCH_ACTION.NONE)

            setGestureState((prev) => ({
                ...prev,
                isDragging: true,
                isPotentialDrag: false,
            }))

            // Prevent text selection when drag is activated
            if (window.getSelection) {
                window.getSelection()?.removeAllRanges()
            }

            // Capture pointer only after drag is confirmed
            if (targetElementRef.current && pointerIdRef.current !== null) {
                try {
                    targetElementRef.current.setPointerCapture(pointerIdRef.current)
                } catch (error) {
                    // Ignore if pointer capture fails
                }
            }

            onDragStart?.(position)
        },
        [enabled, onDragStart],
    )

    const deactivateDragMode = useCallback(
        (event?: PointerEvent) => {
            if (!isDraggingRef.current) return

            resetState()
            onDragEnd?.(event)
        },
        [resetState, onDragEnd],
    )

    const shouldActivateDrag = useCallback(
        (deltaX: number, deltaY: number): boolean => {
            // Use consistent distance calculation for all pointer types
            // Pythagorean theorem ensures accurate distance regardless of direction
            const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

            // 8px threshold recommended for cross-browser compatibility
            // - Small enough to feel responsive
            // - Large enough to prevent accidental activation
            const threshold = 8

            if (totalDistance <= threshold) {
                return false
            }

            // Mouse: allow drag in any direction (maintains desktop UX)
            // Touch: directional logic handled in move handler for dynamic touch-action
            if (pointerType === 'mouse') {
                return true
            }

            // For touch, return true and let the move handler decide based on direction
            // This allows dynamic touch-action management for scroll vs drag
            return true
        },
        [pointerType],
    )

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!enabled || e.button !== 0) {
                return
            }

            // Store initial position with timestamp
            const startPos = { x: e.clientX, y: e.clientY, timeStamp: e.timeStamp }
            startPosRef.current = startPos
            isPotentialDragRef.current = true
            pointerIdRef.current = e.pointerId
            targetElementRef.current = e.currentTarget as HTMLElement

            setGestureState((prev) => ({
                ...prev,
                isPotentialDrag: true,
                startPosition: startPos,
            }))

            // Don't prevent default immediately - this blocks hover effects and clicks
            // We'll only prevent default when drag is actually activated

            // Global pointer move handler
            const handlePointerMove = (moveEvent: PointerEvent) => {
                if (!isPotentialDragRef.current && !isDraggingRef.current) return

                const currentStartPos = startPosRef.current
                if (!currentStartPos) return

                const deltaX = moveEvent.clientX - currentStartPos.x
                const deltaY = moveEvent.clientY - currentStartPos.y

                // If already dragging, update position and prevent scrolling
                if (isDraggingRef.current) {
                    moveEvent.preventDefault()
                    moveEvent.stopPropagation()
                    onDragMove?.({ x: moveEvent.clientX, y: moveEvent.clientY })
                    return
                }

                // CRITICAL: Dynamic Gesture Detection for Scroll vs Drag
                // This is the core logic that enables both dragging and scrolling to work
                if (isPotentialDragRef.current) {
                    const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

                    if (totalDistance > 8) {
                        if (pointerType === 'touch') {
                            // Directional analysis: Compare horizontal vs vertical movement
                            const isHorizontalMovement = Math.abs(deltaX) > Math.abs(deltaY)

                            if (isHorizontalMovement) {
                                // HORIZONTAL GESTURE: User wants to drag
                                // 1. Disable browser scrolling with touch-action: none
                                // 2. Take control of the gesture for drag handling
                                setTouchAction(DRAG_CONSTANTS.TOUCH_ACTION.NONE)
                                moveEvent.preventDefault()
                                moveEvent.stopPropagation()
                                activateDragMode({ x: moveEvent.clientX, y: moveEvent.clientY })
                            } else {
                                // VERTICAL GESTURE: User wants to scroll
                                // 1. Reset drag state immediately
                                // 2. Keep touch-action as pan-y (allows vertical scrolling)
                                // 3. Don't preventDefault - let browser handle scroll
                                resetState()
                                // IMPORTANT: No preventDefault here - this allows native scrolling
                            }
                        } else if (pointerType === 'mouse') {
                            // Mouse: Allow drag in any direction (desktop UX expectation)
                            moveEvent.preventDefault()
                            moveEvent.stopPropagation()
                            activateDragMode({ x: moveEvent.clientX, y: moveEvent.clientY })
                        }
                    }
                }
            }

            // Global pointer up handler
            const handlePointerUp = (upEvent: PointerEvent) => {
                // Check if this was a click (not a drag)
                if (!isDraggingRef.current && isPotentialDragRef.current && startPosRef.current) {
                    const duration = upEvent.timeStamp - (startPosRef.current.timeStamp || 0)
                    const deltaX = upEvent.clientX - startPosRef.current.x
                    const deltaY = upEvent.clientY - startPosRef.current.y
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

                    // It's a click if:
                    // 1. Duration is less than 200ms
                    // 2. Movement is less than 5px
                    const isClick = duration < 200 && distance < 5

                    if (isClick) {
                        // Reset state but don't prevent the click
                        resetState()
                        // Let the click event bubble naturally
                        return
                    }
                }

                // Only deactivate if we're actually dragging, not just potentially dragging
                if (isDraggingRef.current) {
                    deactivateDragMode(upEvent)
                } else {
                    // Just reset state for potential drag that never activated
                    resetState()
                }
            }

            // Add global listeners for complete gesture tracking
            window.addEventListener(DRAG_CONSTANTS.EVENTS.POINTER_MOVE, handlePointerMove)
            window.addEventListener(DRAG_CONSTANTS.EVENTS.POINTER_UP, handlePointerUp)
            window.addEventListener(DRAG_CONSTANTS.EVENTS.POINTER_CANCEL, handlePointerUp)

            // Store cleanup function
            cleanupListenersRef.current = () => {
                window.removeEventListener(DRAG_CONSTANTS.EVENTS.POINTER_MOVE, handlePointerMove)
                window.removeEventListener(DRAG_CONSTANTS.EVENTS.POINTER_UP, handlePointerUp)
                window.removeEventListener(DRAG_CONSTANTS.EVENTS.POINTER_CANCEL, handlePointerUp)
            }
        },
        [enabled, dragThreshold, shouldActivateDrag, activateDragMode, deactivateDragMode, resetState, onDragMove],
    )

    // Cleanup effect to ensure event listeners are removed on unmount
    // eslint-disable-next-line arrow-body-style
    useEffect(
        () => () => {
            if (cleanupListenersRef.current) {
                cleanupListenersRef.current()
                cleanupListenersRef.current = null
            }
        },
        [],
    )

    return {
        isDragging: gestureState.isDragging,
        isPotentialDrag: gestureState.isPotentialDrag,
        startPosition: gestureState.startPosition,
        handlePointerDown,
        resetState,
        touchAction,
    }
}
