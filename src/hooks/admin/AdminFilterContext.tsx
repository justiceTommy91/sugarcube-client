import React, { createContext, useContext, useState, useMemo, type ReactNode } from 'react'
import {
    DEFAULT_SALES_END_DATE_FILTER,
    type SalesEndDateFilterValue,
} from 'components/DesignSidepanel/tabs/AddProductTab/admin/constants'

interface AdminFilterContextType {
    filter: SalesEndDateFilterValue
    setFilter: (filter: SalesEndDateFilterValue) => void
}

const AdminFilterContext = createContext<AdminFilterContextType | undefined>(undefined)

interface AdminFilterProviderProps {
    children: ReactNode
}

/**
 * Context provider for admin sales end date filter state.
 * Used for admin debugging functionality to share filter state between components.
 */
export const AdminFilterProvider = ({ children }: AdminFilterProviderProps) => {
    const [filter, setFilter] = useState<SalesEndDateFilterValue>(DEFAULT_SALES_END_DATE_FILTER)

    const value = useMemo(() => ({ filter, setFilter }), [filter])

    return <AdminFilterContext.Provider value={value}>{children}</AdminFilterContext.Provider>
}

/**
 * Hook to access admin filter context.
 * Must be used within AdminFilterProvider.
 */
export const useAdminFilterContext = () => {
    const context = useContext(AdminFilterContext)
    if (context === undefined) {
        throw new Error('useAdminFilterContext must be used within an AdminFilterProvider')
    }
    return context
}
