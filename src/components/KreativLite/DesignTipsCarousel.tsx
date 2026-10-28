import React from 'react'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'
import { KREATIV_LITE_ASSETS } from 'components/dashboard/UploadImageModal/constants'
import './DesignTipsCarousel.scss'

export const DesignTipsCarousel: React.FC = () => {
    const { t } = useTranslation()
    return (
        <div className="DesignTipsCarousel">
            <div className="DesignTipsCarousel__content">
                <h2>{t('design.kreativLite.tips.header')}</h2>
                <div className="DesignTipsCarousel__slides">
                    <div className="DesignTipsCarousel__image-container">
                        <img
                            src={withPrefix(KREATIV_LITE_ASSETS.tipOne)}
                            alt={t('design.kreativLite.tips.slide1.description')}
                            className="DesignTipsCarousel__image DesignTipsCarousel__image--slide-1"
                        />
                        <img
                            src={withPrefix(KREATIV_LITE_ASSETS.tipTwo)}
                            alt={t('design.kreativLite.tips.slide2.description')}
                            className="DesignTipsCarousel__image DesignTipsCarousel__image--slide-2"
                        />
                        <img
                            src={withPrefix(KREATIV_LITE_ASSETS.tipThree)}
                            alt={t('design.kreativLite.tips.slide3.description')}
                            className="DesignTipsCarousel__image DesignTipsCarousel__image--slide-3"
                        />
                    </div>
                    <div className="DesignTipsCarousel__text-container">
                        <div className="DesignTipsCarousel__text-content DesignTipsCarousel__text-content--slide-1">
                            <p className="DesignTipsCarousel__title">{t('design.kreativLite.tips.slide1.title')}</p>
                            <p className="DesignTipsCarousel__description">
                                {t('design.kreativLite.tips.slide1.description')}
                            </p>
                        </div>
                        <div className="DesignTipsCarousel__text-content DesignTipsCarousel__text-content--slide-2">
                            <p className="DesignTipsCarousel__title">{t('design.kreativLite.tips.slide2.title')}</p>
                            <p className="DesignTipsCarousel__description">
                                {t('design.kreativLite.tips.slide2.description')}
                            </p>
                        </div>
                        <div className="DesignTipsCarousel__text-content DesignTipsCarousel__text-content--slide-3">
                            <p className="DesignTipsCarousel__title">{t('design.kreativLite.tips.slide3.title')}</p>
                            <p className="DesignTipsCarousel__description">
                                {t('design.kreativLite.tips.slide3.description')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DesignTipsCarousel
