import * as THREE from "three"
import type { IntersectionInfo, ThreeBasis } from "Renderer/positioning/positioning_types"
import { Point3D } from "Renderer/geomviewer/geom_types"
import { PlacingBehavior } from "Renderer/geomviewer/geom_constants"
import * as numeric from "Renderer/utils/NumericUtils"
import type { PlaneType } from "Renderer/geomviewer/geom_types"


// Returns the item's local Z-axis as a unit vector [x, y, z] in world space.
export function getWorldForwardUnitVector(matrixWorld: THREE.Matrix4) {
    if (!matrixWorld)
        return [0, 0, 0]
    const e = matrixWorld.elements
    const worldForward = [e[ 8 ], e[ 9 ], e[ 10 ]]
    const worldForwardNormalized = numeric.mul(worldForward, 1.0 / numeric.norm2(worldForward))

    return worldForwardNormalized
}

export function getWorldRightUnitVector(matrixWorld: THREE.Matrix4): Point3D {
    if (!matrixWorld)
        return [0, 0, 0]
    const e = matrixWorld.elements
    const worldRight = [e[ 0 ], e[ 1 ], e[ 2 ]]
    const worldRightNormalized = numeric.mul(worldRight, 1.0 / numeric.norm2(worldRight))

    return worldRightNormalized as Point3D
}

export function getObjBasisForIntersection(intersection: IntersectionInfo,
    trackingObject: THREE.Object3D, floorPlane: PlaneType, itemLandingPlane: PlaneType,
    placingBehavior: PlacingBehavior) {
    if (!intersection.point || !intersection.normal) {
        return null
    }
    const trackingObjWorldPos = trackingObject.getWorldPosition(new THREE.Vector3())
    const trackingObjZAxis = new THREE.Vector3().subVectors(trackingObject
        .localToWorld(new THREE.Vector3(0.0, 0.0, 1.0)), trackingObjWorldPos)
    let upVector = [0, 1, 0]
    if (placingBehavior === PlacingBehavior.ON_FLOOR)
        upVector = floorPlane.rot[2]
    else if (itemLandingPlane)
        upVector = itemLandingPlane.rot[1]
    const trackingObjYAxis = new THREE.Vector3().fromArray(upVector)
    const yAxis = new THREE.Vector3()
    const zAxis = new THREE.Vector3()
    const xAxis = new THREE.Vector3()
    if (placingBehavior === PlacingBehavior.ON_FLOOR) {
        yAxis.copy(trackingObjYAxis).normalize()
        zAxis.set(intersection.normal.dx, intersection.normal.dy, intersection.normal.dz).normalize()
        xAxis.crossVectors(yAxis, zAxis)
    } else if (placingBehavior === PlacingBehavior.ON_WALL) {
        yAxis.copy(trackingObjZAxis).normalize()
        zAxis.set(intersection.normal.dx, intersection.normal.dy, intersection.normal.dz).normalize()
        xAxis.crossVectors(yAxis, zAxis)
    }

    return [xAxis, yAxis, zAxis] as ThreeBasis
}

// Returns normalized to the range [-π, π].
// In other words, maps <angleInRadians> to equivalent angle within [-π, π].
export function getNormalizedAngle(angleInRadians: number) {
  return Math.atan2(Math.sin(angleInRadians), Math.cos(angleInRadians));
}
