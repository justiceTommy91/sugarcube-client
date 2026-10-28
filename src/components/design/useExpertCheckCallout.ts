import { useCallback, useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from 'hooks'
import { useTracker } from 'apps/TrackingBoundary'
import {
    getDismissedExpertCheckCalloutFromTimeout,
    getShouldShowExpertCheckCallout,
    getShowExpertCheckCalloutFromTimeout,
} from 'models/ui/selectors'
import {
    dismissExpertCheckCalloutFromTimeout,
    setHasSeenExpertCheck,
    showExpertCheckCalloutFromTimeout,
} from 'models/ui/actions'
import { trackGoogleAnalytics } from 'utils/tracker'
import {
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_ACTION_CLOSE_EXPERT_CHECK_CALLOUT,
    GA_LABEL_EXPERT_CHECK_CALLOUT_CLOSE_BUTTON_TIMEOUT,
    GA_LABEL_EXPERT_CHECK_CALLOUT_CLOSE_BUTTON,
    ACTION_CLOSE_EXPERT_CHECK_CALLOUT,
    GA_ACTION_CLICK_EXPERT_CHECK_CALLOUT,
    GA_LABEL_EXPERT_CHECK_CALLOUT_TIMEOUT,
    GA_LABEL_EXPERT_CHECK_CALLOUT,
    ACTION_CLICK_EXPERT_CHECK_CALLOUT,
    GA_ACTION_SHOW_EXPERT_CHECK_CALLOUT,
} from 'models/tracking/constants'

export const useExpertCheckCallout = () => {
    const dispatch = useAppDispatch()
    const track = useTracker()
    const prevRendered = useRef(false)
    const timerHandler = useRef<number | null>(null)
    const shouldShowCallout = useAppSelector(getShouldShowExpertCheckCallout)
    const dismissedExpertCheckCalloutFromTimeout = useAppSelector(getDismissedExpertCheckCalloutFromTimeout)
    const shownExpertCheckCalloutFromTimeout = useAppSelector(getShowExpertCheckCalloutFromTimeout)

    const setTimeoutHandler = useCallback(() => {
        if (dismissedExpertCheckCalloutFromTimeout) return

        timerHandler.current = window.setTimeout(() => {
            // we want to show the expert check callout one more time after a 20 minute timer
            // hoping this would capture higher-quality leads
            dispatch(showExpertCheckCalloutFromTimeout())
        }, 20 * 60 * 1000)
    }, [])

    useEffect(() => {
        setTimeoutHandler()

        return () => {
            if (timerHandler.current !== null) {
                window.clearTimeout(timerHandler.current)
            }
        }
    }, [])

    useEffect(() => {
        // Transition from rendering null to now 'showing' the callout
        if (prevRendered.current === false && shouldShowCallout) {
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: GA_ACTION_SHOW_EXPERT_CHECK_CALLOUT,
                label: shownExpertCheckCalloutFromTimeout
                    ? GA_LABEL_EXPERT_CHECK_CALLOUT_TIMEOUT
                    : GA_LABEL_EXPERT_CHECK_CALLOUT,
            })
        }
        prevRendered.current = shouldShowCallout
    }, [shouldShowCallout])

    const handleCalloutCloseButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_CLOSE_EXPERT_CHECK_CALLOUT,
            label: shownExpertCheckCalloutFromTimeout
                ? GA_LABEL_EXPERT_CHECK_CALLOUT_CLOSE_BUTTON_TIMEOUT
                : GA_LABEL_EXPERT_CHECK_CALLOUT_CLOSE_BUTTON,
        })
        track.click({
            target: 'expertCheck.tooltip',
            intendedAction: ACTION_CLOSE_EXPERT_CHECK_CALLOUT,
        })
        dispatch(setHasSeenExpertCheck(true))
        if (shownExpertCheckCalloutFromTimeout) {
            dispatch(dismissExpertCheckCalloutFromTimeout())
        }
    }

    const handleCalloutBodyClick = () => {
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_CLICK_EXPERT_CHECK_CALLOUT,
            label: shownExpertCheckCalloutFromTimeout
                ? GA_LABEL_EXPERT_CHECK_CALLOUT_TIMEOUT
                : GA_LABEL_EXPERT_CHECK_CALLOUT,
        })
        track.click({
            target: 'expertCheck.callout',
            intendedAction: ACTION_CLICK_EXPERT_CHECK_CALLOUT,
        })
        if (shownExpertCheckCalloutFromTimeout) {
            dispatch(dismissExpertCheckCalloutFromTimeout())
        }
    }
    return {
        handleCalloutCloseButtonClick,
        handleCalloutBodyClick,
    }
}
