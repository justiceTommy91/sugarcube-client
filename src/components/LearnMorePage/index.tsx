import React from 'react'

import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'

import { useFlags } from 'hooks'
import LearnMore from './LearnMore'
import LearnMoreV2 from './LearnMoreV2'

const LearnMoreContainer = () => {
    const { flags, status } = useFlags()
    const isMorpheusEnabled = flags.Morpheus

    if (status === 'pending') {
        return <BouncingBallLoader />
    }

    if (isMorpheusEnabled) {
        return <LearnMoreV2 />
    }

    return <LearnMore />
}

export default LearnMoreContainer
