import {
    Location3,
    Matrix3x3,
    Matrix4x4,
    Point2D,
    Point3D,
    PointXYZ,
} from 'Renderer/geomviewer/geom_types'
import type { Point2 } from 'Renderer/geometry/Point2'
import { Vector3 } from 'Renderer/geometry'
import type { RenderItem3D } from "Renderer/model/RenderItem3D"

export type DragResult = {
    success: boolean
    referencePointChanged?: boolean
}
export interface PositioningBehavior<TConfig> {
    /**
     * Set the item's position including 2D and 3D location and orientation,
     *  given a 2D screen location.
     * The input location is given in relative screen coordinates.
     * How the item's position in the scene depends on a number of factors, including
     * the type of item, whether snapping to a wall happens, etc.
     * This function sets the position without taking  in account item's current state
     * (e.g. current item's orientation, which surface it is bound to, etc).
     * @returns Whether the position is valid. To handle PositioningTarget visibility.
     */
    setTargetScreenPositionStatic: (pos2d: Point2D) => boolean

    /**
     * Drag the item to a new screen position, updating its 3D location and orientation.
     * The input location is given in relative screen coordinates.
     * The position setting is initiated by user dragging the item, so the final
     * position may depend on the current item state (e.g. which surface it is currently bound to, orientation, etc).
     * @returns Whether the position is valid. To handle PositioningTarget visibility.
     */
    dragTargetToScreenPoint: (pos2d: Point2D) => DragResult

    /**
     * Pass a new config and update the target accordingly.
     */
    updateConfig?: (config: TConfig) => void
}

export type WallSnapBody = {
    rot: number
    pos: number[]
    lines: number[][][]
    normals: number[]
    corners: number[][]
    mass: number
    area: number
    density: number
    i: number
    radius: number
}

export type WallSnapPose = {
    pos: Point3D
    rot: Matrix3x3
}

export interface WallSnapAdapter {
    get orientation(): number
    set orientation(value: number)
    get body(): WallSnapBody | null
    get position(): Point2D | undefined
    set position(screenPoint: Point2D | undefined)
    get pose(): WallSnapPose
    set pose(pose: WallSnapPose)
}

/**
 * Provides functions that PositioningBehavior requires to act on an item.
 */
export interface BehaviorTarget {
    // Get target's current location
    getLocation: () => Location3 | undefined
    // Get target's world position
    getWorldTransform?: () => Matrix4x4 | undefined
    // Function to set target's 2d position. Sets value directly with not logic.
    // To support legacy 2D based classes.
    setTargetPos2D?: (xy: [number, number]) => void

    setPosRelative: (pos: PointXYZ) => void
    setPosAbsolute: (pos: PointXYZ) => void
    setRotRelative: (rotation: Matrix3x3) => void
    setRotAbsolute: (rotation: Matrix3x3) => void

    getPosRelative(): PointXYZ
    getPosAbsolute(): PointXYZ
    getRotRelative(): Matrix3x3
    getRotAbsolute(): Matrix3x3

    // Gets the three object's world matrix
    getTargetObjectMatrixWorld?: () => THREE.Matrix4
    // Set target's drag reference point in target's local coordinates.
    setDragReferencePoint?:(position: Vector3) => void
    // Get target's drag reference point projected on screen.
    getLocalPointProjectionOnScreen?: (localPoint: PointXYZ) => Point2 | undefined
    // Get rotation value manually specified by user, if applicable.
    getHeading?:() => number
    // Force rotation value that usually is manually specified by user, if applicable.
    setHeading?:(value: number) => void
    // Get wether the target can stack. In other words, if its stackable. 
    getCanStack?:() => boolean
    // Get whether the target is visible. Visibily is used to hide/show item while dragging along
    // a valid/non-valid positions and to handle raycast interference.
    getIsVisible?: () => boolean
    // Set the target visiblity. Visibily is used to hide/show item while dragging along
    // a valid/non-valid positions and to handle raycast interference.
    setVisible?: (visible: boolean) => void
    
    // Set target's parent.
    setParent: (parent: RenderItem3D | null, draggingInHand: boolean) => boolean
    setParentBySurfaceId: (parentId: string | null, draggingInHand: boolean) => boolean
    setParentByRenderItemId: (parentId: string | null, draggingInHand: boolean) => boolean
    setParentSurface: (id: string) => void

    getWallSnapAdapter?: () => WallSnapAdapter
}
