import React from 'react'
import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'

import { ACCESS_FROM_HERO, GA_ACTION_HERO } from 'models/tracking/constants'

import { LearnMoreButton } from './LearnMoreButton'

require('./ReturnUserHero.scss')

export const ReturnUserHero: React.FunctionComponent = () => {
    const { t } = useTranslation('dashboard')
    return (
        <div className="ReturnUserHero">
            <div className="heroContainer">
                <div className="heroTitleLoggedIn">
                    <SSRIcon className="paintBrushIcon" paths={paintbrush} />
                    {t('dashboard.ikea kreativ')}
                </div>
                <h1 className="heroTagline">{t('dashboard.bring your ideal')}</h1>
                <LearnMoreButton type="image-overlay" track={{ action: GA_ACTION_HERO, from: ACCESS_FROM_HERO }} />
            </div>
        </div>
    )
}
