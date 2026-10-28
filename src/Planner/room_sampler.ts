import * as THREE from 'three'

import type { Point2Pod, Point3Pod, Vector3Pod } from 'Renderer/geometry'
import type { SurfaceClass, PlaneType } from 'Renderer/geomviewer'
import type { PointSampleResult, RenderItemQueryResult, RenderObjectQueryResult } from 'Renderer/rendering/SceneSampler'
import { gvPositioningConext, SceneSamplerContext } from 'Renderer/positioning/positioning_context'
import { isObjectVisible } from 'Renderer/rendering/rendering_utils'
import * as tu from 'Renderer/geometry/ThreeUtils'
import { CameraIntrinsics } from 'Renderer/multiview/camera_types'

import type { RayCastResult } from 'Planner/planner_types'
import type { Room } from 'Planner/room'
import { rayCastToPlane, objectsRaycast, clampPointVertically } from 'Planner/room_geometry'
import { OBJECT_TYPE_COMPOSITION_ITEM } from 'Planner/api_constants'
import { PlannerPositioningContext } from './composition/planner_positioning_context'

export interface Camera {
  getPosition(): THREE.Vector3,
  getScreenPointRay(relativeCoords: [number, number]): THREE.Ray
  worldToScreenRelative(worldPoint: [number, number, number]): THREE.Vector2
  getThreeCamera(): THREE.PerspectiveCamera | undefined 
  getIntrinsics(): CameraIntrinsics |undefined
}

/* eslint-disable class-methods-use-this */
/*  eslint-disable no-continue */
export class RoomSampler implements SceneSamplerContext {
  private room: Room

  constructor(room: Room) {
    this.room = room
  }

  public sampleRelativePoint(relativePoint: Point2Pod): PointSampleResult | null {
    const camera = RoomSampler.getCamera()
    if (!camera) {
      return null
    }
    const ray = camera.getScreenPointRay([relativePoint.x, relativePoint.y])
    const result = this.sampleSceneNearest(ray)
    return this.toKreativResult(result)
  }

  public sampleWalls(relativePoint: Point2Pod): PointSampleResult | null {
    const camera = RoomSampler.getCamera()
    if (!camera) {
      return null
    }
    const ray = camera.getScreenPointRay([relativePoint.x, relativePoint.y])
    const result = this.sampleWallMeshes(ray)
    return this.toKreativResult(result)
  }

  public sampleSurfaceClass(relativePoint: Point2Pod): SurfaceClass | null {
    const result = this.sampleRelativePoint(relativePoint)
    if (!result) {
      return null
    }
    return result.plane.class
  }

  public samplePlane(relativePoint: Point2Pod, plane: PlaneType): PointSampleResult | null {
    const camera = RoomSampler.getCamera()
    if (!camera) {
      return null
    }
    const ray = camera.getScreenPointRay([relativePoint.x, relativePoint.y])
    return RoomSampler.doPlaneRaycast(ray, plane)
  }

  // Is camera ray through the screen point the given world point projects to, sample the given surface.
  public is3DWallPointVisible(point: Point3Pod, plane: PlaneType): boolean {
    const camera = RoomSampler.getCamera()
    if (!camera) {
      return false
    }
    const screenPoint = camera.worldToScreenRelative([point.x, point.y, point.z])
    const result = this.sampleRelativePoint(screenPoint)
    return result?.plane.id === plane.id
  }

  public rawRaycastSample(origin: Point3Pod, direction: Vector3Pod): PointSampleResult[] {
    const ray = new THREE.Ray(new THREE.Vector3(origin.x, origin.y, origin.z),
      new THREE.Vector3(direction.dx, direction.dy, direction.dz))
    return this.sampleScene(ray)
      .map(result => this.toKreativResult(result))
      .filter((result): result is PointSampleResult => !!result)
  }

  public rawBboxRaycast(origin: Point3Pod, direction: Vector3Pod, findNearest?: boolean | undefined,
    filterFn?: ((itemId: string) => boolean) | undefined): RenderItemQueryResult | null {
    const ray = new THREE.Ray(new THREE.Vector3(origin.x, origin.y, origin.z),
      new THREE.Vector3(direction.dx, direction.dy, direction.dz))
    const inverseMatrix = new THREE.Matrix4()
    const target = new THREE.Vector3()

    let nearestDist = Infinity
    let nearestItem = null
    let nearestIntersection: RenderObjectQueryResult | null = null

    const items = this.room.getComposition().getItems()
    for (const [id, item] of items) {
      if ((filterFn && !filterFn(id)) ||
        !item.isBoundToRoomSurface() ||
        !isObjectVisible(item.getRootObject())) {
        continue
      }

      const bbox = item.getBbox()
      const threeObject = item.getRootObject()
      if (bbox && threeObject) {
        const matrixWorld = threeObject.matrixWorld
        inverseMatrix.copy(matrixWorld).invert()
        ray.applyMatrix4(inverseMatrix)

        let intersection = ray.intersectBox(bbox, target)
        if (intersection) {
          const dist = ray.origin.distanceTo(intersection)
          intersection = threeObject.localToWorld(intersection)
          const result: RenderObjectQueryResult = {
            range: dist,
            objHit: threeObject,
            point: intersection.clone(),
          }
          if (!findNearest) {
            nearestItem = item
            nearestIntersection = result
            break
          }
          if (dist < nearestDist) {
            nearestDist = dist
            nearestItem = item
            nearestIntersection = result
          }
        }
      }
    }
    return (nearestIntersection && nearestItem) ? {
      intersect: nearestIntersection,
      id: nearestItem.getId(),
    } : null
  }

  public rawPlaneRaycastSample(origin: Point3Pod, direction: Vector3Pod, plane: PlaneType): PointSampleResult | null {
    const ray = new THREE.Ray(new THREE.Vector3(origin.x, origin.y, origin.z),
      new THREE.Vector3(direction.dx, direction.dy, direction.dz))
    return RoomSampler.doPlaneRaycast(ray, plane)
  }

  // Is given point projects to the given wall plane within wall's polygon.
  public is3DWallPointValid(point: Point3Pod, plane: PlaneType): boolean {
    const wallMesh = this.room.getRoomMesh()?.getWallMesh(String(plane.id))
    if (!wallMesh) {
      return false
    }
    // Wall's normal.
    const normal = new THREE.Vector3().fromArray(plane.rot[2]).normalize()
    // Start the ray from a point 1 meter away from the wall in the direction of its normal.
    const origin = new THREE.Vector3(point.x, point.y, point.z).add(normal)
    const ray = new THREE.Ray(origin, normal.clone().negate())
    const results = objectsRaycast(ray, [wallMesh], 0.0)
    return results.length > 0
  }

  private toKreativResult(plannerResult: RayCastResult | null): PointSampleResult | null {
    if (!plannerResult) {
      return null
    }
    let plane: PlaneType | undefined = undefined
    switch (plannerResult.objectType) {
      case 'floor':
        plane = this.room.getFloorPlane()
        break
      case 'ceiling':
        plane = this.room.getCeilingPlane()
        break
      case 'wall':
        plane = this.room.getWallPlane(plannerResult.id)
        break
      default:
        break
    }
    return plane ? {
      position: tu.toPoint3(plannerResult.worldPosition),
      plane,
    } : null
  }

  public sampleScene(ray: THREE.Ray) {
    const rootObject = this.room.getRoomMesh()?.getRootObject()
    return rootObject ? (objectsRaycast(ray, [rootObject])) : []
  }

  public sampleSceneNearest(ray: THREE.Ray) {
    const rootObject = this.room.getRoomMesh()?.getRootObject()
    return rootObject ? (objectsRaycast(ray, [rootObject])[0] ?? null) : null
  }

  public sampleWallMeshes(ray: THREE.Ray) {
    const wallMeshes = this.room.getRoomMesh()?.getWallMeshes() ?? []
    const results = objectsRaycast(ray, wallMeshes)
    return results[0] ?? null
  }

  public sampleWallPlane(ray: THREE.Ray, wallId: string, clamp = false,
    bidirectional = true): THREE.Vector3 | undefined {
    const plane = this.room.getRoomMesh()?.getWallPlane(wallId)
    if (!plane) {
      return undefined
    }
    let result = rayCastToPlane(ray, plane, bidirectional)
    const floorPlane = this.room.getFloorPlane()
    const ceilingPlane = this.room.getCeilingPlane()
    if (result && clamp && floorPlane && ceilingPlane) {
      result = clampPointVertically(result, floorPlane, ceilingPlane)
    }
    return result
  }

  public sampleFloorPlane(ray: THREE.Ray, bidirectional = true) {
    const floorPlane = this.room.getFloorPlane()
    if (!floorPlane) {
      return undefined
    }
    return rayCastToPlane(ray, floorPlane, bidirectional)
  }

  public sampleCeilingPlane(ray: THREE.Ray, bidirectional = true) {
    const ceilingPlane = this.room.getCeilingPlane()
    if (!ceilingPlane) {
      return undefined
    }
    return rayCastToPlane(ray, ceilingPlane, bidirectional)
  }

  public sampleCompositionItem(ray: THREE.Ray): RayCastResult | null {
    const raycaster = new THREE.Raycaster()
    raycaster.ray.copy(ray)

    const items = [...this.room.getComposition().getItems().values()]
    const renderObjects = items.map(item => item.getRootObject())
    const itemsLookup = new Map<string, string>
    items.forEach(item => itemsLookup.set(item.getRootObject().uuid, item.getId()))

    const intersections = raycaster.intersectObjects(renderObjects)
    const nearest = intersections[0]
    if (!nearest) {
      return null
    }
    let itemRoot = null
    let currentObj: THREE.Object3D | null = nearest.object
    while(currentObj !== null) {
      // Don't stop if found an instance, it might be a combinable or stackable, we want to
      // reach the top-most instance parent.
      if (currentObj.userData.isItemRoot !== undefined) {
        itemRoot = currentObj
      }
      currentObj = currentObj.parent
    }
    if (!itemRoot) {
      return null
    }

    const compositionItemId = itemsLookup.get(itemRoot.uuid)
    if (!compositionItemId) {
      return null
    }
    return {
      id: compositionItemId,
      objectType: OBJECT_TYPE_COMPOSITION_ITEM,
      worldPosition: nearest.point,
      distance: nearest.distance,
    }
  }

  private static doPlaneRaycast(ray: THREE.Ray, plane: PlaneType) {
    const positiion = rayCastToPlane(ray, plane, false)
    if (positiion) {
      return {
        position: tu.toPoint3(positiion),
        plane,
      }
    }
    return null
  }

  private static getCamera() {
    const context = gvPositioningConext()
    if (context && context instanceof PlannerPositioningContext) {
      return context.getViewerContext()
    }
    return null
  }
}