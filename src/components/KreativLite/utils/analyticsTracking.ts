import { visit, workflow, trackGoogleAnalytics } from 'utils/tracker'
import {
    KREATIVLITE_PROCESSING_VISIT,
    KREATIVLITE_PROCESSING_EXTENDED,
    KREATIVLITE_PROCESSING_END,
    KREATIVLITE_RESULT_SUCCESS,
    KREATIVLITE_RESULT_FAIL,
    GA_ACTION_KREATIVLITE_PROCESSING_VISIT,
    GA_ACTION_KREATIVLITE_PROCESSING_EXTENDED,
    GA_ACTION_KREATIVLITE_PROCESSING_END,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'

export interface ProcessingTracking {
    /** Workflow event name for the processing-visit event */
    visitEvent: string
    /** Workflow event name for the processing-extended event */
    extendedEvent: string
    /** Workflow event name for the processing-end event */
    endEvent: string
    /** Google Analytics action for the processing-visit event */
    gaActionVisit: string
    /** Google Analytics action for the processing-extended event */
    gaActionExtended: string
    /** Google Analytics action for the processing-end event */
    gaActionEnd: string
    /** Google Analytics category. Defaults to GA_CATEGORY_DYH_SUGARCUBE */
    gaCategory?: string
}

const DEFAULT_PROCESSING_TRACKING: ProcessingTracking = {
    visitEvent: KREATIVLITE_PROCESSING_VISIT,
    extendedEvent: KREATIVLITE_PROCESSING_EXTENDED,
    endEvent: KREATIVLITE_PROCESSING_END,
    gaActionVisit: GA_ACTION_KREATIVLITE_PROCESSING_VISIT,
    gaActionExtended: GA_ACTION_KREATIVLITE_PROCESSING_EXTENDED,
    gaActionEnd: GA_ACTION_KREATIVLITE_PROCESSING_END,
}

export interface AnalyticsTracker {
    trackVisitIfNeeded: (sceneId: string, estimatedFinishTs: string) => void
    trackExtensionIfNeeded: (
        sceneId: string,
        finishTime: number,
        initialEstimate: number,
        estimatedFinishTs: string,
        processingStartTime: number,
    ) => void
    trackSuccess: (sceneId: string, processingStartTime: number) => void
    trackFailure: (sceneId: string, processingStartTime: number, errorMessage: string) => void
}

/**
 * Creates an analytics tracker for scene processing events.
 * Maintains state to ensure events are only tracked once per processing session, since we keep polling the scene when it's processing
 */
export const createAnalyticsTracker = (tracking: ProcessingTracking = DEFAULT_PROCESSING_TRACKING): AnalyticsTracker => {
    const gaCategory = tracking.gaCategory ?? GA_CATEGORY_DYH_SUGARCUBE
    let hasTrackedVisit = false
    let hasTrackedExtended = false

    return {
        trackVisitIfNeeded: (sceneId: string, estimatedFinishTs: string) => {
            if (!hasTrackedVisit) {
                visit(tracking.visitEvent, {
                    SceneId: sceneId,
                    EstimatedCompletionTime: estimatedFinishTs,
                })
                trackGoogleAnalytics({
                    action: tracking.gaActionVisit,
                    category: gaCategory,
                    label: sceneId,
                    custom: {
                        SceneId: sceneId,
                        EstimatedCompletionTime: estimatedFinishTs,
                    },
                })
                hasTrackedVisit = true
            }
        },

        trackExtensionIfNeeded: (
            sceneId: string,
            finishTime: number,
            initialEstimate: number,
            estimatedFinishTs: string,
            processingStartTime: number,
        ) => {
            const hasBeenExtended = finishTime > initialEstimate
            if (hasBeenExtended && !hasTrackedExtended) {
                const elapsedTime = Date.now() - processingStartTime
                const originalEstimatedTime = new Date(initialEstimate).toISOString()

                workflow(tracking.extendedEvent, {
                    SceneId: sceneId,
                    OriginalEstimatedCompletionTime: originalEstimatedTime,
                    NewEstimatedCompletionTime: estimatedFinishTs,
                    ElapsedTimeMs: elapsedTime,
                })
                trackGoogleAnalytics({
                    action: tracking.gaActionExtended,
                    category: gaCategory,
                    label: sceneId,
                    custom: {
                        SceneId: sceneId,
                        OriginalEstimatedCompletionTime: originalEstimatedTime,
                        NewEstimatedCompletionTime: estimatedFinishTs,
                        ElapsedTimeMs: String(elapsedTime),
                    },
                })
                hasTrackedExtended = true
            }
        },

        trackSuccess: (sceneId: string, processingStartTime: number) => {
            const processingDuration = Date.now() - processingStartTime

            workflow(tracking.endEvent, {
                SceneId: sceneId,
                ProcessingDurationMs: processingDuration,
                Result: KREATIVLITE_RESULT_SUCCESS,
            })
            trackGoogleAnalytics({
                action: tracking.gaActionEnd,
                category: gaCategory,
                label: KREATIVLITE_RESULT_SUCCESS,
                custom: {
                    SceneId: sceneId,
                    ProcessingDurationMs: String(processingDuration),
                    Result: KREATIVLITE_RESULT_SUCCESS,
                },
            })
        },

        trackFailure: (sceneId: string, processingStartTime: number, errorMessage: string) => {
            const processingDuration = Date.now() - processingStartTime

            workflow(tracking.endEvent, {
                SceneId: sceneId,
                ProcessingDurationMs: processingDuration,
                Result: KREATIVLITE_RESULT_FAIL,
                FailReason: errorMessage,
            })
            trackGoogleAnalytics({
                action: tracking.gaActionEnd,
                category: gaCategory,
                label: KREATIVLITE_RESULT_FAIL,
                custom: {
                    SceneId: sceneId,
                    ProcessingDurationMs: String(processingDuration),
                    Result: KREATIVLITE_RESULT_FAIL,
                    FailReason: errorMessage,
                },
            })
        },
    }
}
