import { getUrlParams } from 'models/location/selectors'

const PARTNER_ID_KEY = 'partner_tracking_partner_id'
const REFERRAL_ID_KEY = 'partner_tracking_referral_id'

export interface PartnerTrackingData {
    partnerId?: string
    referralId?: string
}

/**
 * Captures partner tracking parameters from URL and stores them in sessionStorage
 * These parameters are sent from BCN team portal when redirecting to Kreativ
 */
export const capturePartnerTrackingParams = (): void => {
    const urlParams = getUrlParams()

    // Check for partner_id parameter
    const partnerId = urlParams.partner_id?.toString()
    if (partnerId) {
        sessionStorage.setItem(PARTNER_ID_KEY, partnerId)
    }

    // Check for referral_id parameter
    const referralId = urlParams.referral_id?.toString()
    if (referralId) {
        sessionStorage.setItem(REFERRAL_ID_KEY, referralId)
    }
}

/**
 * Retrieves stored partner tracking data from sessionStorage
 */
export const getPartnerTrackingData = (): PartnerTrackingData => ({
    partnerId: sessionStorage.getItem(PARTNER_ID_KEY) || undefined,
    referralId: sessionStorage.getItem(REFERRAL_ID_KEY) || undefined,
})

/**
 * Clears partner tracking data from sessionStorage
 * Called after successfully saving a composition
 */
export const clearPartnerTrackingData = (): void => {
    sessionStorage.removeItem(PARTNER_ID_KEY)
    sessionStorage.removeItem(REFERRAL_ID_KEY)
}

/**
 * Formats partner tracking data for the geo_properties field
 */
export const formatGeoProperties = (): Record<string, string> | undefined => {
    const trackingData = getPartnerTrackingData()

    if (!trackingData.partnerId && !trackingData.referralId) {
        return undefined
    }

    const result: Record<string, string> = {}
    if (trackingData.partnerId) {
        result.partnerId = trackingData.partnerId
    }
    if (trackingData.referralId) {
        result.referralId = trackingData.referralId
    }

    return result
}
