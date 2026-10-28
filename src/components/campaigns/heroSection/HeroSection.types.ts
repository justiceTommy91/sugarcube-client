import { Cta } from 'templates/CampaignPage.types'
import { CampaignsKeys } from 'types/i18next'

export interface HeroSectionData {
    type: 'hero'
    slug: string
    id: string
    title: CampaignsKeys
    media: string
    alt: string
    poster: string
    backgroundColor?: string
    hideCta: boolean | null
    body: CampaignsKeys
    cta: Cta
    tracking: {
        onHeroCardClick: {
            mixPanel: {
                eventName: string
                metadata: Record<string, string>
            }
            ga: {
                action: string
                label: string
            }
        }
        onHeroPlayPause: {
            mixPanel: {
                eventName: string
                metadata: Record<string, string>
            }
        }
        onHeroScrollPast: {
            mixPanel: {
                section: string
            }
        }
    }
}
