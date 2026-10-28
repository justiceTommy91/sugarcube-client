import React from 'react'

import './MiniToggle.scss'

type MiniToggleProps = {
    value: boolean
    onChange: (v: boolean) => void
    label?: string
}

export const MiniToggle = ({ value, onChange, label }: MiniToggleProps) => (
    <div className="MiniToggle" onClick={() => onChange(!value)}>
        <div className={`view ${value ? 'isOn' : ''}`} />
        {label}
    </div>
)
