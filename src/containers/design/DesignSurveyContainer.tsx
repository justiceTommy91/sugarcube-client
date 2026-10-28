import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { RootState } from 'store'
import { submitFeedbackForm, skipFeedbackForm, skipFeedbackFormFirstTime } from 'models/ui/actions'
import { workflow } from 'utils/tracker'
import type { SelectedCompositionTrackingRoomInfo } from 'models/compositions'
import { getSelectedCompositionTrackingRoomInfo } from 'models/compositions/selectors'

import { exitDesign as exitDesignAction } from 'models/location/actions'
import DesignSurvey from 'components/design/DesignSurvey'
import { getHasSeenFeedbackFormOnce, getPromptVisibility } from 'models/ui/selectors'
import { getHasUsedEraser } from 'models/sessionStorage/selectors'

interface DesignSurveyContainerProps {
    skip: () => void
    complete: (completeTime: number) => void
    trackingInfo: SelectedCompositionTrackingRoomInfo
    onClose: () => void
    skipFirstTime: (completeTime: number) => void
    hasSeenFeedbackFormOnce: boolean
    hasUsedEraser: boolean
    feedbackDelayData?: number
    feedbackSource?: 'design' | 'beautify' | null
}

const DesignSurveyContainer = ({
    skip,
    skipFirstTime,
    complete,
    trackingInfo,
    onClose,
    hasSeenFeedbackFormOnce,
    hasUsedEraser,
    feedbackDelayData,
    feedbackSource,
}: DesignSurveyContainerProps) => {
    useEffect(() => {
        workflow('DecorateRoom.DesignFeedback', { 'time-delay': feedbackDelayData })
    }, [])
    return (
        <DesignSurvey
            onSkip={() => skip()}
            onSkipFirstTime={() => skipFirstTime(Date.now())}
            onComplete={() => complete(Date.now())}
            trackingInfo={trackingInfo}
            onClose={onClose}
            hasSeenFeedbackFormOnce={hasSeenFeedbackFormOnce}
            hasUsedEraser={hasUsedEraser}
            feedbackDelayData={feedbackDelayData}
            feedbackSource={feedbackSource ?? undefined}
        />
    )
}

const mapStateToProps = (state: RootState) => ({
    trackingInfo: getSelectedCompositionTrackingRoomInfo(state),
    hasSeenFeedbackFormOnce: getHasSeenFeedbackFormOnce(state),
    hasUsedEraser: getHasUsedEraser(),
    feedbackSource: getPromptVisibility(state)?.source ?? undefined,
})
const mapDispatchToProps = {
    skip: skipFeedbackForm,
    skipFirstTime: skipFeedbackFormFirstTime,
    complete: submitFeedbackForm,
    exitDesign: exitDesignAction,
}

export default connect(mapStateToProps, mapDispatchToProps)(DesignSurveyContainer)
