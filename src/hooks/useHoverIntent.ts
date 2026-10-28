import React from 'react'

export type UseHoverIntentResult = {
    intendsToHover: () => void
    intendsToExit: () => void
}

export type UseHoverIntentOptions = {
    onHover?: () => void
    onExit?: () => void
    delay?: number
}

/**
 * Infer user's intent to hover.
 */
export const useHoverIntent = ({ delay = 600, onHover, onExit }: UseHoverIntentOptions = {}): UseHoverIntentResult => {
    const countdownRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const onHoverRef = React.useRef(onHover)
    onHoverRef.current = onHover
    const onExitRef = React.useRef(onExit)
    onExitRef.current = onExit

    React.useEffect(
        () => () => {
            if (countdownRef.current != null) {
                clearTimeout(countdownRef.current)
            }
        },
        [],
    )

    return React.useMemo(
        () => ({
            intendsToHover: () => {
                onHoverRef.current?.()
                if (countdownRef.current != null) {
                    clearTimeout(countdownRef.current)
                    countdownRef.current = undefined
                }
            },
            intendsToExit: () => {
                if (countdownRef.current != null) {
                    clearTimeout(countdownRef.current)
                }
                countdownRef.current = setTimeout(() => {
                    onExitRef.current?.()
                }, delay)
            },
        }),
        [delay],
    )
}
