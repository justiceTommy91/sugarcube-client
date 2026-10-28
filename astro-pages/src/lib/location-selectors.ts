/**
 * Shim for models/location/selectors in Astro pages.
 *
 * Re-exports everything from the real Gatsby selectors, but overrides
 * getRegion with the Astro-compatible version that parses the market
 * from the URL path instead of relying on GATSBY_IKEA_MARKET env var.
 *
 * Wired via Vite resolve alias in astro.config.mjs:
 *   'models/location/selectors' → this file
 *
 * TODO: The following re-exported functions reference process.env.GATSBY_*
 * variables that are undefined in Astro and will produce broken values
 * if called. They need Astro-compatible overrides before use:
 *
 *   - getLocale()          — reads process.env.GATSBY_LOCALE → returns undefined
 *   - getRoutingBasename() — reads process.env.GATSBY_IKEA_MARKET → returns "undefined/home-design/"
 *   - generateRoomLink()   — reads process.env.GATSBY_IKEA_MARKET → path contains "undefined"
 *   - getDefaultRedirectUrl() — calls getRoutingBasename() → inherits its broken value
 */

import { isProd } from '@utils/environment'
import { getHostname, getOrigin } from '@utils/urlParams'
import { COUNTRY_TO_API_SHARD, type AllowedCountries } from '@models/location/constants'
import { getRegion } from './url-utils'

// Re-export all original selectors
export * from '@models/location/selectors'

// Override getRegion with the Astro-compatible URL-based version
export { getRegion } from './url-utils'

/**
 * Astro-compatible override of getIkeaHomeUrl from models/location/selectors.
 * The original calls getRegion() which relies on process.env.GATSBY_IKEA_MARKET
 * (undefined in Astro). This version uses the URL-based getRegion shim.
 *
 * Always returns the CTE or prod IKEA home URL — suitable for profile, login,
 * and the IKEA logo link where localhost/Cloudflare targets don't exist.
 * For home-design navigation use getStartPageUrl() instead.
 */
export const getIkeaHomeUrl = () => {
    const region = getRegion()
    if (!isProd) {
        return `https://www.cte.ikeadt.com/${region}/`
    }
    return `https://www.ikea.com/${region}/`
}

/**
 * Returns the URL for the /home-design/ start page, respecting the current
 * deployment context so local dev and Cloudflare preview links stay within
 * their own environment.
 *
 * - localhost       → http://localhost:1080/   (Gatsby dev server)
 * - Cloudflare link → {current origin}/{region}/home-design/
 * - CTE / prod      → {getIkeaHomeUrl()}home-design/
 */
export const getStartPageUrl = (): string => {
    const region = getRegion()
    const hostname = getHostname()
    if (hostname === 'localhost') {
        return `http://localhost:1080/`
    }
    if (hostname.includes('sugarcube-client')) {
        return `${getOrigin()}/${region}/home-design/`
    }
    return `${getIkeaHomeUrl()}home-design/`
}

/**
 * Astro-compatible override of getApiPrefix from models/location/selectors.
 * The original relies on process.env.GATSBY_IKEA_MARKET (via getRegion) which
 * is undefined in Astro. This version uses the shimmed URL-based getRegion.
 */
export const makeLoginUrl = (returnUrl: string, isSignup = false): string => {
    const origin = getOrigin()
    const isIkeaOrigin = origin.includes('ikea')
    const verb = isSignup ? 'signup' : 'login'
    const baseUrl = isIkeaOrigin
        ? `${getIkeaHomeUrl()}profile/${verb}/`
        : `${origin}/${getRegion()}/home-design/test/login`
    return `${baseUrl}?from=${window.encodeURIComponent(returnUrl)}`
}

export const makeLogoutUrl = (redirectUrl = window.location.href): string =>
    `${getApiPrefix()}/auth/logout?redirectUrl=${window.encodeURIComponent(redirectUrl)}`

export const getApiPrefix = (shardApi = false) => {
    const region = getRegion()
    const country = region.split('/')[0] as AllowedCountries
    const apiPath = 'ideas/sugarcube/api'
    const apiShard = COUNTRY_TO_API_SHARD[country]
    const shouldShardBaseUrl = shardApi && apiShard !== 'us' && isProd

    const hostname = getHostname()
    const customOrigin = import.meta.env.PUBLIC_SUGARCUBE_CUSTOM_ORIGIN ?? 'localhost'
    const useLocalServer = hostname === 'localhost' || hostname === customOrigin

    const baseUrl = import.meta.env.PUBLIC_SUGARCUBE_API ?? process.env.GATSBY_SUGARCUBE_API
    const shardedBaseUrl = shouldShardBaseUrl ? baseUrl.replace('api', `api-${apiShard}`) : baseUrl
    const finalBaseUrl = useLocalServer ? '' : shardedBaseUrl

    return `${finalBaseUrl}/${region}/${apiPath}`
}
