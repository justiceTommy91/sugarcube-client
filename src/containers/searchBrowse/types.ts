import { ValueOf } from 'utils/object'

import { Showroom } from 'models/showrooms'
import { TAGS } from 'models/showrooms/constants'

export type SearchBrowseShowroom = {
    compositionId: string
    sceneId: string
    name: string
    thumbnail: string
}

export type SearchBrowseItem = {
    category?: string
    categoryName?: SearchBrowseCategories
    subcategoryId?: string
    image?: string
    mobileHeader?: SearchBrowseMobileHeaders
    mobileSubHeader?: SearchBrowseMobileHeaders
    tag?: ValueOf<typeof TAGS>
    showrooms: Showroom[]
}

export const BEDS = 'beds'
export const BOOKCASES = 'bookcases'
export const DESK = 'desk'
export const DESKS = 'desks'
export const DRESSERS = 'dressers'
export const ITEMS = 'items'
export const STORAGE_SHELVES = 'storage shelves'

export type SearchBrowseCategories =
    | typeof BEDS
    | typeof BOOKCASES
    | typeof DESK
    | typeof DESKS
    | typeof DRESSERS
    | typeof ITEMS
    | typeof STORAGE_SHELVES

/* eslint-disable i18next/no-literal-string */
export const HEADER_1 = 'header1'
export const HEADER_2 = 'header2'
export const HEADER_3 = 'header3'
export const HEADER_4 = 'header4'
export const HEADER_5 = 'header5'
export const HEADER_6 = 'header6'
export const SUB_HEADER_1 = 'subheader1'
export const SUB_HEADER_2 = 'subheader2'
export const SUB_HEADER_3 = 'subheader3'
export const SUB_HEADER_4 = 'subheader4'
export const SUB_HEADER_5 = 'subheader5'
export const SUB_HEADER_6 = 'subheader6'
/* eslint-disable i18next/no-literal-string */

export type SearchBrowseMobileHeaders =
    | typeof HEADER_1
    | typeof HEADER_2
    | typeof HEADER_3
    | typeof HEADER_4
    | typeof HEADER_5
    | typeof HEADER_6
    | typeof SUB_HEADER_1
    | typeof SUB_HEADER_2
    | typeof SUB_HEADER_3
    | typeof SUB_HEADER_4
    | typeof SUB_HEADER_5
    | typeof SUB_HEADER_6
