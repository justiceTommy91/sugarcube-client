/* eslint-disable i18next/no-literal-string */
import React from 'react'
import { useAppSelector } from 'hooks'
import { getAreDebugFeaturesEnabled } from 'models/user/selectors'
import { getDebugSettings } from 'models/admin/selectors'
import { SALES_END_DATE_FILTER, DEFAULT_SALES_END_DATE_FILTER, type SalesEndDateFilterValue } from './admin/constants'

type AdminSalesEndDateFilterProps = {
    value?: SalesEndDateFilterValue
    onSalesEndDateFilterChange?: (filter: SalesEndDateFilterValue) => void
}

/**
 * Admin-only component for filtering products by sales end date.
 * Only visible to admin users in development environment.
 */
export const AdminFilter = ({
    value = DEFAULT_SALES_END_DATE_FILTER,
    onSalesEndDateFilterChange,
}: AdminSalesEndDateFilterProps): React.ReactElement | null => {
    const areDebugFeaturesEnabled = useAppSelector(getAreDebugFeaturesEnabled)
    const debugSettings = useAppSelector(getDebugSettings)
    const shouldShow = areDebugFeaturesEnabled && debugSettings.showProductAdminData

    // Don't render anything if not admin in development
    if (!shouldShow) {
        return null
    }

    return (
        <div className="ProductSearch__salesEndDateFilter">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="salesEndDateFilter">[DEBUG]: Sales End Date Filter:</label>
            <select
                id="salesEndDateFilter"
                value={value}
                onChange={(e) => {
                    const filterValue = e.target.value as SalesEndDateFilterValue
                    onSalesEndDateFilterChange?.(filterValue)
                }}
            >
                <option value={SALES_END_DATE_FILTER.ALL}>All dates</option>
                <option value={SALES_END_DATE_FILTER.MORE_THAN_12_MONTHS}>End date &gt; 12 months</option>
                <option value={SALES_END_DATE_FILTER.LESS_THAN_12_MONTHS}>End date &lt; 12 months</option>
                <option value={SALES_END_DATE_FILTER.NO_END_DATE}>No End Date</option>
            </select>
        </div>
    )
}
