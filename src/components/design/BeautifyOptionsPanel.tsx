import React from 'react'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import cross from '@ingka/ssr-icon/paths/cross'
import classNames from 'classnames'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'

import { useAppSelector } from 'hooks'
import { DAILY_USAGE_LIMIT } from 'models/beautifier/constants'
import { getDailyUsageCount, getGeneratedImages } from 'models/beautifier/selectors'

import Tooltip from 'components/Tooltip'
import BeautifyProgressBar from './BeautifyProgressBar'

import './BeautifyOptionsPanel.scss'

type BeautifyOptionsPanelProps = {
    onGenerate: () => void
    onClose: () => void
    onCancel: () => void
    onComplete: () => void
    disabled: boolean
    isGenerating: boolean
}

const BeautifyOptionsPanel = ({
    onGenerate,
    onClose,
    onCancel,
    onComplete,
    disabled,
    isGenerating,
}: BeautifyOptionsPanelProps) => {
    const { t } = useTranslation('translation')
    const dailyUsageCount = useAppSelector(getDailyUsageCount)
    const remainingCredits = DAILY_USAGE_LIMIT - dailyUsageCount
    const generatedImages = useAppSelector(getGeneratedImages)

    if (isGenerating) {
        return (
            <div className="BeautifyOptionsPanel BeautifyOptionsPanel--generating">
                <div className="BeautifyOptionsPanel__content">
                    <BeautifyProgressBar
                        onClose={onClose}
                        onCancel={onCancel}
                        onComplete={onComplete}
                        onRetry={onGenerate}
                    />
                </div>
            </div>
        )
    }

    const hasImages = generatedImages.length > 0

    return (
        <div className={classNames('BeautifyOptionsPanel', { 'BeautifyOptionsPanel--with-gallery': hasImages })}>
            <div className="BeautifyOptionsPanel__content">
                <button
                    type="button"
                    className="BeautifyOptionsPanel__close"
                    onClick={onClose}
                    aria-label={String(t('aria.close'))}
                >
                    <SSRIcon paths={cross} />
                </button>
                {hasImages && (
                    <div className="BeautifyOptionsPanel__gallery">
                        <span className="BeautifyOptionsPanel__gallery-label">
                            {t('design.beautify generated images')}
                        </span>
                        <div className="BeautifyOptionsPanel__gallery-images">
                            {generatedImages.map((url, index) => (
                                <Tooltip
                                    place="bottom"
                                    key={`generated-${generatedImages.length - index}`}
                                    describedById={`beautify-thumb-${index}`}
                                    title={String(t('design.beautify view fullscreen'))}
                                >
                                    <button
                                        type="button"
                                        className="BeautifyOptionsPanel__gallery-thumb"
                                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                    >
                                        <img src={url} alt="" draggable={false} />
                                        <span className="BeautifyOptionsPanel__gallery-thumb-overlay">
                                            <img
                                                src={withPrefix('images/icons/beautifier_expand.svg')}
                                                alt=""
                                                draggable={false}
                                            />
                                        </span>
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                )}
                <div className="BeautifyOptionsPanel__info">
                    <div className="BeautifyOptionsPanel__header">
                        <h3 className="BeautifyOptionsPanel__title">
                            {t('design.beautify panel title')}
                        </h3>
                    </div>
                    <p className="BeautifyOptionsPanel__description">
                        {t(dailyUsageCount === 0
                            ? 'design.beautify panel description first'
                            : 'design.beautify panel description')}
                    </p>
                </div>
                <div className="BeautifyOptionsPanel__actions">
                    <div className="BeautifyOptionsPanel__credits">
                        {Array.from({ length: DAILY_USAGE_LIMIT }).map((_, index) => {
                            const isAvailable = index < remainingCredits
                            return (
                                <span
                                    key={`credit-${DAILY_USAGE_LIMIT - index}`}
                                    className={classNames('BeautifyOptionsPanel__credit', {
                                        'BeautifyOptionsPanel__credit--available': isAvailable,
                                        'BeautifyOptionsPanel__credit--used': !isAvailable,
                                    })}
                                >
                                    <img
                                        src={withPrefix(
                                            isAvailable
                                                ? 'images/icons/beautifier_lightning.svg'
                                                : 'images/icons/beautifier_lightning_disabled.svg'
                                        )}
                                        alt=""
                                        draggable={false}
                                    />
                                </span>
                            )
                        })}
                        <span className="BeautifyOptionsPanel__credits-text">
                            {remainingCredits === 0
                                ? t('design.beautify panel credits exhausted', {
                                      remaining: remainingCredits,
                                      total: DAILY_USAGE_LIMIT,
                                  })
                                : t('design.beautify panel credits', {
                                      remaining: remainingCredits,
                                      total: DAILY_USAGE_LIMIT,
                                  })}
                        </span>
                    </div>
                    <Button
                        className="BeautifyOptionsPanel__generate-btn"
                        type="primary"
                        size="small"
                        onClick={onGenerate}
                        disabled={disabled}
                        text={t('design.beautify panel generate')}
                    />
                </div>
            </div>
        </div>
    )
}

export default BeautifyOptionsPanel
