import mixpanel from 'mixpanel-browser'
import * as Sentry from '@sentry/react'

import { isProd, getTestingEnv, getE2ETestingEnv, isClient } from 'utils/environment'
import {
    APP_TYPE_SUGARCUBE,
    APP_TYPE_MAGICWINDOW,
    APP_ENV_TESTING,
    APP_ENV_PROD,
    APP_TYPE_DESIGN_HOME,
    APP_TYPE_KIOSK,
    APP_TYPE_UPPTACKA,
    APP_MODE_FULL_FEATURED,
    APP_MODE_SWAP_ONLY,
    APP_TYPE_PIP,
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_ACTION_ERROR_PAGE_VISIT,
    GA_ACTION_CRITICAL_ERROR,
    GA_LABEL_CRITICAL_ERROR,
    APP_TYPE_SEARCH_BROWSE,
    APP_TYPE_CATEGORY_LIVING_ROOM,
} from 'models/tracking/constants'
import { getRegion, getIsIFrame, getHref, getWindow, getUrlContext } from 'models/location/selectors'
import { getPathname } from 'utils/urlParams'

import isMobile, { detectDevice } from 'utils/isMobile'
import { Page } from 'constants/pages'
import { getUserScrolledFold } from 'models/sessionStorage/selectors'
import { webSessionService } from 'services/webSessionId'
import { AfterFoldSessionKeyType } from 'models/sessionStorage'
import { SUB_CATEGORIES_IDS_MAP } from 'constants/categories'

// Active Design Context Management
// These UUIDs are automatically injected into GA events when on a design page

/**
 * Check if the current page is the design page (/room, including the Upptacka
 * variant rendered from the same route). /room-builder, /room-editor, and
 * /upptackaShowroom are intentionally excluded - they are not design pages.
 *
 * The pathname is prefixed with the Gatsby market path (e.g.
 * "us/en/home-design/room/"), so we match "/room" as a path segment.
 */
export const isDesignPage = (): boolean => {
    if (typeof window === 'undefined') return false
    return /(^|\/)room(\/|$)/.test(getPathname())
}

/**
 * Set the active scene and composition UUIDs for automatic GA tracking
 * Call this when entering a design page or when scene/composition changes
 */
export const setActiveDesignUuids = (sceneUuid: string, compositionUuid: string | null): void => {
    if (typeof window === 'undefined') return
    window.activeSceneUuid = sceneUuid
    window.activeCompositionUuid = compositionUuid
}

/**
 * Set the active design context for automatic GA tracking
 * Includes scene UUID, composition UUID, and room source type
 * Call this when entering a design page or when scene/composition changes
 */
export const setActiveDesignContext = (
    sceneUuid: string,
    compositionUuid: string | null,
    roomSourceType: string | null,
): void => {
    if (typeof window === 'undefined') return
    window.activeSceneUuid = sceneUuid
    window.activeCompositionUuid = compositionUuid
    window.activeRoomSourceType = roomSourceType
}

/**
 * Clear the active design UUIDs
 * Optional cleanup - pathname check provides primary protection
 */
export const clearActiveDesignUuids = (): void => {
    if (typeof window === 'undefined') return
    window.activeSceneUuid = null
    window.activeCompositionUuid = null
    window.activeRoomSourceType = null
}

let initMixpanelTime: number
let isSentryInit = false
let loadingStartTime: number
let heartbeatIntervalId: number
let heartbeatMinute = 0
let trackingContext: string | null = null

const locationData: {
    LocationKnown: boolean
    LocationZip: string | null
    LocationPreferredStore: string | null
} = {
    LocationKnown: false,
    LocationZip: null,
    LocationPreferredStore: null,
}

export const setTrackingContext = (ctx: string) => {
    trackingContext = ctx
}

const getTrackingContext = (): string | null => trackingContext

// If the performance consent was set then confirm that the cookie was set
// This check is similar to the one in the ingka repo for optimizely ab testing fragment:
// https://github.com/ingka-group-digital/abtesting-fragmentexport const isCookieConsentSet = () =>
export const isCookieConsentSet = () => window?.ikea?.cookieConsent?.hasConsent(2)

const setSentryUserId = () => {
    if (isSentryInit && initMixpanelTime) {
        const mixpanelId = mixpanel?.get_distinct_id() || undefined
        if (mixpanelId) {
            Sentry.setUser({ id: mixpanelId })
        }
    }
}

const initMixpanel = () => {
    initMixpanelTime = Date.now()

    // We do not know which happens first, Sentry init or mixpanel init.
    // So we will call the setSentryUserId function here and in the initSentry function
    // Mixpanel distinct id is a combination of user id and device id.
    if (isProd) {
        mixpanel.init('29a3c10bc553189c0e5b6c5dcded291a', {
            api_host: `https://mxpnl.home-design.ikea.com`,
            loaded: setSentryUserId,
        })
    } else {
        mixpanel.init('a7a560b7ce99351f21ced5f60aa7d965', {
            api_host: `https://mxpnl.home-design.ikea.com`,
            loaded: setSentryUserId,
        })
    }
}

const ignoredErrorPaths = ['/pagead/', '/resources/']
const initSentry = () => {
    if (!isSentryInit) {
        Sentry.init({
            release: process.env.GATSBY_BUILD_TAG,
            dsn: 'https://39a1b642333d427a81f16ed5eb7d8894@o250847.ingest.sentry.io/5339839',
            environment: process.env.GATSBY_ENV.toUpperCase(),
            tracesSampleRate: 0.2,
            ignoreErrors: ['https://reactjs.org/docs/error-decoder.html?invariant=421'],
            beforeSend(event) {
                Sentry.setContext('geoDebug', {
                    frames: JSON.stringify(event.exception?.values?.[0]?.stacktrace?.frames),
                })

                if (
                    event.exception?.values?.[0]?.stacktrace?.frames?.some((frame) =>
                        ignoredErrorPaths.some((path) => frame.filename?.includes(path)),
                    )
                ) {
                    return null
                }
                return event
            },
        })
        isSentryInit = true
        setSentryUserId()
    }
}

export const retryTrackingInitHandler = () => {
    // We only want to check for cookie consent in Prod environments
    if (isProd) {
        if (isCookieConsentSet()) {
            initSentry()
        }
    } else {
        // Not Prod
        initSentry()
    }
}

const trackingEnabled = (): boolean => {
    if (getE2ETestingEnv() || getTestingEnv()) {
        return false
    }

    const hasConsent = isCookieConsentSet()
    const { isUpptacka } = getUrlContext()
    // If window.ikea.cookieConsent is not defined OR cookie consent status available AND NOT consenting
    // Note: Upptacka is a kiosk device in IKEA stores which do not have a cookie consent banner
    if (!hasConsent && !isUpptacka) {
        return false
    }

    if (!initMixpanelTime) {
        // If tracking is enabled, but mixpanel wasn't initialized
        // (likely because it was previously disabled) try again
        initMixpanel()
    }

    return true
}

export const shouldShowFeedbackForm = () => !!initMixpanelTime

export const initTracking = () => {
    document.addEventListener('ikeaCookieConsent', retryTrackingInitHandler)

    // Set up sentry tracking for non prod env without cookie consent
    // or prod env where cookie consent was already accepted on earlier sessions
    if (!isProd) {
        initSentry()
    } else {
        retryTrackingInitHandler()
    }

    // TrackingEnabled will call initMixpanel
    return trackingEnabled()
}

export const markLoadingStart = () => {
    loadingStartTime = Date.now()
}

export const alias = (id: string) =>
    new Promise<void>((resolve) => {
        // export const alias = id => track('$create_alias', { alias: id })
        // New user
        if (trackingEnabled()) {
            mixpanel.alias(id)
        }
        resolve()
    })

export const identify = (id: string) =>
    new Promise<void>((resolve) => {
        // Logged in user
        if (trackingEnabled()) {
            mixpanel.identify(id)
        }
        resolve()
    })

export const initAppGlobals = ({
    isMagicWindow = false,
    isDesignHome = false,
    isKiosk = false,
    isUpptacka = false,
    isPipIntegration = false,
    isSearchBrowseIntegration = false,
    isLivingRoomIntegration = false,
    isAstroPage = false,
    partnerId = '',
    storeId = '',
    testCycleId = '',
}) => {
    const isTestingEnvironment = getTestingEnv()
    window.appType = isMagicWindow ? APP_TYPE_MAGICWINDOW : APP_TYPE_SUGARCUBE

    // So overwrite the appType if you are in the DesignHome experience since it is also
    // a magic window ie. has magicWindow in the iframe url
    if (isDesignHome) {
        window.appType = APP_TYPE_DESIGN_HOME
    }
    if (isKiosk) {
        window.appType = APP_TYPE_KIOSK
    }
    if (isUpptacka) {
        window.appType = APP_TYPE_UPPTACKA
    }
    if (isPipIntegration) {
        window.appType = APP_TYPE_PIP
    }

    if (isSearchBrowseIntegration) {
        window.appType = APP_TYPE_SEARCH_BROWSE
    }

    if (isLivingRoomIntegration) {
        window.appType = APP_TYPE_CATEGORY_LIVING_ROOM
    }
    if (testCycleId) {
        window.testCycleId = testCycleId
    }

    window.isAstroPage = isAstroPage
    window.appEnvironment = isTestingEnvironment ? APP_ENV_TESTING : APP_ENV_PROD
    window.appMode = isMobile() ? APP_MODE_SWAP_ONLY : APP_MODE_FULL_FEATURED
    window.appPartnerId = partnerId
    window.appStoreId = storeId
    window.userType = 'anonymous'
}

type PageTimings = {
    NavigationStartedAt: number
    RequestStart?: number
    ResponseStart?: number
    ResponseEnd?: number
    DOMInteractive?: number
    DOMContentLoadedStart?: number
    DOMContentLoadedEnd?: number
    FCP?: number
    LCP?: number
    AppMounted?: number
    ExperimentsLoaded?: number
}

export type TrackOptions = Record<string, unknown>
type Track = (eventName: string, options?: TrackOptions) => Promise<void>

export const track: Track = (eventName, options) =>
    new Promise<void>((resolve) => {
        if (!isClient) {
            resolve()
            return
        }

        const [Region, Language] = getRegion().toUpperCase().split('/')
        const deviceInfo = detectDevice()
        const completeOptions: TrackOptions = {
            globalRendererSessionId: window.globalRendererSessionId,
            Application: 'Sugarcube.com',
            AppType: window.appType ? window.appType : APP_TYPE_SUGARCUBE,
            AppMode: window.appMode,
            AppEnvironment: window.appEnvironment ? window.appEnvironment : APP_ENV_PROD,
            AppVersion: process.env.GATSBY_RELEASE_BRANCH,
            IsAstroPage: window.isAstroPage || false,
            isMobile: isMobile(),
            DeviceCategory: deviceInfo.category,
            ScreenWidth: deviceInfo.screenWidth,
            HasTouch: deviceInfo.hasTouch,
            IsTouchOnly: deviceInfo.isTouchOnly,
            DetectionMethod: deviceInfo.method,
            DeviceOrientation: deviceInfo.orientation,
            PartnerId: window.appPartnerId,
            TestCycleId: window.testCycleId,
            Region,
            Language,
            UserType: window.userType,
            WebSessionId: webSessionService.sessionId,
            ReferrerContext: getTrackingContext(),
            ...locationData,
            ...options,
        }

        if (!isProd) {
            /* eslint-disable no-console */
            console.group(`tracking %c${eventName}`, 'color: #ddd;')
            console.log('Event name:      ', eventName)
            console.log('Action type:     ', completeOptions.ActionType)
            console.log('Tracking enabled:', trackingEnabled())
            console.log('Metadata:        ', completeOptions)
            console.groupEnd()
        }

        if (trackingEnabled()) {
            const promises = []

            promises.push(
                new Promise<void>((res) => {
                    // DEBUGGING {
                    const debugData = {
                        d_ts: Date.now(),
                        d_id: Math.floor(Math.random() * 10000000000),
                        eventAddedTs: new Date().getTime() + Math.floor(Math.random() * 1000), // to compare
                    }
                    // }

                    const completePlusDebug = { ...completeOptions, ...debugData }
                    mixpanel.track(eventName, completePlusDebug, () => res())
                }),
            )

            Promise.all(promises).then(() => resolve())
        } else {
            resolve()
        }
    })

let appMountedAt: number | undefined
let experimentsLoadedAt: number | undefined

const isPerformanceSupported =
    typeof window !== 'undefined' &&
    'performance' in window &&
    'getEntriesByName' in performance &&
    'getEntriesByType' in performance &&
    'now' in performance

export const appMounted = () => {
    if (typeof window !== 'undefined' && 'setState' in window) {
        window.setState('app', 'mounted')
    }

    if (!isPerformanceSupported) {
        return
    }

    appMountedAt = performance.now()
}

export const experimentsDecided = () => {
    if (isPerformanceSupported && experimentsLoadedAt == null) {
        experimentsLoadedAt = performance.now()
    }
}

const pageTimings = () => {
    if (!isPerformanceSupported) {
        return {}
    }

    const timings: PageTimings = {
        NavigationStartedAt: Math.fround(performance.timeOrigin),
    }

    const navigationTimings = performance.getEntriesByName(
        window.location.href,
        'navigation',
    ) as PerformanceNavigationTiming[]
    if (navigationTimings.length > 0) {
        const {
            requestStart,
            responseStart,
            responseEnd,
            domInteractive,
            domContentLoadedEventStart,
            domContentLoadedEventEnd,
        } = navigationTimings[navigationTimings.length - 1]
        timings.RequestStart = Math.round(requestStart)
        timings.ResponseStart = Math.round(responseStart)
        timings.ResponseEnd = Math.round(responseEnd)
        timings.DOMInteractive = Math.round(domInteractive)
        timings.DOMContentLoadedStart = Math.round(domContentLoadedEventStart)
        timings.DOMContentLoadedEnd = Math.round(domContentLoadedEventEnd)
    }

    const firstContentfulPaints = performance.getEntriesByName(
        'first-contentful-paint',
        'paint',
    ) as PerformancePaintTiming[]
    if (firstContentfulPaints.length > 0) {
        const { startTime } = firstContentfulPaints[0]
        timings.FCP = Math.round(startTime)
    }

    const largestContentfulPaints = performance.getEntriesByName(
        'largest-contentful-paint',
        'paint',
    ) as PerformancePaintTiming[]
    if (largestContentfulPaints.length > 0) {
        // Makes sure we grab the last LCP in case there are multiple recorded.
        const { startTime } = largestContentfulPaints[largestContentfulPaints.length - 1]
        timings.LCP = Math.round(startTime)
    }

    if (appMountedAt) {
        timings.AppMounted = Math.round(appMountedAt)
    }

    if (experimentsLoadedAt) {
        timings.ExperimentsLoaded = Math.round(experimentsLoadedAt)
    }

    return timings
}

export const register = (options: Record<string, unknown>) =>
    new Promise<void>((resolve) => {
        if (!isProd) {
            /* eslint-disable no-console */
            console.group('Register super property')
            console.log('Metadata:        ', options)
            console.log('Tracking enabled:', trackingEnabled())
            console.groupEnd()
        }
        if (trackingEnabled()) {
            mixpanel.register(options)
        }
        resolve()
    })

export const set = (options: Record<string, unknown>) =>
    new Promise<void>((resolve) => {
        if (!isProd) {
            /* eslint-disable no-console */
            console.group('People API set')
            console.log('Metadata:        ', options)
            console.log('Tracking enabled:', trackingEnabled())
            console.groupEnd()
        }
        if (trackingEnabled()) {
            mixpanel.people.set(options, () => resolve())
        }
        if (options.UserType) {
            window.userType = options.UserType as UserType
        }
    })

export const setOnce = (options: Record<string, unknown>) =>
    new Promise<void>((resolve) => {
        if (!isProd) {
            /* eslint-disable no-console */
            console.group('People API set_once')
            console.log('Metadata:        ', options)
            console.log('Tracking enabled:', trackingEnabled())
            console.groupEnd()
        }
        if (trackingEnabled()) {
            mixpanel.people.set_once(options, () => resolve())
        }
    })

export const increment = (propertyName: string, amnt = 1) =>
    new Promise<void>((resolve) => {
        if (!isProd) {
            /* eslint-disable no-console */
            console.group('People API increment')
            console.log('Property:        ', propertyName)
            console.log('Amount:          ', amnt)
            console.log('Tracking enabled:', trackingEnabled())
            console.groupEnd()
        }
        if (trackingEnabled()) {
            mixpanel.people.increment(propertyName, amnt, () => resolve())
        }
    })

export const reset = () =>
    new Promise<void>((resolve) => {
        if (trackingEnabled()) {
            mixpanel.reset()
        }
        resolve()
    })

export const visit: Track = (eventName, options) => track(eventName, { ...options, ActionType: 'Visit' })

const PAGE_INTERACTIVE_EVENT = 'PageInteractive'
const PERFORMANCE_ACTION_TYPE = 'Performance'

export const pageInteractive = (page: Page) => {
    if (typeof window !== 'undefined' && 'setState' in window) {
        window.setState('app', 'interactive')
    }

    const timings = pageTimings()
    const tti = Math.round(performance.now())
    track(PAGE_INTERACTIVE_EVENT, { Page: page, ActionType: PERFORMANCE_ACTION_TYPE, ...timings, TTI: tti }).catch(
        Sentry.captureException,
    )
}

export const showMagicWindowCloseFeedbackForm = () => false

export type ClickOptions = {
    /** Unique identifier for the clicked element. Ideally this should be either a translation key or a testid. */
    target: string
    /** Name of an event that the click is intended to trigger in order to aid debugging. */
    intendedAction?: string
    /** Additional attributes to attach to the Click event. */
    attributes?: TrackOptions
}

export async function click(options: ClickOptions): Promise<void>
/** @deprecated */
export async function click(eventName: string, options?: TrackOptions): Promise<void>
export async function click(optsOrEventName: ClickOptions | string, options?: TrackOptions): Promise<void> {
    // Preserve backwards-compatibility with the old click tracking where event name encoded the specific action.
    if (typeof optsOrEventName === 'string') {
        return track(optsOrEventName, { ...options, ActionType: 'Click' })
    }

    // New click tracking where the event name is generic 'Click' and attributes add additional detail.
    const { target, intendedAction, attributes } = optsOrEventName
    return track('UserClick', { Target: target, IntendedAction: intendedAction, ...attributes })
}
export const hover: Track = (eventName, options) => track(eventName, { ...options, ActionType: 'Hover' })
export const drop: Track = (eventName, options) => track(eventName, { ...options, ActionType: 'Drop' })
export const error: Track = (eventName, options) => track(eventName, { ...options, ActionType: 'Error' })
export const workflow: Track = (eventName, options) => track(eventName, { ...options, ActionType: 'Workflow' })
export const debug: Track = (eventName, options) => track(eventName, { ...options, ActionType: 'Debug' })

export const getTimeSinceLoadingStart = () => Date.now() - loadingStartTime

const tickHeartbeat = (roomInfo: Record<string, unknown>) => {
    workflow('DecorateRoom.SessionMinuteIncrement', {
        ...roomInfo,
        MinuteIncrement: heartbeatMinute,
    })
    heartbeatMinute += 1
}

export const initHeartbeat = (roomInfo: Record<string, unknown>) => {
    heartbeatMinute = 0
    tickHeartbeat(roomInfo)
    heartbeatIntervalId = window.setInterval(tickHeartbeat, 60000, roomInfo)
}

export const cancelHeartbeat = () => window.clearInterval(heartbeatIntervalId)

export const updateLocation = ({ zipcode, storeId }: { zipcode: string; storeId: string }) => {
    locationData.LocationKnown = !!(zipcode || storeId)
    locationData.LocationZip = zipcode || null
    locationData.LocationPreferredStore = storeId || null
}

export type TrackGoogleAnalyticsArgs = {
    category: string
    action: string
    label: string
    custom?: Record<string, string>
}
type TrackGoogleAnalyticsPositionalArgs = [string, string, string]

const arePositional = (
    args: [TrackGoogleAnalyticsArgs] | TrackGoogleAnalyticsPositionalArgs,
): args is TrackGoogleAnalyticsPositionalArgs => args.length > 1

export function trackGoogleAnalytics(...args: TrackGoogleAnalyticsPositionalArgs): void
export function trackGoogleAnalytics(args: TrackGoogleAnalyticsArgs): void
export function trackGoogleAnalytics(...args: [TrackGoogleAnalyticsArgs] | TrackGoogleAnalyticsPositionalArgs): void {
    const { category, action, label, custom } = arePositional(args)
        ? { category: args[0], action: args[1], label: args[2], custom: {} }
        : args[0]

    const isTestingEnvironment = getTestingEnv()
    const { isUpptacka } = getUrlContext()
    const isInIframe = getIsIFrame()

    // Auto-inject scene_uuid, composition_uuid, and room_source_type if on a design page
    const autoContextProperties: Record<string, string> = {}
    if (isDesignPage()) {
        if (window.activeSceneUuid) {
            autoContextProperties.scene_uuid = window.activeSceneUuid
        }
        if (window.activeCompositionUuid) {
            autoContextProperties.composition_uuid = window.activeCompositionUuid
        }
        if (window.activeRoomSourceType) {
            autoContextProperties.room_source_type = window.activeRoomSourceType
        }
    }

    const customEvent: Record<string, string> = {
        ...autoContextProperties, // Auto-injected UUIDs (only on design pages)
        ...custom, // Caller's custom properties (can override)
        WebSessionId: webSessionService.sessionId,
    }

    // Log GA events to console for dev environments: local/cloudflare/cte
    if (!isProd) {
        /* eslint-disable no-console */
        console.group(`Google Analytics tracking %c${action}`, 'color: #ddd;')
        console.log('Event category: ', category)
        console.log('Event action: ', action)
        console.log('Event label: ', label)
        console.log('Event custom: ', customEvent)
        console.groupEnd()
    }

    // Only fire ga events if not in an iFrame. When in an iframe, messsages
    // are passed up to the parent window to fire ga events.
    // NOTE: We want to fire our own ga events for Upptacka, when in an iframe
    if (!isTestingEnvironment && window && (isUpptacka || !isInIframe)) {
        if (window.sendEvent) {
            window.sendEvent({
                event_category: category,
                event_action: action,
                event_label: label,
                custom: customEvent,
            })
        }
    }
}

export const trackError = (err: Error) => {
    const errorMessage = err.message || GA_LABEL_CRITICAL_ERROR
    trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, GA_ACTION_ERROR_PAGE_VISIT, errorMessage)
    const metaData = {
        Action: GA_ACTION_CRITICAL_ERROR,
        ErrorMessage: errorMessage,
        Href: getHref(),
    }
    visit('ErrorPage', metaData)
}

export const afterFold = async (
    sessionStorageKey: AfterFoldSessionKeyType,
    properties: Record<string, unknown> = {},
    gaEvent?: TrackGoogleAnalyticsArgs,
): Promise<void> => {
    // Only allow ScrolledPastFold to execute once per user session per sessionStorage key.
    if (getUserScrolledFold(sessionStorageKey)) {
        return
    }

    if (gaEvent) {
        trackGoogleAnalytics(gaEvent)
    }

    await track('UserScrollPast', properties)
    try {
        getWindow()?.sessionStorage?.setItem(sessionStorageKey, JSON.stringify(true))
    } catch (e) {
        /* empty */
    }
}

export const trackSubCategoryClick = (subCategoryIds: string[]) => {
    let trackingCategory = ''

    if (!subCategoryIds.length) {
        return
    }

    const modifiableSubCatagoryIds = subCategoryIds.slice()

    // Some child items have multiple subcategories, we want to track using the most unique
    if (modifiableSubCatagoryIds.length > 1) {
        // The decorative pillows have a secondary, more generic, duvet subcategory, this finds and removes that if present
        const genericDuvetIndex = modifiableSubCatagoryIds.findIndex(
            (element) => element === SUB_CATEGORIES_IDS_MAP.Duvets,
        )

        if (genericDuvetIndex !== -1) {
            modifiableSubCatagoryIds.splice(genericDuvetIndex, 1)
        } else {
            // Fail-safe if the index is not found, the more generic subcategory is the first one
            modifiableSubCatagoryIds.shift()
        }
    }

    switch (modifiableSubCatagoryIds[0]) {
        case SUB_CATEGORIES_IDS_MAP.Beds:
            trackingCategory = 'Bed'
            break
        case SUB_CATEGORIES_IDS_MAP.DecorativePillow:
            trackingCategory = 'Pillows'
            break
        case SUB_CATEGORIES_IDS_MAP.Duvets:
            trackingCategory = 'Duvet'
            break
        default:
            trackingCategory = ''
            break
    }

    if (trackingCategory !== '') {
        click(`DecorateRoom.Morpheus.${trackingCategory}`, {
            ActionTarget: `/DesignPage/ActionPanel/design.select ${trackingCategory.toLocaleLowerCase()}`,
        })
    }
}
