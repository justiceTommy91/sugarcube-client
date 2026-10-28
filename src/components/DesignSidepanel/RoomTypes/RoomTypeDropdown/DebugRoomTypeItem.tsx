import React from 'react'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'
import { useTranslation } from 'react-i18next'

require('./RoomTypeItem.scss')

type DebugRoomTypeItemProps = {
    isSelected: boolean
    isFocused: boolean
    onClick: () => void
} & React.HTMLAttributes<HTMLDivElement>

export const DebugRoomTypeItem = ({
    isSelected,
    isFocused,
    onClick,
    ...props
}: DebugRoomTypeItemProps): React.ReactElement => {
    const { t } = useTranslation()

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick()
        }
    }

    return (
        <div
            role="option"
            tabIndex={0}
            aria-selected={isSelected}
            aria-label={`${t('common.debug')}${isSelected ? ', selected' : ''}`}
            className={classNames('RoomTypeItem', {
                'RoomTypeItem--selected': isSelected,
                'RoomTypeItem--focused': isFocused,
            })}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            {...props}
        >
            <div className="RoomTypeItem__content">
                <span className="RoomTypeItem__name">{t('common.debug')}</span>
            </div>
            {isSelected && <SSRIcon paths={checkmarkIcon} className="RoomTypeItem__check" aria-hidden="true" />}
        </div>
    )
}
