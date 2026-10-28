import React from 'react'
import { graphql, navigate } from 'gatsby'

import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'

import { BrandSectionData } from './BrandSection.types'
import './BrandSection.scss'

export const BrandSection: React.FC<BrandSectionData> = ({ id, tracking }) => {
    const { t } = useTranslation()

    const onBrandClick = () => {
        click(tracking?.onBrandClick.mixPanel.eventName, tracking?.onBrandClick.mixPanel.metadata)

        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: tracking?.onBrandClick?.ga.action,
            label: tracking?.onBrandClick?.ga.label,
            custom: tracking?.onBrandClick?.ga.custom,
        })
        navigate('/')
    }

    return (
        <div className="BrandSection" onClick={onBrandClick} id={id}>
            <SSRIcon className="paintBrushIcon" paths={paintbrush} color="000" />
            {t('design.ikea kreativ')}
        </div>
    )
}

export const BrandFragment = graphql`
    fragment BrandFragment on CampaignsJsonSections {
        type
        id
        tracking
    }
`
