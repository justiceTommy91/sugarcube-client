import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'gatsby'
import { StaticImage } from 'gatsby-plugin-image'

import Button from '@ingka/button'
import { getAppStoreUrl } from 'utils/buildUrls'
import { APP_STORE_SOURCE_MOBILE_DESIGN } from 'models/tracking/constants'

require('./MobileDesignPage.scss')

const appStoreLink = getAppStoreUrl({ source: APP_STORE_SOURCE_MOBILE_DESIGN })

const MobileDesignPage = () => {
    const { t } = useTranslation(['translation', 'dashboard'])
    return (
        <div className="MobileDesignPage">
            <StaticImage
                layout="constrained"
                width={240}
                src="../../../static/images/graphics/sad_bear.jpg"
                loading="eager"
                alt=""
            />

            <h1>{t("mobile.you're one step")}</h1>
            <p>{t('mobile.it looks like')}</p>

            <Button
                href={appStoreLink}
                type="primary"
                text={t('dashboard:dashboard.get ikea app')}
                className="cta"
                expandedOnTouchDevice
            />
            <Link className="learnMoreLink" to="/learnmore">
                {t('mobile.learn more about IKEA Kreativ')}
            </Link>
        </div>
    )
}
export default MobileDesignPage
