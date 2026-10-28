import React, { type ChangeEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import feedbackSad from '@ingka/ssr-icon/paths/feedback-sad'
import feedbackDissatisfied from '@ingka/ssr-icon/paths/feedback-dissatisfied'
import feedbackNeutral from '@ingka/ssr-icon/paths/feedback-neutral'
import feedbackSatisfied from '@ingka/ssr-icon/paths/feedback-satisfied'
import feedbackHappy from '@ingka/ssr-icon/paths/feedback-happy'
import { click, workflow } from '@utils/tracker'
import {
    MP_KREATIV_LITE_CSAT_SHOWN,
    MP_KREATIV_LITE_CSAT_SUBMIT,
    MP_KREATIV_LITE_CSAT_WRITTEN_SUBMIT,
    MP_KREATIV_LITE_CSAT_DISMISS,
    MP_KREATIV_LITE_CSAT_WRITTEN_DISMISS,
} from '@lib/tracking/constants'
import { BottomSheet } from './BottomSheet'
import './FeedbackDrawer.scss'

const CHARACTER_LIMIT = 300
const HANDLE_AREA_HEIGHT_PX = 40
const MIN_EXPANDED_TOP_PX = 56

const RATINGS = [
    { value: 1, icon: feedbackSad, labelKey: 'find-my-fit.csat.bad' },
    { value: 2, icon: feedbackDissatisfied, labelKey: 'find-my-fit.csat.dissatisfied' },
    { value: 3, icon: feedbackNeutral, labelKey: 'find-my-fit.csat.neutral' },
    { value: 4, icon: feedbackSatisfied, labelKey: 'find-my-fit.csat.satisfied' },
    { value: 5, icon: feedbackHappy, labelKey: 'find-my-fit.csat.good' },
]

export interface FeedbackDrawerProps {
    open: boolean
    onClose: () => void
    onComplete: () => void
}

export const FeedbackDrawer = ({ open, onClose, onComplete }: FeedbackDrawerProps) => {
    const { t } = useTranslation('find-my-fit')
    const [rating, setRating] = useState<number | null>(null)
    const [description, setDescription] = useState('')

    // Measure inner content so the sheet hugs its content with no flash.
    // Start off-screen (window.innerHeight) — the sheet is hidden via transform anyway.
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

    useEffect(() => {
        if (open) {
            workflow(MP_KREATIV_LITE_CSAT_SHOWN)
        }
    }, [open])

    const handleDescriptionChange = ({ target: { value } }: ChangeEvent<HTMLTextAreaElement>) => setDescription(value)

    const handleSend = useCallback(() => {
        if (rating === null) return
        click(MP_KREATIV_LITE_CSAT_SUBMIT, { Rating: rating })
        if (description !== '') {
            click(MP_KREATIV_LITE_CSAT_WRITTEN_SUBMIT, { Rating: rating, Feedback: description })
        }
        onComplete()
        setRating(null)
        setDescription('')
    }, [rating, description, onComplete])

    const handleClose = useCallback(() => {
        if (description !== '') {
            click(MP_KREATIV_LITE_CSAT_WRITTEN_DISMISS)
        } else {
            click(MP_KREATIV_LITE_CSAT_DISMISS)
        }
        onClose()
        setRating(null)
        setDescription('')
    }, [description, onClose])

    return (
        <BottomSheet open={open} onClose={handleClose} dismissMode="dismiss" overlay elevated expandedTop={expandedTop}>
            <div ref={innerRef} className="FeedbackDrawer__content">
                <h2 className="FeedbackDrawer__title">{t('find-my-fit.csat.title')}</h2>
                <p className="FeedbackDrawer__instruction">{t('find-my-fit.csat.ratingDescription')}</p>
                <div className="FeedbackDrawer__rating">
                    {RATINGS.map(({ value, icon, labelKey }) => (
                        <button
                            key={value}
                            type="button"
                            className={`FeedbackDrawer__rating-btn${rating === value ? ' FeedbackDrawer__rating-btn--selected' : ''}`}
                            onClick={() => setRating(value)}
                            aria-label={t(labelKey)}
                            aria-pressed={rating === value}
                        >
                            {/* eslint-disable-next-line i18next/no-literal-string */}
                            <SSRIcon paths={icon} viewBox="2 2 20 20" />
                        </button>
                    ))}
                </div>
                <textarea
                    id="feedback-drawer-description"
                    name="feedback-description"
                    className="FeedbackDrawer__textarea"
                    value={description}
                    onChange={handleDescriptionChange}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder={t('find-my-fit.csat.describeIt')}
                    maxLength={CHARACTER_LIMIT}
                    rows={5}
                />
                <p className="FeedbackDrawer__char-count">
                    {description.length}/{CHARACTER_LIMIT}
                </p>
                <div className="FeedbackDrawer__footer">
                    <Button
                        type="primary"
                        size="medium"
                        text={t('find-my-fit.csat.submit')}
                        onClick={handleSend}
                        disabled={rating === null || description.length > CHARACTER_LIMIT}
                        fluid
                    />
                </div>
            </div>
        </BottomSheet>
    )
}
