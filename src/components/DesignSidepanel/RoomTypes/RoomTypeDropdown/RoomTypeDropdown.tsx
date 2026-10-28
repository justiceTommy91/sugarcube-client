import React, { useEffect, useRef } from 'react'

import { useAppSelector } from 'hooks'
import { getAllRoomTypeOptions } from 'models/roomTypes/selectors'
import { getSelectedRoomTypeFromFilter } from 'models/furniture/selectors'

import type { RoomType } from 'models/roomTypes/types'
import { RoomTypeItem } from './RoomTypeItem'
import { DebugRoomTypeItem } from './DebugRoomTypeItem'

require('./RoomTypeDropdown.scss')

type RoomTypeDropdownProps = {
    onRoomTypeSelect: (roomType: RoomType) => void
    onClose: () => void
    focusedIndex: number
    dropdownId: string
    triggerId: string
    getOptionId: (index: number) => string
    isAdmin: boolean
    isDebugSelected: boolean
    onDebugSelect: () => void
    debugItemIndex: number
}

export const RoomTypeDropdown = ({
    onRoomTypeSelect,
    onClose,
    focusedIndex,
    dropdownId,
    triggerId,
    getOptionId,
    isAdmin,
    isDebugSelected,
    onDebugSelect,
    debugItemIndex,
}: RoomTypeDropdownProps): React.ReactElement => {
    const containerRef = useRef<HTMLDivElement>(null)
    const allRoomTypeOptions = useAppSelector(getAllRoomTypeOptions)
    const selectedRoomType = useAppSelector(getSelectedRoomTypeFromFilter)

    // scroll to focused item
    useEffect(() => {
        if (focusedIndex >= 0) {
            const optionElement = document.getElementById(getOptionId(focusedIndex))
            optionElement?.scrollIntoView({ block: 'center' })
        }
    }, [focusedIndex, getOptionId])

    const handleKeyDown = (event: React.KeyboardEvent) => {
        // Only handle Escape key, let parent handle all other navigation
        if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
        }
    }

    return (
        <div
            className="RoomTypeDropdown"
            ref={containerRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            id={dropdownId}
            aria-labelledby={triggerId}
        >
            <div className="RoomTypeDropdown__content">
                {allRoomTypeOptions.map((roomType: RoomType, index: number) => {
                    const isSelected = selectedRoomType?.humanId === roomType.humanId
                    const isFocused = index === focusedIndex

                    return (
                        <RoomTypeItem
                            key={roomType.humanId}
                            roomType={roomType}
                            isSelected={isSelected}
                            isFocused={isFocused}
                            onClick={() => onRoomTypeSelect(roomType)}
                            role="option"
                            tabIndex={isFocused ? 0 : -1}
                            aria-selected={isSelected}
                            id={getOptionId(index)}
                        />
                    )
                })}
                {isAdmin && (
                    <DebugRoomTypeItem
                        isSelected={isDebugSelected}
                        isFocused={focusedIndex === debugItemIndex}
                        onClick={onDebugSelect}
                        tabIndex={focusedIndex === debugItemIndex ? 0 : -1}
                        aria-selected={isDebugSelected}
                        id={getOptionId(debugItemIndex)}
                    />
                )}
            </div>
        </div>
    )
}
