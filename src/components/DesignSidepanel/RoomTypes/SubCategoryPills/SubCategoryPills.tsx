import React from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import { useAppSelector } from 'hooks/useAppSelector'
import {
    getSelectedRoomTypeFromFilter,
    getSelectedSubCategoryFromFilter,
    getFilter,
    getRawFilters,
    getFurnitureByFilter,
    isInRoomTypeSearchMode,
} from 'models/furniture/selectors'

import type { SubCategory } from 'models/roomTypes/types'
import { BasePill, PILL_ICON_TYPES } from '../../search-filters/components/pills/BasePill'
import { Dropdown } from '../../search-filters/components/pills/shared/Dropdown'
import { DropdownProvider } from '../../search-filters/components/pills/hooks/useDropdownManager'
import { useSubCategoryDropdownBehavior } from './useSubCategoryDropdownBehavior'
import { SubCategoryFilter } from './SubCategoryFilter'

require('./SubCategoryPills.scss')

type SubCategoryPillsProps = {
    onSubCategorySelect: (subCategory: SubCategory | null) => void
}

const SubCategoryPillsInner = ({ onSubCategorySelect }: SubCategoryPillsProps): React.ReactElement | null => {
    const { t } = useTranslation()
    const selectedRoomType = useAppSelector(getSelectedRoomTypeFromFilter)
    const selectedSubCategory = useAppSelector(getSelectedSubCategoryFromFilter)
    const subCategories = selectedRoomType?.categories || []

    // Get data needed to determine if filter pills would be visible
    const filters = useAppSelector(getFilter)
    const rawFilters = useAppSelector(getRawFilters)
    const results = useAppSelector(getFurnitureByFilter)
    const isRoomTypeSearchMode = useAppSelector(isInRoomTypeSearchMode)

    // Determine if filter pills would be shown (matches ProductSearch logic)
    const shouldShowFilterPills =
        (!!filters.query && !isRoomTypeSearchMode && rawFilters.length > 0) ||
        (!!selectedSubCategory && (rawFilters.length > 0 || results.length > 0))

    const {
        pillProps,
        dropdownProps,
        isOpen,
        availableOptions,
        handleOptionClick,
        getOptionProps,
        keyboardSelectedIndex,
    } = useSubCategoryDropdownBehavior({
        subCategories,
        selectedSubCategory,
        onSubCategorySelect,
    })

    if (subCategories.length === 0) {
        return null
    }

    // Always show the first 3 pills
    const visiblePills = subCategories.slice(0, 3)
    const remainingCategories = subCategories.slice(3)

    const selectedIndex = selectedSubCategory
        ? subCategories.findIndex((sc) => sc.categoryId === selectedSubCategory.categoryId)
        : -1
    // If selected sub category is not part of the visible 3, add it to the end of the list as the fourth pill
    if (selectedSubCategory && selectedIndex >= 3) {
        visiblePills.push(selectedSubCategory)
    }

    const handlePillClick = (subCategory: SubCategory) => {
        if (selectedSubCategory?.categoryId === subCategory.categoryId) {
            // Deselect if clicking the already selected pill
            onSubCategorySelect(null)
        } else {
            onSubCategorySelect(subCategory)
        }
    }

    return (
        <div
            className={classNames('SubCategoryPills', {
                'SubCategoryPills--filtersVisible': shouldShowFilterPills,
            })}
        >
            <div className="SubCategoryPills__container">
                {visiblePills.map((subCategory) => (
                    <BasePill
                        key={subCategory.categoryId}
                        label={subCategory.name}
                        isSelected={selectedSubCategory?.categoryId === subCategory.categoryId}
                        onClick={() => handlePillClick(subCategory)}
                        disabled={false}
                    />
                ))}

                {(remainingCategories.length > 0 || (selectedSubCategory && subCategories.length > 3)) && (
                    <div className="SubCategoryPills__allCategories">
                        <BasePill
                            ref={pillProps.ref}
                            label={t('design.all categories')}
                            iconType={PILL_ICON_TYPES.CHEVRON}
                            active={isOpen}
                            onClick={pillProps.onClick}
                            id={pillProps.id}
                            aria-haspopup={pillProps['aria-haspopup']}
                            aria-expanded={pillProps['aria-expanded']}
                            aria-controls={pillProps['aria-controls']}
                            onKeyDown={pillProps.onKeyDown}
                            onBlur={pillProps.onBlur}
                            disabled={false}
                        />

                        {isOpen && (
                            <Dropdown {...dropdownProps}>
                                <SubCategoryFilter
                                    options={availableOptions}
                                    selectedSubCategory={selectedSubCategory}
                                    onSubCategorySelect={handleOptionClick}
                                    getOptionProps={getOptionProps}
                                    selectedIndex={keyboardSelectedIndex}
                                />
                            </Dropdown>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export const SubCategoryPills = ({ onSubCategorySelect }: SubCategoryPillsProps): React.ReactElement | null => (
    <DropdownProvider>
        <SubCategoryPillsInner onSubCategorySelect={onSubCategorySelect} />
    </DropdownProvider>
)
