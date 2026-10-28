import React, { useEffect, useContext, useCallback, useMemo } from 'react'
import { usePrevious } from 'hooks'
import classNames from 'classnames'
import * as Sentry from '@sentry/react'
import { withPrefix } from 'gatsby'
import { legacyUserDataToPersistUserData } from 'Renderer/geomviewer/legacy'
import { SENTRY_BREADCRUMB_CATEGORY } from 'Renderer/constants'
import { ViewerContext, useViewerContext } from 'Renderer/ui/components/ViewerContext'
import { Viewport } from 'Renderer/ui/components/Viewport'
import {
    useIsPlacementMode,
    useIsDragging,
    useHoveredItemId,
    useStackableDraggingState,
    useCameraOrbitMode,
    usePlacementIndicatorState,
} from 'Renderer/ui/hooks'

import { withTranslation, Trans } from 'react-i18next'
import WallPaintPinContainer from 'containers/WallPaintPinContainer'
import MissingFeatureModal from 'components/MissingFeatureModal'
import MemoryCharts from 'components/preview/MemoryCharts'
import RoomDimensions from 'components/RoomDimensions'
import DynamicMeasurements from 'components/DynamicMeasurements'
import SugarcubeContext from 'apps/SugarcubeContext'
import { withTrackingBoundary } from 'apps/TrackingBoundary'
import { getRenderer } from 'models/refStore/selectors'
import SSRIcon from '@ingka/ssr-icon'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import SkipLinks from 'components/SkipLinks'
import { BROWSE, DESIGN, HEADER, NAVIGATION } from 'components/SkipLinks/constants'
import { deepCompareViewerSettings } from 'utils/geomviewer_utils'
import { allScenesAreStandard3D } from 'models/scenes/utils'
import type { RenderItemComplete } from 'models/compositions'
import { SOURCETYPE_CAPTURED } from 'models/scenes/constants'
import { CompositionItem } from './CompositionItem'
import { PlacementIndicator } from './PlacementIndicator'
import { PreviewError } from './PreviewError'
import { PreviewLoading } from './PreviewLoading'
import { forwardEventToViewer, stopPropagationFunc } from './utils/viewerEventHandlers'
import { useImageCache } from './hooks/useImageCache'
import { usePlacementModeHandlers } from './hooks/usePlacementModeHandlers'
import type { PreviewProps } from './index'

require('./Preview.scss')

// Inner component that gates composition item rendering on scene readiness.
// Must be a child of ViewerContext to read isSceneReady via the context hook.
const RenderItemOverlay: React.FC<{
    renderItems: RenderItemComplete[]
    compositionId: string
    customContext: string
    imageCache: ReturnType<typeof useImageCache>
}> = ({ renderItems, compositionId, customContext, imageCache }) => {
    const { isSceneReady } = useViewerContext()
    const renderer = getRenderer()
    if (!isSceneReady || !renderer) return null
    return (
        <div
            className="renderItemWrapper"
            style={{ userSelect: 'none', touchAction: 'none' }}
            onMouseMove={stopPropagationFunc}
            onMouseDown={stopPropagationFunc}
            onMouseUp={stopPropagationFunc}
            onPointerMove={forwardEventToViewer}
            onPointerDown={forwardEventToViewer}
            onPointerUp={forwardEventToViewer}
        >
            {renderItems.map((renderItem) => {
                const parentItem = renderItems.find(
                    (item) => item.uniqueId === renderItem.combinablePlacement?.parentId,
                )

                if (renderItem.combinablePlacement?.parentId && !parentItem) {
                    return null
                }

                return (
                    <CompositionItem
                        key={`${renderItem.uniqueId}`}
                        renderItem={renderItem}
                        parentItem={parentItem}
                        compositionId={compositionId}
                        customContext={customContext}
                        artImageData={imageCache[renderItem.id]}
                    />
                )
            })}
        </div>
    )
}

/**
 * PreviewVC - Functional component replacement for the class-based Preview component.
 *
 * This component manages the 3D viewer canvas and render item overlays. It uses the new
 * ViewerContext/Viewport architecture and hooks for viewer state instead of the legacy
 * approach of passing props through deeply nested class components.
 *
 */
const PreviewVCBase: React.FC<PreviewProps> = (props) => {
    const {
        composition,
        customContext,
        canvasWidth,
        canvasHeight,
        maxHeight,
        hasError,
        debugSettings,
        previewSettings,
        clearSelection,
        newRenderer,
        destroyRenderer,
        settings,
        t,
        onUpdateCompositionSaveData,
        hasRendered,
        correctOrientation,
        wallDimensions,
        showMissingWallsModal,
        closeMissingWallsModal,
        onContextLost,
        onContextCreationError,
        onContextRestored,
        setShowDesignSummary,
        onClick,
        productDimensionsEnabled,
        roomDimensionsEnabled,
        dynamicMeasurementsEnabled,
        canvasKey,
    } = props

    // Use hooks instead of Redux-derived props when possible.
    const isPlacementMode = useIsPlacementMode()
    const { isDragging, draggingItemId } = useIsDragging()
    const hoveredItemId = useHoveredItemId()
    const { isStackableDragging: isStackableDraggingMode, isDragDestinationValid } = useStackableDraggingState()
    const { isInOrbitMode: isCameraInOrbitMode, isOrbitMoving: isCameraInOrbitModeMoving } = useCameraOrbitMode()
    const { isInvalidForStackable, isValidHoverForStackable } = usePlacementIndicatorState()

    const imageCache = useImageCache(composition)

    // Track previous values for comparison (like componentDidUpdate prevProps)
    const prevPreviewSettings = usePrevious(previewSettings)

    const { isMobile, isUpptacka } = useContext(SugarcubeContext)

    const handleContextCreationError = useCallback(
        (evt: WebGLContextEvent) => {
            Sentry.captureEvent({
                message: `GL Context creation error`,
                breadcrumbs: [
                    {
                        type: `Error message`,
                        category: SENTRY_BREADCRUMB_CATEGORY,
                        data: {
                            errorMessage: (evt && evt.statusMessage) || `Unknown error`,
                        },
                    },
                ],
            })
            onContextCreationError()
        },
        [onContextCreationError],
    )

    const { onMouseLeave } = usePlacementModeHandlers()

    useEffect(() => () => destroyRenderer(), [destroyRenderer])

    // Handle magic eraser mode selection clearing
    // ViewerContext handles startViewer and settings changes
    useEffect(() => {
        const renderer = getRenderer()

        if (
            renderer &&
            prevPreviewSettings !== undefined &&
            !deepCompareViewerSettings(previewSettings, prevPreviewSettings)
        ) {
            if (previewSettings.onOffOptions.magicEraserMode && !prevPreviewSettings.onOffOptions.magicEraserMode) {
                clearSelection()
            }
        }
    }, [previewSettings, prevPreviewSettings, clearSelection])

    // Create persistUserData from composition
    const persistUserData = useMemo(() => {
        if (!composition) return undefined
        const { savedProperties } = composition
        const uncachedSavedProperties = {
            ...savedProperties,
            wallPaint: composition.wallPaint as Record<string, string | number>,
            wallPaintInpaint: composition.wallPaintInpaint as Record<string, string | number>,
            measurements: {
                roomDimensions: roomDimensionsEnabled,
                productDimensions: productDimensionsEnabled,
                dynamicMeasurements: dynamicMeasurementsEnabled,
            },
        }
        return legacyUserDataToPersistUserData(uncachedSavedProperties)
    }, [composition, roomDimensionsEnabled, productDimensionsEnabled, dynamicMeasurementsEnabled])

    const { disablePins } = debugSettings

    const is3DCapture = allScenesAreStandard3D(composition?.scene)
    const sceneHeight = is3DCapture
        ? `${(maxHeight / canvasWidth) * 100}%`
        : `${(wallDimensions.height / (wallDimensions.width || 1)) * 100}%`

    const key = composition?.scene?.sceneId ?? null
    const renderItems = composition?.renderItems ?? []

    const isOwnRoom = composition?.scene?.sourceType === SOURCETYPE_CAPTURED
    const hasWallPaint =
        (!isMobile || !previewSettings.mobileFeatures.noWallColor) &&
        (!isOwnRoom || is3DCapture || previewSettings.featureFlags.webOwnRoomWallColor) &&
        (!is3DCapture || previewSettings.featureFlags.helaWallColor) &&
        composition?.scene?.hasWallPaint

    const showWallPaintPins =
        hasWallPaint &&
        (isUpptacka || previewSettings.featureFlags.webOwnRoomWallColor || previewSettings.featureFlags.helaWallColor)

    const stackableIndicatorMessage = isInvalidForStackable ? (
        <Trans i18nKey="design.choose a valid surface">Please choose a valid surface</Trans>
    ) : isValidHoverForStackable ? (
        <Trans i18nKey="design.click to select surface">Click to select this surface</Trans>
    ) : (
        <Trans i18nKey="design.select a surface with floor">
            <div>Select a colored surface or place on floor</div>
        </Trans>
    )

    return (
        <div
            className={classNames('Preview PreviewVC', {
                hasRendered,
                mobile: isMobile,
                correctOrientation,
                disablePins,
                isUpptacka,
            })}
            key={key}
            onClick={onClick}
        >
            {!settings.onOffOptions.magicEraserMode && (
                <SkipLinks
                    label={t('accessibility.skiplinks for design')}
                    skipLinks={[BROWSE, HEADER, NAVIGATION]}
                    skipContext={DESIGN}
                />
            )}

            {!hasRendered && hasError && <PreviewError />}
            {!hasRendered && !hasError && <PreviewLoading />}
            {!hasError && (
                <div
                    style={{
                        paddingTop: sceneHeight,
                    }}
                />
            )}
            <ViewerContext
                scene={composition?.scene}
                viewerSettings={previewSettings}
                debugSettings={debugSettings}
                persistUserData={persistUserData}
                onSaveDataUpdate={onUpdateCompositionSaveData}
                onInitialized={newRenderer}
                onContextLost={onContextLost}
                onContextRestored={onContextRestored}
                onContextCreationError={handleContextCreationError}
                externalRestartKey={canvasKey}
            >
                <Viewport
                    // eslint-disable-next-line i18next/no-literal-string
                    canvasId="PreviewCanvas"
                    isItemHovered={!!hoveredItemId}
                    isPlacementMode={isDragging || isPlacementMode}
                    cannotPlaceStackable={!isDragDestinationValid}
                    cameraInOrbitMode={isCameraInOrbitMode && !(!!hoveredItemId || isPlacementMode || isDragging)}
                    cameraInOrbitModeMoving={
                        isCameraInOrbitModeMoving && !(!!hoveredItemId || isPlacementMode || isDragging)
                    }
                    draggingRenderItemId={draggingItemId ? Number(draggingItemId) : undefined}
                >
                    {composition?.scene && (
                        <div
                            className="sceneContainer"
                            onMouseLeave={stopPropagationFunc}
                            onPointerLeave={onMouseLeave}
                            onKeyDown={forwardEventToViewer}
                            style={{
                                paddingTop: sceneHeight,
                            }}
                        >
                            {showMissingWallsModal && (
                                <MissingFeatureModal
                                    onClose={closeMissingWallsModal}
                                    body={t('design.capture walls')}
                                    imgSrc={withPrefix('/images/graphics/wallArt.jpg')}
                                />
                            )}

                            {isMobile && (
                                <button className="nextArrow" onClick={setShowDesignSummary}>
                                    <SSRIcon paths={arrowRight} />
                                </button>
                            )}

                            {isPlacementMode && (
                                <div
                                    className={classNames('stackableIndicator', {
                                        isPlacementMode,
                                        isInvalidForStackable,
                                    })}
                                >
                                    <p>{stackableIndicatorMessage}</p>
                                </div>
                            )}
                            {isStackableDraggingMode && (
                                <div className={classNames('stackableIndicator', { isStackableDraggingMode })}>
                                    <p>
                                        <Trans i18nKey="design.drop stackable while dragging">
                                            <div>Drop on a colored surface or floor</div>
                                        </Trans>
                                    </p>
                                </div>
                            )}

                            <RenderItemOverlay
                                renderItems={renderItems}
                                compositionId={composition.id}
                                customContext={customContext}
                                imageCache={imageCache}
                            />

                            <PlacementIndicator />
                            {showWallPaintPins && (
                                <WallPaintPinContainer
                                    wallWidth={wallDimensions.width}
                                    wallHeight={wallDimensions.height}
                                />
                            )}
                        </div>
                    )}

                    {/* Measurement overlays */}
                    <RoomDimensions canvasHeight={canvasHeight} />
                    <DynamicMeasurements />
                    {hasRendered && debugSettings.showMemoryStats && <MemoryCharts debugSettings={debugSettings} />}
                </Viewport>
            </ViewerContext>
        </div>
    )
}

export const PreviewVC = withTranslation()(withTrackingBoundary('Preview')(PreviewVCBase))
