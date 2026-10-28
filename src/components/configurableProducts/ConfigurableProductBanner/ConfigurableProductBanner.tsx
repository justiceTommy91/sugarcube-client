import React from 'react'
import { useTranslation } from 'react-i18next'
import { withPrefix } from 'gatsby'
import Button from '@ingka/button'
import Image from '@ingka/image'

import type { TranslationKeys } from 'types/i18next'
import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'

import type { ProductFamily } from '../constants'

require('./ConfigurableProductBanner.scss')

type ConfigurableProductBannerConfig = {
    title: TranslationKeys
    subtitle: TranslationKeys
    imageUrl: string
    imageAlt: TranslationKeys
    onCreateNew: () => void
    onAddSavedDesign: () => void
}

const useBannerConfig = (): Record<ProductFamily, ConfigurableProductBannerConfig> => {
    const { openPAXCustomizePanel, openPAXImportPanel } = useDesignSidebarContext()

    return {
        PAX: {
            title: 'configurableProducts.pax.banner.title' as TranslationKeys,
            subtitle: 'configurableProducts.pax.banner.subtitle' as TranslationKeys,
            imageUrl: '/images/graphics/pax_banner.png',
            imageAlt: 'configurableProducts.pax.banner.imageAlt' as TranslationKeys,
            onCreateNew: openPAXCustomizePanel,
            onAddSavedDesign: openPAXImportPanel,
        },
    }
}

type ConfigurableProductBannerProps = {
    productFamily: ProductFamily
}

export const ConfigurableProductBanner = ({ productFamily }: ConfigurableProductBannerProps): React.ReactElement => {
    const { t } = useTranslation()
    const bannerConfig = useBannerConfig()
    const config = bannerConfig[productFamily]

    return (
        <div className="ConfigurableProductBanner">
            <Image
                className="ConfigurableProductBanner__image"
                src={withPrefix(config.imageUrl)}
                alt={t(config.imageAlt) as unknown as string}
                width="96"
                height="96"
            />
            <div className="ConfigurableProductBanner__content">
                <div className="ConfigurableProductBanner__info">
                    <h3 className="ConfigurableProductBanner__title">{t(config.title)}</h3>
                    <p className="ConfigurableProductBanner__subtitle">{t(config.subtitle)}</p>
                </div>
                <div className="ConfigurableProductBanner__actions" >
                    <Button type="secondary" size="small" onClick={config.onCreateNew}>
                        {t('configurableProducts.banner.createNew')}
                    </Button>
                    <Button type="primary" size="small" onClick={config.onAddSavedDesign} className='ConfigurableProductBanner__expanded'>
                        {t('configurableProducts.banner.addSavedDesign')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
