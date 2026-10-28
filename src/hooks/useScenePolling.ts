import { useEffect, useRef } from 'react'
import { addJitter } from 'utils/async'

interface UseScenePollingOptions {
    interval?: number // Default: 10000ms (10s)
    enabled?: boolean // Default: true
    onlyWhenProcessing?: boolean // Only poll if processing scenes exist
}

/**
 * Polls the scenes endpoint at regular intervals
 * Used on dashboard to keep processing scenes updated
 *
 * @param fetchScenes - Function to fetch scenes from API (must accept silent parameter)
 * @param hasProcessingScenes - Whether there are any scenes currently processing
 * @param options - Polling configuration options
 */
export const useScenePolling = (
    fetchScenes: (isRetry?: boolean, silent?: boolean) => void,
    hasProcessingScenes: boolean,
    options: UseScenePollingOptions = {},
) => {
    const { interval = 10000, enabled = true, onlyWhenProcessing = true } = options

    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        // Don't poll if disabled
        if (!enabled) {
            return undefined
        }

        // Don't poll if no processing scenes and onlyWhenProcessing is true
        if (onlyWhenProcessing && !hasProcessingScenes) {
            return undefined
        }

        // Start polling - use silent mode to avoid layout shift
        intervalRef.current = setInterval(() => {
            fetchScenes(false, true) // isRetry=false, silent=true
        }, addJitter(interval))

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [fetchScenes, hasProcessingScenes, enabled, interval, onlyWhenProcessing])
}
