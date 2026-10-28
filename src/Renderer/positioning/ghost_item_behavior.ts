import * as THREE from 'three'

import type { Point2D, Point3D, Matrix3x3 } from "Renderer/geomviewer/geom_types";
import { gvCurrentCamera } from "Renderer/foundation/geom_app";
import { Point3 } from "Renderer/geometry/Point3";
import { Point2 } from "Renderer/geometry/Point2";
import { EXTRA_HINT_STACKABLE } from 'Renderer/constants';
import { getStackableSurfaceItem3D } from 'Renderer/rendering/scene_utils';
import { makeRotationX } from 'Renderer/geometry/utilities';
import * as WallSnap from 'Renderer/WallSnap'
import { BehaviorTarget, DragResult, PositioningBehavior } from "./positioning_system";
import { Bbox } from "./positioning_types";
import { getWorldRightUnitVector, getWorldForwardUnitVector } from "../utils/posUtils"
import * as pu from "./positioning_utilities";

/**
 * Defines the configuration parameters that are pulled from the GhostItem for GhostItemBehavior construction.
 */
export interface GhostItemBehaviorConfig {
    // Item's bounding box in local space.
    localBbox: Bbox
    // Item's scale
    scale: number
}
export class GhostItemBehavior implements PositioningBehavior<GhostItemBehaviorConfig> {
    private target: BehaviorTarget
    private transientPoint3 = new Point3(0, 0, 0)
    private transientPoint2 = new Point2(0, 0)
    private transientFootPrint3: Point3D[] = Array.from({ length: 4 }, () => [0, 0, 0])
    private transientFootPrint2: Point2[] = Array.from({ length: 4 }, () => new Point2(0, 0))
    private itemRight = [0, 0, 0]
    private itemForward = [0, 0, 0]
    private localBbox = {
        max: { x:0, y:0, z:0 },
        min: { x:0, y:0, z:0 },
    }

    private lastFloorDragSuccess = false

    constructor(config: GhostItemBehaviorConfig, target: BehaviorTarget) {
        this.target = target
        this.localBbox = config.localBbox
        // Behavior initialization. Set all the invariant parameters for the behavior.
        const initPos = { x: 0, y: 0, z:  0 }
        const initRot = pu.getFloorPlane()?.rot
        // Target's rotation won't change, that is why it is set at the constructor.
        // We need to set the initial position and rotation so that the first update
        // runs to have the correct item's invariant orientation.
        if (initRot) {
            this.target.setPosAbsolute(initPos)
            this.target.setRotAbsolute(initRot)
        }
        const matrixWorld = target.getTargetObjectMatrixWorld?.() || new THREE.Matrix4()
        this.itemRight = getWorldRightUnitVector(matrixWorld)
        this.itemForward = getWorldForwardUnitVector(matrixWorld)
    }

    private getWorldSpaceFootprint3d(worldPos: number[]) {
        // NorthEast corner.
        this.transientFootPrint3[0] = [
            worldPos[0] + (this.itemForward[0] * this.localBbox.max.z) + (this.itemRight[0] * this.localBbox.max.x),
            worldPos[1] + (this.itemForward[1] * this.localBbox.max.z) + (this.itemRight[1] * this.localBbox.max.x),
            worldPos[2] + (this.itemForward[2] * this.localBbox.max.z) + (this.itemRight[2] * this.localBbox.max.x)
        ]
        // NorthWest corner.
        this.transientFootPrint3[1] = [
            worldPos[0] + (this.itemForward[0] * this.localBbox.max.z) + (this.itemRight[0] * this.localBbox.min.x),
            worldPos[1] + (this.itemForward[1] * this.localBbox.max.z) + (this.itemRight[1] * this.localBbox.min.x),
            worldPos[2] + (this.itemForward[2] * this.localBbox.max.z) + (this.itemRight[2] * this.localBbox.min.x)
        ]

        // SouthEast corner.
        this.transientFootPrint3[2] = [
            worldPos[0] + (this.itemForward[0] * this.localBbox.min.z) + (this.itemRight[0] * this.localBbox.max.x),
            worldPos[1] + (this.itemForward[1] * this.localBbox.min.z) + (this.itemRight[1] * this.localBbox.max.x),
            worldPos[2] + (this.itemForward[2] * this.localBbox.min.z) + (this.itemRight[2] * this.localBbox.max.x)
        ]

        // SouthWest corner.
        this.transientFootPrint3[3] = [
            worldPos[0] + (this.itemForward[0] * this.localBbox.min.z) + (this.itemRight[0] * this.localBbox.min.x),
            worldPos[1] + (this.itemForward[1] * this.localBbox.min.z) + (this.itemRight[1] * this.localBbox.min.x),
            worldPos[2] + (this.itemForward[2] * this.localBbox.min.z) + (this.itemRight[2] * this.localBbox.min.x)
        ]

        return this.transientFootPrint3
    }

    private getWorldSpaceFootprint2d(worldPos: number[]) {
        const camera = gvCurrentCamera()
        if (!camera) {
            this.transientFootPrint2.forEach(el => el.set(0, 0))
            return this.transientFootPrint2
        }

        this.getWorldSpaceFootprint3d(worldPos).forEach((value, idx) => {
            this.transientFootPrint2[idx] = camera
                .worldToScreenFloat(this.transientPoint3.set(value[0], value[1], value[2]))
        })

        return this.transientFootPrint2
    }

    public setTargetScreenPositionStatic(xy: Point2D) {
        const location = this.target.getLocation()
        if (location?.hintExtraBindTo === EXTRA_HINT_STACKABLE) {
            return this.placeTargetToStackableSurface(xy, location.bindTo)
        }
        return this.placeTargetOnFloor(xy)
    }

    private placeTargetOnFloor(xy: Point2D) {
        const floorPlane = pu.getFloorPlane()
        if (!floorPlane) {
            this.lastFloorDragSuccess = false
            return false
        }
        const position3d = pu.samplePlane(this.transientPoint2.set(xy[0], xy[1]), floorPlane)?.position
        if (!position3d) {
            this.lastFloorDragSuccess = false
            return false
        }
        const boxFloorCorners2d =
            this.getWorldSpaceFootprint2d([position3d.x, position3d.y, position3d.z])
        const boxOnFloorFlags = boxFloorCorners2d.map(corner2d => {
            const pos = this.transientPoint2.set(corner2d.x, corner2d.y)
            return pu.queryBackgroundTypeAtScreenPos(pos) === 'floor'
        })
        const isAllOutOfRoom = boxOnFloorFlags.every(isOnFloor => !isOnFloor)
        const isAllInRoom = boxOnFloorFlags.every(isOnFloor => isOnFloor)
        if (isAllOutOfRoom) {
            this.lastFloorDragSuccess = false
            return false
        }
        if (WallSnap.isInitialized()) {
            if (!this.lastFloorDragSuccess) {
                WallSnap.resetPosition(this.target, [position3d.x, position3d.y, position3d.z], floorPlane)
            }
            const result = WallSnap.setPosition(this.target, xy)
            // This situation is possible in image based rooms when the ghost is barely in the room visually,
            // but Wallsnap still registers it out of the room because of imprecise wall lines.
            if (result.valid && 'numContactPoints' in result && result.numContactPoints === 0 && !isAllInRoom) {
                this.lastFloorDragSuccess = false
                return false
            }
            WallSnap.pushOut(this.target)
        } else {
            const posXYZ = { x: position3d.x, y: position3d.y, z: position3d.z }
            const rot: Matrix3x3 = [[...floorPlane.rot[0]], [...floorPlane.rot[2]], [
                -floorPlane.rot[1][0],
                -floorPlane.rot[1][1],
                -floorPlane.rot[1][2],
            ]]
            this.target.setPosAbsolute(posXYZ)
            this.target.setRotAbsolute(rot)
        }
        this.lastFloorDragSuccess = true
        return true
    }

    private placeTargetToStackableSurface(screenPos: Point2D, surfaceId: string): boolean {
        const surface = getStackableSurfaceItem3D(surfaceId)
        const worldPosition = pu.sampleStackableSurface({ x: screenPos[0], y: screenPos[1] }, surfaceId, true)
        if (!worldPosition || !surface) {
          return false
        }
        const localPos = surface.worldToLocal(worldPosition)
        if (!localPos) {
          return false
        }

        const xRotation = makeRotationX(Math.PI * 0.5)
        this.target.setParentBySurfaceId(surfaceId, false)
        this.target.setPosRelative(localPos)
        this.target.setRotRelative(xRotation)
        return true
    }

    public dragTargetToScreenPoint(xy: Point2D): DragResult {
        return { success: this.setTargetScreenPositionStatic(xy) }
    }
}
