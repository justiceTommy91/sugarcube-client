import { CampaignsKeys } from 'types/i18next'

export enum FeatureGridActions {
    OPEN_ROOM = 'open-room',
    OPEN_ROOM_BUILDER = 'open-room-builder',
    OPEN_QR_MODAL = 'open-qr-modal',
}

export interface FeatureGridCard {
    image: string
    alt: CampaignsKeys
    action: FeatureGridActions
    title: CampaignsKeys
    subtitle: CampaignsKeys
    url: string
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

export interface FeatureGridSectionData {
    type: 'featureGrid'
    id: string
    slug: string
    title: CampaignsKeys
    cards: FeatureGridCard[]
    tracking: {
        onFeatureGridScrollPast: {
            mixPanel: {
                section: string
            }
        }
    }
}
