import React from 'react'
import RadioButton from '@ingka/radio-button'
import { useTranslation } from 'react-i18next'
import type { HtmlAttributeBag } from 'hooks/aria/common'
import type { SortOption, SortOptionId } from '../../types/sort'

require('./SortFilter.scss')

export type SortFilterProps = {
    options: SortOption[]
    onSortChange: (sortOptionId: SortOptionId) => void
    name?: string
    getOptionProps?: <T extends HTMLElement>(index: number) => HtmlAttributeBag<T>
    selectedIndex?: number // Current keyboard selected index for focus styling
}

export const SortFilter = ({
    options,
    onSortChange,
    name,
    getOptionProps,
    selectedIndex = -1,
}: SortFilterProps): React.ReactElement | null => {
    const { t } = useTranslation()
    const sortName = name || t('search.filters.sort')

    if (options.length <= 0) {
        return null
    }

    const isDropdownContext = !!getOptionProps

    return (
        <div className="SortFilter" role="radiogroup" aria-labelledby={`${sortName}-legend`}>
            <div id={`${sortName}-legend`} className="sr-only">
                {t('aria.descriptions.searchFilterSort')}
            </div>
            {options.map((option, index) => {
                const isSelected = option.selected
                const isFocused = isDropdownContext && selectedIndex === index

                if (isDropdownContext) {
                    // Dropdown context: use getOptionProps for proper keyboard navigation
                    const optionProps = getOptionProps<HTMLLabelElement>(index)
                    // Use the ID from getOptionProps to match aria-activedescendant
                    const radioId = optionProps.id || `sort-${option.id}`

                    return (
                        <label
                            key={option.id}
                            className="SortFilter__option"
                            aria-selected={isFocused}
                            htmlFor={radioId}
                            onClick={optionProps.onClick}
                        >
                            <span className="SortFilter__label">{option.name}</span>
                            <RadioButton
                                id={radioId}
                                type="radio"
                                name={sortName}
                                value={option.id}
                                checked={isSelected}
                                onChange={() => undefined} // Prevent immediate selection - only activate on Enter/Space
                                className="SortFilter__radio"
                                tabIndex={-1} // Remove from tab order - focus managed by aria-activedescendant
                                subtle
                            />
                        </label>
                    )
                }

                // Modal context: direct selection behavior
                const inputId = `sort-${option.id}`
                // In modal context, all radio buttons should be tabbable
                const tabIndex = 0
                return (
                    <label
                        key={option.id}
                        className="SortFilter__option"
                        htmlFor={inputId}
                        tabIndex={tabIndex}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                onSortChange(option.id)
                            }
                        }}
                    >
                        <span className="SortFilter__label">{option.name}</span>
                        <RadioButton
                            id={inputId}
                            type="radio"
                            name={sortName}
                            value={option.id}
                            checked={isSelected}
                            onChange={() => onSortChange(option.id)}
                            className="SortFilter__radio"
                            tabIndex={-1}
                            subtle
                        />
                    </label>
                )
            })}
        </div>
    )
}
