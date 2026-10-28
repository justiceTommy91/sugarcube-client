import React from 'react'
import classNames from 'classnames'
import SSRIcon, { type SSRIconProps } from '@ingka/ssr-icon'

import { useSugarcubeContext } from 'apps/SugarcubeContext'

import './ToggleTab.scss'

export type ToggleTabProps = Omit<React.DOMAttributes<HTMLButtonElement>, 'className'> & {
    label: string
    icon: SSRIconProps['paths']
}

export const ToggleTab: React.FunctionComponent<ToggleTabProps> = ({ label, icon, ...props }) => {
    const { isUpptacka } = useSugarcubeContext()
    return (
        <button className={classNames('ToggleTab', { isUpptacka })} {...props}>
            <div className="ToggleTab__icon">
                <SSRIcon paths={icon} />
            </div>

            {label}
        </button>
    )
}
