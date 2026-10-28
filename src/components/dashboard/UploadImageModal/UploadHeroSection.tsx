import React, { useRef } from 'react'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import arrowUpToBaseIcon from '@ingka/ssr-icon/paths/arrow-up-to-base'
import imageIcon from '@ingka/ssr-icon/paths/image'
import { withPrefix } from 'gatsby'
import { useTranslation, Trans } from 'react-i18next'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { getRegion } from 'models/location/selectors'
import type { UploadState } from './types'
import { UPLOAD_STATUS_PROCESSING, UPLOAD_STATUS_UPLOADING } from './types'
import { KREATIV_LITE_ASSETS } from './constants'

require('./UploadHeroSection.scss')

interface UploadHeroSectionProps {
    isDragging: boolean
    onDrop: (e: React.DragEvent) => void
    onFileSelect: (file: File) => void
    uploadState: UploadState
}

const UploadHeroSection: React.FC<UploadHeroSectionProps> = ({ isDragging, onDrop, onFileSelect, uploadState }) => {
    const { t } = useTranslation()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleButtonClick = (): void => {
        fileInputRef.current?.click()
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0]
        if (file) {
            onFileSelect(file)
        }
        // Reset input value to allow selecting the same file again
        e.target.value = ''
    }

    const isProcessing =
        uploadState.status === UPLOAD_STATUS_PROCESSING || uploadState.status === UPLOAD_STATUS_UPLOADING

    return (
        <div className="UploadHeroSection" onDrop={onDrop}>
            <div
                className={`UploadHeroSection__hero-image ${isDragging ? 'isDragging' : ''}`}
                style={{ backgroundImage: `url(${withPrefix(KREATIV_LITE_ASSETS.uploadModalHero)})` }}
            >
                <SSRIcon className="UploadHeroSection__icon" paths={imageIcon} />
                <h2 className="UploadHeroSection__hero-heading">
                    <Trans i18nKey="design.kreativLite.hero.heading">
                        Upload here.
                        <br />
                        Then design your space.
                    </Trans>
                </h2>

                {/* Show processing/uploading status */}
                {(uploadState.status === UPLOAD_STATUS_PROCESSING ||
                    uploadState.status === UPLOAD_STATUS_UPLOADING) && (
                    <div className={`UploadHeroSection__status UploadHeroSection__status--${uploadState.status}`}>
                        <BouncingBallLoader subheaderText={uploadState.message} />
                    </div>
                )}

                {!isProcessing && (
                    <div className="UploadHeroSection__buttons">
                        <Button
                            ssrIcon={arrowUpToBaseIcon}
                            onClick={handleButtonClick}
                            type="primary"
                            inverseTheme
                            staticColour
                        >
                            {t('design.kreativLite.hero.upload button')}
                        </Button>
                        <p className={`UploadHeroSection__drag-drop-text ${isDragging ? 'isDragging' : ''}`}>
                            {t('design.kreativLite.hero.drag drop text')}
                        </p>
                    </div>
                )}
                <p className="UploadHeroSection__upload-disclaimer">
                    <Trans i18nKey="design.kreativLite.hero.upload disclaimer">
                        {"Please don't upload images with people, personal data or private items. Learn more in our "}
                        <a
                            href={`https://www.ikea.com/${getRegion()}/customer-service/privacy-policy/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="UploadHeroSection__upload-disclaimer-link"
                        >
                            privacy policy
                        </a>
                        .
                    </Trans>
                </p>
                <div className="UploadHeroSection__footer-text UploadHeroSection__footer-text--vertical">
                    <div className="UploadHeroSection__footer-text UploadHeroSection__footer-text--horizontal">
                        <p>{t('design.kreativLite.hero.supported formats')}</p>
                        <p>{t('design.kreativLite.hero.max file size')}</p>
                    </div>
                    <p>{t('design.kreativLite.hero.no floorplans')}</p>
                </div>
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                disabled={isProcessing}
            />
        </div>
    )
}

export default UploadHeroSection
