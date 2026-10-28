import React, { useState, useRef, useId, useCallback } from 'react'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import chevronDownIcon from '@ingka/ssr-icon/paths/chevron-down'
import { useTranslation } from 'react-i18next'

import { useAppSelector } from 'hooks'
import { useOutsideAlerter } from 'hooks/useOutsideAlerter'
import { getSelectedRoomTypeFromFilter } from 'models/furniture/selectors'
import { getAllRoomTypeOptions } from 'models/roomTypes/selectors'

import type { RoomType } from 'models/roomTypes/types'
import { useRoomTypeFilters } from '../hooks/useRoomTypeFilters'
import { RoomTypeDropdown } from '../RoomTypeDropdown/RoomTypeDropdown'
import { getRoomTypeDisplayName } from '../utils'

require('./RoomTypeSelector.scss')

type RoomTypeSelectorProps = {
    onRoomTypeSelect: (roomType: RoomType) => void
}

export const RoomTypeSelector = ({ onRoomTypeSelect }: RoomTypeSelectorProps): React.ReactElement => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const dropdownContainerRef = useRef<HTMLDivElement>(null)

    const selectedRoomType = useAppSelector(getSelectedRoomTypeFromFilter)
    const allRoomTypeOptions = useAppSelector(getAllRoomTypeOptions)
    const { isAdmin, isDebugSelected, onDebugSelect } = useRoomTypeFilters()

    // Debug item sits after all room type options
    const debugItemIndex = allRoomTypeOptions.length
    const totalOptions = allRoomTypeOptions.length + (isAdmin ? 1 : 0)

    const triggerId = useId()
    const dropdownId = useId()
    const optionIdBase = useId()

    const getOptionId = useCallback((index: number) => `${optionIdBase}-${index}`, [optionIdBase])

    useOutsideAlerter({
        ref: dropdownContainerRef,
        excludeRefs: [buttonRef],
        onClickOutside: () => {
            setIsOpen(false)
            setFocusedIndex(-1)
        },
    })

    const handleToggleDropdown = () => {
        setIsOpen((prev) => {
            if (!prev) {
                // Opening dropdown - set focus to selected item or first item
                if (isDebugSelected) {
                    setFocusedIndex(debugItemIndex)
                } else {
                    let selectedIndex = -1
                    if (selectedRoomType) {
                        selectedIndex = allRoomTypeOptions.findIndex(
                            (roomType) => roomType.humanId === selectedRoomType.humanId,
                        )
                    }
                    setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0)
                }
            } else {
                setFocusedIndex(-1)
            }
            return !prev
        })
    }

    const handleRoomTypeSelect = (roomType: RoomType) => {
        onRoomTypeSelect(roomType)
        setIsOpen(false)
        setFocusedIndex(-1)
        buttonRef.current?.focus()
    }

    const handleDebugItemSelect = () => {
        onDebugSelect()
        setIsOpen(false)
        setFocusedIndex(-1)
        buttonRef.current?.focus()
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault()
                if (!isOpen) {
                    handleToggleDropdown()
                } else {
                    setFocusedIndex((prev) => {
                        const next = prev + 1
                        return next >= totalOptions ? 0 : next
                    })
                }
                break

            case 'ArrowUp':
                event.preventDefault()
                if (!isOpen) {
                    handleToggleDropdown()
                } else {
                    setFocusedIndex((prev) => {
                        const next = prev - 1
                        return next < 0 ? totalOptions - 1 : next
                    })
                }
                break

            case 'Home':
                if (isOpen) {
                    event.preventDefault()
                    setFocusedIndex(0)
                }
                break

            case 'End':
                if (isOpen) {
                    event.preventDefault()
                    setFocusedIndex(totalOptions - 1)
                }
                break

            case 'Enter':
            case ' ':
                event.preventDefault()
                if (!isOpen) {
                    handleToggleDropdown()
                } else if (focusedIndex === debugItemIndex && isAdmin) {
                    handleDebugItemSelect()
                } else if (focusedIndex >= 0 && focusedIndex < allRoomTypeOptions.length) {
                    const focusedRoomType = allRoomTypeOptions[focusedIndex]
                    if (focusedRoomType) {
                        handleRoomTypeSelect(focusedRoomType)
                    }
                }
                break

            case 'Escape':
                if (isOpen) {
                    event.preventDefault()
                    setIsOpen(false)
                    setFocusedIndex(-1)
                    buttonRef.current?.focus()
                }
                break

            default:
                break
        }
    }

    return (
        <div className="RoomTypeSelector">
            <button
                className={classNames('RoomTypeSelector__trigger', {
                    'RoomTypeSelector__trigger--open': isOpen,
                })}
                onClick={handleToggleDropdown}
                onKeyDown={handleKeyDown}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={isOpen ? dropdownId : undefined}
                type="button"
                ref={buttonRef}
                id={triggerId}
            >
                {isDebugSelected ? t('common.debug') : selectedRoomType && getRoomTypeDisplayName(selectedRoomType, t)}
                <SSRIcon
                    paths={chevronDownIcon}
                    className={classNames('RoomTypeSelector__chevron', {
                        'RoomTypeSelector__chevron--open': isOpen,
                    })}
                />
            </button>

            {isOpen && (
                <div ref={dropdownContainerRef}>
                    <RoomTypeDropdown
                        onRoomTypeSelect={handleRoomTypeSelect}
                        onClose={() => {
                            setIsOpen(false)
                            setFocusedIndex(-1)
                            buttonRef.current?.focus()
                        }}
                        focusedIndex={focusedIndex}
                        dropdownId={dropdownId}
                        triggerId={triggerId}
                        getOptionId={getOptionId}
                        isAdmin={isAdmin}
                        isDebugSelected={isDebugSelected}
                        onDebugSelect={handleDebugItemSelect}
                        debugItemIndex={debugItemIndex}
                    />
                </div>
            )}
        </div>
    )
}
