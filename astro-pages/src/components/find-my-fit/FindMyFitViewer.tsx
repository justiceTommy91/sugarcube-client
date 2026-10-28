import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import Button from '@ingka/button'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import cross from '@ingka/ssr-icon/paths/cross'
import defineSpace from '@ingka/ssr-icon/paths/define-space'
import eraser from '@ingka/ssr-icon/paths/eraser'
import checkmark from '@ingka/ssr-icon/paths/checkmark'
import { ViewerContext, useViewerContext } from '@gatsby/Renderer/ui/components/ViewerContext'
import { Viewport } from '@gatsby/Renderer/ui/components/Viewport'
import type { PersistUserData, ViewerSettings } from '@gatsby/Renderer/geomviewer/geom_types'
import type { DebugSettings } from '@gatsby/Renderer/geomviewer'
import { GeomViewer } from '@gatsby/Renderer/geomviewer/geom_init'
import DrawingOverlay from '@astro-components/find-my-fit/viewer/DrawingOverlay'
import ResizeHandles from '@astro-components/find-my-fit/viewer/ResizeHandles'
import DimensionsToolbar from '@astro-components/find-my-fit/viewer/DimensionsToolbar'
import { ProductDimensionLabels } from '@astro-components/find-my-fit/viewer/MeasurementLabels'
import ProductPopover from '@astro-components/find-my-fit/viewer/ProductPopover'
import CarouselDots from '@astro-components/find-my-fit/viewer/CarouselDots'
import ViewerTooltip from '@astro-components/find-my-fit/viewer/ViewerTooltip'
import { useViewerTooltips } from '@astro-components/find-my-fit/viewer/hooks/useViewerTooltips'
import { SceneItemManager } from '@astro-components/find-my-fit/viewer/SceneItemManager'
import { updateCarouselItems } from '@astro-components/find-my-fit/viewer/carouselAnimation'
import {
    IKEA_YELLOW,
    MIN_RESULTS_FOR_TOAST,
    DIMENSIONS_TOOLBAR_TOP,
    DIMENSIONS_TOOLBAR_TOP_EDITING,
} from '@astro-components/find-my-fit/viewer/constants'
import { usePlacementEditor } from '@astro-components/find-my-fit/viewer/hooks/usePlacementEditor'
import type { ManualEraseOverrides } from '@astro-components/find-my-fit/viewer/hooks/useDrawingMode'
import { useCarousel } from '@astro-components/find-my-fit/viewer/hooks/useCarousel'
import { useSceneSetup } from '@astro-components/find-my-fit/viewer/hooks/useSceneSetup'
import { useFormatLength } from '@astro-components/find-my-fit/viewer/hooks/useFormatLength'
import { useItemSelection } from '@astro-components/find-my-fit/viewer/hooks/useItemSelection'
import { useItemDragSync } from '@astro-components/find-my-fit/viewer/hooks/useItemDragSync'
import { useFurnitureSearchByDimensions } from '@astro-components/find-my-fit/viewer/hooks/useFurnitureSearchByDimensions'
import { useViewerMode } from '@astro-components/find-my-fit/viewer/hooks/useViewerMode'
import { useReferrer } from '@astro-hooks/useReferrer'
import { useLods } from '@astro-hooks/useLods'
import { useToast } from '@astro-hooks/useToast'
import { useTranslation } from 'react-i18next'
import { visit, click, trackGoogleAnalytics } from '@utils/tracker'
import { GA_CATEGORY_DYH_SUGARCUBE } from '@gatsby/models/tracking/constants'
import {
    FMFBROWSER_PAGE_VISIT,
    FMFBROWSER_FOCUS_AREA_DRAWN,
    FMFBROWSER_FOCUS_AREA_CONTINUE,
    FMFBROWSER_FOCUS_AREA_CLEARED,
    FMFBROWSER_EDIT_BOUNDING_BOX,
    FMFBROWSER_ITEM_TOGGLED,
    FMFBROWSER_VIEW_RESULTS_CLICK,
    FMFBROWSER_EDIT_FOCUS_AREA_CLICK,
    FMFBROWSER_ERASE_ITEMS_TAB_CLICK,
    FMFBROWSER_EDIT_AREA_TAB_CLICK,
    FMFBROWSER_PRODUCT_VIEWED,
    GA_ACTION_FMFBROWSER_PAGE_VISIT,
    GA_ACTION_FMFBROWSER_FOCUS_AREA_DRAWN,
    GA_ACTION_FMFBROWSER_PRODUCT_VIEWED,
    FMF_SCENE_TYPE_SAMPLE_SCENE,
    FMF_SCENE_TYPE_USER_PHOTO,
    FMF_EDIT_BOUNDING_BOX_ACCESS_FROM_SCRIBBLE,
    FMF_EDIT_BOUNDING_BOX_ACCESS_FROM_CIRCLE_DRAG,
    FMF_EDIT_BOUNDING_BOX_ACCESS_FROM_NUMBER_INPUT,
    FMF_VIEW_RESULTS_ACCESS_FROM_SCRIBBLE,
    FMF_VIEW_RESULTS_ACCESS_FROM_EDIT_DIMENSIONS,
} from '@lib/tracking/constants'
import type { OnProductViewedArgs } from '@astro-components/find-my-fit/viewer/hooks/useCarousel'
import type { DragEndInfo } from '@astro-components/find-my-fit/viewer/hooks/useResizeHandles'
import { getFmfProductTrackingInfo } from '@lib/tracking/fmfTrackingUtils'
import FmfFeedbackSurvey from '@astro-components/find-my-fit/FmfFeedbackSurvey'
import { useCsatTrigger } from '@astro-components/find-my-fit/viewer/hooks/useCsatTrigger'
import { isTrackingInitialized } from '@lib/tracking/init'
import '@astro-components/find-my-fit/viewer/FindMyFitCarousel.scss'

const SCENE_ID_PARAM = `sceneId`
const ALLOW_GUEST = true

type TFn = (key: string, vars?: Record<string, string | number>) => string

function searchButtonText(
    isFetching: boolean,
    hasSearched: boolean,
    resultCount: number,
    error: string | null,
    t: TFn,
): string {
    if (isFetching || !hasSearched) return t('find-my-fit.viewer.searching')
    if (error) return t('find-my-fit.viewer.retrySearch')
    if (resultCount === 0) return t('find-my-fit.viewer.noResultsButton')
    return t('find-my-fit.viewer.viewResults', { count: resultCount })
}

type FindMyFitContentProps = {
    viewerSettings: ViewerSettings
    debugSettings: DebugSettings
    sceneId: string
    onErasingChange: (isErasing: boolean) => void
    manualOverridesRef: React.RefObject<ManualEraseOverrides>
}

const FindMyFitContent = ({
    viewerSettings,
    debugSettings,
    sceneId,
    onErasingChange,
    manualOverridesRef,
}: FindMyFitContentProps) => {
    const { t } = useTranslation('find-my-fit')
    const containerRef = useRef<HTMLDivElement>(null)
    const { canvasDimensions } = useViewerContext()
    const formatDimension = useFormatLength()
    const drawAttemptRef = useRef(0)

    const setMagicEraser = useCallback(
        (enabled: boolean) => {
            GeomViewer.bindings?.changeViewerSettings({
                ...viewerSettings,
                canMagicErase: enabled,
                onOffOptions: { ...viewerSettings.onOffOptions, magicEraserMode: enabled },
            })
        },
        [viewerSettings],
    )

    const { dispatch, isDrawing, isAdjusting, isViewing, isResizing, isErasing, isEditing } = useViewerMode()

    const isAdjustingRef = useRef(isAdjusting)
    isAdjustingRef.current = isAdjusting
    onErasingChange(isErasing)

    // Aspect-ratio of the 3D canvas. Applied to .FmfViewer__scene so that
    // container aspect == canvas aspect; useResizableCanvas's aspect-fit then
    // becomes a no-op and the drawing overlay can share one coord space with
    // the canvas (no letterbox gap to translate across).
    const sceneAspect =
        canvasDimensions.width > 0 && canvasDimensions.height > 0
            ? canvasDimensions.width / canvasDimensions.height
            : undefined

    const handleBboxEdit = useCallback(
        ({ startDimensions, endDimensions, startPlacement, endPlacement }: DragEndInfo, source: 'drag' | 'step') => {
            let accessFrom: string
            if (source === 'step') {
                accessFrom = FMF_EDIT_BOUNDING_BOX_ACCESS_FROM_NUMBER_INPUT
            } else {
                accessFrom = isAdjustingRef.current
                    ? FMF_EDIT_BOUNDING_BOX_ACCESS_FROM_SCRIBBLE
                    : FMF_EDIT_BOUNDING_BOX_ACCESS_FROM_CIRCLE_DRAG
            }
            const startLoc = startPlacement?.location3
            const endLoc = endPlacement?.location3
            const startRot = startPlacement?.rotation
            const endRot = endPlacement?.rotation
            click(FMFBROWSER_EDIT_BOUNDING_BOX, {
                SceneUuid: sceneId,
                AccessFrom: accessFrom,
                StartBoxWidth: startDimensions.width,
                EndBoxWidth: endDimensions.width,
                StartBoxHeight: startDimensions.height,
                EndBoxHeight: endDimensions.height,
                StartBoxDepth: startDimensions.depth,
                EndBoxDepth: endDimensions.depth,
                StartPlacementSurfaceId: startLoc?.bindTo ?? null,
                EndPlacementSurfaceId: endLoc?.bindTo ?? null,
                StartPlacementPos: startLoc ? [startLoc.localPos.x, startLoc.localPos.y, startLoc.localPos.z] : null,
                EndPlacementPos: endLoc ? [endLoc.localPos.x, endLoc.localPos.y, endLoc.localPos.z] : null,
                StartPlacementRot: startRot ?? null,
                EndPlacementRot: endRot ?? null,
            })
        },
        [sceneId],
    )

    const editor = usePlacementEditor(containerRef, canvasDimensions.width, handleBboxEdit, manualOverridesRef)
    const hasPlacement = !!editor.placement

    // Latch dimensionLabels while viewing so an item-drag that shifts the
    // bbox doesn't re-fire the search. The value is only allowed to advance
    // when the user is not in viewing mode.
    const latchedDimensionLabelsRef = useRef(editor.dimensionLabels)
    if (!isViewing) latchedDimensionLabelsRef.current = editor.dimensionLabels
    const searchDimensionLabels = latchedDimensionLabelsRef.current

    const { queryTerm, categoryId } = useReferrer()
    const lods = useLods()
    const searchContext = useMemo(() => ({ queryTerm, categoryId, lods }), [queryTerm, categoryId, lods])
    const search = useFurnitureSearchByDimensions({
        dimensionLabels: searchDimensionLabels,
        searchContext,
    })
    const productFamilies = search.families

    const manager = useMemo(() => new SceneItemManager(productFamilies), [productFamilies])
    const occlusionRef = useRef<boolean | null>(null)
    const debugSettingsRef = useRef(debugSettings)
    debugSettingsRef.current = debugSettings
    const handleUpdateItems = useCallback(
        (state: Parameters<typeof updateCarouselItems>[0], mgr: Parameters<typeof updateCarouselItems>[1]) =>
            updateCarouselItems(state, mgr, occlusionRef, debugSettingsRef),
        [],
    )

    const { showSwipeTooltip, showTapTooltip, showDrawTooltip, onSwipe, onItemTapped, onDraw } = useViewerTooltips({
        isViewing,
        isDrawing,
    })

    const handleProductViewed = useCallback(
        ({
            familyIndex,
            variantIndex,
            totalResultCount,
            navigationDirection,
            navigationMethod,
            families,
        }: OnProductViewedArgs) => {
            const family = families[familyIndex]
            if (!family) return
            const variant = family.variants[variantIndex] ?? family.variants[0]
            const isVariant = variantIndex > 0
            const parentProductId = isVariant ? String(family.variants[0].data.id) : null
            const productInfo = getFmfProductTrackingInfo(variant.data)

            const commonMeta = {
                SceneUuid: sceneId,
                ProductPosition: familyIndex + 1,
                TotalResultCount: totalResultCount,
                IsVariant: isVariant,
                ParentProductId: parentProductId,
                NavigationDirection: navigationDirection,
                NavigationMethod: navigationMethod,
            }

            const commonMetaStrings: Record<string, string> = Object.fromEntries(
                Object.entries(commonMeta).map(([k, v]) => [k, v != null ? String(v) : '']),
            )

            visit(FMFBROWSER_PRODUCT_VIEWED, { ...commonMeta, ...productInfo })
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: GA_ACTION_FMFBROWSER_PRODUCT_VIEWED,
                label: variant.data.localItemNumber,
                custom: commonMetaStrings,
            })
        },
        [sceneId],
    )

    const handleStrokeAdded = useCallback(
        (stroke: Parameters<typeof editor.handleStrokeAdded>[0]) => {
            editor.handleStrokeAdded(stroke)
            click(FMFBROWSER_FOCUS_AREA_DRAWN, {
                SceneUuid: sceneId,
                ScribblePoints: stroke.map(([x, y]) => ({ x, y })),
                DrawAttemptNumber: drawAttemptRef.current,
            })
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: GA_ACTION_FMFBROWSER_FOCUS_AREA_DRAWN,
                label: sceneId,
                custom: { SceneUuid: sceneId, DrawAttemptNumber: String(drawAttemptRef.current) },
            })
        },
        [editor.handleStrokeAdded, sceneId],
    )

    const {
        isSurveyOpen,
        productViewCount,
        onSwipe: onCsatSwipe,
        onSurveyClose,
        onSkip,
        onSkipAgain,
        onComplete,
        hasSeenFormOnce,
    } = useCsatTrigger(isViewing, isTrackingInitialized())

    const handleSwipe = useCallback(() => {
        onSwipe()
        onCsatSwipe()
    }, [onSwipe, onCsatSwipe])

    const carousel = useCarousel({
        manager,
        families: productFamilies,
        isViewing,
        placement: editor.placement,
        enableVariantSwipe: true,
        updateItems: handleUpdateItems,
        onSwipe: handleSwipe,
        onProductViewed: handleProductViewed,
        debugSettings,
    })

    // Reset carousel when search results change during editing so stale items
    // don't persist when the user returns to viewing.
    useEffect(() => {
        if (isEditing) carousel.reset()
    }, [productFamilies]) // eslint-disable-line react-hooks/exhaustive-deps

    // Show toast when search completes with few results or an error.
    const { showToast, hideToast } = useToast()
    const prevFetchingRef = useRef(search.isFetching)
    const toastIdRef = useRef<string | null>(null)
    useEffect(() => {
        const wasFetching = prevFetchingRef.current
        prevFetchingRef.current = search.isFetching
        if (!wasFetching || search.isFetching) return

        // Dismiss previous toast before showing a new one.
        if (toastIdRef.current) {
            hideToast(toastIdRef.current)
            toastIdRef.current = null
        }

        if (search.error) {
            toastIdRef.current = showToast({ text: t('find-my-fit.viewer.searchErrorToast') })
        } else if (search.resultCount < MIN_RESULTS_FOR_TOAST) {
            toastIdRef.current = showToast({ text: t('find-my-fit.viewer.fewResultsToast') })
        }
    }, [search.isFetching, search.resultCount, search.error, showToast, hideToast])

    useEffect(() => {
        setMagicEraser(isErasing)
    }, [isErasing, setMagicEraser])

    const selection = useItemSelection(isViewing)
    useItemDragSync(selection.selectedItemId, isViewing, editor.shiftBy)

    useEffect(() => {
        if (selection.isItemSelected) onItemTapped()
    }, [selection.isItemSelected, onItemTapped])

    const allCorners = [...(editor.polygon || []), ...(editor.extrusionPolygon || [])]
    const bboxTopY = allCorners.length > 0 ? Math.min(...allCorners.map((p) => p[1])) : undefined
    const bboxRightX = allCorners.length > 0 ? Math.max(...allCorners.map((p) => p[0])) : undefined

    const handleGoBack = () => {
        window.location.href = window.location.pathname.replace(/\/viewer\/?$/, `/landing/`)
    }

    const handleConfirmDrawing = () => {
        if (!editor.placement || !editor.dimensionLabels) return
        const { width, height, depth } = editor.dimensionLabels
        const { localPos, bindTo } = editor.placement.location3
        const rotation = editor.placement.rotation
        const scribblePoints = editor.strokes.flat().map(([x, y]) => ({ x, y }))
        click(FMFBROWSER_FOCUS_AREA_CONTINUE, {
            SceneUuid: sceneId,
            DrawAttemptNumber: drawAttemptRef.current,
            PlacementSurfaceId: bindTo,
            PlacementPos: [localPos.x, localPos.y, localPos.z],
            PlacementRot: rotation ?? null,
            BoxWidth: width,
            BoxHeight: height,
            BoxDepth: depth,
            ScribblePoints: scribblePoints,
        })
        dispatch({ type: 'CONFIRM_DRAWING' })
    }

    const handleBackToDrawing = () => {
        dispatch({ type: 'BACK_TO_DRAWING' })
    }

    const handleConfirmAdjusting = () => {
        click(FMFBROWSER_VIEW_RESULTS_CLICK, {
            SceneUuid: sceneId,
            ResultCount: search.resultCount,
            AccessFrom: FMF_VIEW_RESULTS_ACCESS_FROM_SCRIBBLE,
        })
        dispatch({ type: 'CONFIRM_ADJUSTING' })
    }

    const handleEditArea = () => {
        click(FMFBROWSER_EDIT_FOCUS_AREA_CLICK, { SceneUuid: sceneId })
        dispatch({ type: 'START_EDITING', tool: `resize` })
    }

    const handleSwitchToResize = () => {
        click(FMFBROWSER_EDIT_AREA_TAB_CLICK, { SceneUuid: sceneId })
        dispatch({ type: 'SWITCH_TOOL', tool: `resize` })
    }

    const handleSwitchToErase = () => {
        click(FMFBROWSER_ERASE_ITEMS_TAB_CLICK, { SceneUuid: sceneId })
        dispatch({ type: 'SWITCH_TOOL', tool: `erase` })
    }

    const handleDoneEditing = () => {
        click(FMFBROWSER_VIEW_RESULTS_CLICK, {
            SceneUuid: sceneId,
            ResultCount: search.resultCount,
            AccessFrom: FMF_VIEW_RESULTS_ACCESS_FROM_EDIT_DIMENSIONS,
        })
        dispatch({ type: 'DONE_EDITING' })
    }

    const handleReset = () => {
        click(FMFBROWSER_FOCUS_AREA_CLEARED, { SceneUuid: sceneId, DrawAttemptNumber: drawAttemptRef.current })
        drawAttemptRef.current += 1
        dispatch({ type: 'RESET' })
        carousel.reset(() => {
            editor.handleClear()
            editor.clearAdjustment()
        })
    }

    const searchText = searchButtonText(search.isFetching, search.hasSearched, search.resultCount, search.error, t)
    const searchDisabled = search.isFetching || (!search.error && search.resultCount === 0)

    return (
        <>
            {isDrawing && (
                <header className="FmfViewer__header">
                    <Button
                        onClick={handleGoBack}
                        type="tertiary"
                        iconOnly
                        ssrIcon={arrowLeft}
                        aria-label={t('find-my-fit.viewer.goBack')}
                        size="small"
                    />
                    <p>{t('find-my-fit.viewer.drawingHeader')}</p>
                </header>
            )}

            {isAdjusting && (
                <header className="FmfViewer__header">
                    <Button
                        onClick={handleBackToDrawing}
                        type="tertiary"
                        iconOnly
                        ssrIcon={arrowLeft}
                        aria-label={t('find-my-fit.viewer.goBack')}
                        size="small"
                    />
                    <p>{t('find-my-fit.viewer.adjustHeader')}</p>
                </header>
            )}

            <div className="FmfViewer__scene-container" onContextMenu={(e) => e.preventDefault()}>
                <div
                    ref={containerRef}
                    className="FmfViewer__scene"
                    style={sceneAspect ? ({ '--scene-aspect': sceneAspect } as React.CSSProperties) : undefined}
                    onPointerDownCapture={isResizing ? editor.onMovePointerDown : undefined}
                >
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    <Viewport view="mainView" cameraMode="default" cameraFocus={undefined}>
                        {selection.isItemSelected && selection.selectedItemId && (
                            <ProductDimensionLabels itemId={selection.selectedItemId} />
                        )}
                    </Viewport>

                    {isDrawing && (
                        <DrawingOverlay
                            strokes={editor.strokes}
                            onStrokeAdded={handleStrokeAdded}
                            onStrokeStart={onDraw}
                            onBboxPosition={editor.setBboxPos}
                            brushColor={IKEA_YELLOW}
                        />
                    )}
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    <ViewerTooltip
                        visible={isDrawing && showDrawTooltip}
                        text={t('find-my-fit.viewer.drawFocusArea')}
                        animation="draw"
                    />

                    {isDrawing && hasPlacement && bboxTopY !== undefined && bboxRightX !== undefined && (
                        <Button
                            onClick={handleReset}
                            type="primary"
                            iconOnly
                            ssrIcon={cross}
                            size="small"
                            aria-label={t('find-my-fit.viewer.clearDrawing')}
                            className="FmfViewer__clear-btn"
                            style={{
                                left: `clamp(24px, ${bboxRightX * 100}%, calc(100% - 24px))`,
                                top: `clamp(24px, ${bboxTopY * 100}%, calc(100% - 24px))`,
                            }}
                        />
                    )}

                    {isResizing && (
                        <DrawingOverlay
                            strokes={editor.strokes}
                            polygon={editor.polygon}
                            extrusionPolygon={editor.extrusionPolygon}
                            boxCorners={editor.boxCorners}
                            activeFaceIndices={editor.activeFaceIndices}
                            dimensionLabels={editor.dimensionLabels}
                            onBboxPosition={editor.setBboxPos}
                            formatDimension={formatDimension}
                            readOnly
                            loading={search.isFetching}
                            strokeFadeMs={isAdjusting ? 3000 : undefined}
                            brushColor={IKEA_YELLOW}
                            hideDimensionLabels
                            connectorLines={editor.connectorLines}
                            highlightSilhouette={editor.isMoving}
                        />
                    )}
                    {isResizing && editor.displayDimensionLabels && (
                        <DimensionsToolbar
                            dimensionLabels={editor.displayDimensionLabels}
                            activeDimension={editor.activeDimension}
                            targetedDimension={editor.targetedDimension}
                            formatDimension={formatDimension}
                            onDimensionTap={editor.enterTargetedMode}
                            onStep={editor.stepDimension}
                            onConfirm={editor.exitTargetedMode}
                            topOffset={isEditing ? DIMENSIONS_TOOLBAR_TOP_EDITING : DIMENSIONS_TOOLBAR_TOP}
                        />
                    )}
                    {isResizing && editor.polygon && editor.handleConfigs.length > 0 && (
                        <ResizeHandles
                            handleConfigs={editor.handleConfigs}
                            activeHandle={editor.activeHandle}
                            onPointerDown={editor.onPointerDown}
                        />
                    )}

                    {/* Always visible so SwipeControl binding stays stable, but pointer-events
                        are disabled outside viewing mode. */}
                    <div
                        ref={carousel.swipeAreaRef}
                        className="FmfCarousel__swipe-area"
                        style={{
                            touchAction: `none`,
                            pointerEvents: isViewing && !selection.isItemSelected ? `auto` : `none`,
                        }}
                        onPointerDown={selection.handlePointerDown}
                        onPointerUp={selection.handlePointerUp}
                    />

                    <ViewerTooltip
                        visible={isViewing && showSwipeTooltip}
                        text={t('find-my-fit.viewer.swipeForMore')}
                        animation="swipe-horizontal"
                    />
                    <ViewerTooltip
                        visible={isViewing && showTapTooltip}
                        text={t('find-my-fit.viewer.tapToSelect')}
                        animation="tap"
                    />

                    {isViewing && (
                        <div className="FmfViewer__overlay-top">
                            <Button
                                text={t('find-my-fit.viewer.editArea')}
                                type="primary"
                                aria-label={t('find-my-fit.viewer.editArea')}
                                size="small"
                                ssrIcon={defineSpace}
                                onClick={handleEditArea}
                            />
                        </div>
                    )}

                    {isEditing && (
                        <div className="FmfViewer__overlay-top">
                            <div className="FmfViewer__toggle-bar">
                                <Button
                                    className={`FmfViewer__toggle-btn ${
                                        isResizing ? 'FmfViewer__toggle-btn--active' : ''
                                    }`}
                                    type="tertiary"
                                    size="small"
                                    ssrIcon={defineSpace}
                                    iconOnly
                                    aria-label={t('find-my-fit.viewer.editArea')}
                                    onClick={handleSwitchToResize}
                                />
                                <Button
                                    className={`FmfViewer__toggle-btn ${
                                        isErasing ? 'FmfViewer__toggle-btn--active' : ''
                                    }`}
                                    type="tertiary"
                                    size="small"
                                    ssrIcon={eraser}
                                    iconOnly
                                    aria-label={t('find-my-fit.viewer.magicEraser')}
                                    onClick={handleSwitchToErase}
                                />
                            </div>
                        </div>
                    )}
                </div>
                {isViewing && !selection.isItemSelected && (
                    <CarouselDots total={productFamilies.length} curItem={carousel.familyIndex} />
                )}
            </div>

            {isViewing && (
                <ProductPopover
                    families={productFamilies}
                    familyIndex={carousel.familyIndex}
                    variantIndex={carousel.variantIndex}
                    onFamilyClick={(idx, variantIdx) => {
                        selection.deselectAll()
                        carousel.goToFamily(idx, variantIdx)
                    }}
                    onVariantClick={(idx) => {
                        selection.deselectAll()
                        carousel.changeVariant(idx)
                    }}
                    sceneId={sceneId}
                />
            )}

            {isDrawing && (
                <div className="FmfViewer__actions">
                    <Button
                        onClick={handleConfirmDrawing}
                        type="primary"
                        text={t('find-my-fit.viewer.continue')}
                        disabled={!hasPlacement}
                        aria-label={t('find-my-fit.viewer.continueAriaLabel')}
                    />
                </div>
            )}
            {isAdjusting && (
                <div className="FmfViewer__actions">
                    <Button
                        onClick={search.error ? search.retry : handleConfirmAdjusting}
                        type="primary"
                        text={searchText}
                        disabled={searchDisabled || !search.hasSearched}
                        aria-label={t('find-my-fit.viewer.continueAriaLabel')}
                    />
                </div>
            )}
            {isEditing && (
                <div className="FmfViewer__actions">
                    <Button
                        onClick={isResizing && search.error ? search.retry : handleDoneEditing}
                        type="primary"
                        text={isResizing ? searchText : t('find-my-fit.viewer.done')}
                        disabled={searchDisabled}
                        ssrIcon={isErasing ? checkmark : undefined}
                        aria-label={t('find-my-fit.viewer.doneAriaLabel')}
                    />
                </div>
            )}

            {isSurveyOpen && (
                <FmfFeedbackSurvey
                    trackingInfo={{ SceneId: sceneId, ProductViewCount: productViewCount }}
                    hasSeenFormOnce={hasSeenFormOnce}
                    onSkip={onSkip}
                    onSkipAgain={onSkipAgain}
                    onComplete={onComplete}
                    onClose={onSurveyClose}
                />
            )}
        </>
    )
}

export const FindMyFitViewer = () => {
    const sceneId = new URLSearchParams(window.location.search).get(SCENE_ID_PARAM) || ''
    const { scene, viewerSettings, debugSettings, loading, error } = useSceneSetup(sceneId, ALLOW_GUEST)

    const isStock = scene?.isStock
    useEffect(() => {
        if (isStock === undefined) return
        const sceneType = isStock ? FMF_SCENE_TYPE_SAMPLE_SCENE : FMF_SCENE_TYPE_USER_PHOTO
        visit(FMFBROWSER_PAGE_VISIT, { SceneUuid: sceneId, SceneType: sceneType })
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_FMFBROWSER_PAGE_VISIT,
            label: sceneId,
            custom: { SceneUuid: sceneId, SceneType: sceneType },
        })
    }, [sceneId, isStock])

    // The viewer fires onSaveDataUpdate on every change to the erased-segments
    // list. That includes programmatic updates (box-erase on resize, clear,
    // stroke recompute) which we don't want to track. isErasingRef gates the
    // event to user taps in the erase tab only. We still diff against the
    // previous list on every call so prevErasedRef stays in sync with the
    // viewer's state regardless of whether we emitted an event.
    const prevErasedRef = useRef<number[]>([])
    const isErasingRef = useRef(false)
    // Segments the user has manually toggled in the erase tab. Auto-erase
    // (doodling, bbox move/resize) respects these so explicit choices survive.
    const manualOverridesRef = useRef<ManualEraseOverrides>({
        forceErased: new Set<number>(),
        forceVisible: new Set<number>(),
    })
    const handleErasingChange = useCallback((v: boolean) => {
        isErasingRef.current = v
    }, [])
    const handleSaveDataUpdate = useCallback(
        (userProps: PersistUserData) => {
            const next = userProps.magicEraser?.saveData?.erasedSegments ?? []
            const prev = prevErasedRef.current
            prevErasedRef.current = next

            if (!isErasingRef.current) return

            const prevSet = new Set(prev)
            const nextSet = new Set(next)
            const toggledId = next.find((id) => !prevSet.has(id)) ?? prev.find((id) => !nextSet.has(id))
            if (toggledId === undefined) return

            const { forceErased, forceVisible } = manualOverridesRef.current
            if (nextSet.has(toggledId)) {
                forceErased.add(toggledId)
                forceVisible.delete(toggledId)
            } else {
                forceVisible.add(toggledId)
                forceErased.delete(toggledId)
            }

            click(FMFBROWSER_ITEM_TOGGLED, {
                SceneUuid: sceneId,
                ToggledItemId: toggledId,
                ErasedItemIds: next,
            })
        },
        [sceneId],
    )

    if (loading || error || !scene) return null

    return (
        <ViewerContext
            key={sceneId}
            scene={scene}
            viewerSettings={viewerSettings}
            debugSettings={debugSettings}
            onSaveDataUpdate={handleSaveDataUpdate}
        >
            <div className="FindMyFitViewer">
                <FindMyFitContent
                    viewerSettings={viewerSettings}
                    debugSettings={debugSettings}
                    sceneId={sceneId}
                    onErasingChange={handleErasingChange}
                    manualOverridesRef={manualOverridesRef}
                />
            </div>
        </ViewerContext>
    )
}
