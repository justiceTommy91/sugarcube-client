import React, { ReactNode } from 'react'

import * as Sentry from '@sentry/react'
import 'utils/polyfills'
import * as tracker from 'utils/tracker'

import { SugarcubeContextProvider } from 'apps/SugarcubeContext'

import { experimentsService } from 'services/experiments'

import UiStateProvider from 'apps/UiStateProvider'
import ToastsProvider from 'toasts/ToastsProvider'
import { getIsIFrame, getPartnerId, getUrlContext, getTestCycleId, getStoreId } from 'models/location/selectors'
import { capturePartnerTrackingParams } from 'services/partnerTracking'
import 'apps/KreativWorker/shim'

require('src/style/Root.scss')

experimentsService.initialize().then(tracker.experimentsDecided)

// By observation it was determined that the root element has no props
// and the head element at least has a location prop
const isHeadElement = (element: ReactNode) => !!(element as React.ReactElement).props?.location

// Not a react component
const RootProvider = ({ element }: { element: ReactNode }) => {
    if (isHeadElement(element)) {
        // Don't initialize the app when Gatsby is wrapping
        // the Head element. The remaining Root element is
        // the only one that should init everything.
        // TODO: Upgrading Gatsby might remove the need for this
        // but no evidence gathered. WALL-2930
        return element
    }

    if (typeof window !== 'undefined') {
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

        // Capture partner tracking parameters from URL (partner_id and referral_id)
        capturePartnerTrackingParams()

        // Tracking
        tracker.initAppGlobals({
            isMagicWindow,
            isDesignHome,
            isKiosk,
            isPipIntegration,
            isSearchBrowseIntegration,
            isUpptacka,
            partnerId,
            storeId,
            testCycleId,
            isLivingRoomIntegration,
        })
        tracker.initTracking()
    }

    tracker.appMounted()

    return (
        <Sentry.ErrorBoundary
            beforeCapture={(scope) => {
                if (typeof window !== 'undefined') {
                    const { isUpptacka } = getUrlContext()
                    scope.setTag(`is-upptacka`, isUpptacka)
                }
            }}
            onError={tracker.trackError}
        >
            <SugarcubeContextProvider>
                <ToastsProvider>
                    <UiStateProvider>{element}</UiStateProvider>
                </ToastsProvider>
            </SugarcubeContextProvider>
        </Sentry.ErrorBoundary>
    )
}

export default RootProvider
