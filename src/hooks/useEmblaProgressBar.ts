import { useCallback, useEffect, useRef, useState } from 'react'
import type { EmblaCarouselType } from 'embla-carousel'

interface EmblaProgressBarResult {
    scrollProgress: number
    thumbWidth: number
    progressTrackRef: React.RefObject<HTMLDivElement>
    handleProgressMouseDown: (e: React.MouseEvent) => void
    handleProgressTouchStart: (e: React.TouchEvent) => void
}

/**
 * Manages a draggable progress bar for an Embla carousel.
 *
 * @param emblaApi - The Embla carousel API instance (undefined until initialised)
 * @param slideCount - Total number of slides; used to calculate thumb width
 * @returns State and event handlers to wire up the progress bar in the JSX
 */
export const useEmblaProgressBar = (
    emblaApi: EmblaCarouselType | undefined,
    slideCount: number,
): EmblaProgressBarResult => {
    const [scrollProgress, setScrollProgress] = useState(0)
    const [thumbWidth, setThumbWidth] = useState(() => Math.max(10, (1 / slideCount) * 100))
    const [isDragging, setIsDragging] = useState(false)
    const progressTrackRef = useRef<HTMLDivElement>(null)

    // Recalculate thumb width on init and whenever the carousel resizes or slideCount changes
    useEffect(() => {
        if (!emblaApi) return undefined

        const updateThumbWidth = () => {
            if (slideCount === 0) return
            setThumbWidth(Math.max(10, (1 / slideCount) * 100))
        }

        const timer = setTimeout(updateThumbWidth, 0)
        emblaApi.on('resize', updateThumbWidth)

        return () => {
            clearTimeout(timer)
            emblaApi.off('resize', updateThumbWidth)
        }
    }, [emblaApi, slideCount])

    // Track scroll position
    useEffect(() => {
        if (!emblaApi) return undefined

        const onScroll = () => {
            const progress = Math.max(0, Math.min(1, emblaApi.scrollProgress()))
            setScrollProgress(progress * (100 - thumbWidth))
        }

        emblaApi.on('scroll', onScroll)
        emblaApi.on('settle', onScroll)
        onScroll()

        return () => {
            emblaApi.off('scroll', onScroll)
            emblaApi.off('settle', onScroll)
        }
    }, [emblaApi, thumbWidth])

    const scrollToProgress = useCallback(
        (clientX: number) => {
            if (!emblaApi || !progressTrackRef.current) return
            const track = progressTrackRef.current
            const trackRect = track.getBoundingClientRect()
            const clickPercent = Math.max(0, Math.min(1, (clientX - trackRect.left) / trackRect.width))
            emblaApi.goTo(Math.round(clickPercent * (slideCount - 1)))
        },
        [emblaApi, slideCount],
    )

    const handleProgressMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            setIsDragging(true)
            scrollToProgress(e.clientX)
        },
        [scrollToProgress],
    )

    const handleProgressTouchStart = useCallback(
        (e: React.TouchEvent) => {
            setIsDragging(true)
            scrollToProgress(e.touches[0].clientX)
        },
        [scrollToProgress],
    )

    // Global mouse/touch move while dragging
    useEffect(() => {
        if (!isDragging) return undefined

        const handleMouseMove = (e: MouseEvent) => scrollToProgress(e.clientX)
        const handleTouchMove = (e: TouchEvent) => scrollToProgress(e.touches[0].clientX)
        const handleEnd = () => setIsDragging(false)

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleEnd)
        document.addEventListener('touchmove', handleTouchMove)
        document.addEventListener('touchend', handleEnd)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleEnd)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleEnd)
        }
    }, [isDragging, scrollToProgress])

    return { scrollProgress, thumbWidth, progressTrackRef, handleProgressMouseDown, handleProgressTouchStart }
}
