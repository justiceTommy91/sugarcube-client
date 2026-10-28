import React from 'react'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'
import { KREATIV_LITE_ASSETS } from './constants'

require('./FeatureCardsSection.scss')

const FeatureCardsSection: React.FC = () => {
    const { t } = useTranslation()
    return (
        <div className="FeatureCardsSection">
            <div className="FeatureCardsSection__cards-grid">
                <div className="FeatureCardsSection__card FeatureCardsSection__card--text">
                    <h3>{t('design.kreativLite.features.heading')}</h3>
                    <p>{t('design.kreativLite.features.description')}</p>
                </div>
                <div className="FeatureCardsSection__card">
                    <img
                        src={withPrefix(KREATIV_LITE_ASSETS.featuredFirst)}
                        alt=""
                        className="FeatureCardsSection__card-image"
                    />
                    <p className="FeatureCardsSection__card-caption">{t('design.kreativLite.features.card one caption')}</p>
                </div>
                <div className="FeatureCardsSection__card">
                    <img
                        src={withPrefix(KREATIV_LITE_ASSETS.featuredSecond)}
                        alt=""
                        className="FeatureCardsSection__card-image"
                    />
                    <p className="FeatureCardsSection__card-caption">{t('design.kreativLite.features.card two caption')}</p>
                </div>
                <div className="FeatureCardsSection__card">
                    <img
                        src={withPrefix(KREATIV_LITE_ASSETS.featuredThird)}
                        alt=""
                        className="FeatureCardsSection__card-image"
                    />
                    <p className="FeatureCardsSection__card-caption">{t('design.kreativLite.features.card three caption')}</p>
                </div>
            </div>
        </div>
    )
}

export default FeatureCardsSection
