// TODO: swap in ua-parser-js
import isMobile from 'ismobilejs'
import { getUserAgent, getWindow } from 'models/location/selectors'
import { isIPadDesktopMode } from './browser'

export const isAppleDevice = () => isMobile(getUserAgent()).apple.device

export const isTouchOnlyDevice = () => {
    if (!getWindow().matchMedia) {
        // happens in jest test environment
        return false
    }
    const isTouchDevice =
        !!getWindow().ontouchstart ||
        getWindow().navigator?.maxTouchPoints > 0 ||
        getWindow().navigator?.msMaxTouchPoints > 0
    const supportsMouse = !!window.matchMedia('(pointer:fine)')?.matches
    return isTouchDevice && !supportsMouse
}

/**
 * Improved touch-only detection using pointer media queries.
 * More reliable than just checking maxTouchPoints.
 */
export const isTouchOnlyDeviceImproved = () => {
    const win = getWindow()
    if (!win.matchMedia) {
        return false
    }

    const isPrimaryPointerCoarse = win.matchMedia('(pointer:coarse)')?.matches
    const hasAnyPointerFine = win.matchMedia('(any-pointer:fine)')?.matches

    return isPrimaryPointerCoarse && !hasAnyPointerFine
}

/**
 * Detects device category and returns detailed detection info for MixPanel tracking.
 * Uses a three-check approach: User Agent + Media Query + Touch Capability.
 *
 * @returns {{ category: 'mobile'|'tablet'|'desktop', method: string, screenWidth: number, hasTouch: boolean, isTouchOnly: boolean, orientation: 'portrait'|'landscape' }}
 */
export const detectDevice = () => {
    // SSR fallback
    if (typeof window === 'undefined') {
        return {
            category: 'desktop',
            method: 'ssr-fallback',
            screenWidth: 0,
            hasTouch: false,
            isTouchOnly: false,
            orientation: 'landscape',
        }
    }

    const ua = getUserAgent()
    const mobile = isMobile(ua)
    const screenWidth = window.innerWidth

    // Touch detection
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    // Improved touch-only detection
    const isTouchOnly = isTouchOnlyDeviceImproved()

    // Orientation
    const isPortrait = window.matchMedia?.('(orientation: portrait)')?.matches ?? false
    const orientation = isPortrait ? 'portrait' : 'landscape'

    // Detection priority (order matters)

    // 1. UA detects phone
    if (mobile.phone) {
        return { category: 'mobile', method: 'ua-phone', screenWidth, hasTouch, isTouchOnly, orientation }
    }

    // 2. UA detects tablet
    if (mobile.tablet) {
        return { category: 'tablet', method: 'ua-tablet', screenWidth, hasTouch, isTouchOnly, orientation }
    }

    // 3. iPad in desktop mode (Safari on iPadOS 13+)
    if (isIPadDesktopMode()) {
        return { category: 'tablet', method: 'ipad-desktop-mode', screenWidth, hasTouch, isTouchOnly, orientation }
    }

    // 4. Touch-only + small screen = mobile
    if (isTouchOnly && screenWidth < 768) {
        return { category: 'mobile', method: 'touch-only-small', screenWidth, hasTouch, isTouchOnly, orientation }
    }

    // 5. Touch-only + medium screen = tablet
    if (isTouchOnly && screenWidth >= 768) {
        return { category: 'tablet', method: 'touch-only-medium', screenWidth, hasTouch, isTouchOnly, orientation }
    }

    // 6. Large screen = desktop
    if (screenWidth >= 1024) {
        return { category: 'desktop', method: 'large-screen', screenWidth, hasTouch, isTouchOnly, orientation }
    }

    // 7. Small screen without mobile UA (e.g., Chrome DevTools)
    if (screenWidth < 768) {
        return { category: 'mobile', method: 'small-screen', screenWidth, hasTouch, isTouchOnly, orientation }
    }

    // 8. Default - medium screen
    return { category: 'tablet', method: 'medium-screen', screenWidth, hasTouch, isTouchOnly, orientation }
}

export const getiOSVersion = () => {
    if (!isAppleDevice()) {
        return null
    }
    const parsed = getUserAgent().match(/iPhone OS (\d+)_(\d+)_?(\d+)?/)
    if (parsed) {
        const v1 = parseInt(parsed[1] || 0, 10)
        const v2 = parseInt(parsed[2] || 0, 10)
        const v3 = parseInt(parsed[3] || 0, 10)
        return [v1, v2, v3]
    }
    return null
}

export const isMobileCheck = () => isMobile(getUserAgent()).any // || isTouchOnlyDevice()

export const isSmallScreenDevice = () => {
    if (typeof window === 'undefined') return false

    const screenWidth = window.screen.width
    return screenWidth < 1200
}

export default isMobileCheck
