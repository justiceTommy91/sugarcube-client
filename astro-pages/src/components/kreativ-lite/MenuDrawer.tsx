import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import arrowUpFromBase from '@ingka/ssr-icon/paths/arrow-up-from-base'
import arrowDownToLine from '@ingka/ssr-icon/paths/arrow-down-to-line'
import person from '@ingka/ssr-icon/paths/person'
import { withPrefix } from 'gatsby'
import { useUserContext } from '@providers/UserProvider'
import { useToast } from '@astro-hooks/useToast'
import { useViewerContext } from '@gatsby/Renderer/ui/components/ViewerContext'
import { magicBroom } from '@gatsby/icons/magic-broom'
import { getIkeaHomeUrl, getStartPageUrl, makeLoginUrl } from '@lib/location-selectors'
import { BottomSheet } from './BottomSheet'
import { useSceneContext } from './SceneContext'
import { captureFullResScene } from './utils/captureFullResScene'
import { downloadImage } from './utils/downloadImage'
import './MenuDrawer.scss'

import { shareOrCopy } from './utils/shareOrCopy'

// Handle area height: 0.75rem top padding + 0.375rem pill + 1.375rem bottom padding = 2.5rem = 40px
const HANDLE_AREA_HEIGHT_PX = 40
const MIN_EXPANDED_TOP_PX = 56

export interface MenuDrawerProps {
    open: boolean
    onClose: () => void
    onSwitchToEraser: () => void
}

export const MenuDrawer = ({ open, onClose, onSwitchToEraser }: MenuDrawerProps) => {
    const { t } = useTranslation()
    const { showToast } = useToast()
    const { isLoggedIn } = useUserContext()
    const { canvasElement } = useViewerContext()
    const { save, share, isSaving, isSaved, isDirty, shareUrl } = useSceneContext()

    // Measure inner content so the sheet hugs its content with no flash.
    // Start off-screen (window.innerHeight) — the sheet is hidden via transform anyway,
    // so the initial value is never visible. useLayoutEffect fires before paint, ensuring
    // expandedTop is correct before the open animation ever runs.
    const innerRef = useRef<HTMLDivElement>(null)
    const [expandedTop, setExpandedTop] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 812))

    useLayoutEffect(() => {
        const el = innerRef.current
        if (!el) return undefined

        const measure = () => {
            const top = Math.max(MIN_EXPANDED_TOP_PX, window.innerHeight - el.scrollHeight - HANDLE_AREA_HEIGHT_PX)
            setExpandedTop(top)
        }

        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        window.addEventListener('resize', measure)
        return () => {
            ro.disconnect()
            window.removeEventListener('resize', measure)
        }
    }, [])

    const isSaveDisabled = (isSaved && !isDirty) || isSaving

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

    const handleDownload = useCallback(async () => {
        if (!canvasElement) return
        const blob = await captureFullResScene(canvasElement)
        if (blob) {
            // eslint-disable-next-line i18next/no-literal-string
            downloadImage(blob, 'ikea-kreativ-design.jpg')
        }
    }, [canvasElement])

    const handleStartPage = useCallback(async () => {
        if (isLoggedIn) {
            await save()
        }
        window.location.assign(getStartPageUrl())
    }, [isLoggedIn, save])

    const handleGoToProfile = useCallback(async () => {
        if (isLoggedIn) {
            await save()
        }
        window.location.assign(`${getIkeaHomeUrl()}loyalty-hub/`)
    }, [isLoggedIn, save])

    const handleLoginLink = useCallback(() => {
        window.location.assign(makeLoginUrl(window.location.href))
    }, [])

    const handleSignupLink = useCallback(() => {
        window.location.assign(makeLoginUrl(window.location.href, true))
    }, [])

    const handleCleanUp = useCallback(() => {
        onSwitchToEraser()
        onClose()
    }, [onSwitchToEraser, onClose])

    return (
        <BottomSheet open={open} onClose={onClose} dismissMode="dismiss" overlay elevated expandedTop={expandedTop}>
            <div ref={innerRef}>
                <div className="MenuDrawer__content">
                    {/* Section 1 — Save Design */}
                    <div className="MenuDrawer__section">
                        <Button
                            type="primary"
                            size="medium"
                            text={t('design.kreativLite.menu.save design')}
                            onClick={handleSave}
                            disabled={isSaveDisabled}
                            loading={isSaving}
                            fluid
                        />
                    </div>

                    {/* Section 2 — Action Buttons */}
                    <div className="MenuDrawer__section MenuDrawer__section--actions">
                        <button className="MenuDrawer__action-btn" onClick={handleStartPage}>
                            <SSRIcon paths={arrowLeft} />
                            <span>{t('design.kreativLite.menu.start page')}</span>
                        </button>
                        <button className="MenuDrawer__action-btn" onClick={handleShare}>
                            <SSRIcon paths={arrowUpFromBase} />
                            <span>{t('design.kreativLite.menu.share design')}</span>
                        </button>
                        <button className="MenuDrawer__action-btn" onClick={handleDownload}>
                            <SSRIcon paths={arrowDownToLine} />
                            <span>{t('design.kreativLite.menu.download image')}</span>
                        </button>
                        <button className="MenuDrawer__action-btn" onClick={handleCleanUp}>
                            <SSRIcon paths={magicBroom} />
                            <span>{t('design.kreativLite.menu.clean up')}</span>
                        </button>
                    </div>

                    {/* Section 3 — User/Auth */}
                    <div className="MenuDrawer__section">
                        {isLoggedIn ? (
                            <button className="MenuDrawer__action-btn" onClick={handleGoToProfile}>
                                <SSRIcon paths={person} />
                                <span>{t('design.kreativLite.menu.go to profile')}</span>
                            </button>
                        ) : (
                            <div className="MenuDrawer__auth-row">
                                <SSRIcon paths={person} />
                                <p className="MenuDrawer__auth-text">
                                    <Trans
                                        i18nKey="design.kreativLite.menu.greeting logged out"
                                        components={{
                                            loginLink: (
                                                <button className="MenuDrawer__inline-link" onClick={handleLoginLink} />
                                            ),
                                            signupLink: (
                                                <button
                                                    className="MenuDrawer__inline-link"
                                                    onClick={handleSignupLink}
                                                />
                                            ),
                                        }}
                                    />
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer — IKEA logo */}
                <div className="MenuDrawer__footer">
                    <button
                        className="MenuDrawer__logo-btn"
                        onClick={() => window.location.assign(getIkeaHomeUrl())}
                        aria-label="IKEA"
                    >
                        <img src={withPrefix('/images/icons/logo_ikea.svg')} alt="IKEA" className="MenuDrawer__logo" />
                    </button>
                </div>
            </div>
        </BottomSheet>
    )
}
