import React from 'react'

import './ToggleTabList.scss'

export type ToggleTabListProps = Omit<React.DOMAttributes<HTMLDivElement>, 'className'> & {
    children: React.ReactNode
}

export const ToggleTabList: React.FunctionComponent<ToggleTabListProps> = ({ children, ...props }) => (
    <div className="ToggleTabList" {...props}>
        {children}
    </div>
)
