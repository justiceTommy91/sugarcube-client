import React, { useEffect, useRef, useState } from 'react'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import cross from '@ingka/ssr-icon/paths/cross'
import classNames from 'classnames'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'

import { useAppSelector } from 'hooks'
import { useTracker } from 'apps/TrackingBoundary'
import { BEAUTIFIER_JOB_STATES } from 'models/beautifier/constants'
import { getBeautifierErrorMessage, getBeautifierJobState } from 'models/beautifier/selectors'
import { ACTION_BEAUTIFY_ERROR } from 'models/tracking/constants'

import BeautifyErrorCard from './BeautifyErrorCard'

import './BeautifyProgressBar.scss'

const MAX_DURATION_MS = 28000
const LINEAR_PROGRESS_CAP = 93
const PROGRESS_INTERVAL_MS = 100
const TOTAL_STEPS = 3

const STEP_KEYS = [
    'design.beautify step scene',
    'design.beautify step lighting',
    'design.beautify step details',
] as const

const STEP_STATES = {
    COMPLETED: 'completed',
    ACTIVE: 'active',
    PENDING: 'pending',
} as const

type StepState = (typeof STEP_STATES)[keyof typeof STEP_STATES]

const STEP_MARKER_ICONS: Record<StepState, string> = {
    [STEP_STATES.COMPLETED]: 'images/icons/beautifier_step_complete.svg',
    [STEP_STATES.ACTIVE]: 'images/icons/beautifier_step_active.svg',
    [STEP_STATES.PENDING]: 'images/icons/beautifier_step_pending.svg',
}

const STEP_THRESHOLDS = [12, 53, 100]

/* eslint-disable i18next/no-literal-string */
const getStepState = (stepIndex: number, progress: number): StepState => {
    if (progress >= STEP_THRESHOLDS[stepIndex]) return STEP_STATES.COMPLETED
    const prevThreshold = stepIndex > 0 ? STEP_THRESHOLDS[stepIndex - 1] : 0
    if (progress >= prevThreshold) return STEP_STATES.ACTIVE
    return STEP_STATES.PENDING
}

const CONNECTOR_PROGRESS_THRESHOLD = 75

const isConnectorActive = (connectorIndex: number, progress: number): boolean => {
    if (connectorIndex <= 1) return progress >= STEP_THRESHOLDS[1]
    if (connectorIndex === 2) return progress >= CONNECTOR_PROGRESS_THRESHOLD
    return progress >= STEP_THRESHOLDS[2]
}
/* eslint-enable i18next/no-literal-string */

type BeautifyProgressBarProps = {
    onClose: () => void
    onCancel: () => void
    onComplete: () => void
    onRetry: () => void
}

const BeautifyProgressBar = ({
    onClose,
    onCancel,
    onComplete,
    onRetry,
}: BeautifyProgressBarProps) => {
    const { t } = useTranslation('translation')
    const track = useTracker()
    const [progress, setProgress] = useState(0)
    const [secondsRemaining, setSecondsRemaining] = useState(Math.ceil(MAX_DURATION_MS / 1000))
    const onCompleteRef = useRef(onComplete)
    onCompleteRef.current = onComplete

    const jobState = useAppSelector(getBeautifierJobState)
    const errorMessage = useAppSelector(getBeautifierErrorMessage)

    const isJobDone = jobState === BEAUTIFIER_JOB_STATES.COMPLETED
    const showErrorCard = !!errorMessage

    const errorTrackedRef = useRef(false)
    useEffect(() => {
        if (showErrorCard && errorMessage && !errorTrackedRef.current) {
            errorTrackedRef.current = true
            track(ACTION_BEAUTIFY_ERROR, { attributes: { ErrorMessage: errorMessage } })
        }
        if (!showErrorCard) {
            errorTrackedRef.current = false
        }
    }, [showErrorCard, errorMessage, track])

    useEffect(() => {
        if (isJobDone) {
            setProgress(100)
            const timer = setTimeout(() => onCompleteRef.current(), 500)
            return () => clearTimeout(timer)
        }
        return undefined
    }, [isJobDone])

    useEffect(() => {
        if (isJobDone) return undefined

        const startTime = Date.now()
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime

            if (elapsed <= MAX_DURATION_MS) {
                setProgress((elapsed / MAX_DURATION_MS) * LINEAR_PROGRESS_CAP)
                setSecondsRemaining(Math.max(Math.ceil((MAX_DURATION_MS - elapsed) / 1000), 1))
            } else {
                const overtime = elapsed - MAX_DURATION_MS
                const extra = (99 - LINEAR_PROGRESS_CAP) * (overtime / (overtime + 10000))
                setProgress(LINEAR_PROGRESS_CAP + extra)
                setSecondsRemaining(Math.max(Math.ceil(2 * (10000 / (overtime + 10000))), 1))
            }
        }, PROGRESS_INTERVAL_MS)

        return () => clearInterval(interval)
    }, [isJobDone])

    if (showErrorCard) {
        return <BeautifyErrorCard onClose={onClose} onCancel={onCancel} onRetry={onRetry} />
    }

    const canCollapse = isJobDone

    return (
        <div className="BeautifyProgressBar">
            <button
                type="button"
                className="BeautifyProgressBar__close"
                onClick={onClose}
                disabled={!canCollapse}
                aria-label={String(t('aria.close'))}
            >
                <SSRIcon paths={cross} />
            </button>

            <div className="BeautifyProgressBar__steps" role="list">
                {STEP_KEYS.map((key, index) => {
                    const state = getStepState(index, progress)
                    const isFirst = index === 0
                    const isLast = index === TOTAL_STEPS - 1
                    const leftConnectorIdx = 2 * index - 1
                    const rightConnectorIdx = 2 * index
                    return (
                        <div key={key} className="BeautifyProgressBar__step" role="listitem">
                            {!isFirst && (
                                <span
                                    className={classNames('BeautifyProgressBar__line BeautifyProgressBar__line--left', {
                                        'BeautifyProgressBar__line--active': isConnectorActive(leftConnectorIdx, progress),
                                    })}
                                    aria-hidden="true"
                                />
                            )}
                            {!isLast && (
                                <span
                                    className={classNames('BeautifyProgressBar__line BeautifyProgressBar__line--right', {
                                        'BeautifyProgressBar__line--active': isConnectorActive(rightConnectorIdx, progress),
                                    })}
                                    aria-hidden="true"
                                />
                            )}
                            <span
                                className={classNames('BeautifyProgressBar__marker', {
                                    'BeautifyProgressBar__marker--active': state === STEP_STATES.ACTIVE,
                                })}
                                aria-hidden="true"
                            >
                                <img
                                    src={withPrefix(STEP_MARKER_ICONS[state])}
                                    alt=""
                                    draggable={false}
                                />
                            </span>
                            <span
                                className={classNames('BeautifyProgressBar__step-label', `BeautifyProgressBar__step-label--${state}`)}
                            >
                                {t(key)}
                            </span>
                        </div>
                    )
                })}
            </div>

            <div className="BeautifyProgressBar__progress-row">
                <div className="BeautifyProgressBar__progress-bar">
                    <div
                        className="BeautifyProgressBar__progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="BeautifyProgressBar__progress-percent">
                    {Math.round(progress)}%
                </span>
            </div>

            <div className="BeautifyProgressBar__footer">
                <div className="BeautifyProgressBar__footer-left">
                    <Button
                        className="BeautifyProgressBar__cancel-link"
                        type="tertiary"
                        size="small"
                        onClick={onCancel}
                        text={t('design.beautify cancel')}
                    />
                </div>
                <div className="BeautifyProgressBar__footer-center">
                    <div className="BeautifyProgressBar__status-pill">
                        <img
                            src={withPrefix(
                                'images/icons/beautifier_suggestion.svg'
                            )}
                            alt=""
                            draggable={false}
                        />
                        <span>{t('design.beautify generating')}</span>
                    </div>
                </div>
                <div className="BeautifyProgressBar__footer-right">
                    <span className="BeautifyProgressBar__time-remaining">
                        {t('design.beautify time remaining', {
                            seconds: secondsRemaining,
                        })}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default BeautifyProgressBar