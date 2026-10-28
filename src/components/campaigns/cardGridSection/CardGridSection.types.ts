import { CampaignsKeys } from 'types/i18next'

export interface CardGridItem {
    image: string
    alt: CampaignsKeys
    label: CampaignsKeys
    url: string
    mobileUrl: string
    backgroundColor?: string
    tracking: {
        onCardClick: {
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

export interface CardGridSectionData {
    type: 'cardGrid'
    id: string
    slug: string
    title: CampaignsKeys
    subtitle: CampaignsKeys
    tracking: {
        onCardGridScrollPast: {
            mixPanel: {
                section: string
            }
        }
    }
    cards: CardGridItem[]
}
