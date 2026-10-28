import { Cta, CampaignTrackingInfo } from 'templates/CampaignPage.types'
import { CampaignsKeys } from 'types/i18next'

export interface SocialCarouselPost {
    image: string
    alt: CampaignsKeys
    username: CampaignsKeys
    cta: Cta
    CompositionUuid: string
    tracking: {
        onPostUsernameClick: CampaignTrackingInfo
        onPostCardClick: CampaignTrackingInfo
    }
}

export interface SocialCarouselSectionData {
    type: 'socialCarousel'
    id: string
    slug: string
    title: CampaignsKeys
    subtitle: CampaignsKeys
    tracking: {
        onSocialSectionScrollPast: {
            mixPanel: {
                section: string
            }
        }
    }
    posts: SocialCarouselPost[]
}
