import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import { pollSceneStatus, SceneStatus, SCENE_PROCESSING_ERROR_MESSAGES } from 'services/imageUpload'
import { SCENE_STATE_FAILED } from 'models/scenes/constants'
import { createAnalyticsTracker, ProcessingTracking } from './utils/analyticsTracking'
import { createEstimateStorage } from './utils/estimateStorage'
import { useCompletionRedirect } from './hooks/useCompletionRedirect'
import { useProgressTimer } from './hooks/useProgressTimer'

export interface SceneProcessingState {
    jobState: string | null
    progress: number
    secondsRemaining: number
    error?: string
    thumbnailUrl?: string
    showIndeterminate?: boolean
    showAlmostReady?: boolean
    completed?: boolean
    redirectCountdown?: number
}

const SAFE_ERROR_MESSAGES = new Set<string>([
    SCENE_PROCESSING_ERROR_MESSAGES.TIMEOUT,
    SCENE_PROCESSING_ERROR_MESSAGES.FAILED,
])

/**
 * Determines if indeterminate progress should be shown.
 * Shows indeterminate when processing has taken longer than initially estimated
 * and we're past the initial deadline (extended processing with unknown duration).
 */
const shouldShowIndeterminateProgress = (finishTime: number, initialEstimate: number | null): boolean => {
    if (!initialEstimate) return false
    const now = Date.now()
    const hasBeenExtended = finishTime > initialEstimate
    const pastInitialEstimate = now > initialEstimate
    return hasBeenExtended && pastInitialEstimate
}

/**
 * Manages scene processing state including polling, progress tracking, and analytics.
 * Polls the backend for scene processing status, tracks progress and time estimates,
 * and automatically redirects to the room view when processing completes.
 *
 * @param sceneId - The ID of the scene being processed, or null if no scene
 * @param onComplete - Callback fired when processing succeeds. Receives the scene UUID.
 *   The caller is responsible for navigation or any side effects (e.g. dispatching a Redux action).
 * @param tracking - Optional tracking config. Defaults to KreativLite events.
 * @returns Processing state including progress, errors, and completion status
 */
export const useSceneProcessing = (
    sceneId: string | null,
    onComplete: (sceneUuid: string) => void,
    tracking?: ProcessingTracking,
    allowGuest?: boolean,
): SceneProcessingState => {
    const { t } = useTranslation()
    const [sceneState, setSceneState] = useState<{
        jobState: string | null
        error?: string
        thumbnailUrl?: string
        showIndeterminate?: boolean
        completed?: boolean
    }>({
        jobState: null,
        showIndeterminate: false,
    })

    const startTimeRef = useRef<number | null>(null)
    const processingStartTimeRef = useRef<number | null>(null)
    const initialEstimateRef = useRef<number | null>(null)

    // Hooks that provide reactive values
    const { redirectCountdown, startRedirect } = useCompletionRedirect(onComplete)
    const progressState = useProgressTimer({
        startTime: startTimeRef.current,
        estimatedFinishTime: initialEstimateRef.current,
        initialEstimate: initialEstimateRef.current,
        enabled: !sceneState.error && !sceneState.showIndeterminate,
    })

    // Poll scene status and navigate when complete
    useEffect(() => {
        if (!sceneId) {
            return undefined
        }

        processingStartTimeRef.current = Date.now()
        const abortController = new AbortController()

        // Create utilities for this processing session
        const analytics = createAnalyticsTracker(tracking)
        const storage = createEstimateStorage(sceneId)

        // Initialize from storage
        const storedEstimate = storage.getInitialEstimate()
        if (storedEstimate) {
            initialEstimateRef.current = storedEstimate
        }

        const startPolling = async (): Promise<void> => {
            try {
                const finalScene = await pollSceneStatus(
                    sceneId,
                    (scene: SceneStatus) => {
                        // Initialize start time from server
                        if (!startTimeRef.current && (scene.clientCapturedAt || scene.createdAt)) {
                            const serverStartTime = scene.clientCapturedAt || scene.createdAt
                            if (serverStartTime) {
                                startTimeRef.current = new Date(serverStartTime).getTime()
                            }
                        }

                        if (scene.estimatedFinishTs && startTimeRef.current) {
                            const finishTime = new Date(scene.estimatedFinishTs).getTime()

                            // Track analytics events
                            analytics.trackVisitIfNeeded(sceneId, scene.estimatedFinishTs)
                            storage.setInitialEstimate(finishTime)

                            const currentInitialEstimate = storage.getInitialEstimate()
                            if (currentInitialEstimate) {
                                // Update ref for progress timer
                                initialEstimateRef.current = currentInitialEstimate

                                if (processingStartTimeRef.current) {
                                    analytics.trackExtensionIfNeeded(
                                        sceneId,
                                        finishTime,
                                        currentInitialEstimate,
                                        scene.estimatedFinishTs,
                                        processingStartTimeRef.current,
                                    )
                                }
                            }

                            // Update state based on processing status
                            if (shouldShowIndeterminateProgress(finishTime, currentInitialEstimate)) {
                                setSceneState({
                                    jobState: scene.jobState,
                                    thumbnailUrl: scene.thumbnails?.url,
                                    showIndeterminate: true,
                                })
                            } else {
                                setSceneState({
                                    jobState: scene.jobState,
                                    thumbnailUrl: scene.thumbnails?.url,
                                    showIndeterminate: false,
                                })
                            }
                        }
                    },
                    abortController.signal,
                    allowGuest,
                )

                // Processing completed successfully
                storage.clearInitialEstimate()

                if (processingStartTimeRef.current) {
                    analytics.trackSuccess(sceneId, processingStartTimeRef.current)
                }

                setSceneState((prev) => ({
                    ...prev,
                    completed: true,
                }))

                startRedirect(finalScene.uuid)
            } catch (error) {
                // Don't show error if cancelled by user navigation
                if (error instanceof Error && error.message === 'Polling cancelled') {
                    return
                }

                // Log actual error to Sentry for debugging
                Sentry.captureException(error, {
                    contexts: {
                        sceneProcessing: {
                            sceneId: sceneId || 'unknown',
                            component: 'useSceneProcessing',
                        },
                    },
                })

                // Track failure
                if (processingStartTimeRef.current) {
                    const errorMessage = error instanceof Error ? error.message : ''
                    analytics.trackFailure(sceneId || '', processingStartTimeRef.current, errorMessage)
                }

                // Show user-friendly error message with translated error
                let errorMessage: string
                if (error instanceof Error && SAFE_ERROR_MESSAGES.has(error.message)) {
                    // It's a known error key, translate it
                    errorMessage = t(
                        error.message as 'design.kreativLite.errors.timeout' | 'design.kreativLite.errors.failed',
                    )
                } else {
                    // Unknown error, use generic message
                    errorMessage = t('design.kreativLite.errors.generic')
                }

                setSceneState({
                    jobState: SCENE_STATE_FAILED,
                    error: errorMessage,
                })
            }
        }

        startPolling()

        return () => {
            abortController.abort()
        }
    }, [sceneId, startRedirect])

    return {
        jobState: sceneState.jobState,
        progress: sceneState.completed ? 100 : progressState.progress,
        secondsRemaining: progressState.secondsRemaining,
        error: sceneState.error,
        thumbnailUrl: sceneState.thumbnailUrl,
        showIndeterminate: sceneState.showIndeterminate,
        showAlmostReady: progressState.showAlmostReady,
        completed: sceneState.completed,
        redirectCountdown,
    }
}
