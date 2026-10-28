import React from 'react'
import { connect } from 'react-redux'
import type { RootState } from 'store'

import { getSelectedComposition, getSelectedCompositionTrackingRoomInfo } from 'models/compositions/selectors'
import type { Composition, SelectedCompositionTrackingRoomInfo } from 'models/compositions'

import OnboardingModal from 'components/design/OnboardingModal'
import { completeOnboarding, skipOnboarding } from 'models/ui/actions'
import { getShouldShowOnboarding } from 'models/ui/selectors'

interface OnboardingModalContainerProps {
    composition?: Composition
    shouldShow: boolean
    skip: (completeTime: number) => void
    complete: (completeTime: number) => void
    trackingInfo: SelectedCompositionTrackingRoomInfo
}

const OnboardingModalContainer = ({
    composition,
    skip,
    complete,
    shouldShow,
    trackingInfo,
}: OnboardingModalContainerProps) => {
    if (!(shouldShow && composition)) {
        return null
    }

    return (
        <OnboardingModal
            onSkip={() => skip(Date.now())}
            onComplete={() => complete(Date.now())}
            composition={composition}
            trackingInfo={trackingInfo}
        />
    )
}

const mapStateToProps = (state: RootState) => ({
    composition: getSelectedComposition(state),
    shouldShow: getShouldShowOnboarding(state),
    trackingInfo: getSelectedCompositionTrackingRoomInfo(state),
})

const mapDispatchToProps = {
    skip: skipOnboarding,
    complete: completeOnboarding,
}

export default connect(mapStateToProps, mapDispatchToProps)(OnboardingModalContainer)
