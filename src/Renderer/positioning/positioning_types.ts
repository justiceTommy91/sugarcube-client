import { Location3, Matrix3x3, PlaneType, PointXYZ } from "Renderer/geomviewer/geom_types"
import {
    Point2Pod,
    Point3,
    Point3Pod,
    Vector3,
    Vector3Pod
} from "Renderer/geometry"

// Fixed length array types.
export type NumArrLen4 = [number, number, number, number]
export type NumArrLen16 = [...NumArrLen4, ...NumArrLen4, ...NumArrLen4, ...NumArrLen4]
export type ThreeBasis = [THREE.Vector3, THREE.Vector3, THREE.Vector3]

// Ray type for casting into the scene.
export type Ray = {
    origin: Point3Pod,
    dir: Vector3Pod,
}

// An item bounding box in 3-space.
export type Bbox = {
    max: PointXYZ
    min: PointXYZ
}

// An item's location is a point in 3-space and the plane it's bound to at that location.
export type ItemLoc3 = {
    pt3: Point3Pod,
    boundToPlane: PlaneType,
}

export type IntersectionInfo = {
    distance: number,
    point: Point3 | null,
    normal: Vector3 | null,
    plane: PlaneType | null,
}

// GenericItemLocInfo is essentially a bag of position properties, some 2D and some 3D,
// that are used to update an item's position.
export type GenericItemLocInfo = {
    // 3D position in world space.
    worldPos3d?: Point3Pod;
    // Item rotation matrix, usually taken from the plane or surface the item is bound to.
    rotation?: Matrix3x3;
    // Legacy 2D position in pano coordinates.
    panoPos2D?: Point2Pod;
    // Orientation about the vertical axes.
    orientation?: number;
}

// The type that WallSnap returns when its sets a floor position.
export type CollisionsInfo = {
    // If the position is valid.
    valid: boolean;
    // Number corners of the item that are in touch with the wall.
    numContactPoints?: number | null;
    // Array of arrays that holds the contacts world positions and the corners of the item in contact.
    contactPoints?: number[][][] | null
}

// The asserted type from CollisionsInfo type to use downstream.
export type CollisionsInfoAsserted = {
    valid: boolean;
    numContactPoints: number;
    contactPoints: number[][][]
}

// The type that is used to store information regarding the initial placement of the furniture and wallart items.
export type InitialPosInfo = {
    pos2D: [number, number],
    pos3D: Location3
}
