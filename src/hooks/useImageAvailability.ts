import { useState, useEffect } from 'react'

/**
 * A React hook that checks if an image is available by attempting to load it with exponential backoff retries.
 *
 * @param src - The URL of the image to check
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds for exponential backoff (default: 1000)
 * @returns A boolean indicating if the image is available and can be loaded
 */
export const useImageAvailability = (src: string | null, maxRetries = 3, baseDelay = 1000) => {
    const [hasLoaded, setHasLoaded] = useState(false)
    const [retryCount, setRetryCount] = useState(0)

    useEffect(() => {
        if (!src) return () => {}

        let timeoutId: ReturnType<typeof setTimeout> | undefined

        const checkImage = (url: string) =>
            new Promise((resolve, reject) => {
                const img = new Image()
                img.onload = () => resolve(url)
                img.onerror = () => reject()
                img.src = url
            })

        const attemptLoadImage = async () => {
            try {
                await checkImage(src)
                setHasLoaded(true)
            } catch {
                if (retryCount < maxRetries) {
                    const exponentialDelay = baseDelay * 2 ** retryCount
                    const jitter = Math.random() * 300
                    const finalDelay = exponentialDelay + jitter

                    timeoutId = setTimeout(() => {
                        setRetryCount((prev) => prev + 1)
                    }, finalDelay)
                }
            }
        }

        attemptLoadImage()

        return () => {
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [src, retryCount, maxRetries, baseDelay])

    return hasLoaded
}
