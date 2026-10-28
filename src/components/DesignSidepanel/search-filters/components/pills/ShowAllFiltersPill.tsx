import React from 'react'
import { IconPill } from '@ingka/pill'
import filtersIcon from '@ingka/ssr-icon/paths/filters'
import { useTranslation } from 'react-i18next'
import { useDropdownManager } from './hooks/useDropdownManager'
// shares styling with base pill
require('./BasePill.scss')

export type ShowAllFiltersPillProps = {
    onClick: () => void
}

/**
 * Static pill that opens the "All Filters" modal when clicked.
 * Closes any open dropdowns before opening the modal to prevent UI conflicts.
 */
export const ShowAllFiltersPill = ({ onClick }: ShowAllFiltersPillProps): React.ReactElement => {
    const { t } = useTranslation()
    const { closeAllDropdowns } = useDropdownManager('all-filters')

    const handleClick = () => {
        // Close any open dropdown before opening modal
        closeAllDropdowns()
        onClick()
    }

    return (
        <IconPill
            selected={false}
            onClick={handleClick}
            className="BasePill"
            ssrIcon={filtersIcon}
            ariaLabel={t('aria.show-all-filters')}
        />
    )
}
