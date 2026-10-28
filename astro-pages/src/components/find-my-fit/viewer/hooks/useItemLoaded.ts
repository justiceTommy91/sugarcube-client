import { useEffect, useState } from 'react'
import { EVT_FURNITURE_LOAD_END } from '@gatsby/Renderer/constants'

// Returns true once EVT_FURNITURE_LOAD_END fires on document while enabled.
// Resets to false when enabled becomes false.
export function useItemLoaded(enabled: boolean): boolean {
    const [isItemLoaded, setIsItemLoaded] = useState(false)

    useEffect(() => {
        if (!enabled) {
            setIsItemLoaded(false)
            return undefined
        }

        const onLoaded = () => setIsItemLoaded(true)
        document.addEventListener(EVT_FURNITURE_LOAD_END, onLoaded)
        return () => document.removeEventListener(EVT_FURNITURE_LOAD_END, onLoaded)
    }, [enabled])

    return isItemLoaded
}
