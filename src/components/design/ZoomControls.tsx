import React, { useEffect } from 'react'
import Button from '@ingka/button'

import minus from '@ingka/ssr-icon/paths/minus'
import plus from '@ingka/ssr-icon/paths/plus'

import { GeomViewer, NOTIFY_VIEWER_STATE_UPDATE, ViewerStateUpdateNotification } from 'Renderer/geomviewer'
import { getGrandCentral } from 'Renderer/GrandCentral'
import type { NotificationObserver } from 'Renderer/NotificationDispatcher'
import { useAppDispatch, useAppSelector } from 'hooks'
import { getPreviewSettings } from 'models/preview/selectors'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { click } from 'utils/tracker'
import { getSelectedCompositionTrackingRoomInfo, getSelectedScene } from 'models/compositions/selectors'
import { allScenesAreStandard3D } from 'models/scenes/utils'
import { useTranslation } from 'react-i18next'
import {
    ZOOM_DEFAULT,
    ZOOM_MAX,
    ZOOM_MIN,
    UPPTACKA_ZOOM_MIN,
    CAMERA_DOLLY_STEP,
    ZOOM_STEP,
    ZOOM_SCALE,
} from 'models/ui/constants'
import { getZoomLevel } from 'models/ui/selectors'
import { setWalkedToId, setZoomLevel } from 'models/ui/actions'
import Tooltip from '../Tooltip'

import './ZoomControls.scss'

// centralize walk to id and zoom level in redux
const ZoomControls = () => {
    const zoomLevel = useAppSelector(getZoomLevel)
    const previewSettings = useAppSelector(getPreviewSettings)
    const roomInfo = useAppSelector(getSelectedCompositionTrackingRoomInfo)
    const scene = useAppSelector(getSelectedScene)
    const { t } = useTranslation('translation')
    const dispatch = useAppDispatch()

    // Upptacka would like to override and show hela-optimized functions like walk-to and zoom
    const viewerInfo = GeomViewer.bindings?.queryViewerInfo()

    let zoomMax = ZOOM_MAX
    let zoomMin = ZOOM_MIN

    const { isUpptacka } = useSugarcubeContext()
    const isHelaScene = allScenesAreStandard3D(scene) || isUpptacka || viewerInfo?.cameraState?.orbitModeAllowed

    if (isUpptacka) {
        zoomMin = UPPTACKA_ZOOM_MIN
    }

    if (viewerInfo?.cameraState?.mode === 'orbit') {
        zoomMax = viewerInfo.cameraState.maxDollyDistance
        zoomMin = viewerInfo.cameraState.minDollyDistance
    }

    const handleZoomClick = (zoomIn: boolean) => {
        // eslint-disable-next-line i18next/no-literal-string
        const eventname = `DecorateRoom.${zoomIn ? 'ZoomIn' : 'ZoomOut'}`

        const info = GeomViewer.bindings?.queryViewerInfo()
        if (info?.cameraState?.mode === 'orbit') {
            const nextZoomLevel = zoomLevel + (zoomIn ? -CAMERA_DOLLY_STEP : CAMERA_DOLLY_STEP)
            GeomViewer.bindings?.setCameraDollyDistance(nextZoomLevel)
            dispatch(setZoomLevel(nextZoomLevel))
            click(eventname, { ...roomInfo, ZoomLevel: nextZoomLevel })
        } else {
            const nextZoomLevel = Math.min(zoomMax, Math.max(zoomMin, zoomLevel + (zoomIn ? ZOOM_STEP : -ZOOM_STEP)))
            GeomViewer.bindings?.zoom(nextZoomLevel / ZOOM_SCALE)
            dispatch(setZoomLevel(nextZoomLevel))
            click(eventname, { ...roomInfo, ZoomLevel: nextZoomLevel })
        }
    }
    // In orbit zoom in/out means reduce/increase camera dolly distance.
    const zoomOutDisabled = previewSettings.featureFlags.cameraOrbitMode ? zoomLevel >= zoomMax : zoomLevel === zoomMin
    const zoomInDisabled = previewSettings.featureFlags.cameraOrbitMode ? zoomLevel <= zoomMin : zoomLevel === zoomMax

    useEffect(() => {
        const resetObserver = (notification: ViewerStateUpdateNotification) => {
            // Reset when the camera comes back to a static view (like after changing the view)
            if (
                notification.payload?.stateInfo === 'OrbitModeBegin' ||
                notification.payload?.stateInfo === 'OrbitMoveEnd'
            ) {
                const info = GeomViewer.bindings?.queryViewerInfo()
                if (info?.cameraState?.mode === 'orbit') {
                    dispatch(setZoomLevel(info.cameraState.currentDollyDistance))
                    zoomMax = info.cameraState.maxDollyDistance
                    zoomMin = info.cameraState.minDollyDistance
                }
            }
            if (notification.payload?.stateInfo === 'CameraEnterStaticView') {
                dispatch(setWalkedToId(null))
                if (!previewSettings.featureFlags.cameraOrbitMode) {
                    dispatch(setZoomLevel(ZOOM_DEFAULT))
                }
            }
        }

        // TODO removing type assertion requires refactoring GrandCentral
        getGrandCentral().addObserver(NOTIFY_VIEWER_STATE_UPDATE, resetObserver as NotificationObserver)

        return () => {
            getGrandCentral().removeObserver(resetObserver as NotificationObserver)
        }
    }, [])

    if (!isHelaScene) {
        return null
    }

    return (
        <div className="ZoomControls">
            <div className="divider" />

            <div
                className="ZoomControls__wrapper"
                onMouseDown={(e) => {
                    e.stopPropagation()
                }}
            >
                <Tooltip describedById="zoom-out" title={t('tooltip.zoom out')} place="leading">
                    <Button
                        type="primary"
                        inverseTheme
                        size="small"
                        ssrIcon={minus}
                        iconOnly
                        onClick={() => handleZoomClick(false)}
                        text={t('aria.zoom out')}
                        aria-label={t('aria.zoom out')}
                        disabled={zoomOutDisabled}
                        aria-disabled={zoomOutDisabled}
                    />
                </Tooltip>
                <Tooltip describedById="zoom-in" title={t('tooltip.zoom in')} place="leading">
                    <Button
                        type="primary"
                        inverseTheme
                        size="small"
                        ssrIcon={plus}
                        iconOnly
                        onClick={() => handleZoomClick(true)}
                        text={t('aria.zoom in')}
                        aria-label={t('aria.zoom in')}
                        disabled={zoomInDisabled}
                        aria-disabled={zoomInDisabled}
                    />
                </Tooltip>
            </div>
        </div>
    )
}

export default ZoomControls
