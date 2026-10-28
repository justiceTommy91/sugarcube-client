import Switch from '@ingka/switch'
import React, { useEffect, useRef, useState } from 'react'

import './MeasurementsPopover.scss'
import classNames from 'classnames'
import { GeomViewer } from 'Renderer/geomviewer'
import { useTranslation } from 'react-i18next'
import { useRoomDimensions } from 'hooks/useRoomDimensions'
import { useDynamicMeasurements } from 'hooks/useDynamicMeasurements'
import { useTracker } from 'apps/TrackingBoundary'
import { useAppDispatch, useAppSelector, useExperiments, useOutsideAlerter } from 'hooks'
import { getShouldShowImperialMeasurements, getShouldShowMeasurementsPopover, getIsRoomBuilderEditorAvailable } from 'models/ui/selectors'
import {
    showImperialMeasurements,
    showMeasurementsPopover,
    toggleDynamicMeasurements,
    toggleProductDimensions,
    toggleRoomDimensions,
} from 'models/ui/actions'
import {
    ACTION_ROOM_BUILDER_BRIDGE,
    ACTION_TOGGLE_DYNAMIC_MEASUREMENTS,
    ACTION_TOGGLE_ITEM,
    ACTION_TOGGLE_ROOM,
    ACTION_TOGGLE_UNIT,
    TRACK_LOCATION_ROOM_BUILDER_BRIDGE,
} from 'models/tracking/constants'
import { useModalFocus } from 'hooks/aria/useModalFocus'
import Toggle from '@ingka/toggle'
import { getSelectedScene, getSelectedComposition } from 'models/compositions/selectors'
import { getIsRBShowroomByCompositionId, getHasShowrooms, getIsFetching } from 'models/showrooms/selectors'
import { fetchShowrooms } from 'models/showrooms/actions'
import Tooltip from 'components/Tooltip'
import { LIST_OF_UNSUPPORTED_SHOWROOMS } from 'constants/roomDimensions'
import { CompositionSavedFrom } from 'models/compositions'
import { ROOM_BUILDER_CUT_OUT, SOURCETYPE_ROOMBUILDER } from 'models/scenes/constants'

import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import { allScenesAreStandard3D } from 'models/scenes/utils'
import { isSmallScreenDevice, isTouchOnlyDevice } from 'utils/isMobile'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import SSRIcon from '@ingka/ssr-icon'

import { generateRoomLink } from 'models/location/selectors'

interface MeasurementsPopoverProps<T extends HTMLElement> {
    anchorRef?: React.RefObject<T | null> | undefined
    exitToRoomBuilderPage: (trackLocation: CompositionSavedFrom) => void
    measurementsPopoverId: string
    showMagicEraseMode: boolean | undefined
}

// Hard Coded Lists of Rooms that Room Dimensions don't work in -- this will be removed once graphics issues are fixed

const MeasurementsPopover = ({
    anchorRef,
    exitToRoomBuilderPage,
    measurementsPopoverId,
    showMagicEraseMode,
}: MeasurementsPopoverProps<HTMLDivElement>) => {
    const [position, setPosition] = useState({ right: 0 })
    const { variations } = useExperiments()
    const track = useTracker()
    const dispatch = useAppDispatch()

    const roomDimensionsInfo = useRoomDimensions()
    const dynamicMeasurementsInfo = useDynamicMeasurements()

    const viewerInfo = GeomViewer.bindings?.queryViewerInfo()

    const areRoomDimensionsEnabled = !!roomDimensionsInfo?.isEnabled
    const areProductDimensionsEnabled = !!viewerInfo?.productDimensionsEnabled
    const areDynamicMeasurementsEnabled = !!dynamicMeasurementsInfo?.isEnabled

    const shouldShowImperialMeasurements = useAppSelector(getShouldShowImperialMeasurements)
    const shouldShowMeasurements = useAppSelector(getShouldShowMeasurementsPopover)
    const scene = useAppSelector(getSelectedScene)

    const { isUpptacka } = useSugarcubeContext()

    const isHelaScene = allScenesAreStandard3D(scene) || isUpptacka || viewerInfo?.cameraState?.orbitModeAllowed
    const isRoomBuilderScene =
        (variations.ShowroomAB === 'alternate_showrooms' || variations.ShowroomAB === 'alternate_showrooms_v2') &&
        scene?.sourceType === SOURCETYPE_ROOMBUILDER

    const isSmallDevice = isSmallScreenDevice()
    const isTouchDevice = isTouchOnlyDevice()

    const composition = useAppSelector(getSelectedComposition)
    const showroomId = composition?.sceneId

    const hasShowrooms = useAppSelector(getHasShowrooms)
    const isFetchingShowrooms = useAppSelector(getIsFetching)
    const isRBEmptyShowroom = useAppSelector((state) => getIsRBShowroomByCompositionId(state, composition?.id))
    const isRoomBuilderEditorAvailable = useAppSelector(getIsRoomBuilderEditorAvailable)
    const shouldHideBridgeForRBShowroom = isRBEmptyShowroom && isRoomBuilderEditorAvailable

    useEffect(() => {
        if (!hasShowrooms && !isFetchingShowrooms) {
            // Fetch showrooms if not already fetched so we can check if the current composition is an empty RB showroom
            dispatch(fetchShowrooms())
        }
    }, [hasShowrooms, isFetchingShowrooms])

    const productDimensionsSwitchId = React.useId()
    const roomDimensionsSwitchId = React.useId()
    const realTimeDistancesSwitchId = React.useId()
    const unavailableTooltipId = React.useId()

    const currentSearch = typeof window !== 'undefined' ? window.location.search : ''
    const roomBuilderUrl = generateRoomLink('/room-builder') + currentSearch

    const { t } = useTranslation('translation')

    const measurementsPopoverRef = useRef<HTMLDivElement>(null)

    const handleRoomDimensionsToggle = () => {
        GeomViewer.bindings?.setRoomDimensionsEnabled(!areRoomDimensionsEnabled)
        track(ACTION_TOGGLE_ROOM, {
            attributes: { Enabled: !areRoomDimensionsEnabled },
        })
        dispatch(toggleRoomDimensions(!areRoomDimensionsEnabled))
    }

    const handleProductDimensionsToggle = () => {
        GeomViewer.bindings?.setProductDimensionsEnabled(!areProductDimensionsEnabled)
        track(ACTION_TOGGLE_ITEM, {
            attributes: { Enabled: !areProductDimensionsEnabled },
        })
        dispatch(toggleProductDimensions(!areProductDimensionsEnabled))
    }

    const handleDynamicMeasurementsToggle = () => {
        GeomViewer.bindings?.setDynamicMeasurementsEnabled(!areDynamicMeasurementsEnabled)
        track(ACTION_TOGGLE_DYNAMIC_MEASUREMENTS, {
            attributes: { Enabled: !areDynamicMeasurementsEnabled },
        })
        dispatch(toggleDynamicMeasurements(!areDynamicMeasurementsEnabled))
    }

    const handleUnitToggle = () => {
        track(ACTION_TOGGLE_UNIT, {
            attributes: { Unit: !shouldShowImperialMeasurements ? 'Imperial' : 'Metric' },
        })
        dispatch(showImperialMeasurements())
    }

    const handleRoomBuilderBridgeClick = () => {
        track(ACTION_ROOM_BUILDER_BRIDGE, {})
        exitToRoomBuilderPage(TRACK_LOCATION_ROOM_BUILDER_BRIDGE)
        dispatch(showMeasurementsPopover(false))
    }

    useEffect(() => {
        const updatePosition = () => {
            const targetRect = anchorRef?.current?.getBoundingClientRect()
            if (targetRect !== undefined) {
                // Align popover's right edge to anchor's right edge
                const right = window.innerWidth - targetRect.right
                setPosition({ right })
            }
        }

        updatePosition()
        window.addEventListener('resize', updatePosition)

        return () => {
            window.removeEventListener('resize', updatePosition)
        }
    }, [anchorRef, shouldShowMeasurements])

    const onClose = () => {
        dispatch(showMeasurementsPopover(false))
        anchorRef?.current?.focus()
    }

    useOutsideAlerter({
        ref: measurementsPopoverRef,
        onClickOutside: onClose,
        enableEscapeKey: true,
    })
    useModalFocus(shouldShowMeasurements, measurementsPopoverRef)

    const measurementsConfig = [
        /* eslint-disable i18next/no-literal-string */
        {
            key: 'product',
            checked: areProductDimensionsEnabled,
            onChange: handleProductDimensionsToggle,
            label: t('design.product dimensions'),
            switchId: productDimensionsSwitchId,
            name: 'product-dimensions-switch',
            value: 'product-dimensions-value',
            showInOwnRoom: true,
        },
        {
            key: 'dynamic-measurements',
            checked: areDynamicMeasurementsEnabled,
            onChange: handleDynamicMeasurementsToggle,
            label: t('design.product spacing'),
            switchId: realTimeDistancesSwitchId,
            name: 'real-time-distances-switch',
            value: 'real-time-distances-value',
            showInOwnRoom: true,
        },
        {
            key: 'room',
            checked: areRoomDimensionsEnabled,
            onChange: handleRoomDimensionsToggle,
            label: t('design.room dimensions'),
            switchId: roomDimensionsSwitchId,
            name: 'room-dimensions-switch',
            value: 'room-dimensions-value',
            showInOwnRoom: false,
        },
        /* eslint-enable i18next/no-literal-string */
    ]

    const isShowroomUnsupported = showroomId && LIST_OF_UNSUPPORTED_SHOWROOMS.includes(showroomId)

    const disableRoomDimensions =
        isShowroomUnsupported || !roomDimensionsInfo?.isValid || !roomDimensionsInfo?.shouldBeVisible

    return (
        <div
            className={classNames('MeasurementsPopover', {
                visible: shouldShowMeasurements,
            })}
            ref={measurementsPopoverRef}
            role="menu"
            aria-labelledby="measurements-toggle-button"
            tabIndex={-1}
            style={{
                right: position.right,
                alignSelf: 'flex-end',
            }}
            id={measurementsPopoverId}
        >
            {(!isHelaScene || isRoomBuilderScene || isRBEmptyShowroom) &&
                !shouldHideBridgeForRBShowroom &&
                !showMagicEraseMode &&
                !isTouchDevice &&
                !isSmallDevice && (
                    <>
                        <div className="MeasurementsPopover__roomBuilderBridge">
                            <a
                                href={roomBuilderUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={handleRoomBuilderBridgeClick}
                                className="MeasurementsPopover__roomBuilderBridgeImage"
                                tabIndex={-1}
                            >
                                <img
                                    src={ROOM_BUILDER_CUT_OUT}
                                    alt={t('design.alt.room builder bridge')}
                                    width={140}
                                    height={140}
                                />
                            </a>
                            <div className="MeasurementsPopover__roomBuilderBridgeText">
                                <p className="MeasurementsPopover__roomBuilderBridgePrompt">
                                    {t('design.want to create')}
                                </p>
                                <p>{t('design.build a room with the exact')}</p>
                                <a
                                    href={roomBuilderUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={handleRoomBuilderBridgeClick}
                                    className="MeasurementsPopover__roomBuilderButton"
                                >
                                    {t('design.build a room')}
                                    <SSRIcon paths={arrowRight} />
                                </a>
                            </div>
                        </div>
                        <hr />
                    </>
                )}

            <div
                className={classNames('MeasurementsPopover__measurementControls', {
                    shrinkControls: showMagicEraseMode,
                })}
            >
                {measurementsConfig.map((config) => {
                    if (showMagicEraseMode && !config.showInOwnRoom) {
                        return null
                    }
                    // Disable Room Dimensions Toggle if unsupported in room
                    if (config.key === 'room' && disableRoomDimensions) {
                        return (
                            <div key={config.key} className="MeasurementsPopover__controlContainer">
                                <label htmlFor={config.switchId} className="disabled">
                                    {config.label}
                                </label>
                                <Tooltip describedById={unavailableTooltipId} title={t('tooltip.unavailable')}>
                                    <Switch
                                        checked={config.checked}
                                        id={config.switchId}
                                        name={config.name}
                                        value={config.value}
                                        onChange={config.onChange}
                                        subtle
                                        className="MeasurementsPopover__trigger"
                                        // eslint-disable-next-line i18next/no-literal-string
                                        role="menuitemcheckbox"
                                        aria-checked={config.checked}
                                        disabled
                                    />
                                </Tooltip>
                            </div>
                        )
                    }
                    return (
                        <div key={config.key} className="MeasurementsPopover__controlContainer">
                            <label htmlFor={config.switchId}>{config.label}</label>
                            <Switch
                                checked={config.checked}
                                id={config.switchId}
                                name={config.name}
                                value={config.value}
                                onChange={config.onChange}
                                subtle
                                className="MeasurementsPopover__trigger"
                                // eslint-disable-next-line i18next/no-literal-string
                                role="menuitemcheckbox"
                                aria-checked={config.checked}
                            />
                        </div>
                    )
                })}

                <div className="MeasurementsPopover__trigger">
                    <span className="MeasurementsPopover__unitToggleText">{t('design.unit')}</span>
                    <Toggle
                        id="unit-toggle-id"
                        className="MeasurementsPopover__unitToggle"
                        buttons={[
                            { text: t('common.measurement units.foot') },
                            { text: t('common.measurement units.centimeter') },
                        ]}
                        onClick={handleUnitToggle}
                        activeIndex={shouldShowImperialMeasurements ? 0 : 1}
                    />
                </div>
            </div>
        </div>
    )
}

export default MeasurementsPopover
