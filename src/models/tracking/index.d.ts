import { ROOM_SOURCE_OTHER, ROOM_SOURCE_STOCK, ROOM_SOURCE_USERCAPTURED } from 'models/tracking/constants'

interface OpenCompositionTrackingType {
    DesignName: string
    DesignId: string
    RoomId: string
    Position?: string | null
    RoomType?: string | null
}
export interface GATrackingInfoProps {
    category?: string
    action: string
    label: string | null
    custom?: Record<string, unknown>
}

export type RoomSourceType = typeof ROOM_SOURCE_OTHER | typeof ROOM_SOURCE_STOCK | typeof ROOM_SOURCE_USERCAPTURED

export default OpenCompositionTrackingType
