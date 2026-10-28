import React, { createContext, useState, useContext, useCallback, useRef, useMemo } from 'react'
import { useSmartDropdownPosition, DropdownPosition } from './useSmartDropdownPosition'

export type { DropdownPosition }

/**
 * Global dropdown manager to ensure only one dropdown is open at a time
 * This ensures WCAG AA compliance by preventing multiple open dropdowns
 */
const DropdownContext = createContext<{
    activeDropdown: string | null
    setActiveDropdown: (dropdownId: string | null) => void
} | null>(null)

export const DropdownProvider = ({ children }: { children: React.ReactNode }) => {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

    const value = useMemo(() => ({ activeDropdown, setActiveDropdown }), [activeDropdown, setActiveDropdown])

    return <DropdownContext.Provider value={value}>{children}</DropdownContext.Provider>
}

export type UseDropdownManagerResult = {
    isOpen: boolean
    pillRef: React.RefObject<HTMLButtonElement>
    dropdownRef: React.RefObject<HTMLUListElement>
    dropdownPosition: DropdownPosition
    openDropdown: () => void
    closeDropdown: () => void
    closeAllDropdowns: () => void
    toggleDropdown: () => void
    isActive: boolean
}

export const useDropdownManager = (dropdownId: string): UseDropdownManagerResult => {
    const context = useContext(DropdownContext)

    if (!context) {
        throw new Error('useDropdownManager must be used within a DropdownProvider')
    }

    const { activeDropdown, setActiveDropdown } = context
    const isActive = activeDropdown === dropdownId

    const pillRef = useRef<HTMLButtonElement>(null)
    const dropdownRef = useRef<HTMLUListElement>(null)

    const dropdownPosition = useSmartDropdownPosition({
        triggerRef: pillRef,
        dropdownRef,
        isOpen: isActive,
    })

    const openDropdown = useCallback(() => {
        setActiveDropdown(dropdownId)
    }, [dropdownId, setActiveDropdown])

    const closeDropdown = useCallback(() => {
        if (activeDropdown === dropdownId) {
            setActiveDropdown(null)
        }
    }, [dropdownId, activeDropdown, setActiveDropdown])

    const closeAllDropdowns = useCallback(() => {
        setActiveDropdown(null)
    }, [setActiveDropdown])

    const toggleDropdown = useCallback(
        () => (isActive ? closeDropdown() : openDropdown()),
        [isActive, closeDropdown, openDropdown],
    )

    return {
        isOpen: isActive,
        pillRef,
        dropdownRef,
        dropdownPosition,
        openDropdown,
        closeDropdown,
        closeAllDropdowns,
        toggleDropdown,
        isActive,
    }
}
