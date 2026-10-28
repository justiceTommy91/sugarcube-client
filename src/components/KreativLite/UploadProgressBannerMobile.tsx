import React, { useState } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import type { SceneProcessingState } from './useSceneProcessing'
import { formatTime } from './utils/formatTime'
import './UploadProgressBannerMobile.scss'

export interface UploadProgressBannerMobileProps {
    sceneId: string | null
    sceneState: SceneProcessingState
    isFromFmf?: boolean
}

export const UploadProgressBannerMobile: React.FC<UploadProgressBannerMobileProps> = ({
    sceneId,
    sceneState,
    isFromFmf,
}) => {
    const { t } = useTranslation()
    const [imageError, setImageError] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    const hasError = Boolean(sceneState.error)
    const isCompleted = Boolean(sceneState.completed)
    const isProcessing = Boolean(sceneId && !hasError && !isCompleted)
    const showDeterminateProgress = isProcessing && Boolean(sceneState.jobState) && !sceneState.showIndeterminate

    const clampedProgress = Math.min(100, Math.max(0, sceneState.progress))

    const getTitle = (): string => {
        if (hasError) return t('design.kreativLite.banner.error title')
        if (isCompleted) return t('design.kreativLite.banner.mobile.success title')
        return t('design.kreativLite.banner.mobile.processing title')
    }

    const getDescription = (): string => {
        if (hasError) return sceneState.error || t('design.kreativLite.errors.generic')
        if (isCompleted) return t('design.kreativLite.banner.mobile.success description')
        if (sceneState.showIndeterminate && !isFromFmf) {
            return t('design.kreativLite.progress.email notification')
        }
        return t('design.kreativLite.banner.mobile.processing description')
    }

    const getTimeRemainingText = (): string => {
        if (isCompleted) return t('design.kreativLite.banner.mobile.image processed')
        if (isProcessing && sceneState.showAlmostReady) return t('design.kreativLite.progress.almost ready')
        if (isProcessing && !sceneState.showIndeterminate && sceneState.secondsRemaining > 0)
            return formatTime(sceneState.secondsRemaining, t)
        return '\u00A0'
    }

    const secondLabel = (sceneState.redirectCountdown ?? 0) === 1 ? t('common.time.second') : t('common.time.seconds')

    return (
        <div className="UploadProgressBannerMobile">
            <div className="UploadProgressBannerMobile__header">
                <span className="UploadProgressBannerMobile__time-remaining">{getTimeRemainingText()}</span>
            </div>

            {(showDeterminateProgress || isCompleted) && (
                <div className="UploadProgressBannerMobile__progress-bar-container">
                    <div
                        className="UploadProgressBannerMobile__progress-bar"
                        style={{ width: isCompleted ? '100%' : `${clampedProgress}%` }}
                    />
                </div>
            )}

            {isProcessing && sceneState.showIndeterminate && (
                <div className="UploadProgressBannerMobile__progress-bar-container UploadProgressBannerMobile__progress-bar-container--indeterminate">
                    <div className="UploadProgressBannerMobile__progress-bar" />
                </div>
            )}

            <div
                className={classNames('UploadProgressBannerMobile__image-container', {
                    'UploadProgressBannerMobile__image-container--loaded': imageLoaded,
                })}
            >
                {sceneState.thumbnailUrl && !imageError && (
                    <img
                        src={sceneState.thumbnailUrl}
                        alt={t('design.kreativLite.image.upload progress alt')}
                        className="UploadProgressBannerMobile__image"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageLoaded(true)}
                    />
                )}

                <div className="UploadProgressBannerMobile__overlay">
                    {isProcessing && <BouncingBallLoader className="UploadProgressBannerMobile__loader" />}

                    {(!!sceneState.jobState || isCompleted || hasError) && (
                        <>
                            <h2 className="UploadProgressBannerMobile__title">{getTitle()}</h2>
                            <p className="UploadProgressBannerMobile__description">{getDescription()}</p>

                            {showDeterminateProgress && (
                                <span className="UploadProgressBannerMobile__percentage">
                                    {Math.round(clampedProgress)}%
                                </span>
                            )}

                            {isCompleted && sceneState.redirectCountdown != null && (
                                <span className="UploadProgressBannerMobile__redirect">
                                    {t('design.kreativLite.progress.redirecting in', {
                                        redirectCountdown: sceneState.redirectCountdown,
                                        unit: secondLabel,
                                    })}
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default UploadProgressBannerMobile
