import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import Tooltip from 'components/Tooltip'
import { useOutsideAlerter } from 'hooks'
import { useModalFocus } from 'hooks/aria/useModalFocus'
import { ColorGroupIds, useWallColorsGradients } from './constants'

require('./styles.scss')

const PALETTE_COLUMNS = 6

interface WallColorsPickerProps {
    onColorSelect?: (groupId: string, colorIndex: number) => void
    onClose?: () => void
    isOpen?: () => void
    initialGroupId?: string | null
    initialColorIndex?: number | null
}

export const WallColorsPicker = ({
    onColorSelect,
    onClose,
    isOpen,
    initialGroupId,
    initialColorIndex,
}: WallColorsPickerProps) => {
    const { t } = useTranslation()
    const wallColorsGradients = useWallColorsGradients()

    const hasInitialSelection = initialGroupId != null && initialColorIndex != null

    const [groupSelected, setGroupSelected] = useState(initialGroupId ?? wallColorsGradients[0].id)
    const [selectedSwatchIndex, setSelectedSwatchIndex] = useState<
        | {
              [key in keyof typeof ColorGroupIds]?: number
          }
        | null
    >(hasInitialSelection ? { [initialGroupId as keyof typeof ColorGroupIds]: initialColorIndex } : null)
    const [focusedSwatchIndex, setFocusedSwatchIndex] = useState(initialColorIndex ?? 0)

    const groupRefs = useRef<(HTMLButtonElement | null)[]>([])
    const swatchRefs = useRef<(HTMLButtonElement | null)[]>([])
    const wallColorsPickerRef = useRef<HTMLDivElement>(null)

    const handleClose = () => {
        onClose?.()
    }

    useOutsideAlerter({
        ref: wallColorsPickerRef,
        onClickOutside: handleClose,
        enableEscapeKey: !!onClose,
    })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    useModalFocus(!!onClose, wallColorsPickerRef)

    const selectedGroup = wallColorsGradients.find((group) => group.id === groupSelected)
    const selectedGroupIndex = wallColorsGradients.findIndex((group) => group.id === groupSelected)

    const colors = selectedGroup?.colors ?? []

    const colorName =
        selectedSwatchIndex?.[groupSelected as keyof typeof ColorGroupIds] !== undefined
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              colors[selectedSwatchIndex[groupSelected as keyof typeof ColorGroupIds]!]?.COLOR_NAME
            : null

    const handleGroupSelect = (groupId: keyof typeof ColorGroupIds) => {
        setGroupSelected(groupId)
        setFocusedSwatchIndex(selectedSwatchIndex?.[groupId] ?? 0)
        swatchRefs.current = []
    }

    const handleColorSelect = (index: number) => {
        setSelectedSwatchIndex({ [groupSelected]: index })
        setFocusedSwatchIndex(index)
        if (groupSelected !== null) {
            onColorSelect?.(groupSelected, index)
        }
    }

    const handleGroupKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        const total = wallColorsGradients.length
        let nextIndex = selectedGroupIndex

        switch (e.key) {
            case 'ArrowRight':
                nextIndex = (selectedGroupIndex + 1) % total
                break
            case 'ArrowLeft':
                nextIndex = (selectedGroupIndex - 1 + total) % total
                break
            case 'Home':
                nextIndex = 0
                break
            case 'End':
                nextIndex = total - 1
                break
            default:
                return
        }

        e.preventDefault()
        handleGroupSelect(wallColorsGradients[nextIndex].id as keyof typeof ColorGroupIds)
        groupRefs.current[nextIndex]?.focus()
    }

    const handleSwatchKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        const total = colors.length
        let nextIndex = focusedSwatchIndex

        switch (e.key) {
            case 'ArrowRight':
                nextIndex = (focusedSwatchIndex + 1) % total
                break
            case 'ArrowLeft':
                nextIndex = (focusedSwatchIndex - 1 + total) % total
                break
            case 'ArrowDown':
                nextIndex =
                    focusedSwatchIndex + PALETTE_COLUMNS < total
                        ? focusedSwatchIndex + PALETTE_COLUMNS
                        : focusedSwatchIndex
                break
            case 'ArrowUp':
                if (focusedSwatchIndex - PALETTE_COLUMNS >= 0) {
                    nextIndex = focusedSwatchIndex - PALETTE_COLUMNS
                } else {
                    // If there are not enough items above, move focus to the group selector
                    e.preventDefault()
                    groupRefs.current[selectedGroupIndex]?.focus()
                    return
                }
                break
            case 'Home':
                nextIndex = 0
                break
            case 'End':
                nextIndex = total - 1
                break
            case ' ':
            case 'Enter':
                e.preventDefault()
                handleColorSelect(focusedSwatchIndex)
                return
            default:
                return
        }

        e.preventDefault()
        setFocusedSwatchIndex(nextIndex)
        swatchRefs.current[nextIndex]?.focus()
    }

    useEffect(() => {
        if (isOpen) {
            const selectedSwatch =
                swatchRefs.current[selectedSwatchIndex?.[groupSelected as keyof typeof ColorGroupIds] ?? 0]
            const previousSelectedGroup = wallColorsGradients
                .map((wallColorGradient) => wallColorGradient.id)
                .find(
                    (id) => selectedSwatchIndex?.[id as keyof typeof ColorGroupIds] !== undefined,
                ) as keyof typeof ColorGroupIds

            const previousSelectedIndex = selectedSwatchIndex?.[previousSelectedGroup]
            handleGroupSelect(previousSelectedGroup)

            if (selectedSwatch) {
                setFocusedSwatchIndex(previousSelectedIndex ?? 0)
                setTimeout(() => {
                    selectedSwatch.focus()
                    swatchRefs.current[previousSelectedIndex ?? 0]?.focus()
                }, 100)
            }
        }
    }, [isOpen])

    return (
        <div ref={wallColorsPickerRef} className="WallColorsPickerContainer">
            <div className="WallColorsPicker">
                <div className="WallColorsPicker__section">
                    <div className="WallColorsPicker__title">
                        <span>{colorName}</span>
                    </div>

                    <div className="WallColorsPicker__color-groups-wrapper">
                        <div
                            className="WallColorsPicker__color-groups"
                            role="radiogroup"
                            aria-label={t('design.wall color')}
                        >
                            {wallColorsGradients.map((group, index) => (
                                <Tooltip
                                    data-tooltip
                                    key={group.id}
                                    describedById="WallColorsPickerTooltipGroup"
                                    place="top"
                                    title={group.id}
                                    boundaryContainerID="GroupSelector"
                                >
                                    <button
                                        key={group.id}
                                        ref={(el) => {
                                            groupRefs.current[index] = el
                                        }}
                                        type="button"
                                        role="radio"
                                        className={classNames('WallColorsPicker__color-group', {
                                            isSelected: group.id === groupSelected,
                                        })}
                                        onClick={() => handleGroupSelect(group.id as keyof typeof ColorGroupIds)}
                                        onKeyDown={handleGroupKeyDown}
                                        tabIndex={group.id === groupSelected ? 0 : -1}
                                        aria-checked={group.id === groupSelected}
                                        aria-label={`${t('design.wall color')} ${index + 1}`}
                                    >
                                        <div
                                            className={classNames({
                                                isSelected: group.id === groupSelected,
                                            })}
                                            style={{
                                                background: `linear-gradient(to right, rgb(${group.fromColor.join(
                                                    ',',
                                                )}), rgb(${group.toColor.join(',')}))`,
                                            }}
                                        />
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                    </div>

                    <div className="WallColorsPicker__color-palette-wrapper">
                        <div
                            className="WallColorsPicker__color-palette"
                            role="radiogroup"
                            aria-label={t('design.wall color')}
                        >
                            {colors.map(({ UI_COLOR, COLOR_NAME }, index) => (
                                <Tooltip
                                    key={UI_COLOR.toString()}
                                    describedById="WallColorsPickerTooltip"
                                    place="bottom"
                                    title={COLOR_NAME}
                                    boundaryContainerID="WallColors"
                                >
                                    <button
                                        ref={(el) => {
                                            swatchRefs.current[index] = el
                                        }}
                                        title={COLOR_NAME}
                                        role="radio"
                                        className={classNames('WallColorsPicker__color-swatch', {
                                            isSelected:
                                                index ===
                                                selectedSwatchIndex?.[groupSelected as keyof typeof ColorGroupIds],
                                        })}
                                        onClick={() => handleColorSelect(index)}
                                        onKeyDown={handleSwatchKeyDown}
                                        tabIndex={index === focusedSwatchIndex ? 0 : -1}
                                        aria-checked={
                                            index === selectedSwatchIndex?.[groupSelected as keyof typeof ColorGroupIds]
                                        }
                                        aria-label={COLOR_NAME}
                                    >
                                        <div
                                            className={classNames({
                                                isSelected:
                                                    index ===
                                                    selectedSwatchIndex?.[groupSelected as keyof typeof ColorGroupIds],
                                            })}
                                            style={{
                                                backgroundColor: `rgb(${UI_COLOR[0]}, ${UI_COLOR[1]}, ${UI_COLOR[2]})`,
                                            }}
                                        />
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
