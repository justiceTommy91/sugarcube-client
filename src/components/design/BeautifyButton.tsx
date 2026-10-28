import React, { useCallback, useEffect, useRef, useState } from 'react'
import Button from '@ingka/button'
import roomWithSparkles from '@ingka/ssr-icon/paths/room-with-sparkles'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'

import { useAppDispatch, useAppSelector } from 'hooks'
import { useTracker } from 'apps/TrackingBoundary'
import {
    getRemainingCredits,
    getShoppableProductCount,
    getCanGenerateBeautify,
    getIsBeautifying,
    getIsBeautifyButtonClickable,
    getIsBeautifyButtonHighlighted,
    getIsViewerOpen,
    getGeneratedImages,
} from 'models/beautifier/selectors'
import { requestBeautify, cancelBeautify, openImageViewer } from 'models/beautifier/slice'
import { setPromptVisibility } from 'models/ui/actions'
import { getHasSeenBeautifyFeedback } from 'models/ui/selectors'
import {
    ACTION_BEAUTIFY_OPEN,
    ACTION_BEAUTIFY_ROOM,
    ACTION_BEAUTIFY_CANCEL,
    ACTION_BEAUTIFY_COMPLETE,
    ACTION_BEAUTIFY_DISMISS,
} from 'models/tracking/constants'
import toastsService, { ToastType } from 'services/toasts'
import { DesignSidepanelView, useDesignSidebarContext } from 'components/design/DesignSidepanelContext'

import BeautifierPopover from './BeautifierPopover'
import BeautifyOptionsPanel from './BeautifyOptionsPanel'
import BeautifierImageViewer from './BeautifierImageViewer'

import './BeautifyButton.scss'

const BeautifyButton = () => {
    const { t } = useTranslation('translation')
    const { displaySidepanelView, expandSidepanel } = useDesignSidebarContext()
    const dispatch = useAppDispatch()
    const track = useTracker()
    const creditRemaining = useAppSelector(getRemainingCredits)
    const productsInRoom = useAppSelector(getShoppableProductCount)
    const isButtonClickable = useAppSelector(getIsBeautifyButtonClickable)
    const canGenerate = useAppSelector(getCanGenerateBeautify)
    const isBeautifying = useAppSelector(getIsBeautifying)
    const isHighlighted = useAppSelector(getIsBeautifyButtonHighlighted)
    const isViewerOpen = useAppSelector(getIsViewerOpen)
    const generatedImages = useAppSelector(getGeneratedImages)
    const hasSeenBeautifyFeedback = useAppSelector(getHasSeenBeautifyFeedback)
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [hasBeenClicked, setHasBeenClicked] = useState(false)
    const generationRequestLockRef = useRef(false)
    const wasBeautifyingRef = useRef(isBeautifying)
    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const wasViewerOpenRef = useRef(isViewerOpen)
    useEffect(() => {
        if (wasViewerOpenRef.current && !isViewerOpen) {
            setIsPanelOpen(false)
        }
        wasViewerOpenRef.current = isViewerOpen
    }, [isViewerOpen])

    useEffect(() => {
        if (wasBeautifyingRef.current && !isBeautifying) {
            generationRequestLockRef.current = false
        }
        wasBeautifyingRef.current = isBeautifying
    }, [isBeautifying])

    useEffect(() => () => (feedbackTimerRef.current ? clearTimeout(feedbackTimerRef.current) : undefined), [])

    const handleButtonClick = useCallback(() => {
        if (!isButtonClickable) return
        setHasBeenClicked(true)
        const opening = !isPanelOpen
        setIsPanelOpen(opening)
        if (opening) {
            track(ACTION_BEAUTIFY_OPEN, {
                attributes: {
                    CreditsRemaining: creditRemaining,
                    ProductsInRoom: productsInRoom,
                },
            })
        }
    }, [isButtonClickable, isPanelOpen, track, creditRemaining, productsInRoom])

    const handleOpenPanel = useCallback(() => {
        if (!isButtonClickable) return
        setHasBeenClicked(true)
        if (!isPanelOpen) {
            setIsPanelOpen(true)
            track(ACTION_BEAUTIFY_OPEN, {
                attributes: {
                    CreditsRemaining: creditRemaining,
                    ProductsInRoom: productsInRoom,
                },
            })
        }
    }, [isButtonClickable, isPanelOpen, track, creditRemaining, productsInRoom])

    const handleGenerate = useCallback(() => {
        if (!canGenerate || generationRequestLockRef.current) return
        generationRequestLockRef.current = true
        displaySidepanelView(DesignSidepanelView.EDIT)
        expandSidepanel()
        track(ACTION_BEAUTIFY_ROOM, {
            attributes: {
                CreditsRemaining: creditRemaining,
                ProductsInRoom: productsInRoom,
            },
        })
        dispatch(requestBeautify())
        setIsGenerating(true)
    }, [canGenerate, displaySidepanelView, expandSidepanel, track, dispatch, creditRemaining, productsInRoom])

    const handleGenerationComplete = useCallback(() => {
        generationRequestLockRef.current = false
        track(ACTION_BEAUTIFY_COMPLETE, { attributes: { CreditsRemaining: creditRemaining } })
        if (creditRemaining === 0) {
            toastsService.showToast({ toastType: ToastType.BEAUTIFY_REMAINING_COUNT, count: creditRemaining })
        }
        setIsGenerating(false)
        if (generatedImages.length > 0) {
            const isFirstBeautifyImage = generatedImages.length === 1 && !hasSeenBeautifyFeedback

            if (isFirstBeautifyImage && !feedbackTimerRef.current) {
                const BEAUTIFY_FEEDBACK_DELAY_MS = 60_000
                feedbackTimerRef.current = setTimeout(() => {
                    dispatch(setPromptVisibility(true, BEAUTIFY_FEEDBACK_DELAY_MS, 'beautify'))
                    feedbackTimerRef.current = null
                }, BEAUTIFY_FEEDBACK_DELAY_MS)
            }

            dispatch(openImageViewer(0))
        }
    }, [creditRemaining, dispatch, generatedImages.length, hasSeenBeautifyFeedback, track])

    const handleCancel = useCallback(() => {
        generationRequestLockRef.current = false
        track(ACTION_BEAUTIFY_CANCEL, {})
        setIsGenerating(false)
        dispatch(cancelBeautify())
    }, [dispatch, track])

    const handleClosePanel = useCallback(() => {
        generationRequestLockRef.current = false
        if (!isGenerating) {
            track(ACTION_BEAUTIFY_DISMISS, {})
        }
        setIsGenerating(false)
        setIsPanelOpen(false)
    }, [isGenerating, track])

    const buttonDisabled = !isButtonClickable || isGenerating

    return (
        <>
            {isGenerating && (
                <div className="BeautifySceneOverlay">
                    <div className="BeautifySceneOverlay__dot-pattern" />
                </div>
            )}
            {!isGenerating && !isViewerOpen && (
                <div className="BeautifyButton">
                    <BeautifierPopover disabled={buttonDisabled} onCtaClick={handleOpenPanel}>
                        <Button
                            className={classNames('BeautifyButton__button', {
                                'BeautifyButton__button--highlighted': isHighlighted && !isPanelOpen && !hasBeenClicked,
                            })}
                            type="primary"
                            inverseTheme
                            size="small"
                            ssrIcon={roomWithSparkles}
                            iconOnly
                            onClick={handleButtonClick}
                            text={t('design.beautify room')}
                            aria-label={t('design.beautify room')}
                            disabled={buttonDisabled}
                            aria-disabled={buttonDisabled}
                        />
                    </BeautifierPopover>
                </div>
            )}
            {isPanelOpen && (
                <BeautifyOptionsPanel
                    onGenerate={handleGenerate}
                    onClose={handleClosePanel}
                    onCancel={handleCancel}
                    onComplete={handleGenerationComplete}
                    disabled={!canGenerate}
                    isGenerating={isGenerating}
                />
            )}
            <BeautifierImageViewer />
        </>
    )
}

export default BeautifyButton
