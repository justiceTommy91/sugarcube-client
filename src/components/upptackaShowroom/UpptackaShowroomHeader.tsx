import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import { getLocale } from 'models/location/selectors'
import SSRIcon from '@ingka/ssr-icon'
import duvetDouble from '@ingka/ssr-icon/paths/duvet-double'
import ruler from '@ingka/ssr-icon/paths/ruler'
import { getUpptackaShowroomData } from './utils'

require('./UpptackaShowroomHeader.scss')

export const UpptackaShowroomHeader = () => {
    const { t } = useTranslation()
    const { title, subtitle, dimensions, occupancy } = getUpptackaShowroomData(getLocale())

    return (
        <div className="UpptackaShowroomHeader">
            <Button
                className="UpptackaShowroomHeader__back-button"
                iconOnly
                ssrIcon={arrowLeft}
                type="primary"
                inverseTheme
                onClick={() => window.parent.postMessage(`upptacka_close_iframe`, '*')}
                text={t('aria.exit')}
            />
            <div className="UpptackaShowroomHeader__heading-container">
                <div className="UpptackaShowroomHeader__title-container">
                    <h1>{title}</h1>
                    <span>{subtitle}</span>
                    <div className="UpptackaShowroomHeader__badges-container">
                        <span className="UpptackaShowroomHeader__dimensions">
                            <SSRIcon paths={ruler} />
                            {dimensions}
                        </span>
                        <span className="UpptackaShowroomHeader__occupancy">
                            <SSRIcon paths={duvetDouble} />
                            {occupancy}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
