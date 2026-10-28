import { useEffect, useState } from 'react'

type Orientation = 'portrait' | 'landscape' | undefined | void

export const useOrientation = (): Orientation => {
    const getIsPortrait = (): boolean =>
        typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches

    const [orientation, setOrientation] = useState<Orientation>(() => {
        if (typeof window === 'undefined') return undefined
        return getIsPortrait() ? 'portrait' : 'landscape'
    })

    useEffect(() => {
        if (typeof window === 'undefined') return

        const mql = window.matchMedia('(orientation: portrait)')

        const handleChange = (e: MediaQueryListEvent | MediaQueryList): void => {
            const isPortrait = 'matches' in e ? e.matches : mql.matches
            setOrientation(isPortrait ? 'portrait' : 'landscape')
        }

        // Sync initial orientation
        handleChange(mql)

        // Add listeners (modern and fallback)
        if (mql.addEventListener) {
            mql.addEventListener('change', handleChange)
        } else {
            mql.addListener(handleChange)
        }

        // eslint-disable-next-line consistent-return
        return (): void => {
            if (mql.removeEventListener) {
                mql.removeEventListener('change', handleChange)
            } else {
                mql.removeListener(handleChange)
            }
        }
    }, [])

    return orientation
}
