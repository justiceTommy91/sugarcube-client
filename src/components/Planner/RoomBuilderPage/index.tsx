import React, { useCallback, useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Toast from '@ingka/toast'

import { useAppDispatch, useAppSelector, useFlags } from 'hooks'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { usePlannerApiState } from 'Planner/ui/hooks/usePlannerApiState'
import { usePlannerViewer } from 'Planner/ui/hooks/usePlannerViewer'
import { useRoomWallsInfo } from 'Planner/ui/hooks/useRoomWallsInfo'
import { API_INITIALIZED, API_INITIALIZING, VIEWER_INITIALIZED } from 'Planner/api_constants'

import { PlannerContextProvider } from 'Planner/ui/components/PlannerContext'
import { PlannerViewer } from 'Planner/ui/components/PlannerViewer'
import { createRoomPlannerScene } from 'models/scenes/actions'
import { getIsSaving } from 'models/scenes/selectors'
import {
    clearSessionTracking,
    requestAllData,
    resetSelectedTemplateToDefault,
    setSelectedColorIndex,
    setSelectedMaterialUuid,
} from 'models/planner/slice'
import {
    getTemplates,
    getIsLoadingTemplates,
    getIsTemplateDataResolved,
    getSelectedTemplateRoomInfo,
    getIsLoadingMaterials,
    getMaterials,
    getSessionStats,
} from 'models/planner/selectors'
import { requestFurnitureCategories } from 'models/furniture/actions'
import { useHeaderContentFromContextualCard } from 'models/referrer/hooks'
import { getContextFromReferrer } from 'models/referrer/selector'
import { STEPS, type Step } from 'models/planner/index'
import * as tracker from 'utils/tracker'
import { GA_ACTION_ROOM_BUILDER_DESIGN_THIS_ROOM, GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'
import { GLTf } from 'Renderer/gltf/gltf'
import { validateHDRfile } from 'Renderer/utils/rgbeUtils'
import { usePlannerErrors } from 'hooks/editor/usePlannerErrors'
import LowPerformanceModal from 'components/design/LowPerformanceModal'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'
import { startRoomPlanner, finishRoomPlanner } from 'models/planner/actions'
import { PreviewLoading } from 'components/preview/PreviewLoading'
import { PlannerViewerOverlay } from '../PlannerViewerOverlay'
import Planner from '../Planner'

export type GltfAssetDesc = {
    uuid: string
    data: GLTf
    baseUrl: string
}

require('./styles.scss')

// This id can be any string for now, we are only showing one viewer at a time.
const viewerId = `viewer1`

const TIPS_DELAY = 5_000

const RoomBuilder = () => {
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
    const { plannerApi } = usePlannerApi()
    const plannerApiState = usePlannerApiState()
    const { viewerState } = usePlannerViewer(viewerId)
    const wallsInfo = useRoomWallsInfo()
    const plannerTrackingInfo = usePlannerTrackingInfo()

    const dispatch = useAppDispatch()
    const [step, setStep] = useState<Step>(STEPS.template)

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
    const [floorMaterialInitialized, setFloorMaterialInitialized] = useState(false)

    const templates = Object.values(useAppSelector(getTemplates))
    const isLoadingTemplates = useAppSelector(getIsLoadingTemplates)
    const isTemplateDataResolved = useAppSelector(getIsTemplateDataResolved)
    const hasTemplates = templates.length && !isLoadingTemplates

    const selectedTemplateRoomInfo = useAppSelector(getSelectedTemplateRoomInfo)

    const materials = Object.values(useAppSelector(getMaterials))
    const isLoadingMaterials = useAppSelector(getIsLoadingMaterials)
    const hasMaterials = materials.length && !isLoadingMaterials

    const onSecondStep = step === STEPS.dimensions
    const isSavingScene = useAppSelector(getIsSaving)

    const { flags } = useFlags()

    const context = useAppSelector(getContextFromReferrer)
    useHeaderContentFromContextualCard(context)

    const sessionStats = useAppSelector(getSessionStats)

    // placeholder callback to open the design page with exported gltf from planner api
    const onFinish = useCallback(async () => {
        setIsFinishing(true)

        // Block the main thread to avoid freezing the UI while exporting the scene.
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 0)
        })

        const now = Date.now()
        const sessionDuration = now - (window.globalPlannerSessionStart ?? 0)
        const trackingInfo = {
            EditSummary: {
                SessionDurationMS: sessionDuration,
                ...sessionStats,
                RoomSummary: {
                    NumWalls: wallsInfo.length,
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
            dispatch(createRoomPlannerScene(t('dashboard:dashboard.planner.default room name'), gltf, envmap))
        }
    }, [sessionStats, wallsInfo])

    const updateCanvasDimensions = () => {
        if (canvasContainerRef.current) {
            const containerRect = canvasContainerRef.current.getBoundingClientRect()
            setWidth(containerRect.width)
            setHeight(containerRect.height)
        }
    }
    // When loading templates is finished, the bouncy ball disappears, and canvasContainerRef is instantiated.
    useEffect(updateCanvasDimensions, [isLoadingTemplates])

    useEffect(() => {
        dispatch(clearSessionTracking())
        dispatch(startRoomPlanner())
    }, [])

    useEffect(() => {
        // Reset selections when the modal opens
        dispatch(setSelectedColorIndex(0))
        dispatch(setSelectedMaterialUuid(materials[0]?.uuid ?? null))

        window.addEventListener('resize', updateCanvasDimensions)
        // Disable scroll wheel on background
        document.body.style.overflow = `hidden`
        return () => {
            setIsFinishing(false)
            window.removeEventListener('resize', updateCanvasDimensions)
            document.body.style.overflow = `unset`
            // Reset the template selection on exit so the next entry starts on the
            // first template (rectangular) from its initial render — no flash of
            // the previous session's choice.
            dispatch(resetSelectedTemplateToDefault())
        }
    }, [])

    useEffect(() => {
        if (!hasTemplates) {
            dispatch(requestAllData())
        }
    }, [hasTemplates])

    useEffect(() => {
        if (hasMaterials && plannerApiState === API_INITIALIZED) {
            const firstMaterial = materials[0]
            plannerApi
                .setFloorMaterialFromGltfObject(firstMaterial.uuid, firstMaterial.data, firstMaterial.baseUrl)
                .then(() => setFloorMaterialInitialized(true))
        } else if (plannerApiState === API_INITIALIZING) {
            setFloorMaterialInitialized(false)
        }
    }, [plannerApiState, hasMaterials])

    useEffect(() => {
        // Pre-saving categories once goes to RoomBuilder page
        if (context) {
            dispatch(requestFurnitureCategories())
        }
    }, [context])

    const viewerInitialized = viewerState === VIEWER_INITIALIZED && floorMaterialInitialized

    if (showLowPerformanceDialog && !isFinishing) {
        return <LowPerformanceModal cause={lowPerformanceCause} />
    }

    return (
        <div className="RoomBuilder">
            {(isFinishing || isSavingScene) && <PreviewLoading />}
            <div className="plannerViewerContainer">
                <Planner
                    isViewerReady={isViewerReady}
                    onFinish={onFinish}
                    isFinishing={isFinishing || isSavingScene}
                    viewerId={viewerId}
                    step={step}
                    setStep={advanceToStep}
                    showInfoToast={() => setShowInfoToast(true)}
                />
                <div>
                    <div className="viewer" ref={canvasContainerRef}>
                        {selectedTemplateRoomInfo && isTemplateDataResolved && (
                            <PlannerContextProvider roomInfo={selectedTemplateRoomInfo}>
                                <PlannerViewer
                                    viewerId={viewerId}
                                    width={width}
                                    // if the screen width is too large, we don't scale the planner height beyond the container's
                                    height={Math.min(height, 0.67 * width)}
                                    isInteractive
                                    canvasInvisible={!viewerInitialized}
                                >
                                    <PlannerViewerOverlay
                                        viewerId={viewerId}
                                        onDragWallStart={hideTips}
                                        showWallOverlays={onSecondStep}
                                        showWallElementOverlays
                                        step={step}
                                    />

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
export default RoomBuilder
