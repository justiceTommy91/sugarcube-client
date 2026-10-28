import React, { useEffect, useRef } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import Price from '@ingka/price'
import BouncingBallLoader from '@gatsby/components/uiElements/BouncingBallLoader'
import { formatCurrency } from '@utils/convertCurrency'
import type { FurnitureSearchItem } from './hooks/useKreativLiteSearch'
import { NoSearchResults } from './NoSearchResults'
import './SearchResultsGrid.scss'

interface FurnitureItemPriceProps {
    item: FurnitureSearchItem
}

const FurnitureItemPrice = ({ item }: FurnitureItemPriceProps) => {
    if (item.priceNumeral == null) return null
    const { integer, fraction, decimal, currency, currencyPosition, currencyScriptType } = formatCurrency(
        Number(item.priceNumeral),
    )
    return (
        <Price
            className="SearchResultsGrid__card-price"
            size="medium"
            integerValue={integer}
            decimalValue={fraction}
            decimalSign={decimal}
            currencyLabel={currency}
            currencyPosition={currencyPosition === 'before' ? 'leading' : 'trailing'}
            currencySpacing="thin"
            currencyVerticalAlignment={currencyScriptType === 'superscript' ? 'super' : 'base'}
        />
    )
}

interface SearchResultsGridProps {
    results: FurnitureSearchItem[]
    isSearching: boolean
    hasMore: boolean
    /** Active search query — when set and results are empty (not loading), shows the empty state. */
    searchQuery?: string
    onItemClick: (item: FurnitureSearchItem) => void
    onFetchNextPage: () => void
}

export const SearchResultsGrid = ({
    results,
    isSearching,
    hasMore,
    searchQuery,
    onItemClick,
    onFetchNextPage,
}: SearchResultsGridProps) => {
    const { t } = useTranslation()
    const sentinelRef = useRef<HTMLDivElement>(null)
    // Keep a ref to the latest callback so the IntersectionObserver effect only needs to depend
    // on `hasMore`, not the function identity. Without this, a new observer would be created on
    // every render (since onFetchNextPage has no stable reference), causing it to fire
    // repeatedly in quick succession during a mode transition (e.g. clear search).
    const onFetchNextPageRef = useRef(onFetchNextPage)
    onFetchNextPageRef.current = onFetchNextPage

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel || !hasMore) return undefined

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) onFetchNextPageRef.current()
            },
            { threshold: 0.1 },
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasMore])

    if (isSearching && results.length === 0) {
        return (
            <div className="SearchResultsGrid__loading">
                <BouncingBallLoader />
            </div>
        )
    }

    if (!isSearching && results.length === 0) {
        if (searchQuery) {
            return <NoSearchResults query={searchQuery} />
        }
        return null
    }

    return (
        <div className="SearchResultsGrid">
            <div className="SearchResultsGrid__grid">
                {results.map((item) => (
                    <button
                        key={`${item.id}`}
                        type="button"
                        className="SearchResultsGrid__card"
                        onClick={() => onItemClick(item)}
                        aria-label={t('design.add item to room', { name: item.name })}
                    >
                        {item.thumbUrl && (
                            <img
                                className="SearchResultsGrid__card-img"
                                src={`${item.thumbUrl}?f=u`}
                                alt={item.name}
                                loading="lazy"
                                width={160}
                                height={160}
                            />
                        )}
                        <div className="SearchResultsGrid__card-info">
                            <span className="SearchResultsGrid__card-name">{item.name}</span>
                            {item.description && (
                                <span className="SearchResultsGrid__card-desc">{item.description}</span>
                            )}
                            <FurnitureItemPrice item={item} />
                        </div>
                    </button>
                ))}
            </div>
            {/* Sentinel: triggers next-page fetch; reserves space and shows loader when more results exist */}
            <div
                ref={sentinelRef}
                className={classNames('SearchResultsGrid__sentinel', {
                    'SearchResultsGrid__sentinel--has-more': hasMore,
                })}
                aria-hidden="true"
            >
                {isSearching && results.length > 0 && <BouncingBallLoader />}
            </div>
        </div>
    )
}
