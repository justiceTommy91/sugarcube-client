import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { click, workflow } from '@utils/tracker'
import CsatSurvey, { type CsatSurveyLabels } from '@astro-components/common/CsatSurvey'
import {
    MP_FMF_CSAT_SHOWN,
    MP_FMF_CSAT_SUBMIT,
    MP_FMF_CSAT_WRITTEN_SUBMIT,
    MP_FMF_CSAT_DISMISS,
    MP_FMF_CSAT_WRITTEN_DISMISS,
} from '@lib/tracking/constants'

export interface FmfTrackingInfo {
    SceneId: string
    ProductViewCount: number
}

interface FmfFeedbackSurveyProps {
    trackingInfo: FmfTrackingInfo
    hasSeenFormOnce: boolean
    onSkip: () => void
    onSkipAgain: () => void
    onComplete: () => void
    onClose: () => void
}

const FmfFeedbackSurvey = ({
    trackingInfo,
    hasSeenFormOnce,
    onSkip,
    onSkipAgain,
    onComplete,
    onClose,
}: FmfFeedbackSurveyProps) => {
    const { t } = useTranslation('find-my-fit')

    const tracking = trackingInfo as unknown as Record<string, unknown>

    useEffect(() => {
        workflow(MP_FMF_CSAT_SHOWN, tracking)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const labels: CsatSurveyLabels = {
        title: t('find-my-fit.csat.title'),
        cancel: t('find-my-fit.csat.cancel'),
        ratingLabels: {
            bad: t('find-my-fit.csat.bad'),
            dissatisfied: t('find-my-fit.csat.dissatisfied'),
            neutral: t('find-my-fit.csat.neutral'),
            satisfied: t('find-my-fit.csat.satisfied'),
            good: t('find-my-fit.csat.good'),
        },
        goodOrBad: t('find-my-fit.csat.goodOrBad'),
        feedbackPlaceholder: t('find-my-fit.csat.privacyText'),
        submitLabel: t('find-my-fit.csat.submit'),
        ratingDescription: t('find-my-fit.csat.ratingDescription'),
    }

    const handleSubmit = (rating: number, description: string) => {
        click(MP_FMF_CSAT_SUBMIT, { Rating: rating, ...tracking })
        if (description !== '') {
            click(MP_FMF_CSAT_WRITTEN_SUBMIT, { Rating: rating, Feedback: description, ...tracking })
        }
        onComplete()
    }

    const handleDismiss = (screenIndex: number, rating: number | null) => {
        // If the user had already selected a rating when they dismissed, treat it
        // as a completion (mirrors gatsby DesignSurvey closeSurvey logic).
        if (rating !== null) {
            click(MP_FMF_CSAT_SUBMIT, { Rating: rating, ...tracking })
            onComplete()
        } else if (hasSeenFormOnce) {
            onSkipAgain()
        } else {
            onSkip()
        }

        // Fire the appropriate dismiss event based on which screen they were on.
        if (screenIndex === 1) {
            click(MP_FMF_CSAT_WRITTEN_DISMISS, tracking)
        } else {
            click(MP_FMF_CSAT_DISMISS, tracking)
        }
    }

    return <CsatSurvey labels={labels} onSubmit={handleSubmit} onDismiss={handleDismiss} onClose={onClose} />
}

export default FmfFeedbackSurvey
