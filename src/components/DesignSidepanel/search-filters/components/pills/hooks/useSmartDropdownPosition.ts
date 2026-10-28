import { useLayoutEffect, useState, useRef } from 'react'

// Constants for dropdown positioning calculations
const DEFAULT_OFFSET = 8 // Default spacing between trigger and dropdown
const DEFAULT_FALLBACK_WIDTH = 300 // Fallback width when dropdown width is 0
const SIDE_PANEL_MARGIN = 40 // Margin for dropdown within side panel
const VIEWPORT_MARGIN = 20 // Margin from viewport/container edges
const DEBOUNCE_DELAY = 50 // Delay for debouncing position calculations

export type DropdownPosition = {
    top?: number
    bottom?: number
    left?: number
    right?: number
    maxHeight?: number
    position: 'fixed' | 'absolute'
}

export type UseSmartDropdownPositionOptions = {
    /** Reference to the trigger element that opens the dropdown */
    triggerRef: React.RefObject<HTMLElement>
    /** Reference to the dropdown content element */
    dropdownRef: React.RefObject<HTMLElement>
    /** Whether the dropdown is currently open */
    isOpen: boolean
    /** Offset in pixels from the trigger element (default: DEFAULT_OFFSET) */
    offset?: number
    /** CSS selector for the container element (default: '.DesignSidepanel') */
    containerSelector?: string
}

function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T, delay: number) {
    let timer: ReturnType<typeof setTimeout> | null = null

    const debouncedFn = function debouncedFunction(...args: Parameters<T>) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }

    debouncedFn.cancel = () => {
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
    }

    return debouncedFn
}

/**
 * Smart dropdown positioning hook that automatically positions dropdowns
 * to avoid viewport and container boundaries.
 *
 * @param options - Configuration options for dropdown positioning
 * @returns Position object with CSS properties for dropdown placement
 */
export const useSmartDropdownPosition = ({
    triggerRef,
    dropdownRef,
    isOpen,
    offset = DEFAULT_OFFSET,
    containerSelector = '.DesignSidepanel',
}: UseSmartDropdownPositionOptions): DropdownPosition => {
    // SSR guard
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

    const [position, setPosition] = useState<DropdownPosition>({
        position: 'absolute',
        top: 0,
        left: 0,
    })

    // Debounced position calculation
    const calculatePositionRef = useRef<() => void>()

    useLayoutEffect(() => {
        if (!isBrowser || !isOpen || !triggerRef.current || !dropdownRef.current) {
            return () => {}
        }

        const container = document.querySelector(containerSelector) as HTMLElement | null

        // Helper functions for position calculation
        const calculateSpaceAvailable = (triggerRect: DOMRect, containerRect: DOMRect) => ({
            below: containerRect.bottom - triggerRect.bottom,
            above: triggerRect.top - containerRect.top,
            right: containerRect.right - triggerRect.left,
            left: triggerRect.right - containerRect.left,
        })

        const determineVerticalPlacement = (
            space: ReturnType<typeof calculateSpaceAvailable>,
            dropdownHeight: number,
        ) => ({
            preferBottom: space.below >= dropdownHeight + offset,
            preferTop: space.above >= dropdownHeight + offset,
            shouldPlaceBelow: space.below >= dropdownHeight + offset || space.below > space.above,
        })

        const determineHorizontalPlacement = (
            space: ReturnType<typeof calculateSpaceAvailable>,
            dropdownWidth: number,
            sidePanelWidth: number,
        ) => ({
            preferWithinSidePanel: dropdownWidth <= sidePanelWidth - SIDE_PANEL_MARGIN,
            preferRight: space.right >= dropdownWidth,
            preferLeft: space.left >= dropdownWidth,
        })

        const calculateVerticalPosition = (
            shouldPlaceBelow: boolean,
            triggerRect: DOMRect,
            space: ReturnType<typeof calculateSpaceAvailable>,
            viewportHeight: number,
        ): Pick<DropdownPosition, 'top' | 'bottom' | 'maxHeight'> => {
            if (shouldPlaceBelow) {
                return {
                    top: triggerRect.bottom + offset,
                    maxHeight: space.below - offset - VIEWPORT_MARGIN,
                }
            }
            return {
                bottom: viewportHeight - triggerRect.top + offset,
                maxHeight: space.above - offset - VIEWPORT_MARGIN,
            }
        }

        const calculateHorizontalPosition = (
            preferences: ReturnType<typeof determineHorizontalPlacement>,
            triggerRect: DOMRect,
            containerRect: DOMRect,
            dropdownWidth: number,
            viewportWidth: number,
        ): Pick<DropdownPosition, 'left' | 'right'> => {
            if (preferences.preferWithinSidePanel) {
                const leftAligned = triggerRect.left
                const rightAligned = triggerRect.right - dropdownWidth

                if (leftAligned + dropdownWidth <= containerRect.right - VIEWPORT_MARGIN) {
                    return { left: leftAligned }
                }
                if (rightAligned >= containerRect.left + VIEWPORT_MARGIN) {
                    return { left: rightAligned }
                }
                return {
                    left: containerRect.left + VIEWPORT_MARGIN,
                    right: viewportWidth - containerRect.right + VIEWPORT_MARGIN,
                }
            }
            if (preferences.preferRight) {
                return { left: triggerRect.left }
            }
            if (preferences.preferLeft) {
                return { right: viewportWidth - triggerRect.right }
            }
            return { left: containerRect.left + VIEWPORT_MARGIN }
        }

        const calculatePosition = () => {
            const trigger = triggerRef.current
            const dropdown = dropdownRef.current
            if (!trigger || !dropdown) return

            // Fallback for missing container
            if (!container) {
                setPosition({
                    position: `absolute`,
                    top: trigger.offsetHeight + offset,
                    left: 0,
                })
                return
            }

            // Get all required measurements
            const triggerRect = trigger.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()
            const dropdownRect = dropdown.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const viewportWidth = window.innerWidth

            // Calculate space and preferences
            const space = calculateSpaceAvailable(triggerRect, containerRect)
            const dropdownWidth = dropdownRect.width > 0 ? dropdownRect.width : DEFAULT_FALLBACK_WIDTH
            const dropdownHeight = dropdownRect.height

            const verticalPreferences = determineVerticalPlacement(space, dropdownHeight)
            const horizontalPreferences = determineHorizontalPlacement(space, dropdownWidth, containerRect.width)

            // Calculate final position
            const verticalPosition = calculateVerticalPosition(
                verticalPreferences.shouldPlaceBelow,
                triggerRect,
                space,
                viewportHeight,
            )

            const horizontalPosition = calculateHorizontalPosition(
                horizontalPreferences,
                triggerRect,
                containerRect,
                dropdownWidth,
                viewportWidth,
            )

            setPosition({
                position: `fixed`,
                ...verticalPosition,
                ...horizontalPosition,
            })
        }

        // Debounce calculation for performance (but not the initial one)
        const debouncedCalculatePosition = debounce(calculatePosition, DEBOUNCE_DELAY)
        calculatePositionRef.current = debouncedCalculatePosition

        // Initial calculation - immediate, no debounce
        calculatePosition()

        // Listen for resize and scroll events
        window.addEventListener('resize', debouncedCalculatePosition)
        window.addEventListener('scroll', debouncedCalculatePosition, true)

        // Only add container listener if container exists
        if (container) {
            container.addEventListener('scroll', debouncedCalculatePosition, true)
        }

        return () => {
            window.removeEventListener('resize', debouncedCalculatePosition)
            window.removeEventListener('scroll', debouncedCalculatePosition, true)

            // Safe cleanup - container might not exist during unmount
            if (container) {
                container.removeEventListener('scroll', debouncedCalculatePosition, true)
            }

            // Cancel any pending debounced calls
            debouncedCalculatePosition.cancel()
        }
    }, [isBrowser, isOpen, offset, containerSelector, triggerRef, dropdownRef])

    return position
}
