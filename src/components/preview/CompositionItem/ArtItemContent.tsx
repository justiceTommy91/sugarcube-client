import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { GeomViewer, Placement } from 'Renderer/geomviewer'
import { usePrevious } from 'hooks'
import { useIsDragging } from 'Renderer/ui/hooks'
import { cornersToCenterPointXY } from 'utils/ui'
import { extractPlacementFrom3dCompositionProps } from 'utils/geomviewer_utils'
import { VIEWER_REJECTED, TRASH_CAN } from 'models/tracking/constants'
import ActionPanelContainer from 'containers/design/ActionPanelContainer'
import ProductPin from 'components/ProductPin'
import ProductDimensions from 'components/ProductDimensions'
import type { ExtendedArtItem, ImageCache } from './types'
import { useDeleteSceneItemOnUnmount } from './useDeleteSceneItemOnUnmount'

require('components/CompositionArtItem.scss')

type ArtItemContentProps = {
    renderItem: ExtendedArtItem
    artImageData: ImageCache
    showDot: boolean
    revealDots: boolean
    onSelect: (e?: React.MouseEvent | null) => void
    onDelete: ((removedFrom: string) => void) | null
    onDuplicate: () => void
    showMissingWallsModal: () => void
}

export const ArtItemContent: React.FC<ArtItemContentProps> = ({
    renderItem,
    artImageData,
    showDot,
    revealDots,
    onSelect,
    onDelete,
    onDuplicate,
    showMissingWallsModal,
}) => {
    const { isDragging: isDraggingRenderItem } = useIsDragging()
    const [initializedInViewer, setInitializedInViewer] = useState(false)
    const initializedRef = useRef(false)
    const prevRenderItem = usePrevious(renderItem)

    // Initialize in viewer - useLayoutEffect runs synchronously after render,
    // matching the timing of class component's componentDidUpdate
    useLayoutEffect(() => {
        if (initializedRef.current) return
        if (!artImageData) return

        const { uniqueId, x, y, size, frame, isAddedFromDuplicate } = renderItem

        const savedCompositionPlacement = extractPlacementFrom3dCompositionProps(renderItem)
        const smartaPlacement = renderItem.smartaPlacement as Placement | undefined
        const initialPlacement = smartaPlacement || savedCompositionPlacement

        const imageData = { ...artImageData }
        if (isAddedFromDuplicate) {
            imageData.msFileDownloadTime = 0
        }

        const result = GeomViewer.bindings?.addSceneItem(String(uniqueId), {
            itemKind: `art-item`,
            legacyPosition: x !== null && y !== null ? [x, y] : undefined,
            itemOptions: {
                image: imageData,
                size: size.height,
                frameData: frame,
            },
            placement: initialPlacement,
        })

        if (!result?.ok) {
            showMissingWallsModal()
            onDelete?.(VIEWER_REJECTED)
            return
        }

        initializedRef.current = true
        setInitializedInViewer(true)
        // Intentionally only depends on artImageData - we initialize once when image data arrives.
        // The initializedRef guard prevents re-initialization if other props change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [artImageData])

    useEffect(() => {
        if (!prevRenderItem) return

        const hasFrameUpdated =
            renderItem.size.height !== prevRenderItem.size.height ||
            renderItem.frame.id !== prevRenderItem.frame.id ||
            (renderItem.frame.color &&
                (renderItem.frame.color.hex !== prevRenderItem.frame.color?.hex ||
                    renderItem.frame.color.material !== prevRenderItem.frame.color?.material)) ||
            (renderItem.frame.matte && renderItem.frame.matte.id !== prevRenderItem.frame.matte?.id)

        if (hasFrameUpdated) {
            GeomViewer.bindings?.modifySceneItem(String(renderItem.uniqueId), {
                modifyArtItem: { frameData: renderItem.frame, size: renderItem.size.height },
            })
        }

        if (
            renderItem.readyAndRendered !== prevRenderItem.readyAndRendered &&
            renderItem.selected &&
            initializedInViewer
        ) {
            GeomViewer.bindings?.selectSceneItem(String(renderItem.uniqueId))
        }
    }, [renderItem, prevRenderItem, initializedInViewer])

    useDeleteSceneItemOnUnmount(renderItem.uniqueId)

    const { selected, localItemNumber, corners, readyAndRendered, id, uniqueId } = renderItem

    if (!corners) {
        return null
    }

    const showActionPanel = selected && readyAndRendered && !isDraggingRenderItem

    return (
        <>
            {showActionPanel && (
                <ActionPanelContainer
                    onDelete={onDelete ? () => onDelete(TRASH_CAN) : null}
                    onDuplicate={onDuplicate}
                    localItemNumber={localItemNumber}
                    productId={id}
                    furnitureId={uniqueId}
                    showRotateByDefault={false}
                />
            )}
            <ProductPin
                testId={`${renderItem.name} - ${renderItem.description}`}
                data-product-name={renderItem.name}
                data-product-description={renderItem.description}
                onClick={() => onSelect()}
                enabled={showDot}
                visible={revealDots}
                positionRelative={cornersToCenterPointXY(corners)}
            />
            <ProductDimensions itemId={String(uniqueId)} />
        </>
    )
}
