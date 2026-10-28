import type { PlaneType, Point2D, Point3D } from 'Renderer/geomviewer/geom_types'
import type { BehaviorTarget, PositioningBehavior, DragResult } from 'Renderer/positioning/positioning_system'
import { Point2, Point3, Point3Pod, Vector3 } from 'Renderer/geometry'
import * as pu from './positioning_utilities'

/**
 * Defines the configuration parameters that are pulled from the ArtItem for ArtItemBehavior construction.
 */
interface ArtItemBehaviorConfig {
    // The amount the item is moved on its forward direction.
    zOffset: number
    // Item height, used for floor and ceiling clamping.
    sizeY: number
}

// Local workspace.
const workspace = {
  vec3: new Vector3(0, 0, 0),
  pt2: new Point2(0, 0),
  pt3: new Point3(0, 0, 0),
}

export class ArtItemBehavior implements PositioningBehavior<ArtItemBehaviorConfig> {
    private target: BehaviorTarget
    private config: ArtItemBehaviorConfig

  constructor(config: ArtItemBehaviorConfig, target: BehaviorTarget) {
    this.config = config
    this.target = target
  }

  setTargetScreenPositionStatic(xy: Point2D): boolean {
    const sampleResult = pu.sampleAllWallsPlanes(workspace.pt2.set(xy[0], xy[1]), true)
    if (!sampleResult) {
        return false
    }
    const success = this.bindTargetToSurface(sampleResult.position, sampleResult.plane)
    // Only applicable to legacy 2D based classes.
    if (success && this.target.setTargetPos2D) {
      this.target.setTargetPos2D(xy)
    }
    return success
  }

  public dragTargetToScreenPoint(xy: Point2D): DragResult {
    return { success: this.setTargetScreenPositionStatic(xy) }
  }

  public refreshTargetTransform() {
    const location = this.target.getLocation()
    if (!location) {
      return
    }
    this.bindTargetToSurface(location.localPos, Number(location.bindTo))
  }

  private bindTargetToSurface(position: Point3Pod, surfaceOrId: number | PlaneType): boolean {
      const surface =
          typeof surfaceOrId === 'number' ? pu.getSurfaceById(surfaceOrId) : surfaceOrId
      if (!surface) {
          return false
      }

      const { zOffset, sizeY } = this.config

      const pose = {
          pos: [position.x, position.y, position.z] as Point3D,
          rot: surface.rot,
      }
      pose.pos[0] += pose.rot[2][0] * 0.01 * zOffset
      pose.pos[1] += pose.rot[2][1] * 0.01 * zOffset
      pose.pos[2] += pose.rot[2][2] * 0.01 * zOffset

      let clampPlane
      const halfHeight = sizeY * 0.5
      const dFloor = pu.queryDistFromPointToFloor({x:pose.pos[0], y:pose.pos[1], z:pose.pos[2]})
      if (dFloor !== null && dFloor < halfHeight) {
        clampPlane = pu.getFloorPlane()
      }
      const dCeil = pu.queryDistFromPointToCeiling({x:pose.pos[0], y:pose.pos[1], z:pose.pos[2]})
      if (dCeil !== null && dCeil < halfHeight) {
        clampPlane = pu.getCeilingPlaneAbovePoint({x:pose.pos[0], y:pose.pos[1], z:pose.pos[2]})
          || pu.getCeilingPlane()
      }

      if (clampPlane) {
        const upBasisVector = surface.rot[1]
        const verticalDir = workspace.vec3.set(upBasisVector[0], upBasisVector[1], upBasisVector[2])
        const ray = {
          origin: workspace.pt3.set(pose.pos[0], pose.pos[1], pose.pos[2]),
          dir: verticalDir,
        }
        const clampedPt = pu.rayCastToPlane(ray, clampPlane)

        if (clampedPt) {
          verticalDir.scale(halfHeight * Math.sign(clampPlane.rot[2][1]))
          clampedPt.plus(verticalDir)
          
          pose.pos[0] = clampedPt.x
          pose.pos[1] = clampedPt.y
          pose.pos[2] = clampedPt.z
        }
      }

      const posXYZ = { x: pose.pos[0], y: pose.pos[1], z: pose.pos[2] }

      this.target.setParentSurface(String(surface.id))
      this.target.setPosAbsolute(posXYZ)
      this.target.setRotAbsolute(pose.rot)

      return true
  }
}
