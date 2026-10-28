import React, { useCallback, useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Toast from '@ingka/toast'
import Button from '@ingka/button'
import cross from '@ingka/ssr-icon/paths/cross'

import { useAppDispatch, useAppSelector, useFlags } from 'hooks'

import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { usePlannerApiState } from 'Planner/ui/hooks/usePlannerApiState'
import { usePlannerViewer } from 'Planner/ui/hooks/usePlannerViewer'
import { useRoomWallsInfo } from 'Planner/ui/hooks/useRoomWallsInfo'
import { useRoomVerticesInfo } from 'Planner/ui/hooks/useRoomVerticesInfo'
import { API_INITIALIZED, VIEWER_INITIALIZED } from 'Planner/api_constants'
import type { RoomInfo } from 'Planner/api_types'
import { colorStyleToRGB255 } from 'Planner/planner_utils'

import { PlannerContextProvider } from 'Planner/ui/components/PlannerContext'
import { PlannerViewer } from 'Planner/ui/components/PlannerViewer'
import { getIsSaving } from 'models/scenes/selectors'
import {
    setIsRoomBuilderEditor,
    clearSessionTracking,
    requestAllData,
    setSelectedColorIndex,
    setSelectedMaterialUuid,
} from 'models/planner/slice'
import {
    getMaterials,
    getIsLoadingMaterials,
    getDoors,
    getIsLoadingDoors,
    getWindows,
    getIsLoadingWindows,
    getAssets,
    getIsLoadingAssets,
    getSessionStats,
} from 'models/planner/selectors'
import { STEPS, type Step } from 'models/planner/index'
import * as tracker from 'utils/tracker'
import { GA_ACTION_ROOM_BUILDER_DESIGN_THIS_ROOM, GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'
import { getRoomBuilderEditorInfo } from 'models/ui/selectors'
import { RoomTemplate } from 'Planner/room_template/room_template'
import { TemplateAssetInfo } from 'Planner/room_template/room_template_types'
import { GLTf } from 'Renderer/gltf/gltf'
import { validateHDRfile } from 'Renderer/utils/rgbeUtils'
import { useEditorComposition } from 'hooks/editor/useEditorComposition'

import Tooltip from 'components/Tooltip'

import { cancelRoomEditing, startRoomPlanner, finishRoomPlanner } from 'models/planner/actions'
import { usePlannerErrors } from 'hooks/editor/usePlannerErrors'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'
import LowPerformanceModal from 'components/design/LowPerformanceModal'
import { COLORS } from '../RoomBuilderPage/constants'
import { PlannerViewerOverlay } from '../PlannerViewerOverlay'
import Planner from '../Planner'

export type GltfAssetDesc = {
    uuid: string
    data: GLTf | null
    baseUrl: string
}

require('./styles.scss')

// This id can be any string for now, we are only showing one viewer at a time.
const viewerId = `viewer1`

const TIPS_DELAY = 5_000

const RoomEditor = () => {
    const tipsShownRef = useRef(false)
    const [, setAreTipsVisible] = useState(false)
    const [showInfoToast, setShowInfoToast] = useState(false)
    const showTips = useCallback(() => {
        // Only show tips once per planner session.
        if (tipsShownRef.current) {
            return
        }

        setAreTipsVisible(true)
        tipsShownRef.current = true
    }, [])
    const tipsTimeoutRef = useRef<number | undefined>()
    const startTipsTimer = useCallback(() => {
        // Only start tips timer if the tips haven't been shown before and there is currently no timer
        if (tipsTimeoutRef.current != null || tipsShownRef.current) {
            return
        }
        tipsTimeoutRef.current = window.setTimeout(showTips, TIPS_DELAY)
    }, [showTips])
    const stopTipsTimer = useCallback(() => {
        clearTimeout(tipsTimeoutRef.current)
        tipsTimeoutRef.current = undefined
    }, [])
    const hideTips = useCallback(() => {
        setAreTipsVisible(false)
        stopTipsTimer()
    }, [])
    useEffect(() => {
        startTipsTimer()
        return () => {
            stopTipsTimer()
        }
    }, [startTipsTimer, stopTipsTimer])

    const { t } = useTranslation(['dashboard', 'translation'])

    const { showLowPerformanceDialog, lowPerformanceCause } = usePlannerErrors(viewerId)
    const plannerTrackingInfo = usePlannerTrackingInfo()
    const { plannerApi } = usePlannerApi()
    const plannerState = usePlannerApiState()
    const { viewerState } = usePlannerViewer(viewerId)
    const wallsInfo = useRoomWallsInfo()
    const verticesInfo = useRoomVerticesInfo()
    const { flags } = useFlags()

    const dispatch = useAppDispatch()
    const [step, setStep] = useState<Step>(STEPS.dimensions)

    const advanceToStep = (step_: Step): void => {
        if (step_ === STEPS.template) {
            startTipsTimer()
        } else {
            hideTips()
        }
        setStep(step_)
    }
    const canvasContainerRef = useRef<HTMLDivElement>(null)
    const isViewerReady = true
    const [isFinishing, setIsFinishing] = useState(false)
    const [width, setWidth] = useState(800)
    const [height, setHeight] = useState(536)
    const [resolvedRoomInfo, setResolvedRoomInfo] = useState<RoomInfo | null>(null)
    const [initialFloorArea, setInitialFloorArea] = useState(0)

    const { compositionData, saveRoom } = useEditorComposition()

    const roomBuilderEditorInfo = useAppSelector(getRoomBuilderEditorInfo)
    const roomTemplate: RoomTemplate = roomBuilderEditorInfo?.roomTemplate
    const sceneId: string = roomBuilderEditorInfo?.sceneId

    const materials = Object.values(useAppSelector(getMaterials))
    const isLoadingMaterials = useAppSelector(getIsLoadingMaterials)
    const hasMaterials = materials.length && !isLoadingMaterials

    const doors = Object.values(useAppSelector(getDoors))
    const isLoadingDoors = useAppSelector(getIsLoadingDoors)
    const hasDoors = doors.length && !isLoadingDoors

    const windows = Object.values(useAppSelector(getWindows))
    const isLoadingWindows = useAppSelector(getIsLoadingWindows)
    const hasWindows = windows.length && !isLoadingWindows

    const assets = Object.values(useAppSelector(getAssets))
    const isLoadingAssets = useAppSelector(getIsLoadingAssets)
    const hasAssets = windows.length && !isLoadingAssets

    useEffect(() => {
        dispatch(setIsRoomBuilderEditor(true))
        dispatch(clearSessionTracking())
        dispatch(startRoomPlanner())
    }, [])

    const resolveTemplateAssets = (template: RoomTemplate, receivedAssets: GltfAssetDesc[]) => {
        template?.assets.forEach((templateAsset: TemplateAssetInfo) => {
            const resolvedAsset = receivedAssets.find((m) => m.uuid === templateAsset.uuid)

            if (resolvedAsset && resolvedAsset.data) {
                // eslint-disable-next-line no-param-reassign
                templateAsset.asset = {
                    data: resolvedAsset.data,
                    baseUrl: resolvedAsset.baseUrl,
                }
            }
        })
        setResolvedRoomInfo({
            roomTemplate: template,
            composition: compositionData?.plannerComposition,
        })
    }

    useEffect(() => {
        if (roomTemplate === null || !hasMaterials || !hasDoors || !hasWindows || !hasAssets) {
            return
        }
        const allAssets = [...materials, ...doors, ...windows, ...assets]
        resolveTemplateAssets(roomTemplate, allAssets)
    }, [roomTemplate, hasMaterials, hasDoors, hasWindows, hasAssets])

    useEffect(() => {
        if (!roomTemplate || !compositionData || plannerState !== API_INITIALIZED) {
            return
        }
        const floorMaterialIdx = roomTemplate.floor.asset
        const assetUuid = roomTemplate.assets[floorMaterialIdx].uuid
        dispatch(setSelectedMaterialUuid(assetUuid))

        const templateWallColor = roomTemplate.walls[0]?.color
        const compositionWallColorText = compositionData.apiComposition.savedProperties.wallPaint?.[0]
        const compositionWallColor =
            typeof compositionWallColorText === 'string' && colorStyleToRGB255(compositionWallColorText)
        const finalColor = compositionWallColor || templateWallColor

        if (finalColor) {
            const idx = COLORS.findIndex(
                (color) =>
                    color.VIEWPORT_COLOR[0] === finalColor.r &&
                    color.VIEWPORT_COLOR[1] === finalColor.g &&
                    color.VIEWPORT_COLOR[2] === finalColor.b,
            )
            if (idx !== -1) {
                dispatch(setSelectedColorIndex(idx))
                plannerApi.setAllWallsColor([finalColor.r, finalColor.g, finalColor.b])
            }
        }
        setInitialFloorArea(plannerApi.getFloorArea())
    }, [plannerState, roomTemplate, compositionData])

    const onSecondStep = step === STEPS.dimensions
    const isSavingScene = useAppSelector(getIsSaving)
    const sessionStats = useAppSelector(getSessionStats)

    // placeholder callback to open the design page with exported gltf from planner api
    const onFinish = useCallback(async () => {
        if (!sceneId) {
            return
        }
        setIsFinishing(true)

        // Block the main thread to avoid freezing the UI while exporting the scene.
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 0)
        })

        const now = Date.now()
        const sessionDuration = now - (window.globalPlannerSessionStart ?? 0)
        const lengths = wallsInfo.map((w) => w.length)
        const currentFloorArea = plannerApi.getFloorArea()
        const trackingInfo = {
            EditSummary: {
                SessionDurationMS: sessionDuration,
                ...sessionStats,
                RoomSummary: {
                    NumWalls: wallsInfo.length,
                    NumNodes: verticesInfo.length,
                    MinWallLength: Math.min(...lengths),
                    MaxWallLength: Math.max(...lengths),
                    FloorSurfaceArea: currentFloorArea,
                    FloorSurfaceAreaDelta: currentFloorArea - initialFloorArea,
                },
            },
            ...plannerTrackingInfo,
        }

        dispatch(finishRoomPlanner())
        tracker.click('RoomBuilder.ContinueToDesign', { ...trackingInfo })
        tracker.trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_ROOM_BUILDER_DESIGN_THIS_ROOM,
            label: '',
        })

        const envmap = flags.RoomBuilderEnvmapUploading
            ? await plannerApi.exportCurrentRoomEnvMap(viewerId)?.then((hdrBlob) => {
                  const result = validateHDRfile(hdrBlob)
                  if (!result.valid) {
                      tracker.track('RoomBuilder.EnvmapGenerationFailed', { ...result })
                      return null
                  }

                  return hdrBlob
              })
            : null

        const gltf = await plannerApi.exportCurrentRoom()
        if (gltf) {
            saveRoom(sceneId, String(compositionData?.apiComposition?.compositionId ?? -1), gltf, envmap)
        }
    }, [sceneId, compositionData, sessionStats, wallsInfo, verticesInfo])

    const onCancel = useCallback(() => {
        tracker.click('RoomBuilder.CancelDesign', { ...plannerTrackingInfo })
        dispatch(cancelRoomEditing())
    }, [])

    const updateCanvasDimensions = () => {
        if (canvasContainerRef.current) {
            const containerRect = canvasContainerRef.current.getBoundingClientRect()
            setWidth(containerRect.width)
            setHeight(containerRect.height)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    const handleBrowserNavigation = (event: PopStateEvent) => {
        // TODO [WEBFS-711]: add a confirmation dialog here.
        // Discard all editing progress on browser navigation.
        onCancel()
    }

    const viewerInitialized = viewerState === VIEWER_INITIALIZED
    const showBouncyBallLoader = !viewerInitialized || isFinishing
    const isLoadingData = isLoadingMaterials || isLoadingDoors || isLoadingWindows || isLoadingAssets
    const isLoading = isLoadingData || showBouncyBallLoader

    // When loading templates is finished, the bouncy ball disappears, and canvasContainerRef is instantiated.
    useEffect(updateCanvasDimensions, [isLoadingData])

    useEffect(() => {
        window.addEventListener('resize', updateCanvasDimensions)
        window.addEventListener('popstate', handleBrowserNavigation)
        // Disable scroll wheel on background
        document.body.style.overflow = `hidden`
        return () => {
            window.removeEventListener('resize', updateCanvasDimensions)
            window.removeEventListener('popstate', handleBrowserNavigation)
            document.body.style.overflow = `unset`
        }
    }, [])

    useEffect(() => {
        dispatch(requestAllData())
    }, [])

    if (showLowPerformanceDialog && !isFinishing) {
        return <LowPerformanceModal cause={lowPerformanceCause} />
    }

    return (
        <div className="RoomEditor">
            {isLoading && <BouncingBallLoader className="BouncingBallLoader__roomBuilderPage" />}
            <div
                className="CloseButton__wrapper"
                onMouseDown={(e) => {
                    e.stopPropagation()
                }}
            >
                <Tooltip describedById="editor-close" title={t('dashboard:dashboard.planner.cancel')}>
                    <Button
                        type="primary"
                        inverseTheme
                        size="small"
                        ssrIcon={cross}
                        iconOnly
                        onClick={() => onCancel()}
                        text={t('dashboard:dashboard.planner.cancel')}
                        aria-label={t('dashboard:dashboard.planner.cancel')}
                    />
                </Tooltip>
            </div>
            <div className="plannerViewerContainer">
                <Planner
                    isViewerReady={isViewerReady}
                    onFinish={onFinish}
                    isFinishing={isFinishing || isSavingScene}
                    viewerId={viewerId}
                    step={step}
                    setStep={advanceToStep}
                    showInfoToast={() => setShowInfoToast(true)}
                    isRoomBuilderEditor
                />
                <div>
                    <div className="viewer" ref={canvasContainerRef}>
                        {resolvedRoomInfo && (
                            <PlannerContextProvider roomInfo={resolvedRoomInfo}>
                                <PlannerViewer
                                    viewerId={viewerId}
                                    width={width}
                                    // if the screen width is too large, we don't scale the planner height beyond the container's
                                    height={Math.min(height, 0.67 * width)}
                                    isInteractive
                                    canvasInvisible={!viewerInitialized}
                                >
                                    {viewerInitialized && (
                                        <PlannerViewerOverlay
                                            viewerId={viewerId}
                                            onDragWallStart={hideTips}
                                            showWallOverlays={onSecondStep}
                                            showWallElementOverlays
                                            step={step}
                                        />
                                    )}
                                    <Toast
                                        className="InfoTip"
                                        text={t('dashboard:dashboard.planner.more space needed')}
                                        onCloseRequest={() => setShowInfoToast(false)}
                                        isOpen={showInfoToast}
                                    />
                                </PlannerViewer>
                            </PlannerContextProvider>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
export default RoomEditor
