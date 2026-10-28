import { useState, useEffect } from 'react'

interface WindowSize {
    width: number
    height: number
}

/**
 * A custom hook that tracks the window dimensions and updates on resize.
 *
 * @returns WindowSize object containing current window width and height
 *
 */
export const useWindowSize = (): WindowSize => {
    const [windowSize, setWindowSize] = useState<WindowSize>({
        width: window.innerWidth,
        height: window.innerHeight,
    })

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return windowSize
}
