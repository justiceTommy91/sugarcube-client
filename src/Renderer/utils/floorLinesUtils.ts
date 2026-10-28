import * as THREE from 'three'
import { FloorLines, PolygonType } from "Renderer/assets/Types"
import type { PlaneType, Point2D } from "Renderer/geomviewer"
import { NYUD40_CLASSES } from "Renderer/constants"
import { GeomCamera } from 'Renderer/multiview/geom_camera'
import { PixelData } from 'Renderer/assets/AssetManager'
import { EPSILON_RLXD, Point2, Point3 } from 'Renderer/geometry'
import { SceneSampler } from 'Renderer/rendering/SceneSampler'

const workspace = {
    pt2: new Point2(0, 0),
    pt3: new Point3(0, 0, 0),
}

export function extendFloorLines(floorLines: FloorLines, floor: PlaneType, camera: THREE.PerspectiveCamera) {
    // Get camera properties and floor transformation matrix.
    // Note floor plane's matrix is extracted instead of using floor polygon's matrix
    // because floorLines are calculate relative to the floor polygon in wallSnap.
    // Where polygon-vs-plane transforms differ in 'x', 'y' basis, as well as intercept.
    const frustum = new THREE.Frustum().setFromProjectionMatrix(camera.projectionMatrix)
    const transform = new THREE.Matrix4().fromArray([
        floor.rot[0][0], floor.rot[1][0], floor.rot[2][0], -floor.d * floor.rot[2][0],
        floor.rot[0][1], floor.rot[1][1], floor.rot[2][1], -floor.d * floor.rot[2][1],
        floor.rot[0][2], floor.rot[1][2], floor.rot[2][2], -floor.d * floor.rot[2][2],
        0, 0, 0, 1]).transpose()
    const transformInv = transform.clone().invert()

    // Extend floor lines which cross the camera frustum
    // to avoid items getting behind walls when dragged outside camera view.
    floorLines.forEach(line => {
        const v = []
        v[0] = new THREE.Vector3(...line.points[0], 0).applyMatrix4(transform)
        v[1] = new THREE.Vector3(...line.points[1], 0).applyMatrix4(transform)
        const idIn = frustum.containsPoint(v[0]) ? 0 : 1
        const idOut = frustum.containsPoint(v[1]) ? 0 : 1
        if (idIn === idOut) return
        const direction = v[idOut].clone().sub(v[idIn]).normalize()
        v[idOut].add(direction.multiplyScalar(999))
        // eslint-disable-next-line no-param-reassign
        line.points[idOut] = v[idOut].applyMatrix4(transformInv).toArray().slice(0, 2) as Point2D
    })
}

export function markPolygonsAsIgnored(
    wallPolygons: PolygonType[] | undefined,
    sceneSampler: SceneSampler,
    camera: GeomCamera,
    segMask: PixelData,
    isCameraAboveCeiling: boolean,
) {
    // Due to the inconsistency in the planes normals segmentations across different views
    // the semantic segmentation is used instead. A constant number of points are selected
    // along the access of the wall polygon; which are tested across the segmentation maps
    // to determine whether this wall polygon is hidden.
    const TEST_POINTS = 10
    wallPolygons?.forEach(polygon => {
        const polygonTransform = new THREE.Matrix4().fromArray(polygon.transform.flat()).transpose()
        const polygonMaxY = Math.max(...polygon.parameters.vertices.map(v => v[1]))
        const polygonMinY = Math.min(...polygon.parameters.vertices.map(v => v[1]))
        const polygonHeight = polygonMaxY - polygonMinY
        const heightStep = polygonHeight / (TEST_POINTS + 1)
        const ids = Array.from(Array(TEST_POINTS).keys())
        const points = ids.map(i => new THREE.Vector3(0, - polygonHeight / 2 + heightStep * (i + 1), 0))

        const width = camera.getViewWidth()
        const height = camera.getViewHeight()
        const origin = camera.getLocation()

        const vertices = points.map(planePoint => {
            const vertex = planePoint.applyMatrix4(polygonTransform)
            const pixelPoint = camera.worldToScreenInt(workspace.pt3.set(...vertex.toArray()))
            const segmentationId = segMask.data[4 * (pixelPoint.y * width + pixelPoint.x)]
            return { vertex, pixelPoint, segmentationId }
        }).filter(({ pixelPoint }) => !(pixelPoint.x < 0 || pixelPoint.x > width - 1
            || pixelPoint.y < 0 || pixelPoint.y > height - 1))

        // Using the semantic map; a wall is marked as ignored if:
        // * any of the points on the polygon reads as floor or ceiling, whatever the view type.
        // * all points do not belong to the polygon's plane (unknown, occluded) for dollhouse views.
        const FLOOR_SEMANTIC_ID = NYUD40_CLASSES.findIndex(val => val === 'floor')
        const OTHERS_SEMANTIC_ID = NYUD40_CLASSES.findIndex(val => val === 'otherstructure')
        const UNKNOWN_SEMANTIC_ID = NYUD40_CLASSES.findIndex(val => val === 'unknown')
        polygon.ignoreInStaticView = 
            vertices.some(({ segmentationId }) => segmentationId === FLOOR_SEMANTIC_ID)
            || isCameraAboveCeiling && vertices.length > 0 
                && vertices.every(({ vertex, pixelPoint, segmentationId}) => {
                if (segmentationId === UNKNOWN_SEMANTIC_ID || segmentationId === OTHERS_SEMANTIC_ID) {
                    return true
                }

                const relativeCoords = [pixelPoint.x / width, pixelPoint.y / height]
                const direction = camera.getUnitRayDirThruScreenPoint(relativeCoords[0], relativeCoords[1])
                const sampleResult = sceneSampler.rawRaycastSample(origin, direction)
                    .reduce((accum, curr) => {
                        const distanceSq = origin.distanceToSq(curr.position)
                        if (curr.plane.class === `wall` && distanceSq < accum.distanceSq) {
                            accum.position.copy(curr.position)
                            accum.distanceSq = distanceSq
                        }
                        return accum
                    }, { position: new Point3(0, 0, 0), distanceSq: Infinity })
                const nearestIntersection = sampleResult.distanceSq < Infinity ? sampleResult.position : undefined
                const distanceToVertex = nearestIntersection?.distanceToSq(vertex) || Infinity
                return distanceToVertex > EPSILON_RLXD
            })
    })
}