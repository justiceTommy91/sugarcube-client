/* eslint-disable no-void */
import React from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import Search from '@ingka/search'
import SSRIcon from '@ingka/ssr-icon'
import magnifyingGlass from '@ingka/ssr-icon/paths/magnifying-glass'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { useAppSelector } from 'hooks'
import { useAriaCombobox } from 'hooks/aria/useAriaCombobox'
import { isInRoomTypeSearchMode } from 'models/furniture/selectors'

import { useSearchTracking, SEARCH_TYPES } from 'hooks/useSearchTracking'
import { SEARCH_CHANGE_TYPES } from 'utils/searchTracking'
import useSearchCompletions from '../../search-filters/hooks/useSearchCompletions'
import { useProductSearch } from '../../search-filters/hooks/useProductSearch'
import SearchStatusAnnouncer from './SearchStatusAnnouncer'

import './ProductSearchCombobox.scss'

const MIN_AUTOCOMPLETE_LENGTH = 3

export const ProductSearchCombobox: React.FunctionComponent = () => {
    const { filters, filterBy, clearFilters, status, results } = useProductSearch()
    const { trackSearchResult } = useSearchTracking()
    const isRoomTypeSearchMode = useAppSelector(isInRoomTypeSearchMode)

    const { searchCompletions, autocomplete, clearSearchResults } = useSearchCompletions()

    const { t } = useTranslation()
    const label = t('design.what are you looking for?')
    // Local state to control the input value
    // Don't show room type query in search input - it's shown in the room type dropdown instead
    const displayQuery = isRoomTypeSearchMode ? '' : filters.query ?? ''
    const [inputValue, setInputValue] = React.useState(displayQuery)

    // Sync input value with external filter changes
    React.useEffect(() => {
        setInputValue(displayQuery)
    }, [displayQuery])

    const handleSearch = (value: string) => {
        const trimmedInput = value.trim()

        if (trimmedInput === '') {
            // Clears search filters but preserves URL context (subcatalog, roomType, categoryId)
            // to display appropriate featured products for the current navigation context
            clearFilters()
        } else {
            filterBy({ query: trimmedInput })

            // Track search result event
            trackSearchResult(SEARCH_TYPES.TEXT_BOX, {
                type: SEARCH_CHANGE_TYPES.QUERY,
                value: trimmedInput,
            })
        }
    }

    const { comboboxProps, listboxProps, optionProps, optionButtonProps } = useAriaCombobox({
        options: searchCompletions,
        onChange(value) {
            // Handle autocomplete suggestion clicks
            setInputValue(value)
            handleSearch(value)
        },
        defaultValue: inputValue,
        'aria-label': label,
    })

    const { isUpptacka } = useSugarcubeContext()
    return (
        <div className={classNames('ProductSearchCombobox', { isUpptacka })}>
            <SearchStatusAnnouncer status={status} query={filters.query || ''} resultCount={results.length} />
            <div className="ProductSearchCombobox__searchInputContainer">
                <Search
                    id=""
                    value={inputValue}
                    {...comboboxProps({
                        onInput(event) {
                            const value = event.currentTarget.value
                            setInputValue(value)

                            const query = value.trim()
                            if (query.length < MIN_AUTOCOMPLETE_LENGTH) {
                                clearSearchResults()
                                return
                            }

                            autocomplete(query)
                        },
                        onBlur(event) {
                            // Prevent value reset by overriding the default behavior
                            // Keep the current input value instead of resetting to defaultValue
                            const target = event.currentTarget
                            target.value = inputValue
                            clearSearchResults()
                        },
                    })}
                    placeholder={label}
                    onSearch={(event, data) => {
                        // Only handle search button clicks, not Enter key
                        // Enter key is handled by comboboxProps to avoid duplicates
                        if (event.type === 'click') {
                            handleSearch(data.value ?? '')
                        }
                    }}
                    onClear={() => {
                        setInputValue('')
                        clearFilters()
                        clearSearchResults()
                    }}
                    focusWithClearButton
                />
                <ul {...listboxProps()}>
                    {searchCompletions.map((completion, index) => (
                        <li key={completion} {...optionProps(index)}>
                            <button {...optionButtonProps(index)} type="button">
                                <span>
                                    <SSRIcon paths={magnifyingGlass} />
                                </span>

                                {completion}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
