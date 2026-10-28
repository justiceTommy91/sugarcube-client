/* eslint-disable class-methods-use-this */
import type { PositioningContext } from 'Renderer/positioning/positioning_context'
import type { PlaneType } from 'Renderer/geomviewer/geom_types'
import * as tu from 'Renderer/geometry/ThreeUtils'
import { Vector3, Point2, Point3Pod } from 'Renderer/geometry'

import type { PlannerViewer } from 'Planner/planner_viewer'
import type { Room } from 'Planner/room'
import type { Camera as SamplerCamera } from 'Planner/room_sampler'

export type ViewerContext = Pick<
  PlannerViewer,
  | 'pixelPointToRelative'
> & SamplerCamera

export class PlannerPositioningContext implements PositioningContext {
  private room: Room
  private viewer: ViewerContext | null = null

  constructor(room: Room) {
    this.room = room
  }

  public setViewer(viewer: ViewerContext) {
    this.viewer = viewer
  }

  public getViewerContext() {
    return this.viewer
  }

  public getPlaneData() {
    const floorPlane = this.room.getFloorPlane()
    const ceilingPlane = this.room.getCeilingPlane()
    const walls = this.room.getWallsGraph()?.getWalls()
    const wallIds = walls ? [...walls.keys()] : []
    const wallPlanes = wallIds.map(id => this.room.getWallPlane(id))
    const allPlanes = [floorPlane, ceilingPlane, ...wallPlanes]
      .filter((plane): plane is PlaneType => !!plane)
    return allPlanes
  }

  public getSurfaceById(id: number) {
    return this.getPlaneData().find(plane => plane.id === id)
  }

  public getPolygonData() {
    return this.room.getRoomMesh()?.getKreativPolys() ?? []
  }

  public getSceneSampler() {
    return this.room.getSampler()
  }

  public getFloorPlane() {
    return this.room.getFloorPlane()
  }

  public getCeilingPlane() {
    return this.room.getCeilingPlane() ?? null
  }

  public getScene() {
    const viewer = this.viewer
    if (!viewer) {
      return undefined
    }
    return {
      toRelativeCoords: (x: number, y: number): [number, number] => {
        const relPoint = viewer.pixelPointToRelative({ x, y })
        return [relPoint.x, relPoint.y]
      },
      // Stackables are not supported in the Planner.
      doStackableSurfaceRaycast: () => null,
      getStackableSurfaceAtPoint: () => null,
    }
  }

  public getCamera() {
    const viewer = this.viewer
    if (!viewer) {
      return undefined
    }
    return {
      getLocation: () => tu.toPoint3(viewer.getPosition()),
      getUnitRayDirThruScreenPoint: (relX: number, relY: number, dir?: Vector3) => {
        const threeRay = viewer.getScreenPointRay([relX, relY])
        return dir
          ? dir.set(threeRay.direction.x, threeRay.direction.y, threeRay.direction.z)
          : tu.toVector3(threeRay.direction)
      },
      worldToScreenFloat: (point: Point3Pod, out?: Point2) => {
        const screenPoint = viewer.worldToScreenRelative([point.x, point.y, point.z])
        const intrinsics = viewer.getIntrinsics()
        if (intrinsics) {
          screenPoint.x *= intrinsics.imageWidth
          screenPoint.y *= intrinsics.imageHeight
        }
        return out ? out.copy(screenPoint) : tu.toPoint2(screenPoint)
      },
      getThreeCamera: () => viewer.getThreeCamera(),
      getIntrinsics: () => viewer.getIntrinsics(),
    }
  }
}