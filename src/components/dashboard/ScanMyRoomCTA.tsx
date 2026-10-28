import React from 'react'
import Button from '@ingka/button'
import cameraIcon from '@ingka/ssr-icon/paths/camera'
import { useTranslation } from 'react-i18next'

require('./ScanMyRoomCTA.scss')

export interface ScanMyRoomCTAProps {
    handleAppDownloadModal: (toggleModal: boolean) => void
}

const ScanMyRoomCTA = (props: ScanMyRoomCTAProps) => {
    const { handleAppDownloadModal } = props
    const { t } = useTranslation('dashboard')
    return (
        <div className="ScanMyRoomCTA">
            <div className="scanMyRoomInnerThumbnail">
                <div className="scanMyRoomImage">
                    <div className="opacityContainer" />
                    <Button
                        className="scanMyRoomButton"
                        type="primary"
                        text={t('dashboard.scan my room')}
                        ssrIcon={cameraIcon}
                        iconPosition="leading"
                        onClick={() => handleAppDownloadModal(true)}
                    />
                </div>
            </div>
        </div>
    )
}

export default ScanMyRoomCTA
