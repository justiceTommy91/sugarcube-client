import React, { useRef, useCallback } from 'react'
import classNames from 'classnames'
import { useDrawerDrag } from './hooks/useDrawerDrag'
import './BottomSheet.scss'

/** Top position (px) when the sheet is fully expanded. */
const DEFAULT_EXPANDED_TOP_PX = 56 // 3.5rem

export interface BottomSheetProps {
    /** Whether the sheet is mounted and visible. */
    open: boolean
    onClose: () => void

    /**
     * 'snap'    - sheet snaps between collapsed and expanded (SearchDrawer behaviour).
     * 'dismiss' - swipe-down always dismisses entirely via onClose().
     */
    dismissMode?: 'snap' | 'dismiss'

    /** When true, renders a translucent backdrop. Clicking it calls onClose(). */
    overlay?: boolean

    /** When true, raises the sheet above the overlay (z-drawer-top). Use for drawers that stack above a backdrop. */
    elevated?: boolean

    /**
     * Non-scrolling content rendered between the handle and the scrollable area.
     * Use this for sticky headers (e.g. a search button) that should stay visible
     * while the content area scrolls — mirrors the original SearchDrawer layout.
     */
    header?: React.ReactNode

    /** Fixed content rendered below the scrollable area. */
    footer?: React.ReactNode

    /** px position for the fully-expanded state. Defaults to 56 (3.5rem). */
    expandedTop?: number

    /**
     * px position for the collapsed state (snap mode only).
     * Required when dismissMode === 'snap'.
     */
    collapsedTop?: number

    /** Called on scroll events in the content area (e.g. to auto-expand). */
    onContentScroll?: () => void

    children: React.ReactNode
}

export interface BottomSheetHandle {
    expand: () => void
    collapse: () => void
    /** Scroll the content area — use to reset scroll position on query clear. */
    scrollContentTo: (options: ScrollToOptions) => void
}

/**
 * Reusable bottom-sheet shell with drag-to-snap/dismiss gesture, optional overlay,
 * and an optional fixed footer slot.
 *
 * Two modes:
 *  - snap (default): snaps between collapsedTop and expandedTop — SearchDrawer behaviour.
 *  - dismiss: swipe-down from the handle (or overscroll from content) calls onClose().
 */
export const BottomSheet = React.forwardRef<BottomSheetHandle, BottomSheetProps>(
    (
        {
            open,
            onClose,
            dismissMode = 'snap',
            overlay = false,
            elevated = false,
            header,
            footer,
            expandedTop = DEFAULT_EXPANDED_TOP_PX,
            collapsedTop = 0,
            onContentScroll,
            children,
        },
        ref,
    ) => {
        const contentRef = useRef<HTMLDivElement>(null)

        const {
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
        } = useDrawerDrag(collapsedTop, expandedTop, contentRef, dismissMode === 'dismiss' ? onClose : undefined, open)

        // Expose expand/collapse/scrollContentTo imperatively for the parent (e.g. SearchDrawer).
        React.useImperativeHandle(
            ref,
            () => ({
                expand,
                collapse,
                scrollContentTo: (options: ScrollToOptions) => contentRef.current?.scrollTo(options),
            }),
            [expand, collapse],
        )

        const handleContentScroll = useCallback(() => {
            if (dismissMode === 'snap' && !isExpandedRef.current) expand()
            onContentScroll?.()
        }, [dismissMode, isExpandedRef, expand, onContentScroll])

        return (
            <>
                {overlay && (
                    <div
                        className={classNames('BottomSheet-overlay', { 'BottomSheet-overlay--open': open })}
                        onClick={onClose}
                    />
                )}
                <div
                    ref={drawerRef}
                    className={classNames('BottomSheet', {
                        'BottomSheet--open': open,
                        'BottomSheet--elevated': elevated,
                    })}
                    style={{ top: `${dismissMode === 'dismiss' ? expandedTop : collapsedTop}px` }}
                >
                    <div
                        ref={handleRef}
                        className="BottomSheet__handle-area"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        onTouchCancel={onTouchEnd}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                    >
                        <div className="BottomSheet__handle-pill" />
                    </div>

                    {header && <div className="BottomSheet__header">{header}</div>}

                    <div ref={contentRef} className="BottomSheet__content" onScroll={handleContentScroll}>
                        {children}
                    </div>

                    {footer && <div className="BottomSheet__footer">{footer}</div>}
                </div>
            </>
        )
    },
)
