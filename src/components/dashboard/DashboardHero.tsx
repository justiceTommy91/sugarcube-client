import React from 'react'
import { getSeenDashboard } from 'models/ui/selectors'
import { useAppSelector } from 'hooks'
import { ReturnUserHero } from './ReturnUserHero'
import { VideoHeroV2 } from './VideoHeroV2'

export const DashboardHero = () => {
    const hasSeenDashboard = useAppSelector<boolean>(getSeenDashboard)
    if (hasSeenDashboard) {
        return <ReturnUserHero />
    }
    return <VideoHeroV2 />
}
