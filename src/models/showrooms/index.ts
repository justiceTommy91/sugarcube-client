import type { ValueOf } from 'utils/object'

import { FurnishingType, RoomType } from 'models/scenes/constants'
import { TAGS } from './constants'

export type Showroom = {
    id: number
    composition: string
    images: string[]
    thumbnail: string
    name: string
    roomShape: string | null
    roomSize: number | null
    roomType: RoomType
    scene: string
    subCatalog: string
    furnishingType: FurnishingType
    variantNames?: Record<string, string>
    sortOrder?: number
    tags: ValueOf<typeof TAGS>[]
}
