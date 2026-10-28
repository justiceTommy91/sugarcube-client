import { AllowedUpptackaLocales } from 'models/upptacka/types'
import showroomsJsonData from 'models/upptacka/showrooms.json'
import { isProd } from 'utils/environment'

export const getUpptackaShowroomData = (locale: string) => {
    const data = showroomsJsonData[locale as AllowedUpptackaLocales] || showroomsJsonData['en-US']
    return {
        ...data,
        rooms: data.rooms.map(room => ({
            ...room,
            compositionId: isProd ? room.compositionId : room.devCompositionId
        }))
    }
}

/**
 * Calculates the next slide index in a looping carousel.
 *
 * The showroom carousel is a looping carousel, and the core mechanism for tracking
 * the active slide is handled natively by the Embla carousel. This function explicitly
 * tracks the targeted slide index when the user clicks the previous or next slide button
 * for tracking purposes.
 *
 * @param {boolean} goingForward - Indicates the direction of navigation.
 *                                 `true` for forward, `false` for backward.
 * @param {number} activeIndex - The current active slide index.
 * @param {number} maximumSlides - The total number of slides in the carousel.
 * @returns {string} - The index of the next slide as a string.
 */
export const getNextSlideIndex = (goingForward: boolean, activeIndex: number, maximumSlides: number) => {
    const isLastSlide = activeIndex === maximumSlides - 1
    const isFirstSlide = activeIndex === 0
    let result: number
    if (goingForward) {
        result = isLastSlide ? 0 : activeIndex + 1
    } else {
        result = isFirstSlide ? maximumSlides - 1 : activeIndex - 1
    }
    return result.toString()
}
