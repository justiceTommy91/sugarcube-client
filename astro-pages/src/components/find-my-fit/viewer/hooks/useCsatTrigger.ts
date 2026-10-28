import { useCallback, useEffect, useRef, useState } from 'react'
import { useCsatState } from '@astro-hooks/useCsatState'
import { CSAT_FMF_STORAGE_KEY, CSAT_DELAY_MS } from '@lib/tracking/constants'

export type CsatTrigger = {
    isSurveyOpen: boolean
    productViewCount: number
    onSwipe: () => void
    onSurveyClose: () => void
    onSkip: () => void
    onSkipAgain: () => void
    onComplete: () => void
    hasSeenFormOnce: boolean
}

export function useCsatTrigger(isViewing: boolean, isTrackingEnabled: boolean): CsatTrigger {
    const { neverShowFormAgain, hasSeenFormOnce, onSkip, onSkipAgain, onComplete } = useCsatState(CSAT_FMF_STORAGE_KEY)
    const [productViewCount, setProductViewCount] = useState(0)
    const [isSurveyOpen, setIsSurveyOpen] = useState(false)

    // Refs to avoid stale closures inside setTimeout callbacks
    const neverShowFormAgainRef = useRef(neverShowFormAgain)
    const isViewingRef = useRef(isViewing)
    const isTrackingEnabledRef = useRef(isTrackingEnabled)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hasSwipedOnceRef = useRef(false)
    const hasScheduledRepeatRef = useRef(false)

    useEffect(() => {
        neverShowFormAgainRef.current = neverShowFormAgain
    }, [neverShowFormAgain])
    useEffect(() => {
        isViewingRef.current = isViewing
    }, [isViewing])
    useEffect(() => {
        isTrackingEnabledRef.current = isTrackingEnabled
    }, [isTrackingEnabled])

    const cancelTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const scheduleShow = useCallback(() => {
        cancelTimer()
        timerRef.current = setTimeout(() => {
            if (isViewingRef.current && !neverShowFormAgainRef.current && isTrackingEnabledRef.current) {
                setIsSurveyOpen(true)
            }
        }, CSAT_DELAY_MS)
    }, [cancelTimer])

    // Reset everything when leaving viewing mode
    useEffect(() => {
        if (!isViewing) {
            cancelTimer()
            hasSwipedOnceRef.current = false
            hasScheduledRepeatRef.current = false
            setProductViewCount(0)
            setIsSurveyOpen(false)
        }
    }, [isViewing, cancelTimer])

    const onSwipe = useCallback(() => {
        setProductViewCount((c) => c + 1)
        if (
            !hasSwipedOnceRef.current &&
            isViewingRef.current &&
            !neverShowFormAgainRef.current &&
            isTrackingEnabledRef.current
        ) {
            hasSwipedOnceRef.current = true
            scheduleShow()
        }
    }, [scheduleShow])

    const onSurveyClose = useCallback(() => {
        setIsSurveyOpen(false)
        if (!hasScheduledRepeatRef.current && isViewingRef.current && isTrackingEnabledRef.current) {
            hasScheduledRepeatRef.current = true
            scheduleShow()
        }
    }, [scheduleShow])

    return { isSurveyOpen, productViewCount, onSwipe, onSurveyClose, onSkip, onSkipAgain, onComplete, hasSeenFormOnce }
}
