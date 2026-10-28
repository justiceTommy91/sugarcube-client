import React from 'react'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import './Hero.scss'

export const Hero: React.FunctionComponent = () => {
    const { t } = useTranslation(['translation', 'dashboard'])

    return (
        <div className="Hero">
            <picture className="Hero__background-picture">
                <source
                    media="(min-width: 37.5em)"
                    srcSet={withPrefix('/images/kreativLite/mobile/heroBackground.webp')}
                />
                <img
                    src={withPrefix('/images/kreativLite/mobile/heroBackgroundSmall.webp')}
                    alt=""
                    aria-hidden="true"
                    className="Hero__background-image"
                    loading="eager"
                />
            </picture>
            <div className="Hero__text-container">
                <div className="Hero__title">
                    <SSRIcon className="paintBrushIcon" paths={paintbrush} color="000" />
                    {t('design.ikea kreativ')}
                </div>
                <div className="Hero__heading">
                    {t('dashboard:dashboard.try kreativ lite')}
                </div>
            </div>
        </div>
    )
}
