import { getIkeaHomeUrl, getOrigin, getRegion, getWindow } from 'models/location/selectors'
import { withTimeout } from 'utils/async'

import { PARAM_SAVEONFIRSTRENDER, PARAM_RESUME, PARAM_PRODUCT_ID } from './constants'

export const makeLoginUrl = (returnUrl: string, region: string, isSignup: boolean, shouldResume: boolean, isLivingRoomIntegration?: boolean) => {
    const verb = isSignup ? 'signup' : 'login'
    const origin = getOrigin()
    // origin for localhost and cloudflare links
    const devOrigin = origin.includes('localhost') ? origin : `${origin}/${getRegion()}/home-design`
    const isIkeaOrigin = origin.includes(`ikea`)

    // Redirect to internal login if we are in local dev or cloudflare link, not on ikea
    const baseUrl = isIkeaOrigin ? `${getIkeaHomeUrl()}profile/${verb}/` : `${devOrigin}/login`
    const fromUrl = new URL(returnUrl)
    if (shouldResume) {
        fromUrl.searchParams.set(PARAM_RESUME, 'true')
        fromUrl.searchParams.set(PARAM_SAVEONFIRSTRENDER, 'true')

        if (isLivingRoomIntegration) {
            fromUrl.searchParams.delete(PARAM_PRODUCT_ID)
        }
    }
    return `${baseUrl}?from=${window.encodeURIComponent(fromUrl.toString())}`
}

// Get locale for playStore and appStore badges
export const getLocaleForMobileAppStores = (locale?: string) => {
    const regionBasedLocales = ['fr-CA']
    const currentLocale = locale || process.env.GATSBY_LOCALE
    if (regionBasedLocales.includes(currentLocale)) {
        return [currentLocale, currentLocale.split('-')[1]]
    }
    return currentLocale.split('-')
}

export const replaceUrlParams = (op: (search: URLSearchParams) => void) => {
    if (typeof window === 'undefined') {
        return
    }
    const currentUrl = new URL(window.location.toString())
    op(currentUrl.searchParams)
    window.history.replaceState(null, '', currentUrl)
}

export type NavigateExternalOptions = {
    before?: () => Promise<void>
    timeout?: number
}

const DEFAULT_TIMEOUT = 2_000

export const navigateExternal = (
    url: string | URL,
    { before = Promise.resolve, timeout = DEFAULT_TIMEOUT }: NavigateExternalOptions = {},
): void => {
    withTimeout(before?.(), timeout).then(() => getWindow().location?.assign(url))
}
