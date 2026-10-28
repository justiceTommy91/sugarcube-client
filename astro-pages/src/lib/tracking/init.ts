/**
 * Tracking initialization script for Astro pages
 */

import { initTracking, initAppGlobals, appMounted, register } from '@utils/tracker'
import { getIsIFrame, getUrlContext, getPartnerId, getStoreId, getTestCycleId } from 'models/location/selectors'
import { capturePartnerTrackingParams } from '@services/partnerTracking'

// Guard to ensure initialization only happens once
let isInitialized = false

export const isTrackingInitialized = () => isInitialized

// Initialize tracking when this module is imported
// This will only execute client-side due to the window check
if (typeof window !== 'undefined' && !isInitialized) {
    isInitialized = true
    try {
        // Capture partner tracking parameters from URL
        capturePartnerTrackingParams()

        // Get URL context (iframe, kiosk, integrations, etc.)
        const {
            isMagicWindow,
            isKiosk,
            isUpptacka,
            isPipIntegration,
            isSearchBrowseIntegration,
            isLivingRoomIntegration,
        } = getUrlContext()

        const isInIframe = getIsIFrame()
        const isDesignHome = !isInIframe
        const partnerId = getPartnerId()
        const storeId = getStoreId()
        const testCycleId = getTestCycleId()

        // Initialize app globals for tracking context
        initAppGlobals({
            isMagicWindow: isMagicWindow || false,
            isDesignHome: isDesignHome || false,
            isKiosk: isKiosk || false,
            isPipIntegration: isPipIntegration || false,
            isSearchBrowseIntegration: isSearchBrowseIntegration || false,
            isUpptacka: isUpptacka || false,
            isLivingRoomIntegration: isLivingRoomIntegration || false,
            partnerId: partnerId || '',
            storeId: storeId || '',
            testCycleId: testCycleId || '',
            isAstroPage: true,
        })

        // Initialize tracking services (Mixpanel, Sentry, GA)
        initTracking()

        // Detect GPU tier asynchronously and expose on window for tracking
        import('Renderer/gpuDetect/CachedGPUDetector')
            .then(({ CachedGPUDetector }) => new CachedGPUDetector().fetchGPUStats())
            .then((stats) => {
                register({ gpuStatsTier: stats.tier, gpuStatsGPU: stats.gpu })
            })
            .catch(() => { /* GPU detection failed — gpuStatsTier super property not registered */ })
    } catch (error) {
        console.error('Failed to initialize tracking:', error)
    }

    // Mark app mounted when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            appMounted()
        })
    } else {
        appMounted()
    }
}
