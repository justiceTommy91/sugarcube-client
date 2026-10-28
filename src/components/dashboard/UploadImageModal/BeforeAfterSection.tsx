import React from 'react'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'
import { KREATIV_LITE_ASSETS } from './constants'

require('./BeforeAfterSection.scss')

const BeforeAfterSection: React.FC = () => {
    const { t } = useTranslation()
    return (
        <div className="BeforeAfterSection">
            <h3>{t('design.kreativLite.beforeAfter.heading')}</h3>
            <div className="BeforeAfterSection__images-container">
                <div className="BeforeAfterSection__image-pair-container">
                    <div className="BeforeAfterSection__image-wrapper">
                        <img
                            src={withPrefix(KREATIV_LITE_ASSETS.roomOneBefore)}
                            alt=""
                            className="BeforeAfterSection__transition-image BeforeAfterSection__transition-image--room-one"
                        />
                        <img
                            src={withPrefix(KREATIV_LITE_ASSETS.roomTwoBefore)}
                            alt=""
                            className="BeforeAfterSection__transition-image BeforeAfterSection__transition-image--room-two"
                        />
                        <img
                            src={withPrefix(KREATIV_LITE_ASSETS.roomThreeBefore)}
                            alt=""
                            className="BeforeAfterSection__transition-image BeforeAfterSection__transition-image--room-three"
                        />
                    </div>
                    <div className="BeforeAfterSection__image-wrapper">
                        <img
                            src={withPrefix(KREATIV_LITE_ASSETS.roomOneAfter)}
                            alt=""
                            className="BeforeAfterSection__transition-image BeforeAfterSection__transition-image--room-one"
                        />
                        <img
                            src={withPrefix(KREATIV_LITE_ASSETS.roomTwoAfter)}
                            alt=""
                            className="BeforeAfterSection__transition-image BeforeAfterSection__transition-image--room-two"
                        />
                        <img
                            src={withPrefix(KREATIV_LITE_ASSETS.roomThreeAfter)}
                            alt=""
                            className="BeforeAfterSection__transition-image BeforeAfterSection__transition-image--room-three"
                        />
                    </div>
                </div>
                <div className="BeforeAfterSection__background-strip" />
            </div>
        </div>
    )
}

export default BeforeAfterSection
