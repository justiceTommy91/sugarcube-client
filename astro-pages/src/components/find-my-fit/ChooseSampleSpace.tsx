import React from 'react'
import { getRefParamFragment } from '@astro-hooks/useReferrer'
import { useTranslation } from 'react-i18next'
import type { APIScene } from 'models/scenes'
import './ChooseSampleSpace.scss'

interface Props {
    scenes: (APIScene | null)[]
}

const ChooseSampleSpace = ({ scenes }: Props) => {
    const { t } = useTranslation('find-my-fit')
    return (
    <div className="ChooseSampleSpace">
        <h3 className="chooseSampleTitle">{t('find-my-fit.chooseSample.title')}</h3>
        {scenes.map((scene, index) => {
            const sceneName = t(`find-my-fit.chooseSample.scene_${index}`)
            const thumbUrl = scene?.thumbnails?.url || ''
            return (
                <button
                    key={scene?.uuid ?? index}
                    onClick={() => scene && (window.location.href = `${window.location.pathname.replace(/\/?$/, '/')}viewer/?sceneId=${scene.uuid}${getRefParamFragment()}`)}
                    className="sceneOpenButton"
                >
                    <img src={thumbUrl} alt={sceneName} className="sceneImage" />
                    <p className="sceneName">{sceneName}</p>
                </button>
            )
        })}
    </div>
    )
}

export default ChooseSampleSpace
