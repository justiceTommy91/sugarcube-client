import React, { useEffect } from 'react'
import Button from '@ingka/button'
import cross from '@ingka/ssr-icon/paths/cross'
import { Typography } from '@ingka/typography-shared'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { click, trackGoogleAnalytics, workflow } from 'utils/tracker'
import { withPrefix } from 'gatsby'
import {
    ACTION_STARTER_SET_MODAL_CLOSE,
    ACTION_STARTER_SET_MODAL_DISPLAY,
    ACTION_STARTER_SET_MODAL_OPEN,
    GA_ACTION_STARTER_SET_MODAL_DISPLAY,
    GA_ACTION_STARTER_SET_MODAL_OPEN,
    GA_ACTION_STARTER_SET_MODAL_CLOSE,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'

require('./StarterSetModal.scss')

export type StarterSetModalProps = {
    onDismiss: () => void
    visible: boolean
    openStarterSetSidePanel: () => void
}

const StarterSetModal = ({ onDismiss, visible, openStarterSetSidePanel }: StarterSetModalProps) => {
    const { t } = useTranslation()
    const image = withPrefix(`/images/starterSet/starterSetModalImage.webp`)

    useEffect(() => {
        if (visible) {
            workflow(ACTION_STARTER_SET_MODAL_DISPLAY)
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: GA_ACTION_STARTER_SET_MODAL_DISPLAY,
                label: '',
            })
        }
    }, [visible])

    return (
        <div
            className={classNames('StarterSetModal', {
                'StarterSetModal--visible': visible,
            })}
            data-testid="starter-set-container"
        >
            <div className="StarterSetModal__outer-wrapper">
                <img src={image} className="StarterSetModal__image" alt="" />
                <div className="StarterSetModal__content-wrapper">
                    <h2 className={Typography.Heading.XS}>{t('design.starterSet.modal title')}</h2>
                    <p className={Typography.Body.M}>{t('design.starterSet.modal description')}</p>
                    <Button
                        className="StarterSetModal__cta"
                        data-testid="starter-set-cta-button"
                        onClick={() => {
                            openStarterSetSidePanel()
                            click(ACTION_STARTER_SET_MODAL_OPEN)
                            trackGoogleAnalytics({
                                category: GA_CATEGORY_DYH_SUGARCUBE,
                                action: GA_ACTION_STARTER_SET_MODAL_OPEN,
                                label: '',
                            })
                        }}
                        type="primary"
                        size="xsmall"
                    >
                        {t('design.starterSet.modal button cta')}
                    </Button>
                </div>
                <Button
                    className="StarterSetModal__dismiss-button"
                    data-testid="starter-set-dismiss-action"
                    onClick={() => {
                        onDismiss()
                        click(ACTION_STARTER_SET_MODAL_CLOSE)
                        trackGoogleAnalytics({
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            action: GA_ACTION_STARTER_SET_MODAL_CLOSE,
                            label: '',
                        })
                    }}
                    iconOnly
                    ssrIcon={cross}
                    size="xsmall"
                    type="tertiary"
                />
            </div>
        </div>
    )
}

export default StarterSetModal
