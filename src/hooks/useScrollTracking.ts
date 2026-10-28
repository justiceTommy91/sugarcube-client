import { useEffect, useState } from 'react'
import { AfterFoldSessionKeyType } from 'models/sessionStorage'
import { afterFold } from 'utils/tracker'
import { GA_ACTION_USER_SCROLL_PAST, GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'

export const useScrollTracking = (
    ref: React.RefObject<HTMLElement>,
    sessionStorageKey: AfterFoldSessionKeyType,
    section: string,
    page: string,
    threshold?: number,
) => {
    const [startTime, setStartTime] = useState<number | null>(null)

    useEffect(() => {
        const onIntersect = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && startTime === null) {
                    setStartTime(performance.now())
                }

                if (!entry.isIntersecting && startTime !== null) {
                    const timePassed = (performance.now() - startTime) / 1000
                    const metaData = {
                        Page: page,
                        Section: section,
                        timePassed: timePassed.toString(),
                    }
                    afterFold(
                        sessionStorageKey,
                        { ...metaData },
                        {
                            action: GA_ACTION_USER_SCROLL_PAST,
                            label: `${timePassed}`,
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            custom: metaData,
                        },
                    )
                    setStartTime(null) // Reset start time for next observation
                }
            })
        }

        const observer = new IntersectionObserver(onIntersect, {
            threshold: threshold || 0.7, // 70% of the section should be in view
        })
        const sectionElement = ref.current
        if (sectionElement) {
            observer.observe(sectionElement)
        }

        // Clean up the observer on unmount
        return () => {
            if (sectionElement) {
                observer.unobserve(sectionElement)
            }
        }
    }, [startTime, ref, afterFold]) // Re-run the effect when ref or afterFold changes
}
