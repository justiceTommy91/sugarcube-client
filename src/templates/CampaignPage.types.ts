import type { HeroSectionData } from 'components/campaigns/heroSection'
import type { ProductGridSectionData } from 'components/campaigns/productGridSection'
import type { FeatureGridSectionData } from 'components/campaigns/featureGridSection'
import type { CardGridSectionData } from 'components/campaigns/cardGridSection'
import type { BannerPromoSectionData } from 'components/campaigns/bannerPromoSection'
import type { TipsSectionData } from 'components/campaigns/tipsSection'
import type { SocialCarouselSectionData } from 'components/campaigns/socialCarouselSection'
import type { BrandSectionData } from 'components/campaigns/brandSection'
import type { AppMobileButtonData } from 'components/campaigns/appMobileButton'

import { CampaignsKeys } from 'types/i18next'

export type Cta = {
    text: {
        web: CampaignsKeys
        mobile: CampaignsKeys
    }
    url: string
    mobileUrl?: string
}

export type CampaignTrackingInfo = {
    mixPanel: {
        eventName: string
        metadata: Record<string, string>
    }
    ga: {
        action: string
        label: string
        custom: Record<string, string>
    }
}

export type Section =
    | HeroSectionData
    | ProductGridSectionData
    | CardGridSectionData
    | FeatureGridSectionData
    | BannerPromoSectionData
    | TipsSectionData
    | SocialCarouselSectionData
    | BrandSectionData
    | AppMobileButtonData

export type CampaignPageData = {
    campaignsJson: {
        allowedLocales: string[]
        slug: string
        defaultLocale: string
        uuidMap: Record<string, Record<string, string>>
        rawSections: Section[]
        heroSection?: HeroSectionData
        productGridSection?: ProductGridSectionData
        cardGridSection?: CardGridSectionData
        featureGridSection?: FeatureGridSectionData
        bannerPromoSection?: BannerPromoSectionData
        tipsSection?: TipsSectionData
        socialCarouselSection?: SocialCarouselSectionData
        brandSection?: BrandSectionData
        appMobileButtonSection: AppMobileButtonData
    }
}
