import { CampaignTrackingInfo } from 'templates/CampaignPage.types'
import { CampaignsKeys } from 'types/i18next'

export interface AppMobileButtonData {
    type?: 'appMobileButton'
    alt: string
    slug: string
    id: string
    text: CampaignsKeys
    buttonType: string
    mobileUrl: string
    tracking: {
        onButtonClick: CampaignTrackingInfo
    }
}
