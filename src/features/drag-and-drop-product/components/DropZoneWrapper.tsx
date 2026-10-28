import React, { useState, useCallback } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import { useAppDispatch, useAppSelector } from 'hooks'
import { useTracker } from 'apps/TrackingBoundary'
import type { ProductData } from 'models/furniture'
import { setDropZoneActive, placeProductViaDragDrop } from '../redux/slice'
import type { DragTransferData } from '../redux/types'
import './DropZoneWrapper.scss'

type DropZoneWrapperProps = {
    children: React.ReactNode
    onDrop?: (productData: ProductData, source: string) => void
    acceptedTypes?: string[]
    showDropFeedback?: boolean
    className?: string
    dropMessage?: string
    style?: React.CSSProperties
}

const DropZoneWrapper = ({
    children,
    onDrop,
    acceptedTypes = ['product'],
    showDropFeedback = true,
    className,
    dropMessage,
    style,
}: DropZoneWrapperProps) => {
    const { t } = useTranslation()
    const defaultDropMessage = dropMessage || t('design.drop to add to room')
    const [isDragOver, setIsDragOver] = useState(false)
    const [, setDragCounter] = useState(0)
    const dispatch = useAppDispatch()
    const track = useTracker()
    const dropZoneRef = React.useRef<HTMLElement | null>(null)

    // Get global drop zone active state from Redux - this will be true for any drag (mouse or touch)
    const isDropZoneGloballyActive = useAppSelector((state) => state.dragDrop.isDropZoneActive)

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        // eslint-disable-next-line i18next/no-literal-string
        const dropEffect = 'copy'
        e.dataTransfer.dropEffect = dropEffect
    }, [])

    const handleDragEnter = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()

            // Use counter to handle multiple drag enter/leave events
            setDragCounter((prev) => {
                const newCount = prev + 1
                if (newCount === 1) {
                    setIsDragOver(true)
                    dispatch(setDropZoneActive(true))
                }
                return newCount
            })
        },
        [dispatch],
    )

    const handleDragLeave = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()

            setDragCounter((prev) => {
                const newCount = prev - 1
                if (newCount === 0) {
                    setIsDragOver(false)
                    dispatch(setDropZoneActive(false))
                }
                return newCount
            })
        },
        [dispatch],
    )

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()

            // Reset drag state
            setIsDragOver(false)
            setDragCounter(0)
            dispatch(setDropZoneActive(false))

            try {
                // eslint-disable-next-line i18next/no-literal-string
                const dataTransferType = 'application/json'
                const dragDataString = e.dataTransfer.getData(dataTransferType)
                if (!dragDataString) {
                    // eslint-disable-next-line i18next/no-literal-string
                    const warningMessage = 'No drag data found'
                    // eslint-disable-next-line no-console
                    console.warn(warningMessage)
                    // eslint-disable-next-line i18next/no-literal-string
                    Sentry.captureMessage(`Drag operation warning: ${warningMessage}`, 'warning')
                    return
                }

                const dragData: DragTransferData = JSON.parse(dragDataString)

                // Validate drag data type
                if (!acceptedTypes.includes(dragData.type)) {
                    // eslint-disable-next-line i18next/no-literal-string
                    const warningMessage = `Drag type ${
                        dragData.type
                    } not accepted. Accepted types: ${acceptedTypes.join(', ')}`
                    // eslint-disable-next-line no-console
                    console.warn(warningMessage)
                    // eslint-disable-next-line i18next/no-literal-string
                    Sentry.captureMessage(`Drag operation warning: ${warningMessage}`, 'warning')
                    return
                }

                // Validate product data
                if (!dragData.productData || !dragData.productData.id) {
                    // eslint-disable-next-line i18next/no-literal-string
                    const warningMessage = 'Invalid product data in drag operation'
                    // eslint-disable-next-line no-console
                    console.warn(warningMessage)
                    // eslint-disable-next-line i18next/no-literal-string
                    Sentry.captureMessage(`Drag operation warning: ${warningMessage}`, 'warning')
                    return
                }

                // Place the product using the drag-drop thunk action
                dispatch(
                    placeProductViaDragDrop({
                        productData: dragData.productData,
                        source: dragData.source,
                        actionType: 'Drag & Drop',
                    }),
                )

                // Track successful drop
                track.click({
                    target: 'design-canvas-drop',
                    attributes: {
                        productId: dragData.productData.id,
                        source: dragData.source,
                        actionType: 'Drag & Drop',
                    },
                })

                // Call the onDrop callback
                onDrop?.(dragData.productData, dragData.source)
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error processing drop:', error)
                Sentry.captureException(error, {
                    contexts: {
                        dragOperation: {
                            component: 'DropZoneWrapper',
                            operation: 'drop',
                            acceptedTypes,
                        },
                    },
                })
            }
        },
        [acceptedTypes, dispatch, onDrop, track],
    )

    const handleTouchDrop = useCallback(
        (e: CustomEvent) => {
            const { dragData } = e.detail as { dragData: DragTransferData; touch: { clientX: number; clientY: number } }

            try {
                // Validate drag data type
                if (!acceptedTypes.includes(dragData.type)) {
                    // eslint-disable-next-line i18next/no-literal-string
                    const warningMessage = `Touch drag type ${
                        dragData.type
                    } not accepted. Accepted types: ${acceptedTypes.join(', ')}`
                    // eslint-disable-next-line no-console
                    console.warn(warningMessage)
                    // eslint-disable-next-line i18next/no-literal-string
                    Sentry.captureMessage(`Touch drag operation warning: ${warningMessage}`, 'warning')
                    return
                }

                // Validate product data
                if (!dragData.productData || !dragData.productData.id) {
                    // eslint-disable-next-line i18next/no-literal-string
                    const warningMessage = 'Invalid product data in touch drag operation'
                    // eslint-disable-next-line no-console
                    console.warn(warningMessage)
                    // eslint-disable-next-line i18next/no-literal-string
                    Sentry.captureMessage(`Touch drag operation warning: ${warningMessage}`, 'warning')
                    return
                }

                // Place the product using the drag-drop thunk action

                // Dispatch the product placement
                dispatch(
                    placeProductViaDragDrop({
                        productData: dragData.productData,
                        source: dragData.source,
                        // eslint-disable-next-line i18next/no-literal-string
                        actionType: 'Touch Drag & Drop',
                    }),
                )

                // Track successful touch drop
                track.click({
                    target: 'design-canvas-touch-drop',
                    attributes: {
                        productId: dragData.productData.id,
                        source: dragData.source,
                        // eslint-disable-next-line i18next/no-literal-string
                        actionType: 'Touch Drag & Drop',
                    },
                })

                // Call the onDrop callback
                onDrop?.(dragData.productData, dragData.source)
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error processing touch drop:', error)
                Sentry.captureException(error, {
                    contexts: {
                        dragOperation: {
                            component: 'DropZoneWrapper',
                            operation: 'touch-drop',
                            acceptedTypes,
                        },
                    },
                })
            }
        },
        [acceptedTypes, dispatch, onDrop, track],
    )

    // Set up touch drop event listener
    React.useEffect(() => {
        const element = dropZoneRef.current
        if (!element) return undefined

        element.addEventListener('touch-drop', handleTouchDrop as EventListener)

        return () => {
            element.removeEventListener('touch-drop', handleTouchDrop as EventListener)
        }
    }, [handleTouchDrop])

    // For drop zone, we need to wrap in a container with position relative
    // to properly position the overlay
    const childElement = React.Children.only(children) as React.ReactElement

    return React.cloneElement(childElement, {
        ...childElement.props,
        ref: (el: HTMLElement) => {
            dropZoneRef.current = el
            // Handle existing ref if present
            const originalRef = (childElement as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref
            if (typeof originalRef === 'function') {
                originalRef(el)
            } else if (originalRef && 'current' in originalRef) {
                ;(originalRef as React.MutableRefObject<HTMLElement>).current = el
            }
        },
        onDragOver: handleDragOver,
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        'data-drop-zone': 'true', // Add data attribute for touch drop detection
        className: classNames(childElement.props.className, className, {
            'drag-over': (isDragOver || isDropZoneGloballyActive) && showDropFeedback,
        }),
        style: {
            ...childElement.props.style,
            ...style,
            // eslint-disable-next-line i18next/no-literal-string
            position: 'relative',
        },
        children: (
            <>
                {childElement.props.children}
                {(isDragOver || isDropZoneGloballyActive) && showDropFeedback && (
                    <div className="drop-zone-overlay">
                        <div className="drop-zone-message">
                            <span className="drop-zone-message-icon">📦</span>
                            {defaultDropMessage}
                        </div>
                    </div>
                )}
            </>
        ),
    })
}

export default DropZoneWrapper
