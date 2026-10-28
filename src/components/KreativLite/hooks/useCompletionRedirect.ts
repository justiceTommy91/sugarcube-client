import { useState, useRef, useEffect, useCallback } from 'react'

const REDIRECT_COUNTDOWN_SECONDS = 3

interface CompletionRedirectState {
    redirectCountdown: number | undefined
    startRedirect: (sceneUuid: string) => void
}

export const useCompletionRedirect = (onComplete: (sceneUuid: string) => void): CompletionRedirectState => {
    const [redirectCountdown, setRedirectCountdown] = useState<number | undefined>(undefined)
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    // Keep a ref to always call the latest onComplete without needing it as a useCallback dep
    const onCompleteRef = useRef(onComplete)
    onCompleteRef.current = onComplete

    const startRedirect = useCallback((sceneUuid: string) => {
        setRedirectCountdown(REDIRECT_COUNTDOWN_SECONDS)

        countdownIntervalRef.current = setInterval(() => {
            setRedirectCountdown((prev) => {
                const newCountdown = (prev || 0) - 1
                if (newCountdown <= 0 && countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current)
                }
                return newCountdown
            })
        }, 1000)

        redirectTimeoutRef.current = setTimeout(() => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current)
            }
            onCompleteRef.current(sceneUuid)
        }, REDIRECT_COUNTDOWN_SECONDS * 1000)
    }, [])

    useEffect(
        () => () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current)
            }
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current)
            }
        },
        [],
    )

    return {
        redirectCountdown,
        startRedirect,
    }
}
