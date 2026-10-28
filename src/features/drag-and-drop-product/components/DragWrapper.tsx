/* eslint-disable i18next/no-literal-string */
/* eslint-disable react/jsx-no-useless-fragment */
import React, { useCallback, useMemo, useRef } from 'react'
import classNames from 'classnames'
import { useAppDispatch } from 'hooks'
import { useTracker } from 'apps/TrackingBoundary'
import { getProductTrackingInfo } from 'models/tracking/utils'
import { dragProductStart, dragProductEnd, setDropZoneActive } from '../redux/slice'
import type { DragTransferData } from '../redux/types'
import type { SeamlessDragProps } from '../types/dragTypes'
import { useDragGesture, useDragPreview } from '../hooks'
import { DRAG_CONSTANTS } from '../constants/dragConstants'
import DragErrorBoundary from './DragErrorBoundary'
import './DragWrapper.scss'

const DragWrapper = ({
    productData,
    children,
    enabled = true,
    onDragStart,
    onDragEnd,
    source = 'sidepanel',
    className,
    style,
    dragThreshold = DRAG_CONSTANTS.DEFAULT_DRAG_THRESHOLD,
}: SeamlessDragProps) => {
    const dispatch = useAppDispatch()
    const track = useTracker()

    // Element ref for source element access
    const elementRef = useRef<HTMLElement | null>(null)

    // Track the current pointer type for threshold adjustment
    const [currentPointerType, setCurrentPointerType] = React.useState<string>('touch')

    // Drag preview management
    const { showPreview, hidePreview, updatePreviewPosition } = useDragPreview()

    // Drag activation logic
    const activateDragMode = useCallback(
        (position: { x: number; y: number }) => {
            if (!enabled) return

            // Add overscroll prevention class to content container
            const contentContainer = document.querySelector('[data-drag-drop-container="true"]')
            if (contentContainer) {
                contentContainer.classList.add('drag-active-no-overscroll')
            }

            // Haptic feedback if available
            if ('vibrate' in navigator) {
                navigator.vibrate(DRAG_CONSTANTS.HAPTIC_FEEDBACK_DURATION)
            }

            // Change cursor
            document.body.style.cursor = DRAG_CONSTANTS.CURSORS.GRABBING

            // Show drag preview with source element and position
            showPreview({
                productData,
                sourceElement: elementRef.current || undefined,
                useExistingImage: true,
                position, // Use the provided position
            })

            // Redux actions
            dispatch(dragProductStart({ productData, source }))
            dispatch(setDropZoneActive(true))

            // Tracking
            track.click({
                target: 'product-item-seamless-drag',
                attributes: {
                    ...getProductTrackingInfo(productData),
                    actionType: 'seamless-drag-activated',
                    variant: 'seamless-drag',
                },
            })

            // Optional callback
            onDragStart?.(productData)
        },
        [enabled, productData, source, dispatch, track, onDragStart, showPreview],
    )

    // Drag deactivation logic
    const deactivateDragMode = useCallback(() => {
        // Remove overscroll prevention class from content container
        const contentContainer = document.querySelector('[data-drag-drop-container="true"]')
        if (contentContainer) {
            contentContainer.classList.remove('drag-active-no-overscroll')
        }

        // Reset cursor
        document.body.style.cursor = DRAG_CONSTANTS.CURSORS.DEFAULT

        // Hide preview
        hidePreview()

        // Reset Redux state
        dispatch(dragProductEnd())
        dispatch(setDropZoneActive(false))

        // Optional callback
        onDragEnd?.()
    }, [hidePreview, dispatch, onDragEnd, productData.id])

    // Handle drag end with drop detection
    const handleDragEnd = useCallback(
        (e?: PointerEvent) => {
            if (!e) return

            // Find drop target
            const dropTarget = document.elementFromPoint(e.clientX, e.clientY)
            const dropZone = dropTarget?.closest('[data-drop-zone="true"]')

            if (dropZone) {
                // Check for self-drag: if the drop target is the same element being dragged
                const sourceElement = elementRef.current
                const isSelfDrag =
                    sourceElement &&
                    (dropTarget === sourceElement ||
                        sourceElement.contains(dropTarget) ||
                        dropTarget?.closest('[data-drag-enabled="true"]') === sourceElement)

                if (isSelfDrag) {
                    // Track self-drag attempt (cancelled)
                    track.click({
                        target: 'product-item-seamless-drag',
                        attributes: {
                            ...getProductTrackingInfo(productData),
                            actionType: 'seamless-drag-self-drop-cancel',
                            variant: 'seamless-drag',
                        },
                    })
                } else {
                    // Handle successful drop to different target
                    const dropEvent = new CustomEvent(DRAG_CONSTANTS.EVENTS.TOUCH_DROP, {
                        detail: {
                            dragData: {
                                type: 'product',
                                productData,
                                source,
                            } as DragTransferData,
                            touch: {
                                clientX: e.clientX,
                                clientY: e.clientY,
                            },
                        },
                    })

                    dropZone.dispatchEvent(dropEvent)

                    // Track successful drop
                    track.click({
                        target: 'product-item-seamless-drag',
                        attributes: {
                            ...getProductTrackingInfo(productData),
                            actionType: 'seamless-drag-drop-success',
                            variant: 'seamless-drag',
                        },
                    })
                }
            } else {
                // Track cancelled drop
                track.click({
                    target: 'product-item-seamless-drag',
                    attributes: {
                        ...getProductTrackingInfo(productData),
                        actionType: 'seamless-drag-drop-cancel',
                        variant: 'seamless-drag',
                    },
                })
            }

            // Call deactivation
            deactivateDragMode()
        },
        [productData, source, track, deactivateDragMode],
    )

    // Drag gesture detection
    // Use 0 threshold for mouse, default threshold for touch
    // Default to touch behavior for safety
    const effectiveDragThreshold = currentPointerType === 'mouse' ? 0 : dragThreshold

    const { isDragging, handlePointerDown, touchAction } = useDragGesture({
        enabled,
        dragThreshold: effectiveDragThreshold,
        pointerType: currentPointerType,
        onDragStart: activateDragMode,
        onDragEnd: handleDragEnd,
        onDragMove: (position) => {
            updatePreviewPosition(position.x, position.y)
        },
    })

    // Handle escape key to cancel drag
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isDragging) {
                e.preventDefault()
                e.stopPropagation()

                // Track escape cancellation
                track.click({
                    target: 'product-item-seamless-drag',
                    attributes: {
                        ...getProductTrackingInfo(productData),
                        actionType: 'seamless-drag-escape-cancel',
                        variant: 'seamless-drag',
                    },
                })

                // Call the wrapper's deactivation which handles all UI state
                deactivateDragMode()
            }
        }

        if (isDragging) {
            document.addEventListener('keydown', handleKeyDown)
            return () => {
                document.removeEventListener('keydown', handleKeyDown)
            }
        }

        return undefined
    }, [isDragging, deactivateDragMode, track, productData])

    // Enhanced pointer down handler
    const enhancedPointerDown = useCallback(
        (e: React.PointerEvent) => {
            // Capture pointer type
            setCurrentPointerType(e.pointerType || 'mouse')

            // The useDragGesture hook will handle all pointer events including position updates
            handlePointerDown(e)
        },
        [handlePointerDown],
    )

    // Memoized child element enhancement
    const enhancedChild = useMemo(() => {
        if (!enabled) {
            return <>{children}</>
        }

        const childElement = React.Children.only(children) as React.ReactElement

        // Check if the child can accept refs (not a function component without forwardRef)
        const canAcceptRef =
            typeof childElement.type !== 'function' ||
            (React.isValidElement(childElement) &&
                (childElement.type as React.ComponentType & { $typeof?: symbol }).$typeof ===
                    Symbol.for('react.forward_ref'))

        const cloneProps: React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> } = {
            ...childElement.props,
            onPointerDown: enhancedPointerDown,
            'data-drag-enabled': 'true',
            className: classNames(
                childElement.props.className,
                'ProductItem',
                'product-item-group',
                className,
                DRAG_CONSTANTS.CSS_CLASSES.SEAMLESS_DRAG_ENABLED,
                { [DRAG_CONSTANTS.CSS_CLASSES.SEAMLESS_DRAG_ACTIVATED]: isDragging },
            ),
            style: {
                ...childElement.props.style,
                ...style,
                touchAction,
                // Ensure pointer events work for hover
                pointerEvents: 'auto',
            },
        }

        // Only add ref if the component can accept it
        if (canAcceptRef) {
            cloneProps.ref = (el: HTMLElement | null) => {
                // Store element reference for drag preview
                elementRef.current = el

                // Handle existing ref
                const originalRef = (childElement as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref
                if (typeof originalRef === 'function') {
                    originalRef(el)
                } else if (
                    originalRef &&
                    typeof originalRef === 'object' &&
                    originalRef !== null &&
                    'current' in originalRef
                ) {
                    ;(originalRef as React.MutableRefObject<HTMLElement | null>).current = el
                }
            }
        }

        return React.cloneElement(childElement, cloneProps)
    }, [enabled, children, className, style, enhancedPointerDown, isDragging, touchAction])

    return <DragErrorBoundary>{enhancedChild}</DragErrorBoundary>
}

export default DragWrapper
