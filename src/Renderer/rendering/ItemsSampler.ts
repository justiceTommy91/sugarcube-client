import * as THREE from 'three'
import type { SceneItemsSampler, RenderObjectQueryResult, RenderItemQueryResult } from 'Renderer/rendering/SceneSampler'

import { Point2 } from 'Renderer/geometry/Point2'
import { Point3, Point3Pod } from 'Renderer/geometry/Point3'
import { Vector3Pod } from 'Renderer/geometry/Vector3'
import type { RenderItem3D } from 'Renderer/model/RenderItem3D'
import { gvCurrentCamera, gvColorIdRenderer } from 'Renderer/foundation/geom_app'
import { isObjectVisible } from 'Renderer/rendering/rendering_utils'
import { GeomBaseScene } from './GeomBaseScene'
import { isFurnitureItem3D } from './scene_utils'

export class ItemsSampler<T extends GeomBaseScene> implements SceneItemsSampler {
  protected scene: T
  protected raycaster: THREE.Raycaster

  constructor(scene: T) {
    this.scene = scene
    this.raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0.1, 10000.0)
  }

  public getObjectIdAtPointUsingBbox(relativePoint: Point2, findNearest?: boolean | undefined,
    filterFn?: ((itemId: string) => boolean) | undefined): string | null {
      this.setupRaycasterFromCamera(relativePoint)
      return this.doBboxRaycast(findNearest, filterFn)?.id || null
  }

  public rawBboxRaycast(origin: Point3Pod, direction: Vector3Pod, findNearest?: boolean | undefined,
    filterFn?: ((itemId: string) => boolean) | undefined) {
    this.setupRaycaster(origin, direction)
    return this.doBboxRaycast(findNearest, filterFn)
  }

  private doBboxRaycast(findNearest?: boolean | undefined,
    filterFn?: ((itemId: string) => boolean) | undefined): RenderItemQueryResult | null {
      const inverseMatrix = new THREE.Matrix4()
      const ray = new THREE.Ray()
      const target = new THREE.Vector3()

      let nearestDist = Infinity
      let nearestItem = null
      let nearestIntersection: RenderObjectQueryResult | null = null

      for (const item of this.scene.getRenderItems()) {
        // Skip filtered items if filterFn is available.
        if (filterFn && !filterFn(item.getId())) {
          continue // eslint-disable-line no-continue
        }

        if (!isObjectVisible(item.getObject())){
          continue // eslint-disable-line no-continue
        }

        // Skip over items that are combinable children. These are items such as
        // duvet or mattresses. We want the actual catalog item instead.
        if (isFurnitureItem3D(item) && item.isCombinableChild()) {
          continue // eslint-disable-line no-continue
        }

        const bbox = item.getBbox()
        const threeObject = item.getObject()
        if (bbox && threeObject) {
          const matrixWorld = threeObject.matrixWorld
          // Map ray to item's local space.
          inverseMatrix.copy(matrixWorld).invert()
          ray.copy(this.raycaster.ray)
          ray.applyMatrix4(inverseMatrix)

          // Look for intersection with bounding box.
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
              // We can perform an early exit if we don't need the nearest one.
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

      if (!nearestIntersection || !nearestItem) {
        return null
      }

      return {
        intersect: nearestIntersection,
        id: nearestItem.getId(),
      }
  }

  getStaticSurfacePlaneIDsAtPoint(relativePoint: Point2): string[] {
    this.setupRaycasterFromCamera(relativePoint)
    return this.raycaster.intersectObjects(this.scene.getRenderObjects(), true)
      .filter((hit) => !!hit.object &&
        !!hit.object?.userData?.isStaticSurface &&
        !!hit.object?.userData?.stackablePlaneId
      )
      .map((hit) => hit.object.userData.stackablePlaneId)
  }

  doItemRaycast(relativePoint: Point2, item: RenderItem3D): Point3 | null {
    this.setupRaycasterFromCamera(relativePoint)
    const renderObject = item.getObject()
    if (!renderObject) {
      return null
    }
    const intersections = this.raycaster.intersectObject(renderObject, false)
    if (intersections && intersections.length > 0) {
      const p = intersections[0].point
      return new Point3(p.x, p.y, p.z)
    }
    return null
  }

  getRenderItemIdAtPoint(relativePoint: Point2): string | null {
    let result: string | null = null;
    let objNode: THREE.Object3D | null = null

    // Attempt to use color id to pick an object.
    const colorIdRenderer = gvColorIdRenderer()
    let colorIdReady = false
    if (colorIdRenderer) {
      const colorId = colorIdRenderer.sampleColorIdAtPoint(relativePoint.x, relativePoint.y)
      if (colorId !== undefined) {
        colorIdReady = true
        // Assuming that we don't have items with id === 0.
        const renderItem = this.scene.getRenderItemByColorId(colorId)
        if (renderItem) {
          objNode = renderItem.getObject() ?? null
        }
      }
    }
    // If colorId didn't work (color id renderer may be not ready), fallback to raycast.
    if (!objNode && !colorIdReady) {
      const intersect = this.getRenderObjectAtPoint(relativePoint);
      objNode = intersect.objHit;
    }

    const isPickable = (item: RenderItem3D) => isFurnitureItem3D(item) && !item.isNoninteractable() || item.isArtItem()

    const checkItem = (item: RenderItem3D): boolean => {
      if (item && item.containsObject(objNode)) {
        let parentItem: RenderItem3D | null = item
        while (parentItem) {
          if (isPickable(parentItem)) {
            result = parentItem.getId();
            return false;
          }
          parentItem = parentItem.getParent();
        }
      }
      return true;
    };

    // eslint-disable-next-line no-restricted-syntax
    for (const item of this.scene.getRenderItems()) {
        item.traverse(checkItem);
    }

    return result;
  }

  getRenderObjectAtPoint(relativePoint: Point2, filterStackableIds: string[] | null = null): RenderObjectQueryResult {
    this.setupRaycasterFromCamera(relativePoint)

    const target = this.scene.getRenderObjects()
    let objHit: THREE.Object3D | null = null
    let range = 10000
    let point = null
    if (target) {
      const intersects = this.raycaster.intersectObjects(target, true)
        .filter((intersect) => intersect &&
          intersect.object &&
          intersect.object.name &&
          intersect.object.name !== 'lightmap blend' &&
          intersect.object.name !== 'shadow floor receiver' &&
          intersect.object.name !== 'shadow floor black' &&
          intersect.object.name !== 'occlusion image' &&
          intersect.object.name !== 'foreground image' &&
          intersect.object.name !== 'depth occlusion modifier' &&
          intersect.object.name !== 'shadow wall receiver' &&
          intersect.object.name !== 'principal point ring' &&
          intersect.object.name !== 'vertical vanishing lines'
      )

      const count = intersects.length
      for (let i = 0; i < count; i += 1) {
        if (intersects[i].face && isObjectVisible(intersects[i].object)) {
          const object = intersects[i].object
          if (
              intersects[i].distance < range &&
              (filterStackableIds === null ||
                object.userData.stackablePlaneId === undefined ||
                filterStackableIds.includes(object.userData.stackablePlaneId))
          ) {
            range = intersects[i].distance
            objHit = intersects[i].object
            point = intersects[i].point
          }
        }
      }
    }
    return { range, objHit, point }
  }

  private setupRaycasterFromCamera(relativePoint: Point2) {
    const camera = gvCurrentCamera()
    if (!camera) {
      return
    }

    const start = camera.getLocation()
    const direction = camera.getUnitRayDirThruScreenPoint(relativePoint.x, relativePoint.y)
    this.setupRaycaster(start, direction)
    const threeCamera = camera.getThreeCamera()
    if (threeCamera) {
      this.raycaster.camera = threeCamera
    }
  }

  private setupRaycaster(origin: Point3Pod, direction: Vector3Pod) {
    this.raycaster.ray.origin.set(origin.x, origin.y, origin.z)
    this.raycaster.ray.direction.set(direction.dx, direction.dy, direction.dz)
    this.raycaster.layers.enableAll()
  }
}
