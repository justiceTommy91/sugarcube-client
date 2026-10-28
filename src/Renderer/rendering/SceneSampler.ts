import type { RenderItem3D } from 'Renderer/model/RenderItem3D'
import type { PlaneType, PointXYZ, SurfaceClass } from 'Renderer/geomviewer/geom_types'
import type { Point2Pod } from 'Renderer/geometry/Point2'
import type { Point3, Point3Pod } from 'Renderer/geometry/Point3'
import { Vector3Pod } from 'Renderer/geometry/Vector3'

export type PointSampleResult = {
  // Position on a plane where camera ray hits it.
  position: Point3
  // The plane which is hit by the camera ray.
  plane: PlaneType
}

// Result of a raycast query against render objects (THREE.Object3D).
export type RenderObjectQueryResult = {
  // Distance from the ray origin to the hit point.
  range: number
  // The object which is hit by the camera ray.
  objHit: THREE.Object3D | null
  // World coordinates of the hit point.
  point: THREE.Vector3 | null
}

// Result of a raycast query against render items (Furniture, Art, etc).
export type RenderItemQueryResult = {
  // Id of the render item which is hit by the camera ray.
  id: string | null
  // Detailed intersection information.
  intersect: RenderObjectQueryResult
}

// Result of a raycast query against stackable surfaces.
export type StackableSurfaceQueryResult = {
  // Id of the stackable surface item which is hit by the camera ray.
  stackablePlaneId: string
  // World coordinates of the hit point.
  worldPoint: THREE.Vector3 | null
  // Whether this surface is chosen because of direct hit, or not.
  // See StackableSurfaceItem.getWantsIndirectMouseInteraction
  directHit: boolean
  // Coordinates of the hit point in surface's parent local coordinates, if it has a parent.
  parentPoint: THREE.Vector3 | null
  // Coordinates of the hit point in surface local coordinates.
  localPoint: PointXYZ | null
}
/**
 * PlanesSampler interface is used to sample 3D information from infinite
 * planes that represent flat surfaces in the room.
 */
export interface PlanesSampler {
  // Retrieve 3D position on a specific plane under a point with relative screen coordinates (0..1).
  samplePlane(relativePoint: Point2Pod, plane: PlaneType): PointSampleResult | null

  // Get ray intersection with the given plane.
  rawPlaneRaycastSample(origin: Point3Pod, direction: Vector3Pod, plane: PlaneType): PointSampleResult | null

  // Is 3D point on the wall plane with planeId visible from the current camera, or occluded by other planes.
  // This method is specific to wall planes and allows to specify whether to apply baseboard correction or not.
  is3DWallPointVisible(point: Point3Pod, plane: PlaneType, applyBaseboardYOffset?: boolean): boolean

  // Check if given 3D point lays within valid area of the wall. For image based scenes, it's the same as checking
  // if the point is visible (i.e. passes mask check, is3DWallPointVisible).
  // For 3D poly based scenes, a point can be valid, while not visible from the current camera's position.
  is3DWallPointValid(point: Point3Pod, plane: PlaneType, applyBaseboardYOffset?: boolean): boolean
}

/**
 * SceneSampler interface is used to sample 3D information from scene and items in it under given screen coordinates.
 * All functions accept floating point coordinates relative to the viewport size,
 * (0,0) - top left corner, (1, 1) - bottom right.
 */
export interface SceneSurfacesSampler {
  // Retrieve 3D position and a plane under a point with relative screen coordinates (0..1).
  sampleRelativePoint(relativePoint: Point2Pod): PointSampleResult | null

  // Retrieve 3D position on the floor plane (ignoring all others) under a point with relative screen coordinates.
  sampleFloor(relativePoint: Point2Pod): PointSampleResult | null

  // Retrieve 3D position by checking only wall planes under a point with relative screen coordinates.
  sampleWalls(relativePoint: Point2Pod): PointSampleResult | null

  // Sample the class of a plane under given screen coordinates.
  // Some surfaces may overlay over the room's background for a screen position (e.g static surfs over the floor).
  // <ignore> excludes the surface class from the sampling. If its undefined no surface class is ignored 
  sampleSurfaceClass(relativePoint: Point2Pod, ignore?: SurfaceClass): SurfaceClass | null

  // Collect all the surfaces (and hit positions) in the room that are intersected by the given ray.
  rawRaycastSample(origin: Point3Pod, direction: Vector3Pod): PointSampleResult[]
}

export interface SceneItemsSampler {
    // Get the root render item which is located under given screen coordinates, if any.
    getRenderItemIdAtPoint(relativePoint: Point2Pod): string | null

    // Get THREE render object under given screen coordinates, optionally filtering out stackable surfaces with
    // ids provided in <filterStackableIds>.
    getRenderObjectAtPoint(relativePoint: Point2Pod, filterStackableIds: string[] | null): RenderObjectQueryResult

    // Get the render item id which bounding box is located under given screen coordinates, if any.
    getObjectIdAtPointUsingBbox(relativePoint: Point2Pod,
      findNearest?: boolean, filterFn?: (itemId: string) => boolean): string | null

    rawBboxRaycast(origin: Point3Pod, direction: Vector3Pod, findNearest?: boolean | undefined,
      filterFn?: ((itemId: string) => boolean) | undefined): RenderItemQueryResult | null

    // Get all stackable surface ids which are located under given screen coordinates.
    getStaticSurfacePlaneIDsAtPoint(relativePoint: Point2Pod): string[]

    // Get the 3D point on a render item, which is located under given screen coordinates, if it exists.
    doItemRaycast(relativePoint: Point2Pod, item: RenderItem3D): Point3 | null
}

export interface SceneSampler extends SceneSurfacesSampler, SceneItemsSampler, PlanesSampler {}
