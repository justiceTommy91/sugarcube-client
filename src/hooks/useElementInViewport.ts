import { useEffect, useState } from 'react'

export const useElementInViewport = (element: Element | null, threshold = 0.25): boolean => {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (!element) return () => false

        const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold })

        observer.observe(element)

        return () => observer.disconnect()
    }, [element, threshold])

    return isVisible
}
