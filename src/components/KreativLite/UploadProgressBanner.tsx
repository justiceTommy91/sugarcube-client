import React, { useState } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { SceneProcessingState } from './useSceneProcessing'
import { formatTime } from './utils/formatTime'
import './UploadProgressBanner.scss'

const getBannerTitle = (hasError: boolean, isCompleted: boolean, t: TFunction): string => {
    if (hasError) return t('design.kreativLite.banner.error title')
    if (isCompleted) return t('design.kreativLite.banner.success title')
    return t('design.kreativLite.banner.processing title')
}

const getBannerDescription = (hasError: boolean, isCompleted: boolean, t: TFunction, errorMessage?: string): string => {
    if (hasError) return errorMessage || t('design.kreativLite.errors.generic')
    if (isCompleted) return t('design.kreativLite.banner.success description')
    return t('design.kreativLite.banner.processing description')
}

interface ProgressCompletedProps {
    redirectCountdown: number
}

const ProgressCompleted: React.FC<ProgressCompletedProps> = ({ redirectCountdown }) => {
    const { t } = useTranslation()
    const secondLabel = redirectCountdown === 1 ? t('common.time.second') : t('common.time.seconds')
    return (
        <div className="UploadProgressBanner__progress">
            <span className="UploadProgressBanner__progress-percentage">
                {t('design.kreativLite.progress.ready to design')}
            </span>
            <span className="UploadProgressBanner__progress-time">
                {t('design.kreativLite.progress.redirecting in', { redirectCountdown, unit: secondLabel })}
            </span>
        </div>
    )
}

interface ProgressIndeterminateProps {
    showMessage: boolean
}

const ProgressIndeterminate: React.FC<ProgressIndeterminateProps> = ({ showMessage }) => {
    const { t } = useTranslation()
    return (
        <div className="UploadProgressBanner__progress">
            <BouncingBallLoader
                subheaderText={showMessage ? t('design.kreativLite.progress.email notification') : undefined}
            />
        </div>
    )
}

interface ProgressBarProps {
    progress: number
    secondsRemaining: number
    showAlmostReady: boolean
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, secondsRemaining, showAlmostReady }) => {
    const { t } = useTranslation()
    return (
        <div className="UploadProgressBanner__progress">
            <span className="UploadProgressBanner__progress-percentage">{Math.round(progress)}%</span>
            <div className="UploadProgressBanner__progress-bar-container">
                <div className="UploadProgressBanner__progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span className="UploadProgressBanner__progress-time">
                {showAlmostReady ? t('design.kreativLite.progress.almost ready') : formatTime(secondsRemaining, t)}
            </span>
        </div>
    )
}

export interface UploadProgressBannerProps {
    sceneId: string | null
    sceneState: SceneProcessingState
}

export const UploadProgressBanner: React.FC<UploadProgressBannerProps> = ({ sceneId, sceneState }) => {
    const { t } = useTranslation()
    const [imageError, setImageError] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    const hasError = Boolean(sceneState.error)
    const isCompleted = Boolean(sceneState.completed)
    const isProcessing = sceneId && !hasError && !isCompleted

    const renderProgress = () => {
        if (isCompleted) {
            return <ProgressCompleted redirectCountdown={sceneState.redirectCountdown || 0} />
        }

        if (isProcessing) {
            if (!sceneState.jobState || sceneState.showIndeterminate) {
                return <ProgressIndeterminate showMessage={Boolean(sceneState.showIndeterminate)} />
            }
            return (
                <ProgressBar
                    progress={sceneState.progress}
                    secondsRemaining={sceneState.secondsRemaining}
                    showAlmostReady={Boolean(sceneState.showAlmostReady)}
                />
            )
        }

        return null
    }

    return (
        <div className="UploadProgressBanner">
            <div className="UploadProgressBanner__content">
                <h2 className="UploadProgressBanner__title">{getBannerTitle(hasError, isCompleted, t)}</h2>
                <p className="UploadProgressBanner__description">
                    {getBannerDescription(hasError, isCompleted, t, sceneState.error)}
                </p>
                <div
                    className={classNames('UploadProgressBanner__image-container', {
                        'UploadProgressBanner__image-container--loaded': imageLoaded,
                    })}
                >
                    {sceneState.thumbnailUrl && !imageError && (
                        <img
                            src={sceneState.thumbnailUrl}
                            alt={t('design.kreativLite.image.upload progress alt')}
                            className="UploadProgressBanner__image"
                            onError={() => setImageError(true)}
                            onLoad={() => setImageLoaded(true)}
                        />
                    )}
                    {renderProgress()}
                </div>
            </div>
        </div>
    )
}

export default UploadProgressBanner
