import { CampaignTrackingInfo } from 'templates/CampaignPage.types'

export interface BrandSectionData {
    type?: 'brand'
    id: string
    slug: string
    tracking: {
        onBrandClick: CampaignTrackingInfo
    }
}
