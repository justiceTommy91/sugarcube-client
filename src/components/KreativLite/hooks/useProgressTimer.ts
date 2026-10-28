import { useState, useEffect, useRef } from 'react'
import { PROGRESS_UPDATE_INTERVAL } from 'components/dashboard/UploadImageModal/constants'

const MAX_PROGRESS_PERCENT = 99 // Cap at 99% until completion is confirmed to avoid premature 100%
const ALMOST_READY_THRESHOLD_SECONDS = 30

interface ProgressState {
    progress: number
    secondsRemaining: number
    showAlmostReady: boolean
}

interface ProgressTimerConfig {
    startTime: number | null
    estimatedFinishTime: number | null
    initialEstimate: number | null
    enabled: boolean
}

const calculateProgress = (
    startTime: number,
    finishTime: number,
): { progress: number; secondsRemaining: number } => {
    const now = Date.now()
    const totalTime = finishTime - startTime
    const elapsed = now - startTime
    const remaining = finishTime - now

    const rawProgress = (elapsed / totalTime) * 100
    const progress = Math.min(MAX_PROGRESS_PERCENT, Math.max(0, rawProgress))
    const secondsRemaining = Math.max(0, Math.ceil(remaining / 1000))

    return { progress, secondsRemaining }
}

const shouldShowAlmostReady = (initialEstimate: number): boolean => {
    const now = Date.now()
    const remainingSeconds = (initialEstimate - now) / 1000
    return remainingSeconds <= ALMOST_READY_THRESHOLD_SECONDS && remainingSeconds > 0
}

/**
 * Manages progress calculation and time remaining for scene processing.
 * Updates every second while enabled, calculating percentage complete and seconds left.
 * 
 * @param config - Timer configuration with start/finish times and enabled state
 * @returns Current progress state with percentage, seconds remaining, and almost-ready flag
 */
export const useProgressTimer = (config: ProgressTimerConfig): ProgressState => {
    const { startTime, estimatedFinishTime, initialEstimate, enabled } = config
    
    const [state, setState] = useState<ProgressState>({
        progress: 0,
        secondsRemaining: 0,
        showAlmostReady: false,
    })
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!enabled || !startTime || !estimatedFinishTime) {
            return undefined
        }

        const updateProgress = () => {
            if (!startTime || !estimatedFinishTime) return

            const { progress, secondsRemaining } = calculateProgress(startTime, estimatedFinishTime)
            const showAlmostReady = initialEstimate ? shouldShowAlmostReady(initialEstimate) : false

            setState({ progress, secondsRemaining, showAlmostReady })
        }

        updateProgress()
        timerIntervalRef.current = setInterval(updateProgress, PROGRESS_UPDATE_INTERVAL)

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current)
            }
        }
    }, [enabled, startTime, estimatedFinishTime, initialEstimate])

    return state
}
