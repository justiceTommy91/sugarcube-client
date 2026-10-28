import React, { useState, useEffect, useCallback, useMemo } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { GeomViewer, PlacingBehavior } from 'Renderer/geomviewer'
import { usePrevious } from 'hooks'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { useIsDragging, useIsPlacementMode } from 'Renderer/ui/hooks'
import { cornersToBoxStyle } from 'utils/ui'
import {
    extractPlacementFrom3dCompositionProps,
    furniturePropsToFurnitureItemParams,
    extractPlacementForDuplicateItem,
} from 'utils/geomviewer_utils'
import { browserSupportsPreload, preloadAsset } from 'models/compositions/utils'
import { VIEWER_REJECTED, TRASH_CAN } from 'models/tracking/constants'
import { SMARTA_STATUS_PENDING } from 'constants/stateTypes'
import ActionPanelContainer from 'containers/design/ActionPanelContainer'
import ProductPin from 'components/ProductPin'
import ProductDimensions from 'components/ProductDimensions'
import type { RenderItemComplete } from 'models/compositions'
import { findSocketProductGeometry } from 'models/furniture/helpers'
import { createMatrix4Elements } from 'Renderer/geometry/utilities'
import type { ExtendedRenderItem, ExtendedFurnitureItem } from './types'
import { padCornersBottom } from './utils'
import { useDeleteSceneItemOnUnmount } from './useDeleteSceneItemOnUnmount'

require('components/CompositionFurnitureItem.scss')

type SelectableChildItem = {
    id: number
    thumbUrl?: string
    isSelected: boolean
    subCategoryIds: string[]
    onSelect: (e: React.MouseEvent) => void
}

type RenderItemGroupItem = ExtendedRenderItem & {
    thumbUrl?: string
    subCategoryIds?: string[]
}

type FurnitureItemContentProps = {
    renderItem: ExtendedFurnitureItem
    renderItemGroup: (RenderItemGroupItem | undefined)[]
    parentItem?: ExtendedRenderItem
    showDot: boolean
    revealDots: boolean
    showRotateByDefault: boolean
    onSelect: (e?: React.MouseEvent | null, idParams?: { uniqueId: number; id: number } | null) => void
    onDelete: ((removedFrom: string) => void) | null
    onDuplicate: () => void
    onMirror: () => void
    onUpdate: (item: Partial<RenderItemComplete>) => void
    onDragStart: () => void
    onDragFinish: () => void
    trackSnapRotateClick: () => void
    showMissingWallsModal: () => void
    debugConsoleLog: (category: string, message: string) => void
    disableDrag: boolean
    isHovered: boolean
}

export const FurnitureItemContent: React.FC<FurnitureItemContentProps> = ({
    renderItem,
    renderItemGroup,
    parentItem,
    showDot,
    revealDots,
    showRotateByDefault,
    onSelect,
    onDelete,
    onDuplicate,
    onMirror,
    onUpdate,
    onDragStart,
    onDragFinish,
    trackSnapRotateClick,
    showMissingWallsModal,
    debugConsoleLog,
    disableDrag,
    isHovered,
}) => {
    const { t } = useTranslation()
    const { isMobile } = useSugarcubeContext()
    const isPlacementMode = useIsPlacementMode()
    const { isDragging: isDraggingRenderItem } = useIsDragging()

    const [rotating, setRotating] = useState(false)
    const prevRenderItem = usePrevious(renderItem)

    // Add render item to scene
    const addRenderItemToScene = useCallback(() => {
        const { uniqueId, x, y, p3 } = renderItem

        const savedCompositionPlacement = extractPlacementFrom3dCompositionProps(renderItem)
        const smartaPlacement = renderItem.smartaPlacement && JSON.parse(JSON.stringify(renderItem.smartaPlacement))
        const forDuplicatePlacement = extractPlacementForDuplicateItem(renderItem)

        const initialPlacement = smartaPlacement || savedCompositionPlacement || forDuplicatePlacement

        const itemOptions = furniturePropsToFurnitureItemParams(renderItem as unknown as Record<string, unknown>)

        const socketName = renderItem.combinablePlacement?.socketName as string | undefined
        const parentFurnitureItem = parentItem as ExtendedFurnitureItem | undefined
        const sockets = parentFurnitureItem?.combinablesSocketSet?.sockets

        if (socketName && sockets) {
            const geom = findSocketProductGeometry(socketName, renderItem, parentFurnitureItem, sockets)
            if (geom) {
                Object.assign(itemOptions, {
                    modelUrl: geom.modelUrl,
                    materialUrl: renderItem.materialUrl,
                    min: { x: geom.minX, y: geom.minY, z: geom.minZ },
                    max: { x: geom.maxX, y: geom.maxY, z: geom.maxZ },
                    scale: geom.scale,
                    rotX: geom.rotX,
                })
            }

            // Use parent's socket transform as a local transform of a combinable item
            const socket = sockets.find((s) => s.name === socketName)
            if (itemOptions.combinablePlacement && socket) {
                const socketLocalTranform = createMatrix4Elements({ x: socket.x, y: socket.y, z: socket.z }, [
                    socket.headingI,
                    socket.headingJ,
                    socket.headingK,
                    socket.headingW,
                ])

                const combPlacement = {
                    parentId: itemOptions.combinablePlacement.parentId,
                    localTransform: socketLocalTranform,
                    linkGroupName: itemOptions.combinablePlacement.linkGroupName,
                    socketName: itemOptions.combinablePlacement.socketName,
                }
                Object.assign(itemOptions, { combinablePlacement: combPlacement })
            }

            if (browserSupportsPreload() && itemOptions.modelUrl) {
                preloadAsset(itemOptions.modelUrl)
            }
        } else if (renderItem.socket) {
            return
        }

        const result = GeomViewer.bindings?.addSceneItem(String(uniqueId), {
            itemKind: `furniture-item`,
            restoredPosition: p3 ? [p3.x, p3.y, p3.z] : undefined,
            legacyPosition: x !== null && y !== null ? [x, y] : undefined,
            currentSnapRotationIndex: renderItem.anchorCombinationIndex as number | undefined,
            itemOptions,
            placement: initialPlacement,
        })

        if (!result?.ok) {
            showMissingWallsModal()
            onDelete?.(VIEWER_REJECTED)
        }
    }, [renderItem, parentItem, debugConsoleLog, showMissingWallsModal, onDelete])

    const handleRotateStart = useCallback(() => {
        if (!isMobile && onDragStart) {
            onDragStart()
        }

        GeomViewer.bindings?.modifySceneItem(String(renderItem.uniqueId), {
            modifyFurnitureItem: {
                editOrientationStatus: `begin`,
            },
        })

        setRotating(true)
    }, [renderItem.uniqueId, isMobile, onDragStart])

    const handleRotate = useCallback(
        (heading: number) => {
            GeomViewer.bindings?.modifySceneItem(String(renderItem.uniqueId), {
                modifyFurnitureItem: { newOrientation: heading },
            })
        },
        [renderItem.uniqueId],
    )

    const handleRotateFinish = useCallback(() => {
        if (!isMobile && onDragFinish) {
            onDragFinish()
        }

        GeomViewer.bindings?.modifySceneItem(String(renderItem.uniqueId), {
            modifyFurnitureItem: {
                editOrientationStatus: `end`,
            },
        })

        setRotating(false)
    }, [renderItem.uniqueId, isMobile, onDragFinish])

    const handleSnapRotate = useCallback(() => {
        GeomViewer.bindings?.modifySceneItem(String(renderItem.uniqueId), {
            modifyFurnitureItem: {
                toNextSnapRotation: true,
            },
        })

        trackSnapRotateClick()
    }, [renderItem.uniqueId, trackSnapRotateClick])

    // Add item to 3D scene on mount only. Re-adding is handled in the update effect
    // when smartaPlacement or combinablePlacement changes.
    useEffect(() => {
        addRenderItemToScene()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!prevRenderItem) return

        const {
            uniqueId,
            mirrorOptionEnabled,
            smartaPlacement,
            smartaPlacementState,
            selected,
            readyAndRendered,
            combinablePlacement,
        } = renderItem

        const {
            mirrorOptionEnabled: mirrorOptionWasEnabled,
            smartaPlacement: oldSmartaPlacement,
            smartaPlacementState: oldSmartaPlacementState,
            readyAndRendered: oldReadyAndRendered,
            combinablePlacement: oldCombinablePlacement,
        } = prevRenderItem

        if (mirrorOptionEnabled !== mirrorOptionWasEnabled) {
            GeomViewer.bindings?.modifySceneItem(String(uniqueId), {
                modifyFurnitureItem: {
                    setIsMirrored: mirrorOptionEnabled,
                },
            })
            onUpdate({ assemblyFlip: mirrorOptionEnabled ? `Right` : `Left` })
        }

        if (
            (!oldSmartaPlacement && smartaPlacement) ||
            (oldSmartaPlacementState !== smartaPlacementState && oldSmartaPlacementState === SMARTA_STATUS_PENDING) ||
            (!oldCombinablePlacement && combinablePlacement)
        ) {
            GeomViewer.bindings?.deleteSceneItem(String(uniqueId))
            addRenderItemToScene()
        }

        if (readyAndRendered !== oldReadyAndRendered && selected) {
            GeomViewer.bindings?.selectSceneItem(String(uniqueId))
        }
    }, [renderItem, prevRenderItem, onUpdate, addRenderItemToScene])

    useDeleteSceneItemOnUnmount(renderItem.uniqueId)

    const {
        heading,
        selected,
        isLeftMost,
        stacks,
        localItemNumber,
        corners,
        readyAndRendered,
        placingBehavior,
        isSnapRotable,
        pin,
        id,
        uniqueId,
    } = renderItem

    const showActionPanel =
        !isMobile && selected && readyAndRendered && corners && !isPlacementMode && (!isDraggingRenderItem || rotating)

    const { isCombinableChild } = renderItem
    const hasCombinablePlugs = renderItem.combinablesPlugs

    const selectableChildren = useMemo(
        () =>
            (renderItemGroup || []).reduce<SelectableChildItem[]>((acc, item) => {
                if (!item || acc.some((i) => i.id === item.id)) return acc
                acc.push({
                    id: item.id,
                    thumbUrl: item.thumbUrl,
                    isSelected: item.id === id,
                    subCategoryIds: item.subCategoryIds || [],
                    onSelect: (e: React.MouseEvent) => {
                        onSelect(e, {
                            uniqueId: item.uniqueId,
                            id: item.id,
                        })
                    },
                })
                return acc
            }, []),
        [renderItemGroup, id, onSelect],
    )

    return (
        <>
            {!disableDrag && (!isCombinableChild || hasCombinablePlugs) && (
                <div className="CompositionFurnitureItem">
                    <div
                        className={classNames('hoverInfoContainer', {
                            isHovered,
                            isLeftMost,
                            selected,
                            isDraggingRenderItem,
                        })}
                        style={
                            corners
                                ? cornersToBoxStyle(
                                      padCornersBottom(corners) as [
                                          [number, number],
                                          [number, number],
                                          [number, number],
                                          [number, number],
                                      ],
                                  )
                                : undefined
                        }
                        onFocus={() => onSelect()}
                    >
                        <div className="tooltip">{t('tooltip.click to access more options')}</div>
                    </div>
                    <ProductPin
                        testId={`${renderItem.name} - ${renderItem.description}`}
                        data-product-description={renderItem.description}
                        data-product-name={renderItem.name}
                        onClick={() => onSelect()}
                        enabled={showDot}
                        visible={revealDots}
                        positionRelative={pin}
                    />
                    <ProductDimensions itemId={String(uniqueId)} />
                </div>
            )}
            {showActionPanel && (
                <ActionPanelContainer
                    heading={heading}
                    onDelete={onDelete && !isCombinableChild ? () => onDelete(TRASH_CAN) : null}
                    onRotateStart={handleRotateStart}
                    onRotate={
                        placingBehavior === PlacingBehavior.ON_FLOOR && !isCombinableChild ? handleRotate : undefined
                    }
                    onRotateFinish={handleRotateFinish}
                    onDuplicate={!isCombinableChild ? onDuplicate : undefined}
                    onMirror={renderItem.mirrorType ? onMirror : undefined}
                    onChangeSurface={stacks ? () => GeomViewer.bindings?.doAction('enter-placement-mode') : undefined}
                    localItemNumber={localItemNumber}
                    toNextSnapRotation={isSnapRotable ? handleSnapRotate : undefined}
                    furnitureId={uniqueId}
                    isCombinableChild={isCombinableChild}
                    showRotateByDefault={showRotateByDefault}
                    selectableChildren={selectableChildren}
                    productId={id}
                    isDragging={!isDraggingRenderItem || rotating}
                />
            )}
        </>
    )
}
