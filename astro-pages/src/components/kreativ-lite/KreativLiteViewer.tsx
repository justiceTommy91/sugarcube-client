import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react'

import Button from '@ingka/button'
import menu from '@ingka/ssr-icon/paths/menu'
import { ViewerContext, useViewerContext } from '@gatsby/Renderer/ui/components/ViewerContext'
import { Viewport } from '@gatsby/Renderer/ui/components/Viewport'
import type { SceneInfo } from '@gatsby/Renderer/geomviewer/geom_types'
import { supportsMagicEraser } from '@gatsby/models/scenes/utils'
import { LIVING_ROOM } from '@gatsby/models/scenes/constants'
import type { RoomType } from '@gatsby/models/scenes/constants'
import { useIsDragging } from '@gatsby/Renderer/ui/hooks/useIsDragging'
import { useIsPlacementMode } from '@gatsby/Renderer/ui/hooks/useIsPlacementMode'
import { useCameraOrbitMode } from '@gatsby/Renderer/ui/hooks/useCameraOrbitMode'
import { useStackableDraggingState } from '@gatsby/Renderer/ui/hooks/useStackableDraggingState'
import type { CompositionRestoreItem } from '@astro-services/compositionService'
import type { FurnitureApiProduct } from '@astro-services/kreativLiteFurnitureService'
import { ViewerLayout } from '@astro-components/kreativ-lite/ViewerLayout'
import { EraserPanel } from '@astro-components/kreativ-lite/EraserPanel'
import { SearchDrawer } from '@astro-components/kreativ-lite/SearchDrawer'
import { AppPromotionDrawer } from '@astro-components/kreativ-lite/AppPromotionDrawer'
import { MenuDrawer } from '@astro-components/kreativ-lite/MenuDrawer'
import { SummaryPillButton } from '@astro-components/kreativ-lite/SummaryPillButton'
import { SummaryDrawer } from '@astro-components/kreativ-lite/SummaryDrawer'
import { FeedbackDrawer } from '@astro-components/kreativ-lite/FeedbackDrawer'
import { useFeedbackDrawerTrigger } from '@astro-components/kreativ-lite/hooks/useFeedbackDrawerTrigger'
import { APP_MODE, type AppMode, COMPOSITION_ID_PARAM, SCENE_ID_PARAM } from '@astro-components/kreativ-lite/constants'
import { getSceneAspectRatioFromManifest } from '@astro-components/kreativ-lite/utils/getSceneAspectRatio'
import { updateUrlWithCompositionId } from '@astro-components/kreativ-lite/utils/urlUtils'
import { useViewerSettings } from '@astro-components/kreativ-lite/hooks/useViewerSettings'
import { useSearchWithOverlay } from '@astro-components/kreativ-lite/hooks/useSearchWithOverlay'
import { useSceneItemTracker } from '@astro-components/kreativ-lite/hooks/useSceneItemTracker'
import type { SceneItemTracker } from '@astro-components/kreativ-lite/hooks/useSceneItemTracker'
import type { FurnitureSearchItem } from '@astro-components/kreativ-lite/hooks/useKreativLiteSearch'
import { useCombinablePlacer } from '@astro-components/kreativ-lite/hooks/useCombinablePlacer'
import { useCompositionRestore } from '@astro-components/kreativ-lite/hooks/useCompositionRestore'
import { useCompositionData } from '@astro-components/kreativ-lite/hooks/useCompositionData'
import { useItemCount } from '@astro-components/kreativ-lite/hooks/useItemCount'
import { useCompositionSave } from '@astro-components/kreativ-lite/hooks/useCompositionSave'
import { SceneContextProvider, useSceneContext } from '@astro-components/kreativ-lite/SceneContext'
import type { SceneContextValue } from '@astro-components/kreativ-lite/SceneContext'
import { StackableIndicator } from '@astro-components/kreativ-lite/StackableIndicator'
import './KreativLiteViewer.scss'

interface ViewerInnerProps {
    appMode: AppMode
    initialSceneAR: number | null
    onStartDesign: () => void
    onSwitchToEraser: () => void
    searchProps: ReturnType<typeof useSearchWithOverlay>
    tracker: SceneItemTracker
    isDirty: boolean
    scene: SceneInfo
    sceneId: string
    initialCompositionId?: string
    compositionRestoreItems?: CompositionRestoreItem[]
    supplementalCombinableProducts?: Map<string, FurnitureApiProduct>
}

/** Mounts useCompositionRestore — rendered when a compositionId is present in the URL. */
const CompositionRestoreGate = ({
    restoreItems,
    tracker,
    scheduleCombinable,
    supplementalCombinableProducts,
}: {
    restoreItems: CompositionRestoreItem[]
    tracker: SceneItemTracker
    scheduleCombinable: SceneContextValue['scheduleCombinable']
    supplementalCombinableProducts?: ReadonlyMap<string, FurnitureApiProduct>
}) => {
    const { registerItemProduct } = useSceneContext()
    useCompositionRestore({ restoreItems, tracker, scheduleCombinable, registerItemProduct, supplementalCombinableProducts })
    return null
}

// ViewerInner is a separate component so it can call useViewerContext() inside the ViewerContext provider.
const ViewerInner = ({
    appMode,
    initialSceneAR,
    onStartDesign,
    onSwitchToEraser,
    searchProps,
    tracker,
    isDirty,
    scene,
    sceneId,
    initialCompositionId,
    compositionRestoreItems,
    supplementalCombinableProducts,
}: ViewerInnerProps) => {
    const magicEraserMode = appMode === APP_MODE.ERASER
    const { isDragging, draggingItemId } = useIsDragging()
    const isPlacementMode = useIsPlacementMode()
    const { isInOrbitMode, isOrbitMoving } = useCameraOrbitMode()
    const { isDragDestinationValid } = useStackableDraggingState()
    const [appPromoOpen, setAppPromoOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [summaryOpen, setSummaryOpen] = useState(false)
    const [roomProductsById, setRoomItemsMap] = useState<Map<string, FurnitureSearchItem>>(new Map())
    const registerItemProduct = useCallback(
        (uniqueId: string, item: FurnitureSearchItem) => setRoomItemsMap((prev) => new Map(prev).set(uniqueId, item)),
        [],
    )
    const [canvasHeight, setCanvasHeight] = useState(0)
    const { scheduleCombinable } = useCombinablePlacer(registerItemProduct)
    const { canvasElement } = useViewerContext()
    const { isAtLimit } = useItemCount(tracker)

    const feedbackTrigger = useFeedbackDrawerTrigger(roomProductsById.size)

    const {
        save: rawSave,
        share: rawShare,
        state: saveState,
        isSaved,
        shareUrl,
    } = useCompositionSave({
        sceneId,
        tracker,
        canvasElement,
        initialCompositionId,
    })

    const save = useCallback(async () => {
        const result = await rawSave()
        if (result?.compositionId) updateUrlWithCompositionId(result.compositionId)
        return result
    }, [rawSave])

    const share = useCallback(async () => {
        const result = await rawShare()
        if (result?.compositionId) updateUrlWithCompositionId(result.compositionId)
        return result
    }, [rawShare])

    return (
        <SceneContextProvider
            tracker={tracker}
            isDirty={isDirty}
            scheduleCombinable={scheduleCombinable}
            save={save}
            share={share}
            saveState={saveState}
            isSaved={isSaved}
            shareUrl={shareUrl}
            roomProductsById={roomProductsById}
            addRoomItem={registerItemProduct}
        >
            {compositionRestoreItems && (
                <CompositionRestoreGate
                    restoreItems={compositionRestoreItems}
                    tracker={tracker}
                    scheduleCombinable={scheduleCombinable}
                    supplementalCombinableProducts={supplementalCombinableProducts}
                />
            )}
            <div className="KreativLiteViewer__page">
                <ViewerLayout
                    sceneAR={initialSceneAR}
                    magicEraserMode={magicEraserMode}
                    onCanvasHeightChange={setCanvasHeight}
                >
                    <Viewport
                        // eslint-disable-next-line i18next/no-literal-string
                        view="mainView"
                        // eslint-disable-next-line i18next/no-literal-string
                        cameraMode="default"
                        cameraFocus={undefined}
                        isPlacementMode={isDragging || isPlacementMode}
                        cannotPlaceStackable={!isDragDestinationValid}
                        draggingRenderItemId={draggingItemId ? Number(draggingItemId) : undefined}
                        cameraInOrbitMode={isInOrbitMode}
                        cameraInOrbitModeMoving={isOrbitMoving}
                    />
                    <StackableIndicator />
                </ViewerLayout>

                {appMode === APP_MODE.ERASER && <EraserPanel onStartDesign={onStartDesign} />}

                {appMode === APP_MODE.DESIGN && (
                    <>
                        <Button
                            className="KreativLiteViewer__menu-btn"
                            type="emphasised"
                            inverseTheme
                            size="small"
                            ssrIcon={menu}
                            iconOnly
                            onClick={() => setMenuOpen(true)}
                        />
                        <SearchDrawer
                            canvasHeight={canvasHeight}
                            scene={scene}
                            isAtLimit={isAtLimit}
                            onItemLimitReached={() => setAppPromoOpen(true)}
                            {...searchProps}
                        />
                        <AppPromotionDrawer
                            open={appPromoOpen}
                            onClose={() => setAppPromoOpen(false)}
                            sceneId={scene.sceneId}
                        />
                        <MenuDrawer
                            open={menuOpen}
                            onClose={() => setMenuOpen(false)}
                            onSwitchToEraser={onSwitchToEraser}
                        />
                        <SummaryPillButton open={summaryOpen} onOpen={() => setSummaryOpen(true)} />
                        <SummaryDrawer
                            open={summaryOpen}
                            onClose={() => setSummaryOpen(false)}
                            onOpenPromotion={() => setAppPromoOpen(true)}
                        />
                        <FeedbackDrawer
                            open={feedbackTrigger.isSurveyOpen}
                            onClose={feedbackTrigger.onClose}
                            onComplete={feedbackTrigger.onComplete}
                        />
                    </>
                )}
            </div>
        </SceneContextProvider>
    )
}

export const KreativLiteViewer = () => {
    const { sceneId, compositionId } = useMemo(() => {
        const params = new URLSearchParams(window.location.search)
        return {
            sceneId: params.get(SCENE_ID_PARAM) ?? '',
            compositionId: params.get(COMPOSITION_ID_PARAM) ?? '',
        }
    }, [])

    const { loading, scene, compositionRestoreItems, supplementalCombinableProducts, persistUserData } =
        useCompositionData(compositionId, sceneId)

    const [appMode, setAppMode] = useState<AppMode>(() => (compositionId ? APP_MODE.DESIGN : APP_MODE.ERASER))
    const { tracker, isDirty: isDirtyState, captureRestoredSegments } = useSceneItemTracker()

    const roomType = scene ? ((scene as { roomType?: RoomType })?.roomType ?? LIVING_ROOM) : undefined
    const searchProps = useSearchWithOverlay(roomType)
    const canMagicErase = useMemo(() => supportsMagicEraser(scene), [scene])
    const initialSceneAR = useMemo(() => (scene ? getSceneAspectRatioFromManifest(scene) : null), [scene])
    const magicEraserMode = appMode === APP_MODE.ERASER
    const { viewerSettings, debugSettings } = useViewerSettings(scene, magicEraserMode, canMagicErase)

    // Pre-populate the tracker's erasedSegmentsRef with restored segments BEFORE the
    // viewer fires its onSaveDataUpdate echo. useLayoutEffect runs synchronously after
    // DOM commit; the viewer fires onSaveDataUpdate asynchronously in its own loop,
    // so this always runs first. handleSaveDataUpdate then sees no change → no dirty.
    useLayoutEffect(() => {
        const segments = persistUserData?.magicEraser?.saveData?.erasedSegments
        if (segments?.length) {
            captureRestoredSegments(segments)
        }
    }, [persistUserData, captureRestoredSegments])

    // ────────────────────────────────────────────────────────────────────────────

    if (loading) return null
    if (!scene) return null

    return (
        <ViewerContext
            scene={scene}
            viewerSettings={viewerSettings}
            debugSettings={debugSettings}
            persistUserData={persistUserData}
            onSaveDataUpdate={tracker.handleSaveDataUpdate}
        >
            <ViewerInner
                appMode={appMode}
                initialSceneAR={initialSceneAR}
                onStartDesign={() => setAppMode(APP_MODE.DESIGN)}
                onSwitchToEraser={() => setAppMode(APP_MODE.ERASER)}
                searchProps={searchProps}
                tracker={tracker}
                isDirty={isDirtyState}
                scene={scene}
                sceneId={scene.sceneId}
                initialCompositionId={compositionId || undefined}
                compositionRestoreItems={compositionRestoreItems}
                supplementalCombinableProducts={supplementalCombinableProducts}
            />
        </ViewerContext>
    )
}
