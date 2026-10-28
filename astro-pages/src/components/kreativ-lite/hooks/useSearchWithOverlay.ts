import { useState, useCallback } from 'react'
import type { RoomType } from '@gatsby/models/scenes/constants'
import { useKreativLiteSearch } from './useKreativLiteSearch'

/**
 * Combines the furniture search hook with overlay open/close state and the
 * commit handler that wires them together. Consumers get a single object with
 * all search + overlay concerns resolved.
 */
export function useSearchWithOverlay(roomType?: RoomType) {
    const searchHook = useKreativLiteSearch(roomType)
    const [overlayOpen, setOverlayOpen] = useState(false)

    const { search, setInputValue, clearSearch, autocomplete, fetchNextPage, ...rest } = searchHook

    const handleCommit = useCallback(
        (query: string) => {
            setInputValue(query)
            search(query)
            setOverlayOpen(false)
        },
        [search, setInputValue],
    )

    const handleOpenOverlay = useCallback(() => setOverlayOpen(true), [])
    const handleCloseOverlay = useCallback(() => setOverlayOpen(false), [])

    return {
        ...rest,
        overlayOpen,
        onOpenOverlay: handleOpenOverlay,
        onCloseOverlay: handleCloseOverlay,
        onCommit: handleCommit,
        // Renamed to match SearchDrawerProps event-handler naming convention
        onClearSearch: clearSearch,
        onAutocomplete: autocomplete,
        onFetchNextPage: fetchNextPage,
    }
}
