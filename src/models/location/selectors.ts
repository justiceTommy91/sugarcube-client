import { createSelector } from 'reselect'
import qs from 'qs'

import { isProd, isClient } from 'utils/environment'
import { stringIsUuidOrNumber } from 'utils/string'

import {
    PROD_HOSTNAMES,
    PARAM_SAVEONFIRSTRENDER,
    PARAM_RETURN_URL,
    PARAM_RESUME,
    ONBOARDING_ENABLED_REGIONS,
    PARAM_APP_CONTEXT,
    PARAM_LEGACY_MANIFEST,
    PARAM_SKIP_AUTH,
    PARAM_MOBILE_WEB,
    PARAM_NOTIFY_ACTIVITY,
    PARAM_SHOW_KEYS,
    PARAM_SEARCH_CATEGORY,
    COUNTRY_TO_API_SHARD,
    AllowedCountries,
    MORPHEUS_ENABLED_REGIONS,
    AllowedRegion,
    PARAM_ROOM_TYPE,
    PARAM_FILTER_ROOMTYPE,
    AllowedLocaleType,
    PARAM_BANNER_IMAGE,
    PARAM_PLANNER_ROOM,
} from 'models/location/constants'
import {
    CONTEXT_CATEGORY_LIVING_ROOM,
    CONTEXT_CHOOSE_ROOM,
    CONTEXT_PLANNER,
    CONTEXT_SEARCH_BROWSE,
    ROOM_PLANNER_SLUGS,
    type RoomPlannerSlug,
} from 'constants/contexts'
import { type RoomType, ROOM_TYPES } from 'models/scenes/constants'
import { getUrlParams, getSearch, getPathname, getHash, getHostname, getOrigin, getHref } from 'utils/urlParams'
import { includes } from 'utils/array'
import { hasProp } from 'utils/object'
import { getRoomTypeFromHardcodedCategories } from 'models/referrer/utils'

// Window object accessors
// Needed for Gatsby SSR
export const getWindow = (): Partial<typeof window> => (isClient ? window : {})

export const getUserAgent = () => getWindow().navigator?.userAgent || ''
export const isProdOrCte = () => getHostname().includes('ikea')
export const isCloudflare = () => getHostname().includes('sugarcube-client')
// IKEA global auth only works on IKEA-hosted domains where CDN-injected
// header/footer scripts can connect to CIAM. Non-IKEA-hosted environments
// such as localhost and Cloudflare Pages use session-cookie dev auth.
export const usesDevAuth = () => !isProdOrCte()

export const getIsIFrame = () => typeof window !== 'undefined' && window.self !== window.top

export const getFromParam = () => getUrlParams().from?.toString() || ''

// Return 'us/en'
export const getRegion = (): AllowedRegion =>
    (getUrlParams().region?.toString() as AllowedRegion) || process.env.GATSBY_IKEA_MARKET

// Get locale string in bcp 47 format 'en-US'
export const getLocale = () => process.env.GATSBY_LOCALE as AllowedLocaleType

// Given region 'us/en', return 'us'
export const getCountryCode = (): AllowedCountries => getRegion().split('/')[0] as AllowedCountries

// Given region 'us/en', return 'en'
export const getLanguageCode = () => getRegion().split('/')[1]

// Show locale keys instead of values
export const getShowLanguageKeys = () => hasProp(getUrlParams(), PARAM_SHOW_KEYS)

// Returns the basename for routing (what subfolder are we serving from)
export const getRoutingBasename = () => `${process.env.GATSBY_IKEA_MARKET}/home-design/`

// Returns the url we're serving from (externally)
export const getBaseUrl = () => {
    let hostname = 'www.ikea.com'
    if (!PROD_HOSTNAMES.includes(getHostname())) {
        hostname = getHostname()
    }
    return `https://${hostname}/${getRegion()}/home-design/`
}

export const getOgImage = (url: string) => {
    let hostname = 'www.ikea.com'
    if (!PROD_HOSTNAMES.includes(getHostname())) {
        hostname = getHostname()
    }
    return `https://${hostname}${url}`
}

export const getApiPrefix = (shardApi = false) => {
    const region = getRegion()
    const country = getCountryCode()
    const apiPath = 'ideas/sugarcube/api'
    const apiShard = COUNTRY_TO_API_SHARD[country]
    const shouldShardBaseUrl = shardApi && apiShard !== 'us' && isProd

    // Use the local proxy server for api calls
    const useLocalServer = getHostname() === 'localhost' || getHostname() === process.env.GATSBY_SUGARCUBE_CUSTOM_ORIGIN

    const baseUrl = process.env.GATSBY_SUGARCUBE_API
    const shardedBaseUrl = shouldShardBaseUrl ? baseUrl.replace('api', `api-${apiShard}`) : baseUrl

    const finalBaseUrl = useLocalServer ? '' : shardedBaseUrl

    return `${finalBaseUrl}/${region}/${apiPath}`
}

export const getCartApiPrefix = () =>
    `https://${isProd ? 'prod' : 'stage'}.cart.caas.selling.ingka.com/api/v1/${getCountryCode()}/`

export const getIkeaHomeUrl = () => {
    if (!isProd) {
        return `https://www.cte.ikeadt.com/${getRegion()}/`
    }
    return `https://www.ikea.com/${getRegion()}/`
}

export const getDesignLabUrl = () => `${getIkeaHomeUrl()}home-design/`

export const getPlannersUrl = () => `${getIkeaHomeUrl()}planners/`

export const getDesignLabReturnUrl = () => `${getDesignLabUrl()}room/${getHash()}`

// url is a string of format /room/?subCatalog=abc#compositionId/sceneId
export const generateRoomLink = (url: string) =>
    isProdOrCte() || isCloudflare() ? `/${process.env.GATSBY_IKEA_MARKET}/home-design${url}` : url

// TODO: The below selector is more correct, but including the search params causes DYH to fail into a refresh loop...
// export const getDesignLabReturnUrl = () => `${getDesignLabUrl()}room/${getSearch()}#${getHash()}`

export const getDefaultRedirectUrl = () => `${getOrigin() || 'www.ikea.com'}${getRoutingBasename()}`

export const getRouteCompositionIds = () => {
    const parts = getHash().split('/')
    const ids = {
        compositionId: stringIsUuidOrNumber(parts[0]) ? parts[0] : null,
        sceneId: stringIsUuidOrNumber(parts[1]) ? parts[1] : null,
    }
    return ids
}

export const getRouteCollection = createSelector([getUrlParams], (urlParams) => urlParams.collection || null)

export const getDebugFurnitureId = createSelector([getUrlParams], (urlParams) => urlParams.debugFurnitureId || null)

export const getDebugFurnitureModelUrl = createSelector(
    [getUrlParams],
    (urlParams) => urlParams.debugFurnitureModelUrl || null,
)
export const getDebugGeometryData = createSelector([getUrlParams], (urlParams) => {
    try {
        return JSON.parse(urlParams.geomData as string) || null
    } catch {
        return null
    }
})

export const getSubCatalog = () => getUrlParams().subCatalog || null

export const getFilterRoomType = createSelector(
    [getRoomTypeFromHardcodedCategories],
    (hardcodedRoomType): RoomType | null => {
        if (hardcodedRoomType) return hardcodedRoomType as RoomType
        const roomTypeValue = (getUrlParams()[PARAM_ROOM_TYPE] ?? getUrlParams()[PARAM_FILTER_ROOMTYPE])?.toString().toUpperCase() || ''
        return includes(ROOM_TYPES, roomTypeValue) ? (roomTypeValue as RoomType) : null
    },
)

export const getSearchQuery = () => getUrlParams().query || null

export const getCategoryId = () => getUrlParams().categoryId || null

export const getSubCategoryId = () => getUrlParams().subcategoryId || null

export const getShowroomId = () => getUrlParams().showroomId || null

export const getCanvasWidth = createSelector(
    [getUrlParams],
    (urlParams) => parseInt(urlParams.canvasWidth as string, 10) || 0,
)

// Resume param implies loading composition from local storage
export const getResume = () => hasProp(getUrlParams(), PARAM_RESUME)

export const getSaveOnFirstRender = createSelector([getUrlParams], (urlParams) =>
    hasProp(urlParams, PARAM_SAVEONFIRSTRENDER),
)

export const getReturnUrl = createSelector([getUrlParams], (urlParams) => urlParams[PARAM_RETURN_URL] || null)

export const getMaxTextureSize = createSelector(
    [getUrlParams],
    (urlParams) => parseInt(urlParams.maxTextureSize as string, 10) || null,
)

export const getForceLegacyManifest = () => hasProp(getUrlParams(), PARAM_LEGACY_MANIFEST)

export const getMemoryTrackingEnv = createSelector([getUrlParams], (urlParams) => urlParams.memoryTrackingEnv)

export const getHideHeader = createSelector([getUrlParams], (urlParams) => hasProp(urlParams, 'hideHeader'))

export const getTestCycleId = () => getUrlParams().testCycleId?.toString() || ''
export const getAllowMobileWeb = () => !isProd && hasProp(getUrlParams(), PARAM_MOBILE_WEB)

export const getOnboardingEnabled = () => ONBOARDING_ENABLED_REGIONS.includes(getRegion())

export const getShowroomFilter = () => getUrlParams().roomType?.toString() || ''

export const getShowroomFurnishingFilter = () => getUrlParams().furnishingType?.toString() || ''

export const getUrlProductId = () => getUrlParams().productId?.toString() || ''
export const getChooseRoomProductName = () => getUrlParams().productName?.toString() || ''
export const getChooseRoomRoomType = () => getUrlParams().roomType?.toString() || ''
export const getAppContext = () => getUrlParams()[PARAM_APP_CONTEXT]?.toString() || ''
export const getSearchCategory = () => getUrlParams()[PARAM_SEARCH_CATEGORY]?.toString() || ''
export const getIsPipContext = () => getHref().indexOf('chooseRoom') > -1 || getAppContext() === CONTEXT_CHOOSE_ROOM
export const getIsSearchBrowse = () =>
    getHref().indexOf('searchBrowse') > -1 || getAppContext() === CONTEXT_SEARCH_BROWSE

export const getIsLivingRoomContext = () =>
    getHref().indexOf('living-room') > -1 || getAppContext() === CONTEXT_CATEGORY_LIVING_ROOM
export const getIsLivingRoomSwappable = () => getIsLivingRoomContext() && Boolean(getUrlProductId())

export const getIsRoomPlannerContext = () => getAppContext() === CONTEXT_PLANNER

export const getPlannerRoom = (): RoomPlannerSlug | null => {
    const room = getUrlParams()[PARAM_PLANNER_ROOM]?.toString() || ''
    if ((ROOM_PLANNER_SLUGS as readonly string[]).includes(room)) {
        return room as RoomPlannerSlug
    }
    return null
}

export const getBannerImageParam = () => getUrlParams()[PARAM_BANNER_IMAGE]?.toString() || ''

// isUpptacka is true when the URL contains 'upptacka' as a query param or the page path is '/upptackaShowroom/'
export const getIsUpptacka = () => hasProp(getUrlParams(), 'upptacka') || getPathname().includes('upptackaShowroom')

// isOptimizelyDebug is true when the URL contains 'optimizely_debug' as a query param
export const getIsOptimizelyDebug = () => Object.prototype.hasOwnProperty.call(getUrlParams(), 'optimizely_debug')

export const getPartnerId = () => getUrlParams().partnerId?.toString() || ''
/**
 * Get the storeId from the URL params, used when storeId is passed in the URL of an iframe integration (e.g. Upptacka)
 * @returns {string} - The storeId from the URL params
 */
export const getStoreId = () => getUrlParams().storeId?.toString() || ''

export const getSkipAuth = () => hasProp(getUrlParams(), PARAM_SKIP_AUTH)
export const getNotifyActivity = () => hasProp(getUrlParams(), PARAM_NOTIFY_ACTIVITY)

export const getUrlContext = () => {
    const params = qs.parse(getSearch(), { ignoreQueryPrefix: true })
    const isMagicWindow = hasProp(params, 'magicWindow')
    const isKiosk = hasProp(getUrlParams(), 'kiosk') || hasProp(getUrlParams(), 'h22')
    const isUpptacka = getIsUpptacka()
    const isOptimizelyDebug = getIsOptimizelyDebug()
    const isPipIntegration = getIsPipContext()
    const isSearchBrowseIntegration = getIsSearchBrowse()
    const isLivingRoomIntegration = getIsLivingRoomContext()
    const isRoomPlannerIntegration = getIsRoomPlannerContext()
    const roomPlannerSlug = getPlannerRoom()
    const { sceneId } = getRouteCompositionIds()
    const showLocaleKeys = getShowLanguageKeys()

    return {
        isMagicWindow,
        hideDashboard: isMagicWindow || hasProp(params, 'hideDashboard'),
        isKiosk,
        isUpptacka,
        isOptimizelyDebug,
        isPipIntegration,
        isSearchBrowseIntegration,
        isLivingRoomIntegration,
        isRoomPlannerIntegration,
        roomPlannerSlug,
        sceneId,
        showLocaleKeys,
    }
}

export const getPlannerDashboardUrl = () => {
    const params = new URLSearchParams()
    params.set(PARAM_APP_CONTEXT, CONTEXT_PLANNER)
    const room = getPlannerRoom()
    if (room) {
        params.set(PARAM_PLANNER_ROOM, room)
    }
    const bannerImage = getBannerImageParam()
    if (bannerImage) {
        params.set(PARAM_BANNER_IMAGE, bannerImage)
    }
    return `/dashboard?${params.toString()}`
}

export const getIsMorpheusMarket = () => MORPHEUS_ENABLED_REGIONS.includes(getRegion())

export const getUtmSource = () => getUrlParams().utm_source?.toString() || ''
export const getUtmMedium = () => getUrlParams().utm_medium?.toString() || ''
export const getUtmCampaign = () => getUrlParams().utm_campaign?.toString() || ''
export const getUtmContent = () => getUrlParams().utm_content?.toString() || ''

export { getUrlParams, getSearch, getPathname, getHash, getHostname, getOrigin, getHref }
export const getMultiPlaceIds = () => getUrlParams().multiPlaceIds || null
export const getSetID = () => getUrlParams().setID || null
