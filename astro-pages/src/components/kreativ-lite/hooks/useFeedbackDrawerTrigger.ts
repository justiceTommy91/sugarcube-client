import { useCallback, useEffect, useRef, useState } from 'react'
import { useCsatState } from '@astro-hooks/useCsatState'
import { CSAT_KREATIV_LITE_STORAGE_KEY, CSAT_DELAY_MS } from '@lib/tracking/constants'

export type FeedbackDrawerTrigger = {
    isSurveyOpen: boolean
    hasSeenFormOnce: boolean
    onClose: () => void
    onComplete: () => void
}

/**
 * Controls the visibility and lifecycle of the kreativ-lite feedback drawer.
 *
 * The drawer is shown 1 minute after the first furniture item is added to the room.
 * After the first dismissal the survey reschedules itself once. After a second dismissal
 * or a successful submission the survey is permanently suppressed (via localStorage).
 */
export function useFeedbackDrawerTrigger(roomItemCount: number): FeedbackDrawerTrigger {
    const { neverShowFormAgain, hasSeenFormOnce, onSkip, onSkipAgain, onComplete: persistComplete } = useCsatState(
        CSAT_KREATIV_LITE_STORAGE_KEY,
    )
    const [isSurveyOpen, setIsSurveyOpen] = useState(false)

    // Refs to avoid stale closures inside setTimeout callbacks
    const neverShowFormAgainRef = useRef(neverShowFormAgain)
    const hasSeenFormOnceRef = useRef(hasSeenFormOnce)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hasTriggeredOnceRef = useRef(false)
    const hasScheduledRepeatRef = useRef(false)

    useEffect(() => {
        neverShowFormAgainRef.current = neverShowFormAgain
    }, [neverShowFormAgain])

    useEffect(() => {
        hasSeenFormOnceRef.current = hasSeenFormOnce
    }, [hasSeenFormOnce])

    const cancelTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const scheduleShow = useCallback(() => {
        cancelTimer()
        timerRef.current = setTimeout(() => {
            if (!neverShowFormAgainRef.current) {
                setIsSurveyOpen(true)
            }
        }, CSAT_DELAY_MS)
    }, [cancelTimer])

    // Start the timer when the first item is added to the room
    useEffect(() => {
        if (roomItemCount >= 1 && !hasTriggeredOnceRef.current) {
            hasTriggeredOnceRef.current = true
            if (!neverShowFormAgainRef.current) {
                scheduleShow()
            }
        }
    }, [roomItemCount, scheduleShow])

    // Cancel timer on unmount
    useEffect(() => () => cancelTimer(), [cancelTimer])

    const onClose = useCallback(() => {
        setIsSurveyOpen(false)
        if (!hasSeenFormOnceRef.current) {
            // First dismissal — mark seen once and reschedule
            onSkip()
            if (!hasScheduledRepeatRef.current) {
                hasScheduledRepeatRef.current = true
                scheduleShow()
            }
        } else {
            // Second dismissal — permanently suppress
            onSkipAgain()
        }
    }, [onSkip, onSkipAgain, scheduleShow])

    const onComplete = useCallback(
        () => {
            persistComplete()
            setIsSurveyOpen(false)
        },
        [persistComplete],
    )

    return { isSurveyOpen, hasSeenFormOnce, onClose, onComplete }
}
