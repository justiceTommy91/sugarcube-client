import { useMemo } from 'react'
import { getAppStoreUrl } from '@utils/buildUrls'
import { APP_STORE_SOURCE_KREATIV_LITE_PROMO } from '@gatsby/models/tracking/constants'

/**
 * Deep link route format for the IKEA app scene viewer.
 * Coordinate with the IKEA app team to confirm the exact path before shipping.
 */
const KREATIV_LITE_APP_ROUTE_PREFIX = '/scene'

/**
 * Builds the applink.ikea.com URL that opens the given scene in the IKEA native app.
 * Falls back to the IKEA app store page if the app is not installed.
 */
export function useAppDeepLink(sceneId: string): string {
    return useMemo(() => {
        const route = sceneId ? `${KREATIV_LITE_APP_ROUTE_PREFIX}?sceneId=${sceneId}` : KREATIV_LITE_APP_ROUTE_PREFIX
        return getAppStoreUrl({
            source: APP_STORE_SOURCE_KREATIV_LITE_PROMO,
            route,
        })
    }, [sceneId])
}
