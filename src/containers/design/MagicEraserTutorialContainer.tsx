import React, { useEffect } from 'react'
import { connect } from 'react-redux'

import { RootState } from 'store'

import { getSelectedCompositionTrackingRoomInfo } from 'models/compositions/selectors'
import type { SelectedCompositionTrackingRoomInfo } from 'models/compositions'

import { completeMagicEraserOnboarding, skipMagicEraserOnboarding } from 'models/ui/actions'
import MagicEraserTutorial from 'components/design/MagicEraserTutorial'
import { workflow } from 'utils/tracker'

interface MagicEraserTutorialContainerProps {
    skip: (completeTime: number) => void
    complete: (completeTime: number) => void
    trackingInfo: SelectedCompositionTrackingRoomInfo
}

const MagicEraserTutorialContainer = ({ skip, complete, trackingInfo }: MagicEraserTutorialContainerProps) => {
    useEffect(() => {
        workflow('DecorateRoom.MagicEraserOnboarding', trackingInfo)
    }, [])
    return <MagicEraserTutorial onSkip={() => skip(Date.now())} onComplete={() => complete(Date.now())} />
}

const mapStateToProps = (state: RootState) => ({
    trackingInfo: getSelectedCompositionTrackingRoomInfo(state),
})

const mapDispatchToProps = {
    skip: skipMagicEraserOnboarding,
    complete: completeMagicEraserOnboarding,
}

export default connect(mapStateToProps, mapDispatchToProps)(MagicEraserTutorialContainer)
