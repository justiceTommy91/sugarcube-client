import React, { useEffect } from 'react'
import { useAppSelector } from 'hooks'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { CONTEXT_QUICK } from 'constants/contexts'
import * as RenderItemTypes from 'constants/renderItemTypes'
import { getPreviewSettings } from 'models/preview/selectors'
import { getSelectedRenderItemGroup } from 'models/compositions/selectors'
import {
    useHoveredItemId,
    useSelectedItemId,
    useIsDragging,
    useIsPlacementMode,
} from 'Renderer/ui/hooks'
import { DELETE_KEY } from 'models/tracking/constants'
import type { ExtendedRenderItem, ExtendedArtItem, ExtendedFurnitureItem, CompositionItemProps } from './types'
import { useRenderItemActions } from './useRenderItemActions'
import { ArtItemContent } from './ArtItemContent'
import { FurnitureItemContent } from './FurnitureItemContent'

function useShowDot(renderItem: ExtendedRenderItem, revealDots: boolean) {
    const { isMobile } = useSugarcubeContext()
    const selectedRenderItemId = useSelectedItemId()
    const { isDragging } = useIsDragging()
    const isPlacementMode = useIsPlacementMode()
    const { onOffOptions } = useAppSelector(getPreviewSettings)
    const { pin, isNoninteractable } = renderItem

    return (
        (revealDots || isMobile || !selectedRenderItemId) &&
        !isDragging &&
        !onOffOptions.magicEraserMode &&
        !isPlacementMode &&
        !isNoninteractable &&
        !pin?.hidePin &&
        !pin?.itemIsHidden
    )
}

function useKeyboardDelete(renderItem: ExtendedRenderItem, onDelete: ((removedFrom: string) => void) | null) {
    useEffect(() => {
        if (!onDelete) return undefined

        const handleKeyDown = (e: KeyboardEvent) => {
            const { selected } = renderItem
            const isDeleteKey = e.keyCode === 8 || e.keyCode === 46
            if (!selected || !isDeleteKey) return

            const combinablePlacement = (renderItem as ExtendedFurnitureItem).combinablePlacement
            const activeEl = document.activeElement as HTMLElement | null
            const isInputFocused = activeEl && (
                activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                activeEl.contentEditable === 'true' ||
                activeEl.getAttribute('role') === 'textbox'
            )

            const canDelete = renderItem.renderType === RenderItemTypes.ART_ITEM
                || (!combinablePlacement?.parentId && !isInputFocused)

            if (canDelete) {
                e.stopPropagation()
                e.preventDefault()
                onDelete(DELETE_KEY)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [renderItem, onDelete])
}

/**
 * CompositionItem - Unified functional component for render items in the 3D viewer.
 *
 * This component consolidates the legacy class-based CompositionRenderItemContainer,
 * CompositionArtItem, and CompositionFurnitureItem into a single functional component.
 *
 * The component bridges React state with GeomViewer by:
 * 1. Adding items to the 3D scene on mount via GeomViewer.bindings.addSceneItem
 * 2. Syncing selection state between Redux and GeomViewer
 * 3. Removing items from scene on unmount
 * 4. Handling user interactions through action dispatches
 *
 * Used by PreviewVC within the Viewport overlay to render interactive product controls.
 */
export const CompositionItem: React.FC<CompositionItemProps> = ({
    renderItem,
    parentItem,
    compositionId,
    customContext,
    artImageData,
    revealDots = false,
    showRotateByDefault = false,
}) => {
    const { isMobile } = useSugarcubeContext()
    const extendedRenderItem = renderItem as ExtendedRenderItem

    const previewSettings = useAppSelector(getPreviewSettings)
    const isPlacementMode = useIsPlacementMode()
    const hoveredItemId = useHoveredItemId()
    const renderItemGroup = useAppSelector(getSelectedRenderItemGroup)

    const actions = useRenderItemActions(extendedRenderItem, compositionId)
    const showDot = useShowDot(extendedRenderItem, revealDots)
    const isReg = customContext !== CONTEXT_QUICK
    const disableDrag = isPlacementMode || previewSettings.onOffOptions.magicEraserMode
    const isHovered = hoveredItemId === String(renderItem.uniqueId)

    useKeyboardDelete(extendedRenderItem, isReg ? actions.removeRenderItem : null)

    if (renderItem.renderType === RenderItemTypes.ART_ITEM) {
        return (
            <ArtItemContent
                renderItem={renderItem as ExtendedArtItem}
                artImageData={artImageData}
                showDot={showDot}
                revealDots={revealDots}
                onSelect={actions.selectRenderItem}
                onDelete={isReg ? actions.removeRenderItem : null}
                onDuplicate={actions.duplicateRenderItem}
                showMissingWallsModal={actions.showMissingWallsModal}
            />
        )
    }

    if (renderItem.renderType === RenderItemTypes.FURNITURE_ITEM) {
        return (
            <FurnitureItemContent
                renderItem={renderItem as ExtendedFurnitureItem}
                renderItemGroup={(renderItemGroup || []) as (ExtendedRenderItem & { thumbUrl?: string; subCategoryIds?: string[] } | undefined)[]}
                parentItem={parentItem as ExtendedRenderItem}
                showDot={showDot}
                revealDots={revealDots}
                showRotateByDefault={showRotateByDefault}
                onSelect={actions.selectRenderItem}
                onDelete={isReg ? actions.removeRenderItem : null}
                onDuplicate={actions.duplicateRenderItem}
                onMirror={actions.mirrorRenderItem}
                onUpdate={actions.updateRenderItem}
                onDragStart={isMobile ? () => { } : actions.onDragStart}
                onDragFinish={isMobile ? () => { } : actions.onDragFinish}
                trackSnapRotateClick={actions.trackSnapRotateClick}
                showMissingWallsModal={actions.showMissingWallsModal}
                debugConsoleLog={actions.debugConsoleLog}
                disableDrag={disableDrag}
                isHovered={isHovered}
            />
        )
    }

    return null
}

export default CompositionItem
