/* eslint-disable class-methods-use-this */
// import * as THREE from 'three'
import * as WallSnap from 'Renderer/WallSnap'

import { PositioningBehavior, BehaviorTarget, DragResult } from 'Renderer/positioning/positioning_system'
import { Matrix3x3, Point2D, PlaneType, SurfaceClass } from 'Renderer/geomviewer/geom_types'
import { Point2, Point3, Point3Pod } from 'Renderer/geometry'
import * as pu from 'Renderer/positioning/positioning_utilities'
import * as su from 'Renderer/positioning/stackables_utilities'
import { Vector3 } from 'Renderer/geometry/Vector3'
import { CollisionsInfo } from 'Renderer/positioning/positioning_types'
import { getHeadingFromQuaternion, makeRotationX, makeRotationY, multiplyMatrices3x3, extractQuaternionFromMat3,
  upperLeft3, 
  extractPosition} from 'Renderer/geometry/utilities'
import type { PointSampleResult } from 'Renderer/rendering/SceneSampler'
import { WALL_3D_PUSH_IN_MARGIN, EXTRA_HINT_STACKABLE, EXTRA_HINT_DRAGGING_IN_HAND,
  STACKABLE_TEAR_OFF_TRESHOLD_PIXELS, STACKABLE_TEAR_OFF_TRESHOLD_METERS,
  STACKABLE_SNAP_TO_TRESHOLD_METERS } from 'Renderer/constants'
import { getStackableSurfaceItem3D } from 'Renderer/rendering/scene_utils'
import StackableSurfaceItem3D from 'Renderer/model/StackableSurfaceItem3D'

const workspace = {
    pt2: new Point2(0, 0),
    pt3: new Point3(0, 0, 0),
    v31: new Vector3(0, 0, 0),
    v32: new Vector3(0, 0, 0),
}

export type Behavior3DConfig = {
  // All three flags (canBePlacedOnWall, canBePlacedOnFloor and canBePlacedOnFloorAndWall) can be true
  // at the same time, but in practice canBePlacedOnFloorAndWall is meaningful only when two others are false.
  canBePlacedOnWall: boolean
  canBePlacedOnFloor: boolean
  canBePlacedOnWallFloorEdge: boolean
  targetSizeX: number
  targetSizeY: number
  targetSizeZ: number
}

// Defines a collision with a surface in the scene
export type SurfaceCollision = {
  surfaceType: SurfaceClass
  surfaceId: number | null
}

export class PositioningBehavior3D implements PositioningBehavior<Behavior3DConfig> {
    private target: BehaviorTarget
    private config: Behavior3DConfig

    constructor(target: BehaviorTarget, targetConfig: Behavior3DConfig) {
        this.target = target
        this.config = targetConfig
    }

    public setTargetScreenPositionStatic(xy: Point2D) {
      return this.handleStaticPositioningToScreenPoint(xy)
    }

    public dragTargetToScreenPoint(xy: Point2D, mousePoint?: Point2D) {
      return this.handleDraggingToScreenPoint(xy, mousePoint)
    }

    public updateConfig(config: Behavior3DConfig) {
      this.config = config
      this.refreshTargetTransform();
    }

    // Returns a list of surfaces that the target is colliding with
    public getCollisionState(): SurfaceCollision[] {
      const currentBoundTo = this.getSurfaceTargetIsBoundTo()
      const boundToFloor = currentBoundTo?.class === `floor`
      const boundToWall = currentBoundTo?.class === `wall`
      const collisionInfo = this.getCollisionInfo()

      const targetTouchesWall = 
        boundToWall ||
        (WallSnap.isInitialized() &&
        boundToFloor && 
        collisionInfo.valid &&
        collisionInfo.numContactPoints &&
        collisionInfo.numContactPoints > 0)

      if (targetTouchesWall) {
        return [{ surfaceType: `wall`, surfaceId: null }]
      }

      return []
    }

    private getCollisionInfo() {
      if (WallSnap.isInitialized() && this.target) {
          return WallSnap.getCollisionInfo(this.target, 0.02)
      }
      return { valid: false, numContactPoints: 0, contactPoints: [] }
    }

    private handleStaticPositioningToScreenPoint(screenPos: Point2D): boolean {
      let sampleResult = null
      const screenPoint = workspace.pt2.set(screenPos[0], screenPos[1])
      // If target is not stacked, ignore static stackable surfaces to get the surface class. 
      // E.g to get the floor when its occluded by a static surface for a given <screenPoint>.
      const isTargetStacked = this.target.getLocation()?.hintExtraBindTo === EXTRA_HINT_STACKABLE
      const ignore: SurfaceClass | undefined = isTargetStacked ? undefined : `stackable`
      const surfaceClass = pu.queryBackgroundTypeAtScreenPos(screenPoint, ignore)

      if (this.config.canBePlacedOnFloor && (surfaceClass === 'floor')) {
        sampleResult = pu.sampleFloor(screenPoint)
        if (sampleResult) {
          this.bindTargetToSurface(sampleResult.position, sampleResult.plane)
        }
        if (this.target.getWallSnapAdapter) {
          WallSnap.setPosition(this.target.getWallSnapAdapter(), screenPos)
        }
        return true
      }
      if (this.config.canBePlacedOnWall && this.config.canBePlacedOnFloor) {
        sampleResult = pu.sampleScene(screenPoint, true)
      } else if (this.config.canBePlacedOnWall) {
        sampleResult = pu.sampleAllWallsPlanes(screenPoint, true)
      } else if (this.config.canBePlacedOnWallFloorEdge) {
        sampleResult = pu.sampleScene(screenPoint, true)
      }

      if (!sampleResult) {
          return false
      }
      return this.bindTargetToSurface(sampleResult.position, sampleResult.plane)
    }

    private handleDraggingToWallFloorEdge(
      screenPos: Point2D, bindToSurfaceClass: SurfaceClass | 'none') {
      const backgroundType = pu.queryBackgroundTypeAtScreenPos({ x: screenPos[0], y: screenPos[1] })
      if (backgroundType === 'floor') {
        const sampleResult = pu.sampleFloor(workspace.pt2.set(screenPos[0], screenPos[1]))
        const floorPlane = pu.getFloorPlane()
        if (sampleResult && floorPlane) {
          this.bindTargetToSurface(sampleResult.position, floorPlane)
        }
        return {success: true, referencePointChanged: false}
      }

      if (backgroundType === 'none') {
        // Outside of floor area, don't try to map back to a wall
        return {success: false }
      }

      if (bindToSurfaceClass === 'wall')
        return this.handleDraggingOnWall(screenPos)
      
      return { success: false }
    }

    private handleDraggingToScreenPoint(screenPos: Point2D, mousePoint?: Point2D): DragResult {
      const hint = this.target.getLocation()?.hintExtraBindTo
      if (hint === EXTRA_HINT_STACKABLE) {
        return this.handleDraggingOnStackableSurface(screenPos, mousePoint)
      }
      if (mousePoint && hint === EXTRA_HINT_DRAGGING_IN_HAND) {
        const result = this.handleDraggingInHand(mousePoint)
        this.target.setVisible?.(result.success)
        return result
      }

      const backgroundType = pu.queryBackgroundTypeAtScreenPos({ x: screenPos[0], y: screenPos[1] })
      const currentBoundTo = this.getSurfaceTargetIsBoundTo()
      
      /* eslint-disable-next-line i18next/no-literal-string */
      let boundToSurfaceClass: SurfaceClass | 'none' = 'none'
      // Config might have changed, so it's possible that target was attached
      // to a surface to which it can't be attached now.
      if (!currentBoundTo || !this.canBindToSurfaceClass(currentBoundTo.class)) {
        boundToSurfaceClass = backgroundType
      } else {
        boundToSurfaceClass = currentBoundTo.class
      }

      if (this.isRestrictedToWallFloorEdge()){
        return this.handleDraggingToWallFloorEdge(screenPos, boundToSurfaceClass)
      }

      switch(boundToSurfaceClass) {
        case 'floor':
          return this.handleDraggingOnFloor(screenPos, mousePoint)
        case 'wall':
          return this.handleDraggingOnWall(screenPos)
        default:
          return { success: false }
      }
    }

    private handleDraggingOnFloor(screenPos: Point2D, mousePoint?: Point2D): DragResult {
      if (!this.config.canBePlacedOnFloor) {
        return { success: false }
      }

      // Attempt to switch to the stackable surface closest to the cursor.
      if (this.target.getCanStack?.() && mousePoint) {
        const mousePt2 = workspace.pt2.set(mousePoint[0], mousePoint[1])
        const didSnap = this.tryToSnapToStackableSurface(mousePt2)
        if (didSnap) {
          return { success: true, referencePointChanged: true }
        }
      }
      if (WallSnap.isInitialized() && this.target.getWallSnapAdapter) {
        const collisionsInfo: CollisionsInfo = WallSnap.setPosition(this.target.getWallSnapAdapter(), screenPos)
        
        // If not pushed against the wall, wallsnap is fully in control, otherwise, attempt to switch to wall.
        if (this.config.canBePlacedOnWall && this.isTargetBackFaceAgainstWall(collisionsInfo)) {
            const switchResult = this.switchFromFloorToWall(screenPos)
            return {
              success: switchResult,
              referencePointChanged: switchResult,
            }
        }
      } else {
        const sampleResult = pu.sampleFloor(workspace.pt2.set(screenPos[0], screenPos[1]))
        if (sampleResult) {
          this.bindTargetToSurface(sampleResult.position, sampleResult.plane)
        }
      }
      this.target.setDragReferencePoint?.(this.getTargetDragReferenceForSurface(`floor`))
      return {
        success: true,
        referencePointChanged: false,
      }
    }

    private switchFromFloorToWall(screenPos: Point2D) {
      const dragReferencePoint = this.getTargetDragReferenceForSurface(`wall`)
      const newScreenPos = this.target.getLocalPointProjectionOnScreen?.({
        x: dragReferencePoint.dx,
        y: dragReferencePoint.dy,
        z: dragReferencePoint.dz,
      }) || workspace.pt2.set(screenPos[0], screenPos[1])
      const sampleResult = pu.sampleAllWallsPlanes(newScreenPos, true)
      if (sampleResult) {
        return this.bindTargetToSurface(sampleResult.position, sampleResult.plane)
      }
      return false
    }

    private handleDraggingOnWall(screenPos: Point2D): DragResult {
      if (!this.config.canBePlacedOnWall && !this.config.canBePlacedOnWallFloorEdge) {
        return { success: false }
      }
      const screenPoint = workspace.pt2.set(screenPos[0], screenPos[1])
      let sampleResult = pu.sampleScene(screenPoint, true)
      if (this.config.canBePlacedOnFloor && sampleResult?.plane.class === `floor`) {
        const switchResult = this.switchFromWallToFloor(screenPos)
        return {
          success: switchResult,
          referencePointChanged: switchResult,
        }
      }
      // For now, we're not handling possible placing on the ceiling here.
      // Sample either all the walls strictly, allowing moving from wall to wall, or sample current wall, allowing
      // the item to move along its edge, as we trying to drag it to a non-wall surface.
      // E.g., if we're trying to drag a "wall only" item to the floor,
      // allow it to move along the wall edge as mouse cursor is moving.
      sampleResult = pu.sampleAllWallsPlanes(screenPoint, true) || pu.findWallPositionClamped(screenPoint)
      if (!sampleResult) {
        return { success: false }
      }
      return {
        success: this.bindTargetToSurface(sampleResult.position, sampleResult.plane),
        referencePointChanged: false,
      }
    }

    private switchFromWallToFloor(screenPos: Point2D) {
      const dragReferencePoint = this.getTargetDragReferenceForSurface(`floor`)
      const newScreenPos = this.target.getLocalPointProjectionOnScreen?.({
        x: dragReferencePoint.dx,
        y: dragReferencePoint.dy,
        z: dragReferencePoint.dz,
      }) || workspace.pt2.set(screenPos[0], screenPos[1])
      const sampleResult = pu.sampleFloor(newScreenPos)
      if (sampleResult) {
        this.bindTargetToSurface(sampleResult.position, sampleResult.plane)
        const arrayPoint = [sampleResult.position.x, sampleResult.position.y, sampleResult.position.z]
        if (this.target.getWallSnapAdapter) {
          WallSnap.resetPosition(this.target.getWallSnapAdapter(), arrayPoint, pu.getFloorPlane())
          WallSnap.pushOut(this.target.getWallSnapAdapter())
        }
        return true
      }
      return false
    }

    // Gets the parameters <localPos> and <surfaceId> needed for a stackable to be bound to a surface.
    // Returns null if these params do not exist for such <screenPos> and <surfaceId>.
    private getBindToStackableParams(screenPos: Point2D, surfaceId: string | undefined) {
      let surface: StackableSurfaceItem3D | null = null
      let indirect = false
      let worldPosition: Point3 | null = null
      const screenPt2 = workspace.pt2.set(screenPos[0], screenPos[1])
      if (surfaceId) {
        surface = getStackableSurfaceItem3D(surfaceId)
        if (surface) {
          indirect = surface.getWantsIndirectMouseInteraction()
          if (indirect) {
            // If in indirect mode, allow the chance to tear-off the item.
            const closestScreenPoint = su.computeClosestPointScreenSpace(screenPt2, surfaceId)
            if (closestScreenPoint && closestScreenPoint.distance > STACKABLE_TEAR_OFF_TRESHOLD_PIXELS) {
              return null
            }
          }
        }

        this.target.setVisible?.(false)
        worldPosition = pu.sampleStackableSurface(screenPt2, surfaceId, indirect)
        this.target.setVisible?.(true)
      }
      if (!worldPosition || !surface) {
        return null
      }
      const localPos = surface.worldToLocal(worldPosition)
      if (!localPos) {
        return null
      }
      return { localPos, surfaceId }
    }

    // Handles the dragging along the current <bindTo> surface for a <screenPos>. 
    // With optional <trySwitchToSurfId> target attempts to switch to the surface.
    private handleDraggingOnStackableSurface(screenPos: Point2D, mousePoint?: Point2D): DragResult {
      const surfaceId = this.target.getLocation()?.bindTo
      if (!surfaceId) {
        return { success: false }
      }
      const result = this.getBindToStackableParams(screenPos, surfaceId)
      if (result?.surfaceId) {
        return { success: this.bindTargetToStackableSurface(result.localPos, result.surfaceId) }
      }

      // Check if we want to tear the item off the surface, or move it along the edge.
      const closestPointInfo1 = su.computeClosestPointWorldSpace(new Point2(screenPos[0], screenPos[1]), surfaceId)
      const closestPointInfo2 = mousePoint && su.computeClosestPointWorldSpace(new Point2(mousePoint[0], mousePoint[1]),
        surfaceId)
      const screenPosDistance = closestPointInfo1 ? closestPointInfo1.distance : Infinity
      const mousePosDistance = closestPointInfo2 ? closestPointInfo2.distance : Infinity
      if (Math.min(screenPosDistance, mousePosDistance) > STACKABLE_TEAR_OFF_TRESHOLD_METERS) {
        const success = this.takeTargetInHand()
        if (success) {
          this.updateSurfaceHightlight(surfaceId, null)
        }
        return { success, referencePointChanged: true }
      }
      // Dragging off the surface, but not far enough to tear-off: move along the edge.
      if (closestPointInfo1) {
        return { success: this.bindTargetToStackableSurface(closestPointInfo1.localPoint, surfaceId) }
      }

      return { success: false }
    }

    private handleDraggingInHand(mousePoint: Point2D):DragResult {
      const mousePt2 = workspace.pt2.set(mousePoint[0], mousePoint[1])

      // Attempt to snap to a stackable surface in the scene.
      const didSnap = this.tryToSnapToStackableSurface(mousePt2)
      if (didSnap) {
        return { success: true, referencePointChanged: true }
      }

      // Check if dragging over the floor.
      const mouseBackground = pu.queryBackgroundTypeAtScreenPos(mousePt2)
      if (mouseBackground === 'floor') {
        const sampleResult = pu.sampleFloor(mousePt2)
        if (sampleResult) {
          this.bindTargetToSurface(sampleResult.position, sampleResult.plane)
          const result = this.handleDraggingOnFloor(mousePoint)
          if (result.success) {
            return { ...result, referencePointChanged: true }
          }
        }
      }

      // Return false here to keep the item invisible and display "negatory" cursor.
      return { success: false }
    }

    public refreshTargetTransform() {
      const location = this.target.getLocation()
      if (!location) {
        return
      }
      const hint = location.hintExtraBindTo
      if (hint === EXTRA_HINT_STACKABLE) {
        this.bindTargetToStackableSurface(location.localPos, location.bindTo)
      } else {
        this.bindTargetToSurface(location.localPos, Number(location.bindTo))
      }
    }

    private bindTargetToStackableSurface(position: Point3Pod, surfaceId: string): boolean {
      const heading = this.target.getHeading?.() || 0.0
      const headMat = makeRotationY(heading)
      const xRotation = makeRotationX(Math.PI * 0.5)
      const rot =  multiplyMatrices3x3(xRotation, headMat)

      const surface = getStackableSurfaceItem3D(surfaceId)
      if (surface && !surface.isErased() && this.target.setParent(surface, false)) {
        this.target.setParentBySurfaceId(surfaceId, false)
        this.target.setPosRelative(position)
        this.target.setRotRelative(rot)
        return true
      }
      return false
    }

    private restrictToWallFloorEdge(
      currentBinding: { position: Point3Pod; surface: PlaneType }): { position: Point3Pod; surface: PlaneType } {
      let finalPosition = currentBinding.position
      let surface = currentBinding.surface

      const floorPlane = pu.getFloorPlane()
      if (currentBinding.surface.class === 'wall') {
        finalPosition = pu.projectWallPosOnFloor( currentBinding.position, currentBinding.surface).position
      } else if (floorPlane && currentBinding.surface.class === 'floor') {
        const wallRestricted = this.projectFloorPosToWalls(finalPosition, floorPlane)
        finalPosition = wallRestricted.position.clone()
        surface = wallRestricted.plane
      }
      return { position: finalPosition, surface }
    }


    private bindTargetToSurface(position: Point3Pod, surfaceOrId: number | PlaneType): boolean {
      let surface = typeof surfaceOrId === 'number' ? pu.getSurfaceById(surfaceOrId) : surfaceOrId
      if (!surface) {
          return false
      }

      const surfaceNormal = { dx: surface.rot[2][0], dy: surface.rot[2][1], dz: surface.rot[2][2]}
      const projected = pu.projPtToPlane(position, surfaceNormal, surface)
      let finalPosition = { ...(projected || position) }

      if (this.isRestrictedToWallFloorEdge()) {
          const restricted = this.restrictToWallFloorEdge({position: finalPosition, surface})
          finalPosition = restricted.position
          surface = restricted.surface
      }

      if (!this.canBindToSurfaceClass(surface.class)) {
        return false
      }

      const rot: Matrix3x3 = this.getTargetRotationOnSurface(surface)
      const dragReferencePoint = this.getTargetDragReferenceForSurface(surface.class)
      this.target.setDragReferencePoint?.(dragReferencePoint)
      finalPosition = Point3.sub(finalPosition, dragReferencePoint.mulMat(rot))

      if (surface.class === 'wall') {
        // When on the wall, target's heading is forced by the wall orientation.
        // Heading is specified as the angle between item's z axis and floor's negative Y axis, -PI...PI.
        const v1 = workspace.v31.set(rot[2][0], rot[2][1], rot[2][2]) // Item's Z axis.
        const v2 = workspace.v32.set(0, 0, -1)
        const floorPlane = pu.getFloorPlane()
        if (floorPlane) {
          v2.set(-floorPlane.rot[1][0], -floorPlane.rot[1][1], -floorPlane.rot[1][2]) // Floor's negative Y axis.
        }
        const heading = v1.angleTo(v2) * (Vector3.cross(v1, v2).dy < 0 ? 1 : -1)
        this.target.setHeading?.(heading)
        const adjustedPos = this.getWallPosClampedToCeiling(finalPosition, surface)
        this.target.setParentSurface(String(surface.id))
        this.target.setPosAbsolute(adjustedPos)
        this.target.setRotAbsolute(rot)
      } else if (surface.class === 'ceiling') {
        // Not implemented.
        return false
      } else {
        // When on the floor, heading can be set freely by the user.
        const heading = this.target.getHeading?.() || 0.0
        const headMat = makeRotationY(heading)
        this.target.setParentSurface(String(surface.id))
        this.target.setPosAbsolute(finalPosition)
        this.target.setRotAbsolute(multiplyMatrices3x3(rot, headMat))
      }
      return true
    }

    private canBindToSurfaceClass(surfaceClass: SurfaceClass): boolean {
      switch (surfaceClass) {
        case 'floor':
          return this.config.canBePlacedOnFloor
        case 'wall':
          return this.config.canBePlacedOnWall || this.config.canBePlacedOnWallFloorEdge
        default:
          return false
      }
    }

    // Get target's rotation matrix when bound to a surface, with following rules:
    // - when placed on a wall, target's z axis must be oriented along wall's z axis.
    // - when placed on the floor, target's y axis must be oriented along floor's z axis.
    // - when placed on the ceiling, target's y axis must be oriented along ceiling's negative z axis.
    private getTargetRotationOnSurface(surface: PlaneType): Matrix3x3 {
      switch(surface.class) {
        case 'wall':
          return [[...surface.rot[0]], [...surface.rot[1]], [...surface.rot[2]]]
        case 'floor':
          return [[...surface.rot[0]], [...surface.rot[2]], [
            -surface.rot[1][0],
            -surface.rot[1][1],
            -surface.rot[1][2],
          ]]
        case 'ceiling':
          return [
            [...surface.rot[0]],
            [-surface.rot[2][0], -surface.rot[2][1], -surface.rot[2][2]],
            [...surface.rot[1]]
          ]
        default:
          return [[...surface.rot[0]], [...surface.rot[1]], [...surface.rot[2]]]
      }
    }

    // Get target's local drag reference point when bound to a surface, with these rules:
    // - when placed on a wall, the point is located at negative half z-size along z axis from the local origin.
    // - when placed on the floor, the point is located at the local origin.
    // - when placed on the ceiling, the point is located at y-size distance along y axis from the local origin.
    public getTargetDragReferenceForSurface(surfaceClass: SurfaceClass): Vector3 {
      switch(surfaceClass) {
        case 'wall': {
          return new Vector3(0, 0.0, -(this.config.targetSizeZ * 0.5 + WALL_3D_PUSH_IN_MARGIN))
        }
        case 'floor':
          return new Vector3(0, 0, 0)
        case 'ceiling':
          return new Vector3(0, this.config.targetSizeY, 0)
        default:
          return new Vector3(0, 0, 0)
      }
    }

    private isTargetBackFaceAgainstWall(collisionsInfo: CollisionsInfo) {
      if (!collisionsInfo.contactPoints) {
        return false
      }
      const contactPoints = collisionsInfo.contactPoints
      if (contactPoints.length > 2) {
          let itemContactCorners: number[] = []
          contactPoints.forEach((contactPoint) => {
              itemContactCorners = [...itemContactCorners, ...contactPoint[2]]
          })
          return itemContactCorners.includes(0) && itemContactCorners.includes(1)
      }
      const isCollisionArrayOK = contactPoints[0]?.[2]?.length >= 2 && contactPoints[1]?.[2]?.length > 0
      return isCollisionArrayOK && contactPoints[0][2][2] === 0 && contactPoints[1][2][2] === 1
    }

    private getSurfaceTargetIsBoundTo(): PlaneType | null {
      let result: PlaneType | null = null
      const currentBoundToId = this.target.getLocation()?.bindTo
      if (currentBoundToId !== undefined) {
        result = pu.getSurfaceById(Number(currentBoundToId)) || null
      }
      return result
    }

    private isRestrictedToWallFloorEdge() {
      return !this.config.canBePlacedOnFloor && !this.config.canBePlacedOnWall && this.config.canBePlacedOnWallFloorEdge
    }

    // Clamp given world position (if necessary), to make target's top is not intersecting ceiling.
    private getWallPosClampedToCeiling(position: Point3Pod, wallPlane: PlaneType): Point3 {
      const ceiling = pu.getCeilingPlaneAbovePoint(position) || pu.getCeilingPlane()
      const result = new Point3(position.x, position.y, position.z)
      if (!ceiling) {
        return result
      }
      const { targetSizeY } = this.config
      const vertical = { dx: wallPlane.rot[1][0], dy: wallPlane.rot[1][1], dz: wallPlane.rot[1][2] }
      const projected = pu.projPtToPlane(position, vertical, ceiling)
      if (!projected || projected.y > position.y + targetSizeY) {
        return result
      }
      result.y = projected.y - targetSizeY
      return result
    }

    private projectFloorPosToWalls(position: Point3Pod, floorPlane: PlaneType): PointSampleResult {
      let result = {
        position: new Point3(position.x, position.y, position.z),
        plane: floorPlane
      }
      // Small padding to allow the resulting point not to fail is3DWallPointVisible, which can happen when it
      // lay strictly on the planes intersection line.
      const padding = 0.01
      const paddingVector = {
        dx: padding * floorPlane.rot[2][0],
        dy: padding * floorPlane.rot[2][1],
        dz: padding * floorPlane.rot[2][2]
      }
      result = pu.findClosestProjectionOnWalls(result.position.clone().plus(paddingVector)) || result
      return pu.projectWallPosOnFloor(result.position, result.plane)
    }

    private takeTargetInHand() {
      const worldTransform = this.target.getWorldTransform?.()
      if (!worldTransform) {
        return false
      }
      const worldPosition = extractPosition(worldTransform)
      const rot = upperLeft3(worldTransform)

      this.target.setParent(null, true)
      this.target.setPosAbsolute(worldPosition)
      this.target.setRotAbsolute(rot)
      this.target.setHeading?.(getHeadingFromQuaternion(extractQuaternionFromMat3(rot)))
      this.target.setVisible?.(false)
      return true
    }

    private tryToSnapToStackableSurface(mousePoint: Point2) {
      let success = false
      const closestSurfaceInfo = su.computeClosestSurfaceWorldSpace(mousePoint)

      if (closestSurfaceInfo && closestSurfaceInfo.distance < STACKABLE_SNAP_TO_TRESHOLD_METERS) {
        success = this.bindTargetToStackableSurface(closestSurfaceInfo.localPoint, closestSurfaceInfo.surfaceId)
        if (success) {
          this.updateSurfaceHightlight(null, closestSurfaceInfo.surfaceId)
        }
      }
      return success
    }

    // Arrange surface hightlighting if target switched surfaces.
    private updateSurfaceHightlight(currStackedOnSurfId: string | null, switchToSurfId: string | null) {
      const isSurfaceSwitch = switchToSurfId !== currStackedOnSurfId
      if (isSurfaceSwitch) {
        if (currStackedOnSurfId) {
          getStackableSurfaceItem3D(currStackedOnSurfId)?.setHighlighted(false)
        }
        if (switchToSurfId) {
          getStackableSurfaceItem3D(switchToSurfId)?.setHighlighted(true)
        }
      }
    }
}
