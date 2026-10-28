import { Cta } from 'templates/CampaignPage.types'
import { CampaignsKeys } from 'types/i18next'

interface TipCard {
    image: string
    title: CampaignsKeys
    body: CampaignsKeys
    alt: CampaignsKeys
}

export interface TipsSectionData {
    type: 'tips'
    slug: string
    id: string
    title: CampaignsKeys
    cta: Cta
    blogLink: string
    firstCard: TipCard
    secondCard: TipCard
    tracking: {
        onTipsScrollPast: {
            mixPanel: {
                section: string
            }
        }
        onTipsClick: {
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
