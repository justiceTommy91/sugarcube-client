import React, { useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import arrowUpToBaseIcon from '@ingka/ssr-icon/paths/arrow-up-to-base'
import cameraIcon from '@ingka/ssr-icon/paths/camera'
import imageIcon from '@ingka/ssr-icon/paths/image'

import {
    type UploadState,
    UPLOAD_STATUS_PROCESSING,
    UPLOAD_STATUS_UPLOADING,
} from 'components/dashboard/UploadImageModal/types'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { getRegion } from 'models/location/selectors'
import './UploadSection.scss'

interface UploadSectionProps {
    containerRef?: React.RefObject<HTMLDivElement>
    onFileSelect: (file: File) => void
    uploadState: UploadState
}

export const UploadSection: React.FunctionComponent<UploadSectionProps> = ({
    containerRef,
    onFileSelect,
    uploadState,
}) => {
    const { t } = useTranslation()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const handleButtonClick = (): void => {
        fileInputRef.current?.click()
    }

    const handleCameraClick = (): void => {
        cameraInputRef.current?.click()
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0]
        if (file) {
            onFileSelect(file)
        }
        e.target.value = ''
    }

    const isProcessing =
        uploadState.status === UPLOAD_STATUS_PROCESSING || uploadState.status === UPLOAD_STATUS_UPLOADING

    return (
        <div ref={containerRef} className="UploadSection">
            <SSRIcon className="UploadSection__icon" paths={imageIcon} />
            <h2 className="UploadSection__heading">
                <Trans i18nKey="design.kreativLite.hero.heading">
                    Upload here.
                    <br />
                    Then design your space.
                </Trans>
            </h2>
            <div className="UploadSection__description">
                <p>{t('design.kreativLite.hero.description')}</p>
                <p>{t('design.kreativLite.hero.data stays secure')}</p>
            </div>

            {isProcessing && (
                <div className={`UploadSection__status UploadSection__status--${uploadState.status}`}>
                    <BouncingBallLoader subheaderText={uploadState.message} />
                </div>
            )}

            {!isProcessing && (
                <div className="UploadSection__buttons">
                    <Button ssrIcon={arrowUpToBaseIcon} onClick={handleButtonClick} type="primary" fluid staticColour>
                        {t('design.kreativLite.hero.upload button')}
                    </Button>
                    <Button ssrIcon={cameraIcon} onClick={handleCameraClick} type="secondary" fluid staticColour>
                        {t('design.kreativLite.hero.take photo button')}
                    </Button>
                </div>
            )}

            <p className="UploadSection__upload-disclaimer">
                <Trans i18nKey="design.kreativLite.hero.upload disclaimer">
                    {"Please don't upload images with people, personal data or private items. Learn more in our "}
                    <a
                        href={`https://www.ikea.com/${getRegion()}/customer-service/privacy-policy/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="UploadSection__upload-disclaimer-link"
                    >
                        privacy policy
                    </a>
                    .
                </Trans>
            </p>

            <div className="UploadSection__footer-text UploadSection__footer-text--vertical">
                <p>{t('design.kreativLite.hero.supported formats')}</p>
                <p>{t('design.kreativLite.hero.max file size')}</p>
                <p>{t('design.kreativLite.hero.no floorplans')}</p>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                disabled={isProcessing}
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                disabled={isProcessing}
            />
        </div>
    )
}
