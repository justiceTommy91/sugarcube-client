import React, { useRef } from 'react'
import './styles.scss'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'

import { useFlags, useScrollTracking } from 'hooks'
import { USER_SCROLLED_PAST_APP_DOWNLOAD_CTA } from 'models/sessionStorage/constants'
import { TRACK_LOCATION_DASHBOARD } from 'models/tracking/constants'

type AppDownloadCTAProps = {
    openAppDownload: () => void
}

const TRACKING_APP_DOWNLOAD_CTA_SECTION = 'AppDownloadCta'

export const AppDownloadCTA: React.FC<AppDownloadCTAProps> = ({ openAppDownload }) => {
    const { t } = useTranslation('dashboard')
    const { flags } = useFlags()
    const isMorpheusEnabled = flags.Morpheus
    const appDownloadCtaRef = useRef<HTMLDivElement | null>(null)

    useScrollTracking(
        appDownloadCtaRef,
        USER_SCROLLED_PAST_APP_DOWNLOAD_CTA,
        TRACKING_APP_DOWNLOAD_CTA_SECTION,
        TRACK_LOCATION_DASHBOARD,
        0.3,
    )

    return (
        <div className="AppDownload" ref={appDownloadCtaRef}>
            <div className="container">
                <div className="appDownloadInfo">
                    <h2 className="header">
                        {t(isMorpheusEnabled ? 'dashboard.want a personal fit' : 'dashboard.download the ikea app')}
                    </h2>
                    <p className="subheader">
                        {t(
                            isMorpheusEnabled
                                ? 'dashboard.start scanning with ikea kreativ'
                                : 'dashboard.easily scan your space with ikea',
                        )}
                    </p>
                </div>

                <div className="downloadAppButtonWrapper">
                    <Button
                        onClick={openAppDownload}
                        className="downloadAppButton"
                        iconOnly
                        type="primary"
                        inverseTheme
                        text={t(isMorpheusEnabled ? 'dashboard.go to ikea app' : 'dashboard.download app')}
                    />
                </div>
            </div>

            <div className="cta-image" />
        </div>
    )
}
