import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Search from '@ingka/search'
import SSRIcon from '@ingka/ssr-icon'
import cross from '@ingka/ssr-icon/paths/cross'
import magnifyingGlass from '@ingka/ssr-icon/paths/magnifying-glass'
import './SearchOverlay.scss'

interface SearchOverlayProps {
    initialValue: string
    completions: string[]
    onAutocomplete: (value: string) => void
    onCommit: (query: string) => void
    onClose: () => void
}

export const SearchOverlay = ({
    initialValue,
    completions,
    onAutocomplete,
    onCommit,
    onClose,
}: SearchOverlayProps) => {
    const { t } = useTranslation()
    const [value, setValue] = useState(initialValue)
    const searchRef = useRef<HTMLDivElement>(null)

    // Focus the input on mount — kept at top so the header is always visible
    useEffect(() => {
        const input = searchRef.current?.querySelector('input')
        if (!input) return undefined

        // iOS scrolls the WKScrollView when any input is focused, even inside a fixed
        // overlay, which makes the page shift down and takes the header out of view.
        //
        // preventScroll:true tells the browser not to scroll to the input (iOS 15.4+).
        // For older iOS the visualViewport 'resize' event fires as the keyboard animates
        // in — we reset the scroll position there so the header stays at the top.
        const resetScroll = () => window.scrollTo(0, 0)
        window.visualViewport?.addEventListener('resize', resetScroll)

        input.focus({ preventScroll: true })
        // Place cursor at end
        const len = input.value.length
        input.setSelectionRange(len, len)

        return () => window.visualViewport?.removeEventListener('resize', resetScroll)
    }, [])

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const handleChange = (_e: React.ChangeEvent<HTMLInputElement>, state: { value: string | undefined }) => {
        const v = state.value ?? ''
        setValue(v)
        onAutocomplete(v)
    }

    const handleSearch = (
        _e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>,
        state: { value: string | undefined },
    ) => {
        onCommit((state.value ?? '').trim())
    }

    const handleClear = () => {
        setValue('')
        onAutocomplete('')
    }

    const showSuggestions = completions.length > 0

    return (
        <div className="SearchOverlay" role="dialog" aria-modal="true" aria-label={t('design.search')}>
            <div className="SearchOverlay__header">
                <button
                    type="button"
                    className="SearchOverlay__close"
                    onClick={onClose}
                    aria-label={t('design.close')}
                >
                    <SSRIcon paths={cross} />
                </button>
                <div ref={searchRef} className="SearchOverlay__input-wrap">
                    <Search
                        id="kreativ-lite-search"
                        ariaLabel={t('design.what are you looking for?')}
                        placeholder={t('design.what are you looking for?')}
                        value={value}
                        focusWithClearButton
                        onChange={handleChange}
                        onSearch={handleSearch}
                        onClear={handleClear}
                    />
                </div>
            </div>

            {showSuggestions && (
                <ul className="SearchOverlay__suggestions" role="listbox">
                    {completions.map((suggestion) => (
                        <li key={suggestion} role="option" aria-selected={false}>
                            <button
                                type="button"
                                className="SearchOverlay__suggestion-item"
                                onClick={() => onCommit(suggestion)}
                            >
                                <SSRIcon paths={magnifyingGlass} />
                                {suggestion}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
