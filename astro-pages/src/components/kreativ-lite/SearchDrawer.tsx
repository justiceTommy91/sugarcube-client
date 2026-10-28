import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import magnifyingGlass from '@ingka/ssr-icon/paths/magnifying-glass'
import crossSmall from '@ingka/ssr-icon/paths/cross-small'
import { useIsPlacementMode } from '@gatsby/Renderer/ui/hooks/useIsPlacementMode'
import { useStackableDraggingState } from '@gatsby/Renderer/ui/hooks/useStackableDraggingState'
import type { SceneInfo } from '@gatsby/Renderer/geomviewer/geom_types'
import { useAddFurnitureToScene } from './hooks/useAddFurnitureToScene'
import { useSceneContext } from './SceneContext'
import { SearchResultsGrid } from './SearchResultsGrid'
import { SearchOverlay } from './SearchOverlay'
import { BottomSheet, type BottomSheetHandle } from './BottomSheet'
import type { FurnitureSearchItem } from './hooks/useKreativLiteSearch'
import type { FurnitureApiProduct } from '../../services/kreativLiteFurnitureService'
import './SearchDrawer.scss'

/** Top position (px) when the drawer is fully expanded. */
const EXPANDED_TOP_PX = 56 // 3.5rem

/** How many px the drawer overlaps the canvas bottom edge (hides the border-radius seam). */
const CANVAS_OVERLAP_PX = 12

export interface SearchDrawerProps {
    /** Height (px) of the canvas area — determines the collapsed top position. */
    canvasHeight: number
    query: string
    inputValue: string
    completions: string[]
    results: FurnitureSearchItem[]
    isSearching: boolean
    hasMore: boolean
    combinablesDefaultProductsById: Map<string, FurnitureApiProduct>
    overlayOpen: boolean
    onOpenOverlay: () => void
    onCloseOverlay: () => void
    onClearSearch: () => void
    onAutocomplete: (value: string) => void
    onCommit: (query: string) => void
    onFetchNextPage: () => void
    scene: SceneInfo
    /** Called instead of adding an item when the user has reached the item limit. */
    onItemLimitReached?: () => void
    /** When true, tapping a search result calls onItemLimitReached instead of adding the item. */
    isAtLimit?: boolean
}

export const SearchDrawer = ({
    canvasHeight,
    query,
    inputValue,
    completions,
    results,
    isSearching,
    hasMore,
    combinablesDefaultProductsById,
    overlayOpen,
    onOpenOverlay,
    onCloseOverlay,
    onClearSearch,
    onAutocomplete,
    onCommit,
    onFetchNextPage,
    scene,
    onItemLimitReached,
    isAtLimit = false,
}: SearchDrawerProps) => {
    const { t } = useTranslation()
    const { tracker, scheduleCombinable, registerItemProduct } = useSceneContext()
    const { addItem } = useAddFurnitureToScene({ tracker, scheduleCombinable, scene })
    const [isAdding, setIsAdding] = useState(false)

    const collapsedTop = canvasHeight - CANVAS_OVERLAP_PX
    const expandedTop = EXPANDED_TOP_PX

    const sheetRef = useRef<BottomSheetHandle>(null)

    // Collapse the drawer when the user activates placement / stackable mode.
    const isPlacementMode = useIsPlacementMode()
    const { isStackableDragging } = useStackableDraggingState()
    useEffect(() => {
        if (isPlacementMode || isStackableDragging) sheetRef.current?.collapse()
    }, [isPlacementMode, isStackableDragging])

    // Scroll the results container back to the top whenever the user clears their search.
    useEffect(() => {
        if (!query) {
            // eslint-disable-next-line i18next/no-literal-string
            sheetRef.current?.scrollContentTo({ top: 0, behavior: 'instant' })
        }
    }, [query])

    if (canvasHeight === 0) return null

    // Wrapper div prevents nesting two <button> elements (invalid HTML).
    // The trigger covers the full area; the clear button is absolutely positioned inside.
    const searchHeader = (
        <div className={classNames('SearchDrawer__search-btn', { 'SearchDrawer__search-btn--has-query': query })}>
            <button
                type="button"
                className="SearchDrawer__search-trigger"
                onClick={onOpenOverlay}
                aria-label={t('design.search')}
            >
                {!query && <SSRIcon paths={magnifyingGlass} className="SearchDrawer__search-icon" />}
                <span className="SearchDrawer__search-text">{query || t('design.what are you looking for?')}</span>
            </button>
            {query && (
                <button
                    type="button"
                    className="SearchDrawer__clear-btn"
                    onClick={onClearSearch}
                    aria-label={t('design.clear search')}
                >
                    <SSRIcon paths={crossSmall} className="SearchDrawer__clear-icon" />
                </button>
            )}
        </div>
    )

    return (
        <>
            <BottomSheet
                ref={sheetRef}
                open
                onClose={() => {}}
                dismissMode="snap"
                collapsedTop={collapsedTop}
                expandedTop={expandedTop}
                header={searchHeader}
            >
                <SearchResultsGrid
                    results={results}
                    isSearching={isSearching}
                    hasMore={hasMore}
                    searchQuery={query}
                    onItemClick={(item) => {
                        if (isAtLimit || isAdding) {
                            if (isAtLimit) onItemLimitReached?.()
                            return
                        }
                        setIsAdding(true)
                        addItem(item, combinablesDefaultProductsById)
                            .then((uniqueId) => {
                                if (uniqueId) registerItemProduct(uniqueId, item)
                            })
                            .finally(() => setIsAdding(false))
                        sheetRef.current?.collapse()
                    }}
                    onFetchNextPage={onFetchNextPage}
                />
            </BottomSheet>

            {overlayOpen && (
                <SearchOverlay
                    initialValue={inputValue}
                    completions={completions}
                    onAutocomplete={onAutocomplete}
                    onCommit={onCommit}
                    onClose={onCloseOverlay}
                />
            )}
        </>
    )
}
