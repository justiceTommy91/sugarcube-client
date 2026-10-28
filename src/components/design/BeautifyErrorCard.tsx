import React, { useCallback } from 'react'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import cross from '@ingka/ssr-icon/paths/cross'
import arrowClockwise from '@ingka/ssr-icon/paths/arrow-clockwise'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'

import { useTracker } from 'apps/TrackingBoundary'
import { ACTION_BEAUTIFY_RETRY } from 'models/tracking/constants'

import './BeautifyErrorCard.scss'

type BeautifyErrorCardProps = {
    onClose: () => void
    onCancel: () => void
    onRetry: () => void
}

const BeautifyErrorCard = ({ onClose, onCancel, onRetry }: BeautifyErrorCardProps) => {
    const { t } = useTranslation('translation')
    const track = useTracker()

    const handleRetry = useCallback(() => {
        track(ACTION_BEAUTIFY_RETRY, {})
        onRetry()
    }, [track, onRetry])

    return (
        <div className="BeautifyErrorCard">
            <button
                type="button"
                className="BeautifyErrorCard__close"
                onClick={onClose}
                aria-label={String(t('aria.close'))}
            >
                <SSRIcon paths={cross} />
            </button>

            <div className="BeautifyErrorCard__body">
                <img
                    className="BeautifyErrorCard__image"
                    src={withPrefix('images/icons/beautifier_error.png')}
                    alt=""
                    draggable={false}
                />
                <div className="BeautifyErrorCard__container">
                    <div className="BeautifyErrorCard__content">
                        <h3 className="BeautifyErrorCard__title">
                            {t('design.beautify error title')}
                        </h3>
                        <p className="BeautifyErrorCard__text">
                            {t('design.beautify error body')}
                        </p>
                        <p className="BeautifyErrorCard__text">
                            {t('design.beautify error body secondary')}
                        </p>
                    </div>
                    <div className="BeautifyErrorCard__actions">
                        <Button
                            className="BeautifyErrorCard__cancel-btn"
                            type="tertiary"
                            size="small"
                            onClick={onCancel}
                            text={t('design.beautify cancel')}
                        />
                        <Button
                            className="BeautifyErrorCard__retry-btn"
                            type="primary"
                            size="small"
                            ssrIcon={arrowClockwise}
                            onClick={handleRetry}
                            text={t('design.beautify error try again')}
                        />
                    </div>
                </div>

            </div>
        </div>
    )
}

export default BeautifyErrorCard
