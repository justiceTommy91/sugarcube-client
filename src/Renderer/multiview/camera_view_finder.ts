import * as THREE from 'three'

import type { RenderItem3D } from 'Renderer/model/RenderItem3D'
import type { CameraView } from 'Renderer/multiview/camera_types'
import type { GeomCamera } from 'Renderer/multiview/geom_camera'
import { gvCurrentScene, gvViewManager } from 'Renderer/foundation/geom_app'
import { getWorldForwardUnitVector, getWorldRightUnitVector} from 'Renderer/utils/posUtils'
import { EPSILON_SQRD, Point3, polygonRayCast } from 'Renderer/geometry'
import FurnitureItem3D from 'Renderer/model/FurnitureItem3D'
import ArtItem3D from 'Renderer/model/ArtItem3D'
import { isPointInsideFloorPolygon } from 'Renderer/positioning/positioning_utilities'

export class CameraViewFinder {
  private static defaultIntrinsics = {
    focalLengthX: 1000,
    focalLengthY: 1000,
    principalPointX: 100,
    principalPointY: 100,
    imageWidth: 100,
    imageHeight: 100
  }

  private static defaultView: CameraView = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 0 },
    intrinsics: this.defaultIntrinsics,
    near: 0.1,
    far: 100,
  }

  public static getViewFromCamera(camera: GeomCamera | undefined): CameraView {
    const threeCamera = camera?.getThreeCamera()
    if (!camera || !threeCamera) {
      return { ...CameraViewFinder.defaultView }
    }
    const intrinsics = camera.getIntrinsics() || CameraViewFinder.defaultIntrinsics
    return {
      position: { ...threeCamera.position },
      rotation: {
        x: threeCamera.quaternion.x,
        y: threeCamera.quaternion.y,
        z: threeCamera.quaternion.z,
        w: threeCamera.quaternion.w,
      },
      intrinsics: { ...intrinsics },
      near: threeCamera.near,
      far: threeCamera.far,
    }
  }

  public static resetCameraToView(camera: GeomCamera | undefined, view: CameraView | undefined) {
    const threeCamera = camera?.getThreeCamera()
    if (!camera || !view || !threeCamera) {
      return
    }
    threeCamera.quaternion.set(view.rotation.x, view.rotation.y, view.rotation.z, view.rotation.w)
    camera.setLocation(view.position)
    camera.setIntrinsics(view.intrinsics)
    camera.setNearFar(view.near, view.far)
  }

  public static scaleViewToScreenSize(cameraView: CameraView, screenSize: THREE.Vector2): CameraView {
    const intrinsics = { ...cameraView.intrinsics }
    const savedCameraScreenRatio = intrinsics.imageWidth / intrinsics.imageHeight
    const screenRatio = screenSize.width / screenSize.height
    if (screenRatio < savedCameraScreenRatio) {
      const focalLength = intrinsics.focalLengthX * screenSize.width / intrinsics.imageWidth
      intrinsics.focalLengthX = focalLength
      intrinsics.focalLengthY = focalLength
      intrinsics.imageWidth = screenSize.width
      intrinsics.imageHeight = screenSize.width * (1 / screenRatio)
    } else {
      const focalLength = intrinsics.focalLengthY * screenSize.height / intrinsics.imageHeight
      intrinsics.focalLengthX = focalLength
      intrinsics.focalLengthY = focalLength
      intrinsics.imageHeight = screenSize.height
      intrinsics.imageWidth = screenSize.height * screenRatio
    }
    intrinsics.principalPointX = screenSize.width / 2
    intrinsics.principalPointY = screenSize.height / 2
    return { ...cameraView, intrinsics }
  }

  // When keepCurrentView is true, this will attempt to pick a view that is 
  // closely aligned to the current viewing direction.
  public static getFocusedViewOnItem(
    item: RenderItem3D, camera: GeomCamera | undefined,
    keepCurrentView = false, scaleToScreenSize = false,
  ): CameraView {
    const threeCamera = camera?.getThreeCamera()
    if (!camera || !threeCamera) {
      return { ...CameraViewFinder.defaultView }
    }
  
    const planePolygons = gvCurrentScene()?.getPolygonData()?.plane_polygons
    const mesh = item.getObject()
    const currentView = CameraViewFinder.getViewFromCamera(camera)
    const currentViewDefaults = gvViewManager()?.getCurrentViewDefaults()
    if (!mesh || !planePolygons || !currentViewDefaults) {
      return currentView
    }

    const screenSize = new THREE.Vector2(...gvCurrentScene()?.getDimensions() || [])
    const referenceView = scaleToScreenSize
      ? CameraViewFinder.scaleViewToScreenSize(currentViewDefaults, screenSize)
      : currentViewDefaults

    const floor = planePolygons.find(poly => poly.class === 'floor')
    const worldUp = new THREE.Vector3(...(floor?.plane?.rot[2] || [0, 1, 0]))

    const fy = referenceView.intrinsics.focalLengthY
    const py = referenceView.intrinsics.principalPointY
    const height = referenceView.intrinsics.imageHeight
    const top = (py / fy) * referenceView.near
    const bottom = ((-height + py) / fy) * referenceView.near
    const canonicalFov = 2 * Math.atan((top - bottom) / (2 * referenceView.near))

    const probableViews = CameraViewFinder.focusedItemViewGenerator(
      item, mesh, canonicalFov, worldUp, 
      currentView, keepCurrentView)

    let bestCameraView = currentView
    let bestVisibilityScore = -1
    for (const probableView of probableViews) {
      const view = {
        position: { x: probableView.pos.x, y: probableView.pos.y, z: probableView.pos.z },
        rotation: { x: probableView.rot.x, y: probableView.rot.y, z: probableView.rot.z, w: probableView.rot.w },
        intrinsics: referenceView.intrinsics || camera.getIntrinsics() || CameraViewFinder.defaultIntrinsics,
        near: referenceView.near,
        far: referenceView.far,
      }
      const score = CameraViewFinder.scoreItemVisibilityInView(item, mesh, view)
      if (score > bestVisibilityScore) {
        bestVisibilityScore = score
        bestCameraView = view
      }
    }

    // Unable to find a good view, just return the last probable view.
    return bestCameraView 
  }

  public static scoreItemVisibilityInView(item: RenderItem3D, mesh: THREE.Object3D, cameraView: CameraView) {
    const cameraCenter = new THREE.Vector3(cameraView.position.x, cameraView.position.y, cameraView.position.z)

    const itemCorners: Point3[] = []
    if (item instanceof FurnitureItem3D) {
      // Use the item's computed bounding box so that we get a tight fit instead
      // of computing an axis-aligned bounding box from the current mesh.
      // This gives a much tighter fit on the model.
      const worldTransform = item.getWorldTransform()
      const bboxLines = item.getBoundingBox()
      const geometry = bboxLines?.geometry
      const posAttribute = geometry?.getAttribute('position')
      if (posAttribute) { 
        for (let i = 0; i < posAttribute.count; i += 1) {
          const x = posAttribute.getX(i)
          const y = posAttribute.getY(i)
          const z = posAttribute.getZ(i)
          const pt = new Point3(x, y, z)
          pt.mulMat4(worldTransform)
          // avoid duplicate corners
          if (!itemCorners.some((corner) => pt.distanceToSq(corner) <= EPSILON_SQRD )) {
            itemCorners.push(pt)
          }
        }
      }
    } else {
      // fall back on just computing the axis-aligned bounding box from the mesh, 
      // which works fine for art-items
      const itemBbox = new THREE.Box3().setFromObject(mesh)
      itemCorners.push(new Point3(itemBbox.min.x, itemBbox.min.y, itemBbox.min.z))
      itemCorners.push(new Point3(itemBbox.min.x, itemBbox.min.y, itemBbox.max.z))
      itemCorners.push(new Point3(itemBbox.min.x, itemBbox.max.y, itemBbox.min.z))
      itemCorners.push(new Point3(itemBbox.max.x, itemBbox.min.y, itemBbox.min.z))
      itemCorners.push(new Point3(itemBbox.max.x, itemBbox.max.y, itemBbox.min.z))
      itemCorners.push(new Point3(itemBbox.max.x, itemBbox.min.y, itemBbox.max.z))
      itemCorners.push(new Point3(itemBbox.min.x, itemBbox.max.y, itemBbox.max.z))
      itemCorners.push(new Point3(itemBbox.max.x, itemBbox.max.y, itemBbox.max.z))
    }

    const polygons = gvCurrentScene()?.getPolygonData()?.plane_polygons
      .filter((poly) => poly.class === 'wall' || poly.class === 'window' || poly.class === 'door') || []

    // Check how many of the item's corners are visible from the given view.
    // This will be the visibility heuristic we use to find the best view.
    const visibleCorners = itemCorners.filter(corner => {
      const viewOriginPoint3 = new Point3(cameraCenter.x, cameraCenter.y, cameraCenter.z)
      const viewDirection = corner.minus(viewOriginPoint3).normalize()
      const viewDistance = corner.distanceTo(cameraCenter)
      // Disregard corners that are pushed out of the room bounds (can happen to stackables).
      if (!isPointInsideFloorPolygon(corner)) {
        return false
      }
      const isObscuredByWall = polygons.some(polygon => {
        // only consider walls that aren't back-facing to the camera
        const intersect = polygonRayCast(polygon, viewOriginPoint3, viewDirection, true)
        if (intersect && intersect.distanceFromOrigin < viewDistance) { 
          // Useful debugging visualization
          // const arrowHelper = new THREE.ArrowHelper(
          //   new THREE.Vector3(viewDirection.dx, viewDirection.dy, viewDirection.dz), 
          //   cameraCenter, viewDistance, 0xFF0000,
          //   0.05*viewDistance, 0.05*viewDistance);
          // gvCurrentScene()?.getObjectsScene()?.add(arrowHelper)
          return true
        } 
        // Useful debugging visualization
        // const arrowHelper = new THREE.ArrowHelper(
        //   new THREE.Vector3(viewDirection.dx, viewDirection.dy, viewDirection.dz), 
        //   cameraCenter, viewDistance, 0x00FF00,
        //   0.05 * viewDistance, 0.05 * viewDistance);
        // gvCurrentScene()?.getObjectsScene()?.add(arrowHelper)
        return false
      })
      return !isObscuredByWall
    }).length

    return visibleCorners
  }

  // When keepCurrentView is true, this will attempt to pick a view that is
  // closely aligned to the current viewing direction.
  private static *focusedItemViewGenerator(
    item: RenderItem3D,
    mesh: THREE.Object3D,
    fov: number,
    worldUp: THREE.Vector3,
    currentView: CameraView,
    keepCurrentView = false
  ) {
    const box = item.getBoxRecursive()

    const boxCenter = box.getCenter(new THREE.Vector3())
    const boxDimensions = box.getSize(new THREE.Vector3())
    const boxSize = boxDimensions.length()

    let itemRight = new THREE.Vector3(...getWorldRightUnitVector(mesh.matrixWorld))
    let itemForward = new THREE.Vector3(...getWorldForwardUnitVector(mesh.matrixWorld))

    const itemToCamera = new THREE.Vector3(currentView.position.x, currentView.position.y, currentView.position.z)
      .sub(boxCenter).normalize()

    // For stackables annd combinables, use the orientation of the parent than the item itself.
    // This helps since stackable orientations can be artibrary, but the parent's orientation
    // is more likely to be aligned with the desired view point.
    const furnitureParent = item instanceof FurnitureItem3D ? item.getRootFurnitureParent() : null
    if (furnitureParent) {
      const parentMesh = furnitureParent.getObject()
      furnitureParent.updateRenderObjects()
      if (parentMesh) {
        itemRight = new THREE.Vector3(...getWorldRightUnitVector(parentMesh.matrixWorld))
        itemForward = new THREE.Vector3(...getWorldForwardUnitVector(parentMesh.matrixWorld))
      }
    }

    const itemLeft = itemRight.clone().negate()
    const itemBack = itemForward.clone().negate()

    let idealViewDirection = itemForward
    const isWallItem = item instanceof ArtItem3D || ((item instanceof FurnitureItem3D) && item.isBoundToWall())
    if (keepCurrentView && !isWallItem) {
      let bestScore = -1
      Array.from([itemForward, itemBack, itemRight, itemLeft]).forEach((dir) => {
        const score = dir.dot(itemToCamera)
        if (score > bestScore) {
          bestScore = score
          idealViewDirection = dir
        }
      })
    }
  
    // Use the camera field of view to determine the min distance of viewing the item.
    // use that as a radius of circular circumference of search of clear view point.
    const halfFovY = fov * 0.5
    const halfSizeToFitOnScreen = boxSize * 0.5
    // Ensure minimum radius to avoid avoid getting too close.
    const radius = Math.max(2.0, halfSizeToFitOnScreen / Math.tan(halfFovY))
    const center = worldUp.clone().multiplyScalar(boxDimensions.y * 0.5).add(boxCenter)

    // Search is performed starting at the frontal point going through both directions of a planar
    // circle with the previously calculated radius, until it reaches the back of the item.
    let sign = -1
    const STEPS = isWallItem ? 6 : 20;
    for (let i = 0; i < STEPS; i += 1) {
      sign *= -1
      const step = Math.floor(i / 2)
      // Don't go all the way around for wall items.
      const maxAngle = isWallItem ? Math.PI / 3 : 2 * Math.PI;
      const angle = maxAngle * step / STEPS

      const targetPos = idealViewDirection.clone()
      // rotate around the item's up vector
      const upVec = itemForward.clone().cross(itemRight).normalize()
      targetPos.applyAxisAngle(upVec, sign * angle)
      targetPos.multiplyScalar(radius).add(center)

      // tilt camera up some degrees to get a better view of the item but only for 
      // items on the floor.
      if (!isWallItem) {
        const vec = new THREE.Vector3(targetPos.x - center.x, targetPos.y - center.y, targetPos.z - center.z);
        const tiltvec = worldUp.clone()
        tiltvec.cross(vec).normalize()
        vec.applyAxisAngle(tiltvec, -Math.PI / 8);
        targetPos.set(center.x + vec.x, center.y + vec.y, center.z + vec.z);
      }

      const targetRotMatrix = new THREE.Matrix4().lookAt(targetPos, boxCenter, worldUp)
      const targetRot = new THREE.Quaternion().setFromRotationMatrix(targetRotMatrix)
      yield { pos: targetPos, rot: targetRot }
    }

    return center
  }
}