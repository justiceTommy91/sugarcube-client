import React from 'react'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import bookmark from '@ingka/ssr-icon/paths/bookmark'
import { getLocale } from 'models/location/selectors'
import type { AllowedUpptackaLocales } from 'models/upptacka/types'
import { useAppSelector } from 'hooks'
import * as compositionSelectors from 'models/compositions/selectors'
import { getUpptackaDesignTipsData } from './utils'

require('./UpptackaDesignTipsDescription.scss')

interface Props {
    activeSlide: number
}

export const UpptackaDesignTipsDescription = ({ activeSlide }: Props) => {
    const { t } = useTranslation()
    const locale = getLocale() as AllowedUpptackaLocales
    const compositionId = useAppSelector(compositionSelectors.getSelectedCompositionId)
    const designTipsData = getUpptackaDesignTipsData(compositionId)
    const { position, carouselImages, subtitle, title } = designTipsData[activeSlide]

    return (
        <div
            className={classNames('UpptackaDesignTipsDescription', {
                leftAligned: position === 'left',
            })}
        >
            <div className="UpptackaDesignTipsDescription__header">
                <div className="UpptackaDesignTipsDescription__badge">
                    <SSRIcon paths={bookmark} />
                    <span>{t('upptacka.design tips.title')}</span>
                </div>
                <span className="UpptackaDesignTipsDescription__slide-indicator">
                    0{activeSlide + 1}/0{designTipsData.length}
                </span>
            </div>
            <h4>{title[locale]}</h4>
            <span>{subtitle[locale]}</span>
            <div className="UpptackaDesignTipsDescription__gallery">
                {carouselImages.map((image) => (
                    // empty alt text as we don't have relevant translated text to use as alt
                    <img src={withPrefix(image)} alt="" width={226} height={280} />
                ))}
            </div>
        </div>
    )
}
