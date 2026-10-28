import { Cta } from 'templates/CampaignPage.types'
import { CampaignsKeys } from 'types/i18next'

export interface BannerPromoSectionData {
    type: 'bannerPromo'
    slug: string
    id: string
    title: CampaignsKeys
    body: CampaignsKeys
    image: string
    alt: CampaignsKeys
    cta: Cta
    hideCta: boolean | null
    mobileOnly: boolean | null
    tracking: {
        onBannerPromoScrollPast: {
            mixPanel: {
                section: string
            }
        }
        onBannerPromoCardClick: {
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
    }
}
