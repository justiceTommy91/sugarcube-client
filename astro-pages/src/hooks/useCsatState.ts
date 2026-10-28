import { useCallback, useState } from 'react'

interface CsatStoredState {
    neverShowFormAgain: boolean
    hasSeenFormOnce: boolean
}

export interface CsatState {
    /**
     * Whether the form should never be shown again.
     * Set to `true` after the user dismisses the form a second time (`onSkipAgain`)
     * or submits it (`onComplete`). Permanently suppresses future triggers.
     */
    neverShowFormAgain: boolean
    /**
     * Whether the form has been shown at least once.
     * Set to `true` after the first dismissal (`onSkip`).
     * Allows one more trigger before permanently suppressing via `neverShowFormAgain`.
     */
    hasSeenFormOnce: boolean
    /** Called on first dismissal — allows the form to show one more time. */
    onSkip: () => void
    /** Called on second dismissal — permanently suppresses the form. */
    onSkipAgain: () => void
    /** Called on submit — permanently suppresses the form. */
    onComplete: () => void
}

function readStorage(key: string): CsatStoredState {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return { neverShowFormAgain: false, hasSeenFormOnce: false }
        return JSON.parse(raw) as CsatStoredState
    } catch {
        return { neverShowFormAgain: false, hasSeenFormOnce: false }
    }
}

function writeStorage(key: string, state: CsatStoredState): void {
    try {
        localStorage.setItem(key, JSON.stringify(state))
    } catch {
        // localStorage unavailable — silently ignore
    }
}

export function useCsatState(storageKey: string): CsatState {
    const [stored, setStored] = useState<CsatStoredState>(() => readStorage(storageKey))

    const onSkip = useCallback(() => {
        setStored((prev) => {
            const next = { ...prev, hasSeenFormOnce: true }
            writeStorage(storageKey, next)
            return next
        })
    }, [storageKey])

    const onSkipAgain = useCallback(() => {
        setStored((prev) => {
            const next = { ...prev, neverShowFormAgain: true }
            writeStorage(storageKey, next)
            return next
        })
    }, [storageKey])

    const onComplete = useCallback(() => {
        const next = { neverShowFormAgain: true, hasSeenFormOnce: true }
        writeStorage(storageKey, next)
        setStored(next)
    }, [storageKey])

    return {
        neverShowFormAgain: stored.neverShowFormAgain,
        hasSeenFormOnce: stored.hasSeenFormOnce,
        onSkip,
        onSkipAgain,
        onComplete,
    }
}
