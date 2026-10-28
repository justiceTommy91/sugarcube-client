import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { useFlags, useAppSelector } from 'hooks'

import SSRIcon from '@ingka/ssr-icon'
import Button from '@ingka/button'
import gearIcon from '@ingka/ssr-icon/paths/gear'

import { getAreDebugFeaturesEnabled } from 'models/user/selectors'
import { getLightAssets, getWindows, getDoors, getSelectedTemplateUuid } from 'models/planner/selectors'

import { usePlannerViewer } from 'Planner/ui/hooks/usePlannerViewer'
import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { usePlannerApiState } from 'Planner/ui/hooks/usePlannerApiState'
import { API_INITIALIZED } from 'Planner/api_constants'
import { STEPS, type Step } from 'models/planner/index'
import { click, error } from 'utils/tracker'
import { Asset } from 'models/planner'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'
import DoorWindowSelect from './DoorWindowSelect'
import MaterialSelect from './MaterialSelect'
import TemplateSelect from './RoomBuilderPage/TemplateSelect'
import { DimensionsSelect } from './DimensionsSelect'
import { PlannerDebugPanel } from './PlannerDebugPanel'

require('./Planner.scss')

type PlannerProps = {
    isViewerReady: boolean
    onFinish: () => void
    isFinishing: boolean
    viewerId: string
    step: Step
    setStep: (step: Step) => void
    showInfoToast: () => void
    isRoomBuilderEditor?: boolean
}

const nSteps = Object.keys(STEPS).length

const Planner = ({
    isViewerReady,
    onFinish,
    isFinishing,
    viewerId,
    step,
    setStep,
    showInfoToast,
    isRoomBuilderEditor,
}: PlannerProps) => {
    const { flags } = useFlags()
    const [showDebugPanel, setShowDebugPanel] = useState(false)
    const { t } = useTranslation('dashboard')
    const lightFixtures = useAppSelector(getLightAssets)
    const {
        setDollhouseCameraView,
        setTopDownCameraView,
        setWallsInteractive,
        setWallElementsInteractive,
        setCameraOrbitControlsAllowed,
    } = usePlannerViewer(viewerId)
    const { plannerApi } = usePlannerApi()
    const apiState = usePlannerApiState()
    const plannerTrackingInfo = usePlannerTrackingInfo()

    const doors = useAppSelector(getDoors)
    const windows = useAppSelector(getWindows)
    const selectedTemplateUuid = useAppSelector(getSelectedTemplateUuid)
    const isInitialWallElementsAdded = useRef(false)

    const onFirstStep = isRoomBuilderEditor ? step === STEPS.dimensions : step === STEPS.template
    const onSecondStep = step === STEPS.doorWindow

    const errorHandler = (err: unknown) => {
        let errMessage = ''
        let errCause = ''
        if (err instanceof Error) {
            errMessage = `${err.name}: ${err.message}`
            if (typeof err.cause === 'string' || err.cause instanceof String) {
                errCause = String(err.cause)
            }
        } else if (typeof err === 'string' || err instanceof String) {
            errMessage = String(err)
        }
        error('RoomBuilder.InitError', {
            ...plannerTrackingInfo,
            ErrorMessage: errMessage,
            ErrorCause: errCause,
        })
    }

    useEffect(() => {
        if (apiState === API_INITIALIZED && lightFixtures.length > 0) {
            const lightFixture = lightFixtures[0]
            if (lightFixture.data) {
                plannerApi
                    .setLightFixtureObject(lightFixture.data, lightFixture.baseUrl, lightFixture.uuid)
                    .catch(errorHandler)
            }
        }
    }, [lightFixtures, apiState])

    const addAndSelectWallElement = async (asset: Asset, select: boolean) => {
        const { uuid, baseUrl, data, semanticClass } = asset
        const type = semanticClass[0] === 'DOOR' ? `door` : `window`
        if (!data) {
            return
        }
        plannerApi
            .addWallElement(data, baseUrl, uuid, type, viewerId)
            .then((elementId) => select && plannerApi.forceSelectedWallElement(viewerId, elementId))
    }

    useEffect(() => {
        isInitialWallElementsAdded.current = false
    }, [selectedTemplateUuid])

    useEffect(() => {
        if (
            apiState === API_INITIALIZED &&
            onSecondStep &&
            !isInitialWallElementsAdded.current &&
            !isRoomBuilderEditor
        ) {
            const singlePanelDoor = Object.values(doors).find((door) => door.sortOrder === 1)
            const singlePanelWindow = Object.values(windows).find((window) => window.sortOrder === 1)
            if (singlePanelDoor && singlePanelWindow) {
                addAndSelectWallElement(singlePanelDoor, true)
                addAndSelectWallElement(singlePanelWindow, false)
                isInitialWallElementsAdded.current = true
            }
        }
    }, [step, apiState])

    useEffect(() => {
        if (apiState === API_INITIALIZED) {
            plannerApi.applySettings({ wallMoveMethod: flags.RoomBuilderNodeEditing ? `method2` : `method1` })
        }
    }, [apiState])

    const getStepComponentAndHeaderText = () => {
        switch (step) {
            case STEPS.template:
                return {
                    stepComponent: <TemplateSelect />,
                    stepHeader: t('dashboard.planner.set the shape and size'),
                }
            case STEPS.dimensions:
                return {
                    stepComponent: <DimensionsSelect />,
                    stepHeader: t('dashboard.planner.adjust your dimensions'),
                }

            case STEPS.materials:
                return {
                    stepComponent: <MaterialSelect />,
                    stepHeader: t('dashboard.planner.choose your room style'),
                }

            case STEPS.doorWindow:
                return {
                    stepComponent: <DoorWindowSelect viewerId={viewerId} showInfoToast={showInfoToast} />,
                    stepHeader: t('dashboard.planner.add doors and windows'),
                }
            default:
                return {
                    stepComponent: <TemplateSelect />,
                    stepHeader: t('dashboard.planner.set the shape and size'),
                }
        }
    }

    const onPrimaryCtaClick = () => {
        if (step === STEPS.materials) {
            onFinish()
        } else if (step === STEPS.template) {
            setWallsInteractive(false)
            setWallElementsInteractive(true)
            setTopDownCameraView(true)
            plannerApi.enableWallsDoubleSide(true)
            click('RoomBuilder.StepChange', {
                ...plannerTrackingInfo,
                StepIndex: STEPS.dimensions,
            })
            setStep(STEPS.dimensions)
        } else if (step === STEPS.dimensions) {
            setWallsInteractive(false)
            setWallElementsInteractive(true)
            setDollhouseCameraView(true)
            plannerApi.enableWallsDoubleSide(false)
            setCameraOrbitControlsAllowed(true)
            click('RoomBuilder.StepChange', {
                ...plannerTrackingInfo,
                StepIndex: STEPS.doorWindow,
            })
            setStep(STEPS.doorWindow)
        } else if (step === STEPS.doorWindow) {
            setDollhouseCameraView(true)
            setWallsInteractive(false)
            setWallElementsInteractive(true)
            click('RoomBuilder.StepChange', {
                ...plannerTrackingInfo,
                StepIndex: STEPS.materials,
            })
            setStep(STEPS.materials)
        }
    }

    const onGoBackCtaClick = () => {
        setWallsInteractive(false)
        setWallElementsInteractive(true)
        const isOnMaterialSelectStep = step === STEPS.materials
        const isOnDoorWindowSelectStep = step === STEPS.doorWindow
        if (isOnDoorWindowSelectStep) {
            setTopDownCameraView(true)
            setCameraOrbitControlsAllowed(false)
            plannerApi.enableWallsDoubleSide(true)
        }

        let prevStep

        if (isOnMaterialSelectStep) {
            prevStep = STEPS.doorWindow
        } else if (isOnDoorWindowSelectStep) {
            prevStep = STEPS.dimensions
        } else {
            prevStep = STEPS.template
        }

        click('RoomBuilder.StepChange', {
            ...plannerTrackingInfo,
            StepIndex: prevStep,
        })
        setStep(prevStep)
    }

    const { stepComponent, stepHeader } = getStepComponentAndHeaderText()

    const calculatedStep = isRoomBuilderEditor ? step - 1 : step
    const calculatedTotalSteps = isRoomBuilderEditor ? nSteps - 1 : nSteps

    const finalButtonText = isRoomBuilderEditor ? t('dashboard.planner.finish') : t('dashboard.design this room')

    const debugEnabled = useAppSelector(getAreDebugFeaturesEnabled) as boolean
    const onToggleDebugPanel = () => {
        setShowDebugPanel(!showDebugPanel)
    }

    return (
        <div className={classNames('Planner', { isFinishing })} id="Planner">
            <div className="Planner__stepHeader">
                <div className="Planner__progress">
                    {t('dashboard.planner.step x of y', { stepN: calculatedStep, nSteps: calculatedTotalSteps })}
                </div>
                <h3 className="Planner__stepHeading">{stepHeader}</h3>
            </div>

            <div className="stepContainer" key={step}>
                {stepComponent}
            </div>
            <div className="navFooter">
                {!onFirstStep && (
                    <Button
                        text={t('dashboard.planner.go back')}
                        type="secondary"
                        onClick={onGoBackCtaClick}
                        disabled={isFinishing}
                    />
                )}
                <Button
                    text={step === STEPS.materials ? finalButtonText : t('dashboard.planner.next')}
                    type="primary"
                    onClick={onPrimaryCtaClick}
                    disabled={!isViewerReady || isFinishing}
                />
            </div>
            {debugEnabled && (
                <>
                    {showDebugPanel && <PlannerDebugPanel viewerId={viewerId} />}
                    <div className="debugButtonContainer">
                        <button onClick={onToggleDebugPanel}>
                            <SSRIcon paths={gearIcon} />
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

export default Planner
