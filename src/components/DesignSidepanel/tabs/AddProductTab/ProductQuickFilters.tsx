import classNames from 'classnames'
import React from 'react'
import * as Popover from '@radix-ui/react-popover'
import Pill, { IconPill } from '@ingka/pill'
import ListBox from '@ingka/list-box'
import minusIcon from '@ingka/ssr-icon/paths/minus'
import plusIcon from '@ingka/ssr-icon/paths/plus'
import { useAppSelector } from 'hooks'
import { updateFurnitureFilter } from 'models/furniture/actions'
import { useDispatch } from 'react-redux'
import { RootState } from 'store'
import { useTranslation } from 'react-i18next'
import ListView, { ListViewItem } from '@ingka/list-view'

require('./ProductQuickFilters.scss')

export function useQuickFilters() {
    const appliedFilters = useAppSelector((state: RootState) => state.furniture.filter)
    const { t } = useTranslation()
    const fixedFilters = [
        { label: t('quick-filters.beds') },
        { label: t('quick-filters.wardrobes') },
        { label: t('quick-filters.nightstands') },
        { label: t('quick-filters.dressers') },
    ]
    const allFilters = [
        ...fixedFilters,
        { label: t('quick-filters.rugs') },
        { label: t('quick-filters.lamps') },
        { label: t('quick-filters.mirrors') },
        { label: t('quick-filters.decorations') },
    ]
    const selectedFilter = allFilters.find(({ label }) => appliedFilters.query === label)

    return { fixedFilters, allFilters, selectedFilter, appliedFilters }
}

export const ProductQuickFilters = () => {
    const [isAllCategoriesSelectorOpen, setIsAllCategoriesSelectorOpen] = React.useState(false)
    const dispatch = useDispatch()
    const { fixedFilters, allFilters, selectedFilter, appliedFilters } = useQuickFilters()
    const { t } = useTranslation()

    const handleFixedFilterClick = (query: string) => () => {
        if (appliedFilters.query === query) {
            dispatch(updateFurnitureFilter({ query: null }))
            return
        }
        dispatch(updateFurnitureFilter({ query }))
    }

    const handleListViewFilterChange = (query: string) => () => {
        dispatch(updateFurnitureFilter({ query }))
    }

    return (
        <div className={classNames('ProductQuickFilters')}>
            <div className="pills-container">
                {fixedFilters.map(({ label }) => (
                    <Pill
                        key={label}
                        label={label}
                        onClick={handleFixedFilterClick(label)}
                        selected={selectedFilter?.label === label}
                        size="medium"
                    />
                ))}
                {selectedFilter && !fixedFilters.includes(selectedFilter) ? (
                    <Pill
                        key={selectedFilter.label}
                        label={selectedFilter.label}
                        onClick={handleFixedFilterClick(selectedFilter.label)}
                        selected
                        size="medium"
                    />
                ) : null}
                <Popover.Root
                    open={isAllCategoriesSelectorOpen}
                    modal={false}
                    onOpenChange={setIsAllCategoriesSelectorOpen}
                >
                    <Popover.Trigger asChild>
                        <IconPill
                            onClick={() => setIsAllCategoriesSelectorOpen((v) => !v)}
                            ssrIcon={isAllCategoriesSelectorOpen ? minusIcon : plusIcon}
                            selected={isAllCategoriesSelectorOpen}
                            ariaLabel={t('quick-filters.all-filters-label')}
                        />
                    </Popover.Trigger>
                    <Popover.Portal container={document.querySelector(`#___gatsby`)}>
                        <Popover.Content
                            sideOffset={8}
                            onEscapeKeyDown={() => setIsAllCategoriesSelectorOpen(false)}
                            side="bottom"
                            align="end"
                            className="ProductQuickFilters__popover-content"
                        >
                            <ListBox open>
                                <ListView showDivider={false} id="all-categories-list">
                                    {allFilters.map(({ label }) => (
                                        <ListViewItem
                                            title={label}
                                            control="radiobutton"
                                            inset
                                            size="medium"
                                            controlProps={{
                                                checked: selectedFilter?.label === label,
                                                value: label,
                                                onChange: handleListViewFilterChange(label),
                                            }}
                                        />
                                    ))}
                                </ListView>
                            </ListBox>
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            </div>
        </div>
    )
}
