import React from 'react'
import { useTranslation } from 'react-i18next'
import { withPrefix } from 'gatsby'

import { getLocale } from 'models/location/selectors'
import type { LowPerformanceCause } from 'models/renderer/constants'

import { getSupportPageUrl } from 'utils/buildUrls'

require('./LowPerformanceModal.scss')

export type LowPerformanceModalProps = {
    cause: LowPerformanceCause
}

const LowPerformanceModal: React.FunctionComponent<LowPerformanceModalProps> = ({ cause }) => {
    const { t } = useTranslation()
    const locale = getLocale()

    let headerText = ''
    let bodyText = t('common.errMessage')
    let articleUrl = ''
    if (cause === 'low-performance-device') {
        headerText = t('common.low performance header')
        bodyText = t('common.low performance body')
        articleUrl = getSupportPageUrl(locale, '360052559294')
    } else if (cause === 'low-graphics-memory' || cause === 'too-many-context-losses') {
        headerText = t('common.many ctx losses header')
        bodyText = t('common.many ctx losses body')
        articleUrl = getSupportPageUrl(locale, '6825975614103')
    }

    return (
        <div className="LowPerformanceModal">
            <div className="content">
                <img src={withPrefix('/images/graphics/sad_bear.jpg')} alt="" />
                <div className="header">{headerText}</div>
                <div className="body">{bodyText}</div>
                <a href={articleUrl} target="_blank" rel="noopener noreferrer">
                    {t('common.learn more')}
                </a>
            </div>
        </div>
    )
}

export default LowPerformanceModal
