import React, { useCallback, useEffect, useId, useState } from 'react'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import cross from '@ingka/ssr-icon/paths/cross'
import informationCircle from '@ingka/ssr-icon/paths/information-circle'
import trashCan from '@ingka/ssr-icon/paths/trash-can'
import classNames from 'classnames'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'

import { useAppDispatch, useAppSelector } from 'hooks'
import { useTracker } from 'apps/TrackingBoundary'
import { downloadBeautifierOutputFile } from 'services/beautifier'
import {
    getGeneratedImages,
    getViewerImageIndex,
    getIsViewerOpen,
    getHideImageViewerDisclaimerPermanently,
} from 'models/beautifier/selectors'
import {
    closeImageViewer,
    openImageViewer,
    deleteGeneratedImage,
    permanentlyDismissImageViewerDisclaimer,
} from 'models/beautifier/slice'
import { setPromptVisibility } from 'models/ui/actions'
import { getPromptVisibility } from 'models/ui/selectors'
import { ACTION_BEAUTIFY_VIEWER_DOWNLOAD } from 'models/tracking/constants'
import DesignSurveyContainer from 'containers/design/DesignSurveyContainer'

import { DesignSidepanelView, useDesignSidebarContext } from 'components/design/DesignSidepanelContext'

import './BeautifierImageViewer.scss'

const BeautifierImageViewer = () => {
    const { t } = useTranslation('translation')
    const { displaySidepanelView, expandSidepanel } = useDesignSidebarContext()
    const dispatch = useAppDispatch()
    const track = useTracker()
    const images = useAppSelector(getGeneratedImages)
    const currentIndex = useAppSelector(getViewerImageIndex)
    const isOpen = useAppSelector(getIsViewerOpen)
    const hideDisclaimerPermanently = useAppSelector(getHideImageViewerDisclaimerPermanently)
    const promptVisibility = useAppSelector(getPromptVisibility)
    const disclaimerTitleId = useId()
    const disclaimerBodyId = useId()
    const dontShowAgainId = useId()

    const [disclaimerDismissed, setDisclaimerDismissed] = useState(false)
    const [dontShowAgain, setDontShowAgain] = useState(false)

    const disclaimerOpen = isOpen && !hideDisclaimerPermanently && !disclaimerDismissed

    const hasPrev = currentIndex !== null && currentIndex > 0
    const hasNext = currentIndex !== null && currentIndex < images.length - 1

    const handleClose = useCallback(() => {
        displaySidepanelView(DesignSidepanelView.ADD)
        expandSidepanel()
        dispatch(closeImageViewer())
    }, [dispatch, displaySidepanelView, expandSidepanel])

    const handlePrev = useCallback(() => {
        if (currentIndex !== null && currentIndex > 0) {
            dispatch(openImageViewer(currentIndex - 1))
        }
    }, [dispatch, currentIndex])

    const handleNext = useCallback(() => {
        if (currentIndex !== null && currentIndex < images.length - 1) {
            dispatch(openImageViewer(currentIndex + 1))
        }
    }, [dispatch, currentIndex, images.length])

    const handleDelete = useCallback(() => {
        if (currentIndex !== null) {
            dispatch(deleteGeneratedImage(currentIndex))
        }
    }, [dispatch, currentIndex])

    const handleDownload = useCallback(async () => {
        if (currentIndex === null) return
        track(ACTION_BEAUTIFY_VIEWER_DOWNLOAD, { attributes: { ImageIndex: currentIndex } })
        const url = images[currentIndex]
        try {
            await downloadBeautifierOutputFile(url)
        } catch {
            const link = document.createElement('a')
            link.href = url
            // eslint-disable-next-line i18next/no-literal-string
            link.target = '_blank'
            link.click()
        }
    }, [currentIndex, images, track])

    const dismissDisclaimer = useCallback(() => {
        if (dontShowAgain) {
            dispatch(permanentlyDismissImageViewerDisclaimer())
        }
        setDisclaimerDismissed(true)
        setDontShowAgain(false)
    }, [dispatch, dontShowAgain])

    useEffect(() => {
        if (!isOpen) {
            setDisclaimerDismissed(false)
            setDontShowAgain(false)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return undefined

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (disclaimerOpen) {
                    dismissDisclaimer()
                    return
                }
                handleClose()
            }
            if (e.key === 'ArrowLeft') handlePrev()
            if (e.key === 'ArrowRight') handleNext()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, disclaimerOpen, dismissDisclaimer, handleClose, handlePrev, handleNext])

    if (!isOpen || currentIndex === null || images.length === 0) return null

    const currentUrl = images[currentIndex]

    return (
        <div className="BeautifierImageViewer">
            <div className="BeautifierImageViewer__top-bar">
                <Button
                    className="BeautifierImageViewer__back-btn"
                    type="tertiary"
                    size="small"
                    ssrIcon={arrowLeft}
                    onClick={handleClose}
                    text={t('design.beautify back to design')}
                />
            </div>

            <div className="BeautifierImageViewer__main">
                {hasPrev && (
                    <button
                        type="button"
                        className="BeautifierImageViewer__nav BeautifierImageViewer__nav--prev"
                        onClick={handlePrev}
                        aria-label={String(t('aria.previous'))}
                    >
                        <img src={withPrefix('images/icons/beautifier_nav_prev.svg')} alt="" draggable={false} />
                    </button>
                )}
                <div className="BeautifierImageViewer__image-container">
                    <img
                        src={currentUrl}
                        alt=""
                        className="BeautifierImageViewer__image"
                        draggable={false}
                    />
                </div>
                {hasNext && (
                    <button
                        type="button"
                        className="BeautifierImageViewer__nav BeautifierImageViewer__nav--next"
                        onClick={handleNext}
                        aria-label={String(t('aria.next'))}
                    >
                        <img src={withPrefix('images/icons/beautifier_nav_next.svg')} alt="" draggable={false} />
                    </button>
                )}
                {disclaimerOpen && (
                    <div
                        className="BeautifierImageViewer__disclaimer"
                        role="dialog"
                        aria-labelledby={disclaimerTitleId}
                        aria-describedby={disclaimerBodyId}
                    >
                        <div className="BeautifierImageViewer__disclaimer-accent" aria-hidden />
                        <div className="BeautifierImageViewer__disclaimer-inner">
                            <div className="BeautifierImageViewer__disclaimer-header">
                                <div className="BeautifierImageViewer__disclaimer-title-row">
                                    <SSRIcon
                                        className="BeautifierImageViewer__disclaimer-info-icon"
                                        paths={informationCircle}
                                    />
                                    <h2 className="BeautifierImageViewer__disclaimer-title" id={disclaimerTitleId}>
                                        {t('design.beautify viewer disclaimer header')}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    className="BeautifierImageViewer__disclaimer-close"
                                    onClick={dismissDisclaimer}
                                    aria-label={String(t('aria.close'))}
                                >
                                    <SSRIcon paths={cross} />
                                </button>
                            </div>
                            <p className="BeautifierImageViewer__disclaimer-body" id={disclaimerBodyId}>
                                {t('design.beautify viewer disclaimer text')}
                            </p>
                            <div className="BeautifierImageViewer__disclaimer-footer">
                                <label className="BeautifierImageViewer__disclaimer-dont-show" htmlFor={dontShowAgainId}>
                                    <input
                                        id={dontShowAgainId}
                                        type="checkbox"
                                        className="BeautifierImageViewer__disclaimer-checkbox"
                                        checked={dontShowAgain}
                                        onChange={(e) => setDontShowAgain(e.target.checked)}
                                    />
                                    {t("design.beautify viewer disclaimer don't show again")}
                                </label>
                                <Button
                                    className="BeautifierImageViewer__disclaimer-understand"
                                    type="tertiary"
                                    size="small"
                                    onClick={dismissDisclaimer}
                                    text={t('design.beautify viewer disclaimer understand')}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="BeautifierImageViewer__bottom-bar">
                <div className="BeautifierImageViewer__thumbnails">
                    {images.map((url, index) => (
                        <button
                            key={`viewer-thumb-${images.length - index}`}
                            type="button"
                            className={classNames('BeautifierImageViewer__thumbnail', {
                                'BeautifierImageViewer__thumbnail--active': index === currentIndex,
                            })}
                            onClick={() => dispatch(openImageViewer(index))}
                        >
                            <img src={url} alt="" draggable={false} />
                        </button>
                    ))}
                </div>
                <div className="BeautifierImageViewer__actions">
                    <Button
                        className="BeautifierImageViewer__delete-btn"
                        type="secondary"
                        size="small"
                        ssrIcon={trashCan}
                        iconOnly
                        onClick={handleDelete}
                        text={t('design.beautify delete image')}
                        aria-label={t('design.beautify delete image')}
                    />
                    <Button
                        className="BeautifierImageViewer__download-btn"
                        type="primary"
                        size="small"
                        onClick={handleDownload}
                        text={t('design.beautify download image')}
                    />
                </div>
            </div>
            {promptVisibility?.source === 'beautify' && promptVisibility?.visible && (
                <DesignSurveyContainer
                    onClose={() => dispatch(setPromptVisibility(false, 0))}
                    feedbackDelayData={promptVisibility?.timeDelay}
                />
            )}
        </div>
    )
}

export default BeautifierImageViewer
