import { useState, useRef, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { RoomType } from '@gatsby/models/scenes/constants'
import type { SocketSet } from '@gatsby/models/furniture'
import { getSearchCompletions } from '@gatsby/services/searchCompletions'
import { getRegion } from '@lib/url-utils'
import { fetchFurnitureSearch, fetchFurnitureDefault } from '../../../services/kreativLiteFurnitureService'
import { normalizeFurnitureItem } from '../utils/normalizeFurnitureItem'
import type { FurnitureApiProduct } from '../../../services/kreativLiteFurnitureService'

const MIN_AUTOCOMPLETE_LENGTH = 3
const DEFAULT_FURNITURE_STALE_TIME = 5 * 60 * 1000
const FURNITURE_DEFAULT_QUERY_KEY = 'furniture-default'

export interface FurnitureSearchItem {
    id: number | string
    modelUrl: string
    globalProductId?: string
    name: string
    description?: string
    priceNumeral?: string | number
    thumbUrl?: string
    min?: { x: number; y: number; z: number }
    max?: { x: number; y: number; z: number }
    scale?: number
    rotX?: number
    heading?: number
    isRug?: boolean
    stacks?: boolean
    hasTallLegs?: boolean
    isCubicStructure?: boolean
    uncompressedModelSize?: number
    placingBehavior?: string
    placeables?: unknown
    metadata?: unknown
    isSupportedAutodecorate?: boolean
    localItemNumber?: string
    combinablesDefaultSocketSet?: string
    combinablesSocketSets?: SocketSet[]
    [key: string]: unknown
}

export interface UseKreativLiteSearchResult {
    /** The last committed search query (shown in the drawer search button). */
    query: string
    /** Live input value driving autocomplete. */
    inputValue: string
    setInputValue: (value: string) => void
    /** Autocomplete suggestions (populated when inputValue.length >= 3). */
    completions: string[]
    completionsLoading: boolean
    /** Committed search results. */
    results: FurnitureSearchItem[]
    /** Whether a search fetch is in flight. */
    isSearching: boolean
    hasMore: boolean
    /**
     * Accumulated map of combinable default products (duvet, pillow, mattress, etc.) keyed by
     * their id. The Morpheus API returns these at the response level for list-style endpoints;
     * this mirrors what Gatsby's processCombinables() wrapper does for the Redux furniture store.
     */
    combinablesDefaultProductsById: Map<string, FurnitureApiProduct>
    /** Fire a search for the given query, replacing current results. */
    search: (query: string) => Promise<void>
    /** Load the next page of results and append. */
    fetchNextPage: () => Promise<void>
    /** Fetch autocomplete suggestions for the given input. */
    autocomplete: (value: string) => Promise<void>
    clearCompletions: () => void
    clearSearch: () => void
}

export const useKreativLiteSearch = (roomType?: RoomType): UseKreativLiteSearchResult => {
    const [query, setQuery] = useState('')
    const [inputValue, setInputValue] = useState('')
    const [completions, setCompletions] = useState<string[]>([])
    const [completionsLoading, setCompletionsLoading] = useState(false)

    // Manual state for search mode results (search mode only; default mode reads from the query cache).
    const [searchResults, setSearchResults] = useState<FurnitureSearchItem[]>([])
    const [searchCombinables, setSearchCombinables] = useState<Map<string, FurnitureApiProduct>>(new Map())
    const [isSearchModeLoading, setIsSearchModeLoading] = useState(false)
    const [searchHasMore, setSearchHasMore] = useState(false)

    // Tracks the last query that returned results — used to skip redundant re-fetches.
    const lastSuccessfulQueryRef = useRef('')

    // Token for the next page of search results (null = no more pages).
    const moreTokenRef = useRef<string | null>(null)

    // Stable region for the query key — reads from the URL which doesn't change.
    const region = getRegion()

    // Cache all pages of default furniture by room type.
    // Enabled once roomType is known (scene loaded); staleTime prevents refetches within a session.
    const defaultFurnitureQuery = useInfiniteQuery({
        queryKey: [FURNITURE_DEFAULT_QUERY_KEY, region, roomType],
        queryFn: ({ pageParam }: { pageParam: number }) => fetchFurnitureDefault(region, roomType, pageParam),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage.hasMore) return undefined
            return allPages.reduce((sum, page) => sum + page.items.length, 0)
        },
        enabled: roomType !== undefined,
        staleTime: DEFAULT_FURNITURE_STALE_TIME,
    })

    // Derive flat results and combinables map from all cached default pages.
    const defaultResults = useMemo(
        () => defaultFurnitureQuery.data?.pages.flatMap((page) => page.items.map(normalizeFurnitureItem)) ?? [],
        [defaultFurnitureQuery.data],
    )

    const defaultCombinables = useMemo(() => {
        const map = new Map<string, FurnitureApiProduct>()
        defaultFurnitureQuery.data?.pages.forEach((page) =>
            page.combinablesDefaultProducts.forEach((p) => map.set(String(p.id), p)),
        )
        return map
    }, [defaultFurnitureQuery.data])

    const isDefaultMode = query === ''

    // Unified view: pick from either default query cache or manual search state based on mode.
    const results = isDefaultMode ? defaultResults : searchResults
    const hasMore = isDefaultMode ? defaultFurnitureQuery.hasNextPage : searchHasMore
    const isSearching = isDefaultMode ? defaultFurnitureQuery.isFetching : isSearchModeLoading
    const combinablesDefaultProductsById = isDefaultMode ? defaultCombinables : searchCombinables

    const mergeCombinables = (incoming: FurnitureApiProduct[]) => {
        if (incoming.length === 0) return
        setSearchCombinables((prev) => {
            const next = new Map(prev)
            incoming.forEach((p) => next.set(String(p.id), p))
            return next
        })
    }

    const search = async (q: string) => {
        const trimmed = q.trim()
        setQuery(trimmed)

        if (!trimmed) {
            // Back to default mode — query cache restores results instantly, no fetch needed.
            moreTokenRef.current = null
            lastSuccessfulQueryRef.current = ''
            setSearchResults([])
            setSearchCombinables(new Map())
            return
        }

        // Skip fetch if this query already has results loaded.
        if (trimmed === lastSuccessfulQueryRef.current) return

        moreTokenRef.current = null
        setSearchResults([])
        setSearchHasMore(false)
        setIsSearchModeLoading(true)
        try {
            const { items, moreToken, combinablesDefaultProducts } = await fetchFurnitureSearch(trimmed, region)
            setSearchResults(items.map(normalizeFurnitureItem))
            moreTokenRef.current = moreToken
            setSearchHasMore(!!moreToken)
            lastSuccessfulQueryRef.current = trimmed
            setSearchCombinables(new Map(combinablesDefaultProducts.map((p) => [String(p.id), p])))
        } catch {
            // Silently fail — drawer just shows empty results
        } finally {
            setIsSearchModeLoading(false)
        }
    }

    const fetchNextPage = async () => {
        if (isDefaultMode) {
            await defaultFurnitureQuery.fetchNextPage()
        } else {
            // Search mode: token-based pagination.
            const token = moreTokenRef.current
            if (!token) return

            setIsSearchModeLoading(true)
            try {
                const { items, moreToken, combinablesDefaultProducts } = await fetchFurnitureSearch(
                    query,
                    region,
                    token,
                )
                setSearchResults((prev) => [...prev, ...items.map(normalizeFurnitureItem)])
                moreTokenRef.current = moreToken
                setSearchHasMore(!!moreToken)
                mergeCombinables(combinablesDefaultProducts)
            } catch {
                // Silently fail — keep existing results
            } finally {
                setIsSearchModeLoading(false)
            }
        }
    }

    const autocomplete = async (value: string) => {
        if (value.length < MIN_AUTOCOMPLETE_LENGTH) {
            setCompletions([])
            return
        }
        setCompletionsLoading(true)
        try {
            const response = await getSearchCompletions(value)
            const { universal = [] } = response.data.searchBox
            const texts = universal.reduce<string[]>((acc, item) => {
                if ('completion' in item) acc.push(item.completion.text)
                return acc
            }, [])
            setCompletions(texts)
        } catch {
            setCompletions([])
        } finally {
            setCompletionsLoading(false)
        }
    }

    const clearCompletions = () => setCompletions([])

    const clearSearch = () => {
        setQuery('')
        setInputValue('')
        setCompletions([])
        setSearchResults([])
        setSearchCombinables(new Map())
        lastSuccessfulQueryRef.current = ''
        moreTokenRef.current = null
    }

    return {
        query,
        inputValue,
        setInputValue,
        completions,
        completionsLoading,
        results,
        isSearching,
        hasMore,
        combinablesDefaultProductsById,
        search,
        fetchNextPage,
        autocomplete,
        clearCompletions,
        clearSearch,
    }
}
