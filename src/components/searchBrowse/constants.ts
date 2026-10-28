import { SearchBrowseItem } from 'containers/searchBrowse/types'
import { TAGS } from 'models/showrooms/constants'

export type NewSearchBrowseItem = Omit<SearchBrowseItem, 'image'> & {
    images?: string[]
}

export const SEARCH_BROWSE_ITEMS = [
    {
        category: 'dressers',
        categoryName: 'dressers',
        subcategoryId: 'st004',
        images: [
            '/images/graphics/searchBrowse/bed-3.png',
            '/images/graphics/searchBrowse/dressers-2.png',
            '/images/graphics/searchBrowse/bed-2.png',
        ],
        mobileHeader: 'header6',
        mobileSubHeader: 'subheader6',
        tag: TAGS.SEARCHBROWSE_DRESSERS,
    },
    {
        category: 'beds',
        categoryName: 'beds',
        subcategoryId: 'bm003',
        images: [
            '/images/graphics/searchBrowse/bed-1.png',
            '/images/graphics/searchBrowse/bed-2.png',
            '/images/graphics/searchBrowse/bed-3.png',
        ],
        mobileHeader: 'header5',
        mobileSubHeader: 'subheader5',
        tag: TAGS.SEARCHBROWSE_BEDS,
    },
    {
        category: 'bookcases',
        categoryName: 'bookcases',
        subcategoryId: 'st002',
        images: [
            '/images/graphics/searchBrowse/bookcases-1.png',
            '/images/graphics/searchBrowse/bookcases-2.png',
            '/images/graphics/searchBrowse/bookcases-3.png',
        ],
        mobileHeader: 'header2',
        mobileSubHeader: 'subheader2',
        tag: TAGS.SEARCHBROWSE_BOOKCASES,
    },
    {
        category: 'shelves',
        categoryName: 'storage shelves',
        subcategoryId: 'st002',
        images: [
            '/images/graphics/searchBrowse/shelves-1.png',
            '/images/graphics/searchBrowse/shelves-2.png',
            '/images/graphics/searchBrowse/shelves-3.png',
        ],
        mobileHeader: 'header4',
        mobileSubHeader: 'subheader4',
        tag: TAGS.SEARCHBROWSE_SHELVES,
    },
    {
        category: 'desk-chair',
        categoryName: 'desk',
        subcategoryId: 'fu002',
        images: [
            '/images/graphics/searchBrowse/desk-chair-1.png',
            '/images/graphics/searchBrowse/desk-chair-2.png',
            '/images/graphics/searchBrowse/desk-chair-3.png',
        ],
        mobileHeader: 'header3',
        mobileSubHeader: 'subheader3',
        tag: TAGS.SEARCHBROWSE_DESK_CHAIR,
    },
    {
        category: 'desk-table',
        categoryName: 'desks',
        subcategoryId: 'fu004',
        images: [
            '/images/graphics/searchBrowse/desk-table-1.png',
            '/images/graphics/searchBrowse/desk-table-2.png',
            '/images/graphics/searchBrowse/desk-table-3.png',
        ],
        mobileHeader: 'header1',
        mobileSubHeader: 'subheader1',
        tag: TAGS.SEARCHBROWSE_DESK_TABLE,
    },
] satisfies Omit<NewSearchBrowseItem, 'showrooms'>[]
