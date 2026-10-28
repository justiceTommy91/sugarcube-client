/**
 * URL utilities for Astro pages
 *
 * Astro-specific helpers for constructing asset paths and resolving the
 * current market region from the URL. None of these depend on Gatsby's
 * process.env or Redux.
 */

import { isClient } from '@utils/environment'

/**
 * Get market-aware asset path for Astro pages
 * Prepends the market path prefix to asset paths
 *
 * Dev mode: Returns '/home-design{path}' since images are copied to public/home-design/
 * Production: Returns '/{market}/home-design{path}' for market-specific paths
 *
 * Example (dev): getAssetPath('us/en', '/images/graphics/learnmore/hero.png')
 * Returns: '/home-design/images/graphics/learnmore/hero.png'
 *
 * Example (prod): getAssetPath('us/en', '/images/graphics/learnmore/hero.png')
 * Returns: '/us/en/home-design/images/graphics/learnmore/hero.png'
 */
export const getAssetPath = (market: string, path: string): string => {
    const isDev = import.meta.env.DEV
    return isDev ? `/home-design${path}` : `/${market}/home-design${path}`
}

/**
 * Returns true when running on a real IKEA domain (CTE / production).
 * - Production: *.ikea.com
 * - CTE: *.ikeadt.com
 * Local dev and CF preview deployments are on neither, so this returns false
 * there even though window.ikea is injected by the header scripts.
 */
export const isIkeaOrigin = (): boolean => {
    if (!isClient) return false
    const { hostname } = window.location
    return hostname.endsWith('.ikea.com') || hostname.endsWith('.ikeadt.com')
}

/**
 * Astro-compatible equivalent of getRegion() from models/location/selectors.
 * The Gatsby version relies on process.env.GATSBY_IKEA_MARKET which is undefined
 * in Astro. This version resolves the market from the URL instead.
 * Checks: 1) ?region= URL param  2) URL path /{country}/{lang}/...
 * Falls back to 'us/en' during SSR.
 */
export const getRegion = (): string => {
    if (isClient) {
        const urlParams = new URLSearchParams(window.location.search)
        const regionParam = urlParams.get('region')
        if (regionParam) return regionParam

        const pathParts = window.location.pathname.split('/').filter(Boolean)
        if (pathParts.length >= 2) {
            const country = pathParts[0]
            const lang = pathParts[1]
            if (country.length === 2 && lang.length === 2) {
                return `${country}/${lang}`
            }
        }
    }
    return 'us/en'
}
