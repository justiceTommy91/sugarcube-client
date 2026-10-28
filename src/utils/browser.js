import UAParser from 'ua-parser-js'

const parser = new UAParser()
const minimumVersions = {
    Firefox: 28,
    Chrome: 29,
    Chromium: 29,
    Safari: 9,
    Edge: 12,
}

export const getBrowser = () => parser.getBrowser()

export const isEdge = () => {
    const browser = getBrowser()
    return !!(browser && browser.name && browser.name === 'Edge')
}

export function isSafari() {
    const userAgent = ((window || {}).navigator || {}).userAgent
    if (!userAgent) {
        return false
    }
    // iOS detection from: http://stackoverflow.com/a/9039885/177710
    // Note that chrome and other browsers on iOS are built on Safari's webKit
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return true
    }
    // Safari detection from: https://stackoverflow.com/q/7944460
    if (/^((?!chrome|android).)*safari/i.test(userAgent)) {
        return true
    }
    return false
}

export function getSafariVersion() {
    const userAgent = ((window || {}).navigator || {}).userAgent || ''
    const versionStr = userAgent.split(`Version/`)?.[1]?.split(` `)?.[0]
    let version = parseFloat(versionStr) || 0

    // The user agent sometimes hides the actual state of the device.
    // Example use case is when the web desktop version is requested; which is
    // the default state on some iPads. (See https://chromestatus.com/feature/5452592194781184.)
    // Apple introduced Array.fromAsync in Safari 16.4. We use that to detect Safari version >= 16.4 below.
    // (See https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes.)
    if ('fromAsync' in Array) {
        version = Math.max(version, 16.4)
    }

    return version
}

export const isUnsupportedBrowser = () => {
    const { name, version } = getBrowser()
    return !!(minimumVersions[name] && version < minimumVersions[name])
}

export const checkWebPSupport = () => {
    const tmpCanvas = document.createElement('canvas')
    if (tmpCanvas.getContext && tmpCanvas.getContext('2d')) {
        return tmpCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
    }
    return false
}

export const getBrowserScrollScale = () => {
    const browser = getBrowser()

    if (browser.name === 'Safari') {
        return 10
    }
    if (browser.name === 'Firefox' || browser.name === 'Chrome') {
        return 7
    }
    return 1
}

/**
 * Detects iPads running in Desktop Mode (iOS 13+).
 * These devices report as Macintosh in the user agent but have multitouch capability.
 * Real Macs have maxTouchPoints = 0 (no touch) or 1 (Touch Bar only).
 * iPads have maxTouchPoints >= 2 (full multitouch screen).
 */
export const isIPadDesktopMode = () => {
    if (typeof window === 'undefined' || !window.navigator) {
        return false
    }

    const ua = window.navigator.userAgent || ''
    const platform = window.navigator.platform || ''

    const isMacintosh = platform === 'MacIntel' || ua.includes('Macintosh')
    const hasMultiTouch = window.navigator.maxTouchPoints >= 2

    return isMacintosh && hasMultiTouch
}

export default getBrowser
