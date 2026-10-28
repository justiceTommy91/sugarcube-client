import React, { useCallback } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import sparkles from '@ingka/ssr-icon/paths/sparkles'
import informationCircle from '@ingka/ssr-icon/paths/information-circle'
import createSpace from '@ingka/ssr-icon/paths/create-space'
import { withPrefix } from 'gatsby'
import { useToast } from '@astro-hooks/useToast'
import { BottomSheet } from './BottomSheet'
import { useAppDeepLink } from './hooks/useAppDeepLink'
import { useSceneContext } from './SceneContext'
import './AppPromotionDrawer.scss'

import { shareOrCopy } from './utils/shareOrCopy'

export interface AppPromotionDrawerProps {
    open: boolean
    onClose: () => void
    sceneId: string
}

export const AppPromotionDrawer = ({ open, onClose, sceneId }: AppPromotionDrawerProps) => {
    const { t } = useTranslation()
    const { showToast } = useToast()
    const appDeepLink = useAppDeepLink(sceneId)
    const { save, share, isSaving, isSharing, isSaved, isDirty, shareUrl } = useSceneContext()

    const handleSave = useCallback(async () => {
        const result = await save()
        if (result) showToast({ text: t('design.your design has been saved') })
    }, [save, showToast, t])

    const handleShare = useCallback(async () => {
        // If the composition is already shared and hasn't changed, reuse the cached URL.
        if (isSaved && !isDirty && shareUrl) {
            await shareOrCopy(shareUrl)
            return
        }
        const result = await share()
        if (!result?.shareUrl) return
        await shareOrCopy(result.shareUrl)
    }, [share, isSaved, isDirty, shareUrl])

    const isBusy = isSaving || isSharing

    const footer = (
        <div className="AppPromotionDrawer__footer">
            {!isSaved ? (
                <Button
                    type="secondary"
                    size="small"
                    text={t('design.save progress')}
                    onClick={handleSave}
                    disabled={isBusy}
                    loading={isSaving}
                    fluid
                />
            ) : (
                <Button
                    type="secondary"
                    size="small"
                    text={t('design.copy link')}
                    onClick={handleShare}
                    disabled={isBusy}
                    loading={isSharing}
                    fluid
                />
            )}
            <Button
                type="primary"
                size="small"
                text={t('design.open in ikea app')}
                onClick={() => window.location.assign(appDeepLink)}
                fluid
            />
        </div>
    )

    return (
        <BottomSheet open={open} onClose={onClose} dismissMode="dismiss" overlay elevated footer={footer}>
            <div className="AppPromotionDrawer__content">
                <div className="AppPromotionDrawer__promo-section">
                    <img
                        src={withPrefix('/images/graphics/IKEA-App-badge-60x60.webp')}
                        alt=""
                        className="AppPromotionDrawer__app-badge"
                    />
                    <h2 className="AppPromotionDrawer__title">
                        <Trans i18nKey="design.app promotion.title">
                            More space. More control.
                            <br />
                            More possibilities.
                        </Trans>
                    </h2>
                    <p className="AppPromotionDrawer__body">{t('design.app promotion.body')}</p>
                </div>

                <img
                    src={withPrefix('/images/kreativLite/mobile/promotion-drawer-hero.webp')}
                    alt=""
                    className="AppPromotionDrawer__hero-image"
                />

                <div className="AppPromotionDrawer__features">
                    <div className="AppPromotionDrawer__feature">
                        <div className="AppPromotionDrawer__feature-icon-container">
                            <SSRIcon paths={sparkles} />
                        </div>
                        <div className="AppPromotionDrawer__feature-text">
                            <p className="AppPromotionDrawer__feature-title">
                                {t('design.app promotion.feature 1 title')}
                            </p>
                            <p className="AppPromotionDrawer__feature-description">
                                {t('design.app promotion.feature 1 description')}
                            </p>
                        </div>
                    </div>
                    <div className="AppPromotionDrawer__feature">
                        <div className="AppPromotionDrawer__feature-icon-container">
                            <SSRIcon paths={informationCircle} />
                        </div>
                        <div className="AppPromotionDrawer__feature-text">
                            <p className="AppPromotionDrawer__feature-title">
                                {t('design.app promotion.feature 2 title')}
                            </p>
                            <p className="AppPromotionDrawer__feature-description">
                                {t('design.app promotion.feature 2 description')}
                            </p>
                        </div>
                    </div>
                    <div className="AppPromotionDrawer__feature">
                        <div className="AppPromotionDrawer__feature-icon-container">
                            <SSRIcon paths={createSpace} />
                        </div>
                        <div className="AppPromotionDrawer__feature-text">
                            <p className="AppPromotionDrawer__feature-title">
                                {t('design.app promotion.feature 3 title')}
                            </p>
                            <p className="AppPromotionDrawer__feature-description">
                                {t('design.app promotion.feature 3 description')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </BottomSheet>
    )
}
