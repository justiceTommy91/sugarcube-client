import { useCallback, useEffect, useRef, useState } from 'react'
import { useItemLoaded } from './useItemLoaded'

const SWIPE_TOOLTIP_SEEN = 'fmf_swipe_tooltip_seen'
const TAP_TOOLTIP_SEEN = 'fmf_tap_tooltip_seen'
const DRAW_TOOLTIP_SEEN = 'fmf_draw_tooltip_seen'

const SWIPE_TOOLTIP_DELAY_MS = 2000
const TAP_TOOLTIP_SWIPE_THRESHOLD = 4
const TAP_TOOLTIP_SHOW_DELAY_MS = 3000
const TAP_TOOLTIP_DISMISS_MS = 3000
const DRAW_TOOLTIP_DELAY_MS = 2000

type UseViewerTooltipsArgs = {
    isViewing: boolean
    isDrawing: boolean
}

export type UseViewerTooltipsReturn = {
    showSwipeTooltip: boolean
    showTapTooltip: boolean
    showDrawTooltip: boolean
    onSwipe: () => void
    onItemTapped: () => void
    onDraw: () => void
}

export function useViewerTooltips({ isViewing, isDrawing }: UseViewerTooltipsArgs): UseViewerTooltipsReturn {
    const [showSwipeTooltip, setShowSwipeTooltip] = useState(false)
    const [showTapTooltip, setShowTapTooltip] = useState(false)
    const [showDrawTooltip, setShowDrawTooltip] = useState(false)
    const [tapLoadEnabled, setTapLoadEnabled] = useState(false)

    const productViewCountRef = useRef(0)
    const swipeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const tapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const drawTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    // Refs so callbacks can read current tooltip state without stale closures
    const showSwipeTooltipRef = useRef(false)
    const showTapTooltipRef = useRef(false)
    const showDrawTooltipRef = useRef(false)
    showSwipeTooltipRef.current = showSwipeTooltip
    showTapTooltipRef.current = showTapTooltip
    showDrawTooltipRef.current = showDrawTooltip

    // Show swipe tooltip 2s after the first item loads (once per session)
    const isFirstItemLoaded = useItemLoaded(isViewing)
    useEffect(() => {
        swipeTimerRef.current =
            isFirstItemLoaded && !sessionStorage.getItem(SWIPE_TOOLTIP_SEEN)
                ? setTimeout(() => setShowSwipeTooltip(true), SWIPE_TOOLTIP_DELAY_MS)
                : undefined
        return () => clearTimeout(swipeTimerRef.current)
    }, [isFirstItemLoaded])

    // Show tap tooltip after an item loads following the swipe threshold (once per session)
    const isTapItemLoaded = useItemLoaded(tapLoadEnabled)
    useEffect(() => {
        tapTimerRef.current =
            isTapItemLoaded && !sessionStorage.getItem(TAP_TOOLTIP_SEEN)
                ? setTimeout(() => {
                      setShowTapTooltip(true)
                      setTapLoadEnabled(false)
                  }, TAP_TOOLTIP_SHOW_DELAY_MS)
                : undefined
        return () => clearTimeout(tapTimerRef.current)
    }, [isTapItemLoaded])

    // Auto-dismiss tap tooltip
    useEffect(() => {
        const timer = showTapTooltip
            ? setTimeout(() => {
                  sessionStorage.setItem(TAP_TOOLTIP_SEEN, '1')
                  setShowTapTooltip(false)
              }, TAP_TOOLTIP_DISMISS_MS)
            : undefined
        return () => clearTimeout(timer)
    }, [showTapTooltip])

    // Show draw tooltip 2s after entering drawing phase (once per session)
    useEffect(() => {
        drawTimerRef.current =
            isDrawing && !sessionStorage.getItem(DRAW_TOOLTIP_SEEN)
                ? setTimeout(() => setShowDrawTooltip(true), DRAW_TOOLTIP_DELAY_MS)
                : undefined
        return () => clearTimeout(drawTimerRef.current)
    }, [isDrawing])

    // Reset when leaving viewing phase
    useEffect(() => {
        if (!isViewing) {
            setTapLoadEnabled(false)
            productViewCountRef.current = 0
        }
    }, [isViewing])

    const onSwipe = useCallback(() => {
        const hadPendingTimer = swipeTimerRef.current !== undefined
        clearTimeout(swipeTimerRef.current)
        swipeTimerRef.current = undefined
        if (hadPendingTimer || showSwipeTooltipRef.current) sessionStorage.setItem(SWIPE_TOOLTIP_SEEN, '1')
        setShowSwipeTooltip(false)

        productViewCountRef.current += 1
        if (productViewCountRef.current >= TAP_TOOLTIP_SWIPE_THRESHOLD && !sessionStorage.getItem(TAP_TOOLTIP_SEEN)) {
            setTapLoadEnabled(true)
        }
    }, [])

    const onItemTapped = useCallback(() => {
        const hadPendingTimer = tapTimerRef.current !== undefined
        clearTimeout(tapTimerRef.current)
        tapTimerRef.current = undefined
        setTapLoadEnabled(false)
        if (hadPendingTimer || showTapTooltipRef.current) sessionStorage.setItem(TAP_TOOLTIP_SEEN, '1')
        setShowTapTooltip(false)
    }, [])

    const onDraw = useCallback(() => {
        const hadPendingTimer = drawTimerRef.current !== undefined
        clearTimeout(drawTimerRef.current)
        drawTimerRef.current = undefined
        if (hadPendingTimer || showDrawTooltipRef.current) sessionStorage.setItem(DRAW_TOOLTIP_SEEN, '1')
        setShowDrawTooltip(false)
    }, [])

    return { showSwipeTooltip, showTapTooltip, showDrawTooltip, onSwipe, onItemTapped, onDraw }
}
