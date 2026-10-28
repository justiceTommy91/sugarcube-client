import React, { useCallback, useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import rotate from '@ingka/ssr-icon/paths/rotate'
import trashCan from '@ingka/ssr-icon/paths/trash-can'
import { GeomViewer } from '@gatsby/Renderer/geomviewer'
import { useSelectedItemId } from '@gatsby/Renderer/ui/hooks/useSelectedItemId'
import { useRenderItems } from '@gatsby/Renderer/ui/hooks/useRenderItems'
import { RotateSlider } from '@gatsby/components/design/ActionPanel/RotateSlider'
import { convertDegToRad, convertRadToDeg } from 'utils/convertRotation'
import { useSceneContext } from './SceneContext'
import './ItemActionBar.scss'

const FLOOR_PLACING_BEHAVIOR = 'Floor'

/** Shape that viewer-only (non-Redux) render items may carry. */
interface ExtendedRenderItem {
    itemId?: string
    itemData?: {
        placingBehavior?: string
        heading?: number
    }
}

interface ItemActionBarProps {
    magicEraserMode: boolean
}

export const ItemActionBar = ({ magicEraserMode }: ItemActionBarProps) => {
    const { t } = useTranslation()
    const { tracker } = useSceneContext()
    const selectedItemId = useSelectedItemId()
    const renderItems = useRenderItems()
    const [isSliderOpen, setIsSliderOpen] = useState(false)
    // Key used to force-remount RotateSlider when external rotation changes
    const [sliderKey, setSliderKey] = useState(0)
    // True while the range slider is being pointer-dragged (continuous interaction).
    const isDraggingSlider = useRef(false)
    // True while the degree number input has focus (typing would be destroyed by remount).
    const isDegreeInputFocused = useRef(false)

    const selectedItem = selectedItemId
        ? renderItems?.find((item) => {
              const ext = item as typeof item & ExtendedRenderItem
              return String(item.uniqueId) === selectedItemId || ext.itemId === selectedItemId
          })
        : null

    // placingBehavior is top-level for Redux items, nested in itemData for viewer-only items
    const ext = selectedItem as (typeof selectedItem & ExtendedRenderItem) | null
    const placingBehavior = selectedItem?.placingBehavior ?? ext?.itemData?.placingBehavior
    const isFloorItem = !placingBehavior || placingBehavior === FLOOR_PLACING_BEHAVIOR

    const handleRotateToggle = useCallback(() => {
        setIsSliderOpen((prev) => !prev)
    }, [])

    const handlePointerDown = useCallback(() => {
        isDraggingSlider.current = true
        if (!selectedItemId) return
        GeomViewer.bindings?.modifySceneItem(selectedItemId, {
            modifyFurnitureItem: { editOrientationStatus: `begin` },
        })
    }, [selectedItemId])

    const handlePointerUp = useCallback(() => {
        isDraggingSlider.current = false
        if (!selectedItemId) return
        GeomViewer.bindings?.modifySceneItem(selectedItemId, {
            modifyFurnitureItem: { editOrientationStatus: `end` },
        })
        tracker.markDirty()
    }, [selectedItemId, tracker])

    const handleChange = useCallback(
        (headingDeg: number) => {
            if (!selectedItemId) return
            GeomViewer.bindings?.modifySceneItem(selectedItemId, {
                modifyFurnitureItem: { newOrientation: convertDegToRad(headingDeg) },
            })
        },
        [selectedItemId],
    )

    const handleDelete = useCallback(() => {
        if (!selectedItemId) return
        GeomViewer.bindings?.deleteSceneItem(selectedItemId)
        tracker.unregisterItem(selectedItemId)
        tracker.markDirty()
        setIsSliderOpen(false)
    }, [selectedItemId, tracker])

    // Reset slider state when selection changes
    useEffect(() => {
        setIsSliderOpen(false)
        setSliderKey(0)
        isDraggingSlider.current = false
        isDegreeInputFocused.current = false
    }, [selectedItemId])

    const heading = selectedItem?.heading ?? ext?.itemData?.heading ?? 0
    const initialHeadingDeg = Math.round(convertRadToDeg(heading))

    // When the item's heading changes due to external forces (wall snap during drag),
    // force-remount the slider so it reflects the real rotation — but skip the remount
    // while the user is actively dragging the range slider OR has the degree input focused
    // (remounting would interrupt continuous interaction or destroy the focused input).
    const prevHeadingRef = useRef(initialHeadingDeg)
    useEffect(() => {
        if (
            !isDraggingSlider.current &&
            !isDegreeInputFocused.current &&
            prevHeadingRef.current !== initialHeadingDeg
        ) {
            prevHeadingRef.current = initialHeadingDeg
            setSliderKey((k) => k + 1)
        } else {
            prevHeadingRef.current = initialHeadingDeg
        }
    }, [initialHeadingDeg])

    if (!selectedItem || magicEraserMode) return null

    return (
        <div className="ItemActionBar">
            {isFloorItem && (
                <button
                    className={classNames('ItemActionBar__pill-button', 'ItemActionBar__pill-button--rotate')}
                    onClick={handleRotateToggle}
                    aria-label={t('design.rotate furniture')}
                    aria-pressed={isSliderOpen}
                >
                    <SSRIcon paths={rotate} />
                </button>
            )}

            <button
                className={classNames('ItemActionBar__pill-button', 'ItemActionBar__pill-button--delete', {
                    'ItemActionBar__pill-button--hidden': isSliderOpen,
                    'ItemActionBar__pill-button--delete-only': !isFloorItem,
                })}
                onClick={handleDelete}
                aria-label={t('design.delete furniture')}
            >
                <SSRIcon paths={trashCan} />
            </button>

            {isFloorItem && (
                <div
                    className={classNames('ItemActionBar__slider-wrapper', {
                        'ItemActionBar__slider-wrapper--visible': isSliderOpen,
                    })}
                    aria-hidden={!isSliderOpen}
                    onFocus={(e) => {
                        // Only guard remounts when the degree number input is focused —
                        // spinner button clicks are discrete and should not block wall snap updates.
                        if ((e.target as HTMLInputElement).type === 'number') {
                            isDegreeInputFocused.current = true
                        }
                    }}
                    onBlur={(e) => {
                        // Clear as soon as the number input itself loses focus, regardless of
                        // where focus goes next (even to a spinner button inside the wrapper).
                        if ((e.target as HTMLInputElement).type === 'number') {
                            isDegreeInputFocused.current = false
                        }
                    }}
                >
                    <RotateSlider
                        key={sliderKey}
                        initialHeading={initialHeadingDeg}
                        onChange={handleChange}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                    />
                </div>
            )}
        </div>
    )
}
