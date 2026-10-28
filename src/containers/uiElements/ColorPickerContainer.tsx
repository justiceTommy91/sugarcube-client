import React, { useCallback, useEffect, useState } from 'react'
import { connect } from 'react-redux'

import {
    getSelectedComposition,
    getSelectedCompositionId,
    getSelectedCompositionTrackingRoomInfo,
    getSelectedRenderItemId,
    getSelectedSceneWalls,
    getSelectedSceneWallColorsList,
    getSelectedSceneWallMarkers,
    getSelectedSceneWallsInpaint,
    getSelectedSceneWallsLegacy,
} from 'models/compositions/selectors'
import { setWallColor, TrackingInfo } from 'models/compositions/actions'
import ColorPicker from 'components/uiElements/ColorPicker'
import { getGrandCentral } from 'Renderer/GrandCentral'
import { NOTIFY_VIEWER_STATE_UPDATE, Point2D, ViewerStateUpdateNotification } from 'Renderer/geomviewer'
import { RootState } from 'store'
import { Composition } from 'models/compositions'
import { NotificationInfo } from 'Renderer/NotificationDispatcher'
import { allScenesAreStandard3D } from 'models/scenes/utils'
import { getWallDataDimensions } from 'models/preview/selectors'
import { COLORS } from 'constants/wallColors'

export type ColorPickerContainerProps = {
    composition?: Composition
    compositionId: string
    setColor: (
        compositionId: string,
        planeIndex: number,
        planeIdxInpaint: number,
        colorString: string | null,
        trackingInfo: TrackingInfo,
    ) => void
    scenePlanes?: { planeIdx: number; class: string }[]
    scenePlanesLegacy?: { planeIdx: number; class: string }[]
    scenePlanesInpaint?: { planeIdx: number; class: string }[]
    wallColors?: number[][]
    wallMarkers?: number[][]
    wallDimensions: { width: number; height: number }
}

const ColorPickerContainer: React.FunctionComponent<ColorPickerContainerProps> = ({
    composition,
    compositionId,
    setColor,
    scenePlanes,
    scenePlanesLegacy,
    scenePlanesInpaint,
    wallColors,
    wallMarkers,
    wallDimensions,
}: ColorPickerContainerProps) => {
    const [viewMarkers, setMarkers] = useState<Point2D[] | undefined>(undefined)
    const { width: wallWidth, height: wallHeight } = wallDimensions

    const onCameraStateChange = useCallback((info: NotificationInfo) => {
        const state = info as ViewerStateUpdateNotification
        if (state.payload?.stateInfo === 'ViewChangeEnd') {
            const camera = state.payload.camera
            if (camera) {
                setMarkers(camera.getMarkers())
            }
        }
    }, [])

    // Listen to view changes to update markers.
    useEffect(() => {
        // Register callback.
        const dispatcher = getGrandCentral()
        dispatcher.addObserver(NOTIFY_VIEWER_STATE_UPDATE, onCameraStateChange)
        return () => {
            // Unregister.
            dispatcher.removeObserver(onCameraStateChange)
        }
    }, [onCameraStateChange])

    // Note 3d room captures doesn't require any data to enable wall colors feature.
    const is3DroomCapture = allScenesAreStandard3D(composition?.scene)

    let planeIndices: number[] | undefined
    let planeIndicesInpaint: number[] | undefined
    let singleWallColor: string | number | null
    let singleWallMarker: number[]
    let colorsList: number[][]
    let swatchesList: number[][]
    if (is3DroomCapture) {
        singleWallMarker = [24, 20]
        colorsList = COLORS.map(color => color.VIEWPORT_COLOR)
        swatchesList = COLORS.map(color => color.UI_COLOR)
        // Use the first color, no need for wall ids since it's one color.
        singleWallColor = Object.values(composition?.wallPaint || {})[0] || null
    } else {
        if (!scenePlanes || !composition?.wallPaint || !wallMarkers?.length || !wallColors) {
            return null
        }

        planeIndices = scenePlanes.map((plane) => plane.planeIdx)
        planeIndicesInpaint = scenePlanesInpaint?.map((plane) => plane.planeIdx) || []
        if (!wallMarkers[planeIndices[0]]) {
            return null
        }

        // assuming for now, that all walls are always of the same color
        singleWallColor = composition.wallPaint[planeIndices[0] || 0] || null
        colorsList = wallColors
        swatchesList = wallColors

        // Get the marker placement using the legacy plane IDs as plane_color_0
        // refers to the plane_orientation_0 IDs (legacy).
        const planeIndicesLegacy = scenePlanesLegacy?.map((plane) => plane.planeIdx)
        const markersToUse = viewMarkers || wallMarkers
        singleWallMarker = [
            (100 * markersToUse[planeIndicesLegacy?.[0] || 0][0]) / wallWidth,
            (100 * markersToUse[planeIndicesLegacy?.[0] || 0][1]) / wallHeight,
        ]
    }

    return (
        <ColorPicker
            planeIndices={planeIndices}
            planeIndicesInpaint={planeIndicesInpaint}
            color={singleWallColor}
            compositionId={compositionId}
            setColor={setColor}
            wallMarker={singleWallMarker}
            colorsList={colorsList}
            swatchesList={swatchesList}
        />
    )
}

const mapStateToProps = (state: RootState) => ({
    composition: getSelectedComposition(state),
    compositionId: getSelectedCompositionId(state),
    scenePlanes: getSelectedSceneWalls(state),
    scenePlanesLegacy: getSelectedSceneWallsLegacy(state),
    scenePlanesInpaint: getSelectedSceneWallsInpaint(state),
    wallColors: getSelectedSceneWallColorsList(state),
    wallMarkers: getSelectedSceneWallMarkers(state),
    roomInfo: getSelectedCompositionTrackingRoomInfo(state),
    selectedRenderItem: getSelectedRenderItemId(state),
    wallDimensions: getWallDataDimensions(state),
})

const mapDispatchToProps = {
    setColor: setWallColor,
}

export default connect(mapStateToProps, mapDispatchToProps)(ColorPickerContainer)
