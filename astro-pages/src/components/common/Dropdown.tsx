import React, { useEffect, useRef } from 'react'
import './Dropdown.scss'

export interface DropdownItem {
    id: string
    label: string
    icon?: React.ReactNode
    onClick: () => void
}

interface DropdownProps {
    items: DropdownItem[]
    triggerId: string
    ariaLabel: string
    onClose: () => void
    className?: string
}

const Dropdown = ({ items, triggerId, ariaLabel, onClose, className }: DropdownProps) => {
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

    useEffect(() => {
        itemRefs.current[0]?.focus()
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const focused = document.activeElement
        const index = itemRefs.current.findIndex((el) => el === focused)

        if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
            document.getElementById(triggerId)?.focus()
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            const next = itemRefs.current[index + 1] ?? itemRefs.current[0]
            next?.focus()
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const prev = itemRefs.current[index - 1] ?? itemRefs.current[items.length - 1]
            prev?.focus()
        } else if (e.key === 'Tab') {
            onClose()
        }
    }

    return (
        <div
            className={`Dropdown${className ? ` ${className}` : ''}`}
            role="menu"
            tabIndex={-1}
            aria-label={ariaLabel}
            onKeyDown={handleKeyDown}
        >
            {items.map((item, i) => (
                <button
                    key={item.id}
                    className="Dropdown__item"
                    role="menuitem"
                    type="button"
                    ref={(el) => { itemRefs.current[i] = el }}
                    onClick={item.onClick}
                >
                    {item.icon && <span aria-hidden="true">{item.icon}</span>}
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    )
}

export default Dropdown
