import SSRIcon from '@ingka/ssr-icon'
import React from 'react'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import camera from '@ingka/ssr-icon/paths/camera'
import shareNetwork from '@ingka/ssr-icon/paths/share-network'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from 'hooks'
import { getDesignsCount, getUserCompositionsData, getIsCompositionDataLoadedRaw } from 'models/compositions/selectors'
import { getUserSceneItems, getAreScenesDataLoaded } from 'models/scenes/selectors'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'

require('./AchievementBanner.scss')

interface Props {
    hasLongString: boolean
}

const AchievementBanner = ({ hasLongString }: Props) => {
    const userCompositions = useAppSelector(getUserCompositionsData)
    const userScenes = useAppSelector(getUserSceneItems)
    const designsCount = useAppSelector(getDesignsCount)
    const isCompositionDataLoaded = useAppSelector(getIsCompositionDataLoadedRaw)
    const isSceneDataLoaded = useAppSelector(getAreScenesDataLoaded)

    const sharedDesigns = userCompositions.reduce((acc, design) => acc + +design.isShared, 0)

    const { t } = useTranslation('dashboard')

    return (
        <div className={classNames('AchievementBanner', { hasLongString })}>
            <div className="achievementCard">
                <div className={classNames('achievementTitle', { hasLongString })}>
                    <SSRIcon paths={paintbrush} className="achievementIcon" />
                    {t('dashboard.saved designs')}
                </div>

                <div className="numberAchieved">{isCompositionDataLoaded ? designsCount : <BouncingBallLoader />}</div>
            </div>
            <div className="achievementCard">
                <div className={classNames('achievementTitle', { hasLongString })}>
                    <SSRIcon paths={camera} className="achievementIcon" />
                    {t('dashboard.room scans')}
                </div>

                <div className="numberAchieved">{isSceneDataLoaded ? userScenes.length : <BouncingBallLoader />}</div>
            </div>
            <div className="achievementCard lastCard">
                <div className={classNames('achievementTitle', { hasLongString })}>
                    <SSRIcon paths={shareNetwork} className="achievementIcon" />
                    {t('dashboard.shared designs')}
                </div>

                <div className="numberAchieved">{isCompositionDataLoaded ? sharedDesigns : <BouncingBallLoader />}</div>
            </div>
        </div>
    )
}

export default AchievementBanner
