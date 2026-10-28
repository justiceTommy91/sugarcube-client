import React, { useCallback, useEffect, useState } from 'react'
import { connect } from 'react-redux'

import { hover } from 'utils/tracker'

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
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import WallPaintPin from 'components/preview/WallPaintPin'
import { getGrandCentral } from 'Renderer/GrandCentral'
import { NOTIFY_VIEWER_STATE_UPDATE, Point2D, ViewerStateUpdateNotification } from 'Renderer/geomviewer'
import { RootState } from 'store'
import { Composition } from 'models/compositions'
import { NotificationInfo } from 'Renderer/NotificationDispatcher'
import { allScenesAreStandard3D } from 'models/scenes/utils'

export type WallPaintPinContainerProps = {
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
    wallWidth: number
    wallHeight: number
    roomInfo: { [key: string]: string }
    selectedRenderItem: number | null
}

const WallPaintPinContainer: React.FunctionComponent<WallPaintPinContainerProps> = ({
    composition,
    compositionId,
    setColor,
    scenePlanes,
    scenePlanesLegacy,
    scenePlanesInpaint,
    wallColors,
    wallMarkers,
    wallWidth,
    wallHeight,
    roomInfo,
    selectedRenderItem,
}: WallPaintPinContainerProps) => {
    const [viewMarkers, setMarkers] = useState<Point2D[] | undefined>(undefined)
    const [helaPlaneIndices, setHelaPlaneIndices] = useState<number[]>([])

    const onCameraStateChange = (info: NotificationInfo) => {
        const state = info as ViewerStateUpdateNotification
        if (state.payload?.stateInfo === 'ViewChangeEnd') {
            const camera = state.payload.camera
            if (camera) {
                setMarkers(camera.getMarkers())
            }
        }
    }
    // Listen to view changes to update markers.
    useEffect(() => {
        // Register callback.
        const dispatcher = getGrandCentral()
        dispatcher.addObserver(NOTIFY_VIEWER_STATE_UPDATE, onCameraStateChange)
        return () => {
            // Unregister.
            dispatcher.removeObserver(onCameraStateChange)
        }
    }, [])

    const updateWallPlanes = (info: NotificationInfo) => {
        const state = info as ViewerStateUpdateNotification
        if (state.payload?.stateInfo === 'WallPolygonsReady') {
            const polygons = state.payload.wallPolygonsInfo.plane_polygons
            setHelaPlaneIndices(polygons.filter((poly) => poly.class === 'wall').map((wall) => wall.id))
        }
    }
    // Listen to hela rooms parsing the wall data.
    useEffect(() => {
        // Register callback.
        const dispatcher = getGrandCentral()
        dispatcher.addObserver(NOTIFY_VIEWER_STATE_UPDATE, updateWallPlanes)
        return () => {
            // Unregister.
            dispatcher.removeObserver(updateWallPlanes)
        }
    }, [])

    const { isMobile } = useSugarcubeContext()

    const onPinInteract = useCallback(
        (opening: boolean) => {
            // Track opening/closing the color selector
            // Selection is tracked in middleware
            // eslint-disable-next-line i18next/no-literal-string
            const eventname = `DecorateRoom.WallColor.${opening ? 'Open' : 'Dismiss'}`
            // eslint-disable-next-line i18next/no-literal-string
            hover(eventname, { ...roomInfo, AccessedFrom: 'DesignCanvas' })
        },
        [roomInfo],
    )

    // Note 3d room captures doesn't require any data to enable wall colors feature.
    const is3DroomCapture = allScenesAreStandard3D(composition?.scene)
    let planeIndices: number[] | undefined
    let planeIndicesInpaint: number[] | undefined
    let singleWallColor: string | number | null
    let singleWallMarker: number[]
    let colorsList: number[][]
    if (is3DroomCapture) {
        singleWallMarker = [24, 20]
        colorsList = [
            [242, 241, 237, 255],
            [209, 200, 187, 255],
            [227, 212, 202, 255],
            [195, 151, 87, 255],
            [141, 85, 68, 255],
            [189, 202, 205, 255],
            [125, 155, 163, 255],
            [177, 184, 167, 255],
            [132, 131, 126, 255],
            [149, 130, 119, 255],
            [117, 88, 108, 255],
        ]
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

        // Get the marker placement using the legacy plane IDs as plane_color_0
        // refers to the plane_orientation_0 IDs (legacy).
        const planeIndicesLegacy = scenePlanesLegacy?.map((plane) => plane.planeIdx)
        const markersToUse = viewMarkers || wallMarkers
        singleWallMarker = [
            (100 * markersToUse[planeIndicesLegacy?.[0] || 0][0]) / wallWidth,
            (100 * markersToUse[planeIndicesLegacy?.[0] || 0][1]) / wallHeight,
        ]
    }

    // Hide wall paint pin when a product is selected and when on desktop
    const hidePin = !!selectedRenderItem && !isMobile
    if (hidePin) {
        return null
    }

    return (
        <WallPaintPin
            planeIndices={planeIndices}
            helaPlaneIndices={helaPlaneIndices}
            planeIndicesInpaint={planeIndicesInpaint}
            color={singleWallColor}
            compositionId={compositionId}
            setColor={setColor}
            wallMarker={singleWallMarker}
            colorsList={colorsList}
            onPinInteract={onPinInteract}
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
})

const mapDispatchToProps = {
    setColor: setWallColor,
}

export default connect(mapStateToProps, mapDispatchToProps)(WallPaintPinContainer)
