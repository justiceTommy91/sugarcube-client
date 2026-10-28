import { LOCALE_US_EN } from 'models/location/constants'
import { withPrefix } from 'gatsby'
import { isProd } from 'utils/environment'
import { getRegion, getUtmSource, getUtmMedium, getUtmCampaign, getUtmContent } from 'models/location/selectors'
import getBrowser from './browser'
import { isAppleDevice } from './isMobile'

export const isEmpty = (obj) => Object.keys(obj).length === 0 && obj.constructor === Object

export const getShoppingCartUrl = (region = LOCALE_US_EN) =>
    isProd ? `https://www.ikea.com/${region}/shoppingcart/` : `https://www.cte.ikeadt.com/${region}/shoppingcart/`

// Return a url for checkout of ikea products
// items: array of string (global product id's) or null
/** @type {(items: string[], region?: string | null)} */
export const getAddToCartUrl = (items, region = LOCALE_US_EN) => {
    if (!items || !items.length) {
        return null
    }

    const IKEA_SHOPPING_CART_URL = getShoppingCartUrl(region)

    // Create a hash of global product id's so that we can create a url of the type:
    // `...items?<global_product_id1>:<num_ordered>&<global_product_id2>:<num_ordered>...`
    const itemsCount = items.reduce((acc, curr) => {
        // skip if curr value is null or empty string
        // ie., this product does not have a global product id
        if (!curr) {
            return acc
        }

        if (acc[curr]) {
            acc[curr] += 1
        } else {
            acc[curr] = 1
        }
        return acc
    }, {})

    if (isEmpty(itemsCount)) {
        return null
    }

    const resultUrl = Object.keys(itemsCount).reduce(
        (acc, curr) => `${acc}${curr}:${itemsCount[curr]},`,
        `${IKEA_SHOPPING_CART_URL}?items=`,
    )

    // Remove the trailing '&'
    return resultUrl.slice(0, resultUrl.length - 1)
}

const SUPPORT_PAGE_BASE_URL = 'https://support.home-design.ikea.com/hc/'
export const getSupportPageUrl = (locale, articleId) => {
    const localeLowerCased = (locale && locale.toLowerCase()) || ''
    if (!articleId) {
        return `${SUPPORT_PAGE_BASE_URL}${localeLowerCased}`
    }
    return `${SUPPORT_PAGE_BASE_URL}${localeLowerCased}/articles/${articleId}`
}

export const getMETutorialImageUrl = (lang) => withPrefix(`/images/graphics/onboarding/magic_eraser/goback_${lang}.png`)

/**
 * @param {string} compositionId room's uuid used for the VPC
 * @returns The URL for the BOKA expert check calendar page
 */
export const getExpertCheckUrl = (compositionId) => {
    const locale = process.env.GATSBY_IKEA_MARKET
    const regionCode = locale.split('/')[0]
    // Boka (the appointment booking tool the link goes to) requires us to provide a dummy zip code
    const zipCodes = {
        ca: 'M5B1S9',
        ch: '9015',
        nl: '1101BL',
        pl: '31-357',
        us: '94303',
    }
    // NOTE: BOKA tool doesn't exist in CTE for CA or NL
    return `https://www.ikea.com/${locale}/appointment/bedroom?zip=${zipCodes[regionCode]}&service=expert_check_remote_wardrobes&ref_app=kreativ&event_action=button&vpc=${compositionId}`
}

export const getAppStoreUrl = ({ source, experimentId = '', variationId = '', route = '/gallery' }) => {
    const effUtmSource = getUtmSource() || 'kreativ_web'
    const effUtmMedium = getUtmMedium() || 'kreativ_usage'
    const effUtmCampaign = getUtmCampaign() || 'kreativ_campaign'
    const effUtmContent = getUtmContent() || 'kreativ_content'

    const { name: browserName, version: browserVersion, major: browserMajor } = getBrowser() || {}

    // The IKEA iOS app handles deep links under the `kreativ` host; other platforms still use `design-lab`.
    const deepLinkHost = isAppleDevice() ? 'kreativ' : 'design-lab'
    const deepLink = new URL(`ikea://${deepLinkHost}${route}`)
    deepLink.searchParams.append('source', source)
    if (experimentId) deepLink.searchParams.append('experimentId', experimentId)
    if (variationId) deepLink.searchParams.append('variationId', variationId)
    //  UTM at app level
    if (effUtmSource) deepLink.searchParams.append('utm_source', effUtmSource)
    if (effUtmMedium) deepLink.searchParams.append('utm_medium', effUtmMedium)
    if (effUtmCampaign) deepLink.searchParams.append('utm_campaign', effUtmCampaign)
    if (effUtmContent) deepLink.searchParams.append('utm_content', effUtmContent)

    // browser fields (mobile deep link only)
    if (browserName) deepLink.searchParams.append('browserName', String(browserName))
    if (browserVersion) deepLink.searchParams.append('browserVersion', String(browserVersion))
    if (browserMajor) deepLink.searchParams.append('browserMajor', String(browserMajor))

    const desktopFallbackUrl = `https://www.ikea.com/${getRegion()}/home-design/`

    const linkItUrl = new URL('https://applink.ikea.com')
    linkItUrl.searchParams.append('link', deepLink.toString())
    linkItUrl.searchParams.append('fbd', desktopFallbackUrl)
    linkItUrl.searchParams.append('guid', 'd3N5J3')

    //  UTM at root level
    if (effUtmSource) linkItUrl.searchParams.append('utm_source', effUtmSource)
    if (effUtmMedium) linkItUrl.searchParams.append('utm_medium', effUtmMedium)
    if (effUtmCampaign) linkItUrl.searchParams.append('utm_campaign', effUtmCampaign)
    if (effUtmContent) linkItUrl.searchParams.append('utm_content', effUtmContent)

    return linkItUrl.toString()
}

export const getSlugFromUrl = (url) => {
    const parsedUrl = new URL(url)
    let pathname = parsedUrl.pathname

    // Remove trailing slash (if any) from the pathname
    if (pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1)
    }

    // Split the pathname into parts and return the last part as the slug
    const pathParts = pathname.split('/').filter((part) => part) // Filter out empty parts
    return pathParts[pathParts.length - 1]
}
