import React, { useRef, useEffect } from 'react'
import classNames from 'classnames'

import './Popover.scss'

type PopoverProps = {
    isExpanded: boolean
    collapsedHeight: number
    onExpandedChange: (expanded: boolean) => void
    children: React.ReactNode
    contentRef?: React.MutableRefObject<HTMLDivElement | null>
    /** Render as a full-height right side panel. Drag/handle are disabled. */
    isSidebar?: boolean
}

const Popover = ({
    isExpanded,
    onExpandedChange,
    collapsedHeight,
    children,
    contentRef,
    isSidebar = false,
}: PopoverProps) => {
    const [dragStartY, setDragStartY] = React.useState<number | null>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const [currentHeight, setCurrentHeight] = React.useState(collapsedHeight)
    const [dragStartHeight, setDragStartHeight] = React.useState(collapsedHeight)
    const [isDraggingContent, setIsDraggingContent] = React.useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const currentHeightRef = useRef(currentHeight)
    currentHeightRef.current = currentHeight
    const [maxHeight, setMaxHeight] = React.useState(window.innerHeight * 0.75)

    useEffect(() => {
        const handleResize = () => {
            setMaxHeight(window.innerHeight * 0.75)
        }

        window.addEventListener(`resize`, handleResize)
        return () => window.removeEventListener(`resize`, handleResize)
    }, [])

    // Keep currentHeight in sync when isExpanded changes from outside (e.g. product click).
    useEffect(() => {
        if (!isDragging) {
            setCurrentHeight(isExpanded ? maxHeight : collapsedHeight)
        }
    }, [isExpanded, isDragging, maxHeight, collapsedHeight])

    useEffect(() => {
        if (!isExpanded && contentRef?.current) {
            // eslint-disable-next-line no-param-reassign
            contentRef.current.scrollTop = 0
        }
    }, [isExpanded, contentRef])

    // Publish current sheet height to the FindMyFitViewer root so siblings
    // (e.g. CarouselDots) can position themselves above the popover via CSS.
    // Cleared in sidebar mode and on unmount.
    useEffect(() => {
        const root = containerRef.current?.closest(`.FindMyFitViewer`) as HTMLElement | null
        if (!root) return undefined
        if (isSidebar) {
            root.style.removeProperty(`--fmf-popover-h`)
        } else {
            root.style.setProperty(`--fmf-popover-h`, `${currentHeight}px`)
        }
        return () => {
            root.style.removeProperty(`--fmf-popover-h`)
        }
    }, [isSidebar, currentHeight])

    useEffect(() => {
        // Sidebar is fixed height, no drag interaction.
        if (isSidebar) return undefined
        // Only attach document listeners when tracking a drag.
        if (!isDraggingContent && !isDragging) {
            return undefined
        }

        const handleMove = (e: TouchEvent | MouseEvent) => {
            if (dragStartY !== null) {
                const clientY = `touches` in e ? e.touches[0].clientY : e.clientY
                const deltaY = dragStartY - clientY // positive = drag up, negative = drag down
                const absDeltaY = Math.abs(deltaY)

                if (absDeltaY < 10) {
                    return
                }

                if (!isExpanded && isDraggingContent) {
                    if (deltaY > 0) {
                        e.preventDefault()
                        setIsDragging(true)
                        onExpandedChange(true)
                    }
                    return
                }

                if (isExpanded && isDraggingContent && contentRef?.current) {
                    const isAtTop = contentRef.current.scrollTop === 0

                    // Collapse when dragging down while already scrolled to top.
                    if (deltaY < 0 && isAtTop) {
                        e.preventDefault()
                        setIsDragging(true)
                        onExpandedChange(false)
                        return
                    }

                    return
                }

                if (!isDraggingContent && isDragging) {
                    e.preventDefault()
                    const newHeight = Math.max(collapsedHeight, Math.min(maxHeight, dragStartHeight + deltaY))
                    setCurrentHeight(newHeight)
                }
            }
        }

        const handleEnd = () => {
            if (isDragging && !isDraggingContent) {
                const midpoint = (collapsedHeight + maxHeight) / 2
                const shouldBeExpanded = currentHeightRef.current > midpoint

                if (shouldBeExpanded !== isExpanded) {
                    onExpandedChange(shouldBeExpanded)
                }
            }

            setIsDragging(false)
            setIsDraggingContent(false)
            setDragStartY(null)
        }

        document.addEventListener(`touchmove`, handleMove, { passive: false })
        document.addEventListener(`touchend`, handleEnd)
        document.addEventListener(`mousemove`, handleMove)
        document.addEventListener(`mouseup`, handleEnd)

        return () => {
            document.removeEventListener(`touchmove`, handleMove, { passive: false } as EventListenerOptions)
            document.removeEventListener(`touchend`, handleEnd)
            document.removeEventListener(`mousemove`, handleMove)
            document.removeEventListener(`mouseup`, handleEnd)
        }
    }, [
        isDragging,
        dragStartY,
        dragStartHeight,
        isExpanded,
        collapsedHeight,
        maxHeight,
        onExpandedChange,
        isDraggingContent,
        contentRef,
    ])

    const handleStartCore = (target: HTMLElement, clientY: number, preventDefault: () => void) => {
        const isContentArea = contentRef?.current?.contains(target)

        if (!isContentArea) {
            preventDefault()
            setIsDragging(true)
        } else {
            setIsDragging(false)
        }

        setIsDraggingContent(!!isContentArea)
        setDragStartY(clientY)
        setDragStartHeight(currentHeightRef.current)
    }

    // Register touchstart as non-passive so preventDefault works.
    // handleStartCore reads from refs so the mount-only closure stays fresh.
    useEffect(() => {
        if (isSidebar) return undefined
        const el = containerRef.current
        if (!el) return undefined
        const onTouchStart = (e: TouchEvent) => {
            handleStartCore(e.target as HTMLElement, e.touches[0].clientY, () => e.preventDefault())
        }
        el.addEventListener(`touchstart`, onTouchStart, { passive: false })
        return () => el.removeEventListener(`touchstart`, onTouchStart)
    }, [isSidebar]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleMouseDown = (e: React.MouseEvent) => {
        handleStartCore(e.target as HTMLElement, e.clientY, () => e.preventDefault())
    }

    const handleDragHandleClick = () => {
        // Ignore clicks that are part of a drag gesture.
        if (!isDragging) {
            const newExpanded = !isExpanded
            onExpandedChange(newExpanded)
            setCurrentHeight(newExpanded ? maxHeight : collapsedHeight)
        }
    }

    return (
        <div
            ref={containerRef}
            className={classNames('Popover', {
                'Popover--expanded': !isSidebar && currentHeight > collapsedHeight + 50,
                'Popover--sidebar': isSidebar,
            })}
            style={
                isSidebar
                    ? undefined
                    : {
                          height: `${currentHeight}px`,
                          transition: isDragging ? `none` : `height 0.3s ease-out`,
                      }
            }
            onMouseDown={isSidebar ? undefined : handleMouseDown}
        >
            {!isSidebar && (
                <div className="Popover__handle" onClick={handleDragHandleClick}>
                    <div className="Popover__handle-bar" />
                </div>
            )}

            <div
                className="Popover__content"
                style={
                    isSidebar
                        ? { overflowY: `auto` }
                        : {
                              maxHeight: `${currentHeight - 60}px`,
                              overflowY: `auto`,
                          }
                }
                ref={contentRef}
            >
                {children}
            </div>
        </div>
    )
}

export default Popover
