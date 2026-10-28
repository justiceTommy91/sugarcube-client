import React, { useMemo, useEffect, useCallback } from 'react'
import { getRefParamFragment } from '@astro-hooks/useReferrer'
import * as Sentry from '@sentry/react'

import { AppProviders } from '@providers/AppProviders'
import { StatusProvider } from '@providers/StatusProvider'
import { useUserContext } from '@providers/UserProvider'
import ErrorMessage from '@astro-components/common/ErrorMessage'
import { trackError } from '@utils/tracker'
import { getUrlParams } from '@utils/urlParams'
import UploadProgressBanners from '@gatsby/components/KreativLite/UploadProgressBanners'
import type { ProcessingTracking } from '@gatsby/components/KreativLite/utils/analyticsTracking'
import BouncingBallLoader from '@gatsby/components/uiElements/BouncingBallLoader'
import type { Translations } from '@lib/static-paths-utils'
import {
    FMF_PROCESSING_VISIT,
    FMF_PROCESSING_EXTENDED,
    FMF_PROCESSING_END,
    GA_ACTION_FMF_PROCESSING_VISIT,
    GA_ACTION_FMF_PROCESSING_EXTENDED,
    GA_ACTION_FMF_PROCESSING_END,
} from '@lib/tracking/constants'
import './FindMyFitUploadContent.scss'

const FMF_PROCESSING_TRACKING: ProcessingTracking = {
    visitEvent: FMF_PROCESSING_VISIT,
    extendedEvent: FMF_PROCESSING_EXTENDED,
    endEvent: FMF_PROCESSING_END,
    gaActionVisit: GA_ACTION_FMF_PROCESSING_VISIT,
    gaActionExtended: GA_ACTION_FMF_PROCESSING_EXTENDED,
    gaActionEnd: GA_ACTION_FMF_PROCESSING_END,
}
interface FindMyFitUploadAppProps {
    locale: string
    market: string
    translations: Translations
}

const FindMyFitUploadContent = ({ market }: { market: string }) => {
    const { isLoading: isAuthLoading } = useUserContext()
    const sceneId = useMemo(() => {
        const params = getUrlParams()
        return params.sceneId?.toString() || null
    }, [])

    useEffect(() => {
        if (!sceneId) {
            window.location.href = `/${market}/home-design/find-my-fit`
        }
    }, [sceneId])

    const handleComplete = useCallback(
        (sceneUuid: string) => {
            window.location.href = `/${market}/home-design/find-my-fit/viewer?sceneId=${sceneUuid}${getRefParamFragment()}`
        },
        [market],
    )

    if (isAuthLoading) {
        return (
            <div id="FindMyFitUploadPage" className="FindMyFitUploadContent">
                <BouncingBallLoader />
            </div>
        )
    }

    return (
        <div id="FindMyFitUploadPage" className="FindMyFitUploadContent">
            <UploadProgressBanners
                sceneId={sceneId}
                onComplete={handleComplete}
                processingTracking={FMF_PROCESSING_TRACKING}
                allowGuest
                isFromFmf
            />
        </div>
    )
}

const FindMyFitUploadApp = ({ locale, market, translations }: FindMyFitUploadAppProps) => (
    <Sentry.ErrorBoundary fallback={<ErrorMessage />} onError={trackError}>
        <AppProviders locale={locale} market={market} translations={translations}>
            <StatusProvider>
                <FindMyFitUploadContent market={market} />
            </StatusProvider>
        </AppProviders>
    </Sentry.ErrorBoundary>
)

export default FindMyFitUploadApp
