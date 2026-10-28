import React from 'react'
import RadioButton from '@ingka/radio-button'
import { useTranslation } from 'react-i18next'
import type { HtmlAttributeBag } from 'hooks/aria/common'
import type { SubCategory } from 'models/roomTypes/types'

require('./SubCategoryFilter.scss')

/**
 * SubCategoryFilter - A dropdown filter component for room type subcategories.
 *
 * This component implements ARIA 1.1 listbox pattern with aria-activedescendant focus management.
 * It's specifically designed to be used within dropdown contexts with keyboard navigation support.
 * Each option is rendered as a radio button for visual consistency but click handling is managed
 * by the parent dropdown component.
 *
 * @example
 * <SubCategoryFilter
 *   options={availableOptions}
 *   selectedSubCategory={selectedSubCategory}
 *   onSubCategorySelect={handleOptionClick}
 *   getOptionProps={getOptionProps}
 *   selectedIndex={keyboardSelectedIndex}
 * />
 */

export type SubCategoryFilterProps = {
    options: Array<{ id: string; name: string }>
    selectedSubCategory: SubCategory | null
    onSubCategorySelect: (categoryId: string) => void
    /** Function to get ARIA props for dropdown options with aria-activedescendant focus management */
    getOptionProps: <T extends HTMLElement>(index: number) => HtmlAttributeBag<T>
    /** Current keyboard selected index for focus styling */
    selectedIndex: number
}

export const SubCategoryFilter = ({
    options,
    selectedSubCategory,
    onSubCategorySelect,
    getOptionProps,
    selectedIndex,
}: SubCategoryFilterProps): React.ReactElement | null => {
    const { t } = useTranslation()
    const filterName = `subcategory`

    if (options.length <= 0) {
        return null
    }

    return (
        <div className="SubCategoryFilter" role="radiogroup" aria-labelledby={`${filterName}-legend`}>
            <div id={`${filterName}-legend`} className="sr-only">
                {t('design.all categories')}
            </div>
            {options.map((option, index) => {
                const isSelected = selectedSubCategory?.categoryId === option.id
                const isFocused = selectedIndex === index
                const optionProps = getOptionProps<HTMLLabelElement>(index)
                const radioId = optionProps.id || `subcategory-${option.id}`

                return (
                    <label
                        key={option.id}
                        className="SubCategoryFilter__option"
                        aria-selected={isFocused}
                        aria-checked={isSelected}
                        htmlFor={radioId}
                        onClick={optionProps.onClick}
                        tabIndex={-1} // Remove from tab order - focus managed by aria-activedescendant
                    >
                        <span className="SubCategoryFilter__label">{option.name}</span>
                        <RadioButton
                            id={radioId}
                            type="radio"
                            name={filterName}
                            value={option.id}
                            checked={isSelected}
                            onChange={() => onSubCategorySelect(option.id)}
                            className="SubCategoryFilter__radio"
                            tabIndex={-1} // Remove from tab order - focus managed by aria-activedescendant
                            subtle
                        />
                    </label>
                )
            })}
        </div>
    )
}
