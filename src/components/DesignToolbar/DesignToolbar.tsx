import Button from '@ingka/button'
import classNames from 'classnames'
import { useAppDispatch, useAppSelector, useExperiments } from 'hooks'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import {
    setFloorMaterialRoomBuilderEditor,
    setPreviousSceneIdRoomBuilderEditor,
    setPreviousCompositionIdRoomBuilderEditor,
    setRoomTemplateRoomBuilderEditor,
    setWalkedToId,
    setWallColorRoomBuilderEditor,
    setZoomLevel,
    showChangeView,
    showColorPicker,
    showDollhouseViews,
    showMeasurementsPopover,
} from 'models/ui/actions'
import { upptackaActions } from 'models/upptacka/slice'
import {
    getShouldShowChangeView,
    getShouldShowColorPicker,
    getShouldShowDollhouseViews,
    getShouldShowMeasurementsPopover,
    getWalkedToId,
    getIsRoomBuilderEditorAvailable,
} from 'models/ui/selectors'
import React, { useState, useEffect, useCallback } from 'react'

import cube3d from '@ingka/ssr-icon/paths/cube-3d'
import roomLayout from '@ingka/ssr-icon/paths/room-layout'
import store from '@ingka/ssr-icon/paths/store'
import colorFan from '@ingka/ssr-icon/paths/colour-fan'
import ruler from '@ingka/ssr-icon/paths/ruler'

import { useTranslation } from 'react-i18next'
import Price from '@ingka/price'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import defineSpace from '@ingka/ssr-icon/paths/define-space'

import { useTracker } from 'apps/TrackingBoundary'
import type { CompositionSavedFrom, RenderItemComplete } from 'models/compositions'
import { saveUpptackaComposition, setWallColor } from 'models/compositions/actions'
import {
    getSelectedRenderItemId,
    getSelectedScene,
    getSelectedCompositionRenderedItemsNumeralPrice,
    getSelectedCompositionShoppableProductData,
    getSelectedView,
    getSelectedCompositionTrackingRoomInfo,
    getSelectedComposition,
} from 'models/compositions/selectors'

import { getLocale } from 'models/location/selectors'
import { allScenesAreStandard3D } from 'models/scenes/utils'
import {
    GA_ACTION_UPPTACKA_OPEN_SUMMARY_PANEL,
    GA_CATEGORY_DYH_SUGARCUBE,
    ACTION_UPPTACKA_OPEN_SUMMARY_PANEL,
    ACTION_DIMENSIONS,
    ACTION_EDIT_ROOM,
} from 'models/tracking/constants'
import { GeomViewer, NOTIFY_VIEWER_STATE_UPDATE, ViewerStateUpdateNotification } from 'Renderer/geomviewer'
import Icon from 'components/uiElements/Icon'
import { getGrandCentral } from 'Renderer/GrandCentral'
import type { NotificationObserver } from 'Renderer/NotificationDispatcher'
import { formatCurrency } from 'utils/convertCurrency'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { viewSelected } from 'models/preview/actions'

import './DesignToolbar.scss'
import { Viewport } from 'models/preview'
import { getIsCameraInOrbitModeMoving, getViewports } from 'models/renderer/selectors'

import ColorPickerContainer from 'containers/uiElements/ColorPickerContainer'
import { WallColorsPicker } from 'components/WallColorsPicker'
import { getWallColorHex } from 'components/WallColorsPicker/helpers'
import { useWallColorsGradients } from 'components/WallColorsPicker/constants'
import { setSelectedWallColor } from 'models/wallColor/slice'
import { getSelectedWallColorGroupId, getSelectedWallColorIndex } from 'models/wallColor/selectors'
import { SOURCETYPE_ROOMBUILDER } from 'models/scenes/constants'
import { ZOOM_DEFAULT } from 'models/ui/constants'
import { goToRoomEditor } from 'models/location/actions'
import { useDesignToolbarContext } from './DesignToolbarContext'
import Tooltip from '../Tooltip'
import MultiViewModal from './MultiViewModal'
import ToolbarButton from './ToolbarButton'
import MeasurementsPopover from './MeasurementsPopover'

interface DesignToolbarProps {
    showMagicEraseMode: boolean | undefined
    sceneId: string | undefined
    compositionId: string | undefined
    exitToRoomBuilderPage: (trackLocation: CompositionSavedFrom) => void
}

const DesignToolbar: React.FunctionComponent<DesignToolbarProps> = ({
    showMagicEraseMode,
    sceneId,
    compositionId,
    exitToRoomBuilderPage,
}) => {
    const { t } = useTranslation('translation')
    const dispatch = useAppDispatch()
    const wallColorsGradients = useWallColorsGradients()
    const { isUpptacka } = useSugarcubeContext()
    const shouldShowChangeView = useAppSelector(getShouldShowChangeView)
    const shouldShowDollhouseViews = useAppSelector(getShouldShowDollhouseViews)
    const shouldShowMeasurements = useAppSelector(getShouldShowMeasurementsPopover)
    const walkedToId = useAppSelector(getWalkedToId)

    const scene = useAppSelector(getSelectedScene)
    const composition = useAppSelector(getSelectedComposition)

    const isRoomBuilderRoom = composition?.scene.sourceType === SOURCETYPE_ROOMBUILDER
    const roomTemplate = scene?.gltfManifest?.extras?.geomagical?.geomagicalScenes[0]?.roomTemplate
    const hasTemplate = isRoomBuilderRoom && !!roomTemplate

    const { variations } = useExperiments()
    const isRoomBuilderEditorAvailable = useAppSelector(getIsRoomBuilderEditorAvailable)

    const track = useTracker()
    const [shiftForCookieConsent, setShiftForCookieConsent] = useState(false)
    const [hasOrbitModeBeenTriggered, setHasOrbitModeBeenTriggered] = useState(false)
    const totalPrice = useAppSelector(getSelectedCompositionRenderedItemsNumeralPrice)
    const addedToRoomItems = useAppSelector(getSelectedCompositionShoppableProductData) as RenderItemComplete[]
    const isEmptyRoom = addedToRoomItems.length === 0
    const selectedItemId = useAppSelector(getSelectedRenderItemId)
    const { currency, currencyPosition, currencyScriptType, decimal, fraction, integer } = formatCurrency(totalPrice)
    // Upptacka would like to override and show hela-optimized functions like walk-to and zoom
    const viewerInfo = GeomViewer.bindings?.queryViewerInfo()
    const isHelaScene = allScenesAreStandard3D(scene) || isUpptacka || viewerInfo?.cameraState?.orbitModeAllowed
    const isWallTexturedHelaScene = isHelaScene && scene?.hasTexturedWalls
    const viewports: Viewport[] = useAppSelector(getViewports)

    const selectedView = useAppSelector(getSelectedView)
    const shouldShowColorPicker = useAppSelector(getShouldShowColorPicker)
    const selectedWallColorGroupId = useAppSelector(getSelectedWallColorGroupId)
    const selectedWallColorIndex = useAppSelector(getSelectedWallColorIndex)
    const currentView = viewerInfo?.currentView

    const roomInfo = useAppSelector(getSelectedCompositionTrackingRoomInfo)
    const isCameraInOrbitModeMoving = useAppSelector(getIsCameraInOrbitModeMoving)

    const wallColor = roomTemplate?.walls[0].color
    const floorMaterial = roomTemplate?.floor
    const measurementsButtonId = React.useId()
    const measurementsPopoverId = React.useId()

    const isSelectedViewOneOfFirstFour = [
        viewports[0]?.name,
        viewports[1]?.name,
        viewports[2]?.name,
        viewports[3]?.name,
    ].includes(selectedView)

    const isInDollhouseView = selectedView === viewports[5]?.name || selectedView === viewports[6]?.name
    const showWalkBack = Boolean(walkedToId && (!selectedItemId || selectedItemId === walkedToId))

    /* eslint-disable i18next/no-literal-string */
    const goBackKey = 'design.go back'
    const moveToKey = 'design.move to'
    /* eslint-enable i18next/no-literal-string */

    const { toolbarRef } = useDesignToolbarContext()

    useEffect(() => {
        dispatch(setRoomTemplateRoomBuilderEditor(roomTemplate))
    }, [roomTemplate])

    useEffect(() => {
        dispatch(setWallColorRoomBuilderEditor(wallColor))
    }, [wallColor])

    useEffect(() => {
        dispatch(setFloorMaterialRoomBuilderEditor(floorMaterial))
    }, [floorMaterial])

    useEffect(() => {
        dispatch(setPreviousSceneIdRoomBuilderEditor(sceneId))
    }, [sceneId])

    useEffect(() => {
        dispatch(setPreviousCompositionIdRoomBuilderEditor(compositionId))
    }, [compositionId])

    useEffect(() => {
        if (!currentView) {
            return
        }
        dispatch(viewSelected(currentView, currentView))
    }, [currentView])

    useEffect(() => {
        if (isCameraInOrbitModeMoving) {
            setHasOrbitModeBeenTriggered(true)
        }
    }, [isCameraInOrbitModeMoving])

    useEffect(() => {
        const resetObserver = (notification: ViewerStateUpdateNotification) => {
            // Reset when the camera comes back to a static view (like after changing the view)
            if (notification.payload?.stateInfo === 'CameraEnterStaticView') {
                dispatch(setWalkedToId(null))
            }
        }

        // TODO removing type assertion requires refactoring GrandCentral
        getGrandCentral().addObserver(NOTIFY_VIEWER_STATE_UPDATE, resetObserver as NotificationObserver)

        return () => {
            getGrandCentral().removeObserver(resetObserver as NotificationObserver)
        }
    }, [])

    // Click Handlers
    const onColorPickerClick = useCallback(() => {
        // Track opening/closing the color selector
        // Selection is tracked in middleware
        // eslint-disable-next-line i18next/no-literal-string
        const eventname = `DecorateRoom.WallColor.${!shouldShowColorPicker ? 'Open' : 'Dismiss'}`
        click(eventname, { ...roomInfo, AccessedFrom: 'Toolbar' })
    }, [roomInfo, shouldShowColorPicker])

    const closeColorPickerOnChangeViewClick = () => {
        if (!shouldShowChangeView) {
            dispatch(showColorPicker(false))
        }
    }

    const handleWalkToClick = () => {
        // eslint-disable-next-line i18next/no-literal-string
        const eventname = showWalkBack ? 'DecorateRoom.GoBack' : 'DecorateRoom.MoveTo'
        click(eventname, roomInfo)

        if (selectedItemId && selectedItemId !== walkedToId) {
            GeomViewer.bindings?.setCameraMode({
                mode: `focused`,
                itemId: String(selectedItemId),
            })
            dispatch(setZoomLevel(ZOOM_DEFAULT))
            dispatch(setWalkedToId(selectedItemId))
        } else if (walkedToId) {
            GeomViewer.bindings?.setCameraMode({ mode: `default` })
            dispatch(setZoomLevel(ZOOM_DEFAULT))
            dispatch(setWalkedToId(null))
        }
    }

    const handleViewClick = (name: string, id: string) => {
        GeomViewer.bindings?.setCurrentView?.(id)
        dispatch(viewSelected(name, id))
        dispatch(showColorPicker(false))
        setHasOrbitModeBeenTriggered(false)

        if (shouldShowChangeView) {
            dispatch(showChangeView(false))
        }

        if (shouldShowDollhouseViews) {
            dispatch(showDollhouseViews(false))
        }

        if (shouldShowMeasurements) {
            dispatch(showMeasurementsPopover(false))
        }
    }

    const handleDollhouseDropdownClick = () => {
        closeColorPickerOnChangeViewClick()

        if (isHelaScene) {
            handleViewClick(viewports[5].name, viewports[5].id)
        } else if (!isHelaScene && shouldShowChangeView && !shouldShowDollhouseViews) {
            dispatch(showDollhouseViews(true))
            dispatch(showChangeView(false))
        } else {
            dispatch(showDollhouseViews(!shouldShowDollhouseViews))
        }

        if (shouldShowMeasurements) {
            dispatch(showMeasurementsPopover(false))
        }
    }

    const handleTopViewButtonClick = () => {
        handleViewClick(viewports[4].name, viewports[4].id)
    }

    const handleSideViewsButtonClick = () => {
        closeColorPickerOnChangeViewClick()

        if (shouldShowMeasurements) {
            dispatch(showMeasurementsPopover(false))
        }

        if (!shouldShowChangeView && shouldShowDollhouseViews) {
            dispatch(showChangeView(true))
            dispatch(showDollhouseViews(false))
        } else {
            dispatch(showChangeView(!shouldShowChangeView))
        }
    }

    const handleColorPickerClick = () => {
        onColorPickerClick()

        if (!shouldShowColorPicker) {
            dispatch(showChangeView(false))
            dispatch(showDollhouseViews(false))
        }

        if (shouldShowMeasurements) {
            dispatch(showMeasurementsPopover(false))
        }

        dispatch(showColorPicker(!shouldShowColorPicker))
    }

    const handleWallColorSelect = useCallback(
        (groupId: string, colorIndex: number) => {
            if (!compositionId) return
            const hexColor = getWallColorHex(wallColorsGradients, groupId, colorIndex)
            if (!hexColor) return

            dispatch(setSelectedWallColor({ groupId, colorIndex }))
            dispatch(setWallColor(compositionId, 0, -1, hexColor, { timestamp: Date.now() }))
        },
        [wallColorsGradients, compositionId, dispatch],
    )

    const handleMeasurementsClick = () => {
        dispatch(showColorPicker(false))

        if (shouldShowChangeView) {
            dispatch(showChangeView(false))
        }

        if (shouldShowDollhouseViews) {
            dispatch(showDollhouseViews(false))
        }

        dispatch(showMeasurementsPopover(!shouldShowMeasurements))

        track(ACTION_DIMENSIONS, {
            attributes: { Enabled: !shouldShowMeasurements },
        })
    }

    const handleEditRoomClick = () => {
        track(ACTION_EDIT_ROOM, {})
        dispatch(goToRoomEditor())
    }

    // Active Button Logic
    const isDollhouseButtonActive =
        (isInDollhouseView && !shouldShowChangeView && !shouldShowColorPicker && !showWalkBack) ||
        shouldShowDollhouseViews

    const isTopViewButtonActive =
        selectedView === viewports[4]?.name &&
        !shouldShowChangeView &&
        !shouldShowColorPicker &&
        !hasOrbitModeBeenTriggered &&
        !shouldShowDollhouseViews

    const isSideViewsButtonActive =
        !shouldShowColorPicker &&
        ((shouldShowChangeView && !shouldShowDollhouseViews) ||
            (!shouldShowDollhouseViews && isSelectedViewOneOfFirstFour))

    const isEnabledNewWallColors = variations.EnableNewWallColors === 'enabled'

    const cookieConsentBanner = document.getElementById('onetrust-banner-sdk')
    const locale = getLocale()

    const returnToolbarToOriginalPosition = useCallback(() => {
        setShiftForCookieConsent(false)
    }, [])

    // shift MultiView Toggle up when cookie consent banner is present on Design Page
    useEffect(() => {
        // check for cookie consent banner in us/en only
        if (cookieConsentBanner?.style.display !== 'none' && cookieConsentBanner !== null && locale === 'en-US') {
            setShiftForCookieConsent(true)
        }
        // when cookie consent response has been submitted, return button to original position
        document.addEventListener('ikeaCookieConsent', returnToolbarToOriginalPosition)

        // remove event listener
        return () => {
            document.removeEventListener('ikeaCookieConsent', returnToolbarToOriginalPosition)
        }
    }, [cookieConsentBanner])

    if (showMagicEraseMode) {
        return null
    }

    return (
        <div
            className={classNames('DesignToolbar', {
                hideMultiView: shouldShowChangeView && isUpptacka,
                shiftForCookieConsent,
                isUpptacka,
                isOwnRoom: showMagicEraseMode,
            })}
            onMouseDown={() => {
                if (shouldShowChangeView) {
                    dispatch(showChangeView(false))
                }

                if (shouldShowDollhouseViews) {
                    dispatch(showDollhouseViews(false))
                }
            }}
        >
            <div
                className={classNames('buttonBar')}
                onMouseDown={(e) => {
                    e.stopPropagation()
                }}
                ref={toolbarRef}
            >
                {!showMagicEraseMode && (
                    <>
                        {/* Dollhouse Button */}
                        <Tooltip
                            describedById="dollhouse"
                            title={t('tooltip.switch to dollhouse view')}
                            place="top"
                            hide={shouldShowDollhouseViews}
                        >
                            <ToolbarButton
                                active={isDollhouseButtonActive}
                                className="dollhouse"
                                onClick={handleDollhouseDropdownClick}
                                icon={cube3d}
                                label={t('design.multiView.dollhouse')}
                                dropdown={!isHelaScene}
                            />
                        </Tooltip>

                        {/* Top View Button */}
                        <Tooltip describedById="top-view" title={t('tooltip.switch to top view')} place="top">
                            <ToolbarButton
                                active={isTopViewButtonActive}
                                onClick={handleTopViewButtonClick}
                                icon={roomLayout}
                                label={t('design.multiView.top view')}
                            />
                        </Tooltip>

                        {/* Side Views Button */}
                        <Tooltip
                            describedById="side-views"
                            title={t('tooltip.open side views')}
                            place="top"
                            hide={shouldShowChangeView}
                        >
                            <ToolbarButton
                                active={isSideViewsButtonActive}
                                className="sideViews"
                                onClick={handleSideViewsButtonClick}
                                icon={store}
                                label={t('design.multiView.side views')}
                                dropdown
                            />
                        </Tooltip>
                        {isHelaScene && (
                            <>
                                <div className="divider" />
                                <Tooltip
                                    describedById={`move-or-back-to-${showWalkBack ? `back` : `move`}`}
                                    title={
                                        showWalkBack
                                            ? t('tooltip.back to preset camera view')
                                            : t('tooltip.move to selected')
                                    }
                                    place="top"
                                >
                                    <Button
                                        className={classNames('toggleButton', { active: showWalkBack })}
                                        onClick={() => handleWalkToClick()}
                                        type="tertiary"
                                        disabled={!walkedToId && !selectedItemId}
                                        size="small"
                                        key={`tooltip-${showWalkBack ? 'back' : 'move'}`}
                                        aria-label={showWalkBack ? t(goBackKey) : t(moveToKey)}
                                    >
                                        <Icon svg code={showWalkBack ? 'walk_back' : 'walk_to'} />
                                        <p key={showWalkBack ? 'walkBackText' : 'moveToText'}>
                                            {showWalkBack ? t(goBackKey) : t(moveToKey)}
                                        </p>
                                    </Button>
                                </Tooltip>
                            </>
                        )}

                        {!isWallTexturedHelaScene && <div className="divider" />}

                        {/* Wall Color Button */}
                        {/*
                            We noticed a bug when having ColorPickerContainer as a child in the Tooltip, normally we would
                            hide the tooltip if shouldShowColorPicker is true, and it would just render its children.
                            But in this case this made is so that the user couldnt pick a color, cant say if its a skapa bug or not
                            since it works for 2D rooms, but not 3D rooms.
                            By doing this we need to wrap the tooltip in a div, so that the ColorPickerContainer can be rendered
                            with position absolute, since its rendered outside of the tooltip and have no parent anchor
                        */}
                        {!isWallTexturedHelaScene && (
                            <div className="colorPickerTooltipWrapper">
                                <Tooltip
                                    describedById="wall-color"
                                    title={t('tooltip.change wall color')}
                                    place="top"
                                    hide={shouldShowColorPicker}
                                >
                                    <ToolbarButton
                                        active={shouldShowColorPicker}
                                        small={isHelaScene}
                                        onClick={handleColorPickerClick}
                                        icon={colorFan}
                                        label={!isHelaScene ? t('design.wall color') : undefined}
                                    />
                                </Tooltip>
                                {isEnabledNewWallColors && (
                                    <div
                                        className={classNames('newWallColorsPicker', {
                                            visible: shouldShowColorPicker,
                                        })}
                                    >
                                        <WallColorsPicker
                                            onClose={() => {
                                                dispatch(showColorPicker(false))
                                                toolbarRef.current?.focus()
                                            }}
                                            isOpen={shouldShowColorPicker}
                                            onColorSelect={handleWallColorSelect}
                                            initialGroupId={selectedWallColorGroupId}
                                            initialColorIndex={selectedWallColorIndex}
                                        />
                                    </div>
                                )}

                                {!isEnabledNewWallColors && <ColorPickerContainer />}
                            </div>
                        )}
                    </>
                )}{' '}
                {!showMagicEraseMode && <div className="divider" />}
                {/* Measurements Button */}
                <Tooltip
                    describedById="measurements"
                    title={t('tooltip.show measurement options')}
                    place="top"
                    hide={shouldShowMeasurements}
                >
                    <ToolbarButton
                        active={shouldShowMeasurements}
                        role="button"
                        aria-haspopup="menu"
                        aria-expanded={shouldShowMeasurements}
                        aria-controls={measurementsPopoverId}
                        id={measurementsButtonId}
                        aria-label={t('tooltip.show measurement options')}
                        label={showMagicEraseMode ? t('design.measurements') : undefined}
                        small={!showMagicEraseMode}
                        onClick={handleMeasurementsClick}
                        icon={ruler}
                    />
                </Tooltip>
                {hasTemplate && isRoomBuilderEditorAvailable && (
                    <>
                        <div className="divider" />
                        {/* Edit Room Button */}
                        <Tooltip describedById="edit-room" title={t('design.edit room')} place="top">
                            <ToolbarButton
                                className="editRoom"
                                role="button"
                                label={t('design.edit room')}
                                aria-label={t('design.edit room')}
                                onClick={handleEditRoomClick}
                                icon={defineSpace}
                            />
                        </Tooltip>
                    </>
                )}
            </div>
            {isHelaScene && isUpptacka && <div className="UpptackaMultiView__divider" />}

            {isUpptacka && (
                <>
                    <div className="UpptackaMultiView__divider" />
                    <Price
                        className="UpptackaMultiView__price"
                        currencyLabel={currency}
                        currencyPosition={currencyPosition === 'before' ? 'leading' : 'trailing'}
                        currencySpacing="thin"
                        currencyVerticalAlignment={currencyScriptType === 'superscript' ? 'super' : 'base'}
                        decimalSign={decimal}
                        decimalValue={fraction}
                        integerValue={integer}
                        size="medium"
                    />
                    <Button
                        className="UpptackaMultiView__summary-button"
                        iconPosition="trailing"
                        ssrIcon={arrowRight}
                        text={t('upptacka.summary button')}
                        type="emphasised"
                        onClick={() => {
                            trackGoogleAnalytics({
                                action: GA_ACTION_UPPTACKA_OPEN_SUMMARY_PANEL,
                                category: GA_CATEGORY_DYH_SUGARCUBE,
                                label: '',
                            })
                            track.click({
                                target: 'upptacka.DesignToolbarSummaryButton',
                                intendedAction: ACTION_UPPTACKA_OPEN_SUMMARY_PANEL,
                            })
                            dispatch(saveUpptackaComposition())
                            dispatch(upptackaActions.setShowUpptackaSummary(true))
                        }}
                        disabled={isEmptyRoom}
                    />
                </>
            )}
            <MeasurementsPopover
                anchorRef={toolbarRef}
                measurementsPopoverId={measurementsPopoverId}
                showMagicEraseMode={showMagicEraseMode}
                exitToRoomBuilderPage={exitToRoomBuilderPage}
            />
            <MultiViewModal />
        </div>
    )
}

export default DesignToolbar
