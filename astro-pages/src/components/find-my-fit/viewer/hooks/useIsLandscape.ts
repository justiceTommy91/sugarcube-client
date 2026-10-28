import { useEffect, useState } from 'react'

const QUERY = '(orientation: landscape)'

export function useIsLandscape(): boolean {
    const [isLandscape, setIsLandscape] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
    )

    useEffect(() => {
        const mq = window.matchMedia(QUERY)
        const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    return isLandscape
}
