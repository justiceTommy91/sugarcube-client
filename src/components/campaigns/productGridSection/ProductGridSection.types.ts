import { Cta } from 'templates/CampaignPage.types'
import { CampaignsKeys } from 'types/i18next'

export interface ProductGridSectionData {
    type: 'productGrid'
    slug: string
    id: string
    title: CampaignsKeys
    body: CampaignsKeys
    image: string
    alt: CampaignsKeys
    cta: Cta
    tracking: {
        onProductGridButtonClick: {
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
        onHeroPlayPause: {
            mixPanel: {
                eventName: string
                metadata: Record<string, string>
            }
        }
        onProductGridScrollPast: {
            mixPanel: {
                section: string
            }
        }
    }
}
