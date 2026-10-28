import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'
import sparklesIcon from '@ingka/ssr-icon/paths/sparkles'
import { useTranslation } from 'react-i18next'
import Badge from '@ingka/badge'

import type { RoomType } from 'models/roomTypes/types'
import { COMPLETE_MY_ROOM_ID } from 'models/roomTypes/constants'
import { COMPLETE_ROOM_SELECTED_SESSION_STORAGE_KEY } from './constants'
import { getRoomTypeDisplayName } from '../utils'

require('./RoomTypeItem.scss')

type RoomTypeItemProps = {
    roomType: RoomType
    isSelected: boolean
    isFocused: boolean
    onClick: () => void
} & React.HTMLAttributes<HTMLDivElement>

export const RoomTypeItem = ({
    roomType,
    isSelected,
    isFocused,
    onClick,
    ...props
}: RoomTypeItemProps): React.ReactElement => {
    const { t } = useTranslation()
    const [showNewBadge, setShowNewBadge] = useState(false)

    const isCompleteMyRoom = roomType.humanId === COMPLETE_MY_ROOM_ID

    useEffect(() => {
        if (isCompleteMyRoom) {
            const hasBeenSelected = sessionStorage.getItem(COMPLETE_ROOM_SELECTED_SESSION_STORAGE_KEY)
            setShowNewBadge(!hasBeenSelected)
        }
    }, [isCompleteMyRoom])

    const handleClick = () => {
        if (isCompleteMyRoom && showNewBadge) {
            sessionStorage.setItem(COMPLETE_ROOM_SELECTED_SESSION_STORAGE_KEY, `true`)
            setShowNewBadge(false)
        }
        onClick()
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleClick()
        }
    }

    const displayName = getRoomTypeDisplayName(roomType, t)

    return (
        <div
            role="option"
            tabIndex={0}
            aria-selected={isSelected}
            aria-label={`${displayName}${isSelected ? ', selected' : ''}`}
            className={classNames('RoomTypeItem', {
                'RoomTypeItem--selected': isSelected,
                'RoomTypeItem--focused': isFocused,
            })}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            {...props}
        >
            <div className="RoomTypeItem__content">
                {isCompleteMyRoom ? (
                    <div className="RoomTypeItem__icon-placeholder">
                        <SSRIcon paths={sparklesIcon} className="RoomTypeItem__sparkle-icon" />
                    </div>
                ) : (
                    roomType.imageUrl && (
                        <img src={roomType.imageUrl} alt={displayName} className="RoomTypeItem__thumbnail" />
                    )
                )}
                <div className="RoomTypeItem__name-container">
                    <span className="RoomTypeItem__name">{displayName}</span>
                    {isCompleteMyRoom && showNewBadge && (
                        <Badge label={t('design.new')} size="small" className="RoomTypeItem__new-badge" />
                    )}
                </div>
            </div>
            {isSelected && <SSRIcon paths={checkmarkIcon} className="RoomTypeItem__check" aria-hidden="true" />}
        </div>
    )
}
