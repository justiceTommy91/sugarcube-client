import * as THREE from 'three'

import { gvGeomModel } from 'Renderer/foundation/geom_app'
import { Point2 } from 'Renderer/geometry/Point2'
import { Point3, Point3Pod } from 'Renderer/geometry/Point3'
import { Vector3, Vector3Pod } from 'Renderer/geometry/Vector3'
import { QuaternionPod } from 'Renderer/geometry'
import type { Point2D } from 'Renderer/geomviewer'

import { GrandCentral } from 'Renderer/GrandCentral'
import { NOTIFY_CAMERA_TRANSFORM_UPDATE } from 'Renderer/geomviewer/geom_constants'
import { CameraTransformUpdateNotification } from 'Renderer/geomviewer/geom_notifications'
import { CameraIntrinsics, CameraView } from './camera_types'

// Geomagical uses a perspective camera with the principal point offset from center,
// which requires tweaking the three-js perspective camera.
export class GeomThreeCamera extends THREE.PerspectiveCamera {
  private left: number;
  private right: number;
  private top: number;
  private bottom: number;

  // Public properties for animation proxy.
  public focalLength = 0
  public principalPointX = 0
  public principalPointY = 0
  public imageWidth = 0
  public imageHeight = 0
  public target: THREE.Vector3 = new THREE.Vector3()

  constructor(left: number, right: number, top: number, bottom: number, near: number, far: number) {
    super();
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.near = near;
    this.far = far;
  }

  reset(left: number, right: number, top: number, bottom: number, near: number, far: number, fov: number) {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.near = near;
    this.far = far;
    this.fov = fov;
    this.updateProjectionMatrix();
  }

  // Override.
  updateProjectionMatrix() {
    let { left, right, top, bottom } = this;

    // Support threejs' view offsets used for TAA.
    if (this.view !== null && this.view.enabled) {
      left += (this.view.offsetX * (right - left)) / this.view.fullWidth
      right += (this.view.offsetX * (right - left)) / this.view.fullWidth
      top -= (this.view.offsetY * (top - bottom)) / this.view.fullHeight
      bottom -= (this.view.offsetY * (top - bottom)) / this.view.fullHeight
    }

    const A = (right + left) / (right - left)
    const B = (top + bottom) / (top - bottom)
    const C = -(this.far + this.near) / (this.far - this.near)
    const D = -(2 * this.far * this.near) / (this.far - this.near)

    this.projectionMatrix.set(
      (2 * this.near) / (this.right - this.left), 0, A, 0,
      0, (2 * this.near) / (this.top - this.bottom), B, 0,
      0, 0, C, D,
      0, 0, -1, 0,
    )
  }

  public override updateMatrixWorld(force?: boolean) {
    super.updateMatrixWorld(force)
    const notification: CameraTransformUpdateNotification = {
      what: NOTIFY_CAMERA_TRANSFORM_UPDATE,
      payload: { }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification)
  }

  syncPathAnimationFrame() {
    this.lookAt(this.target)
  }
}

const workspace = {
  threeV3: new THREE.Vector3(),
  v3: new Vector3(0, 0, 0),
}

// Geomagical Camera.
// Usage:
// const cam = new GeomagicalCamera();
// cam.init(intrinsics);
// const threeCam = cam.getThreeCamera();
export class GeomCamera {
  readonly DefaultNear = 0.2;
  readonly DefaultFar = 30.0;

  // Index of the corresponding camera object in the room gltf. Always 0 when manifest is used.
  private cameraIndex = 0;

  private camera?: GeomThreeCamera;
  private cameraProxy?: GeomThreeCamera;

  private near = this.DefaultNear
  private far = this.DefaultFar
  private intrinsics?: CameraIntrinsics;
  private oneOverFx = 1.0;
  private oneOverFy = 1.0;

  private viewDirThree = new THREE.Vector3();
  private camLocThree = new THREE.Vector3();

  private markers: Point2D[] | undefined

  constructor(index = 0) {
    this.cameraIndex = index
  }

  // Initialize a default camera for the given intrinsics and view dimensions in pixels. The
  // default camera has position = (0, 0, 0), view-up = (0, 1, 0) and view-dir = 90, 0, -1)
  init(
    intrinsics: CameraIntrinsics,
    near = this.DefaultNear,
    far = this.DefaultFar) {
    this.near = near
    this.far = far

    const fx = intrinsics.focalLengthX;
    const fy = intrinsics.focalLengthY;
    const px = intrinsics.principalPointX
    const py = intrinsics.principalPointY;
    const width = intrinsics.imageWidth;
    const height = intrinsics.imageHeight;

    const left = (-px / fx) * this.near;
    const right = ((width - px) / fx) * this.near;
    const top = (py / fy) * this.near;
    const bottom = ((-height + py) / fy) * this.near;

    this.camera = new GeomThreeCamera(left, right, top, bottom, this.near, this.far);
    this.createCameraProxy()

    this.setIntrinsics(intrinsics)
  }

  getIndex() {
    return this.cameraIndex
  }

  getIntrinsics() {
    return this.intrinsics
  }

  resetCamera() {
    if (this.camera && this.intrinsics) {
      const fx = this.intrinsics.focalLengthX
      const fy = this.intrinsics.focalLengthY
      const px = this.intrinsics.principalPointX
      const py = this.intrinsics.principalPointY
      const width = this.intrinsics.imageWidth
      const height = this.intrinsics.imageHeight
      this.oneOverFx = 1.0 / fx
      this.oneOverFy = 1.0 / fy

      const left = (-px / fx) * this.near
      const right = ((width - px) / fx) * this.near
      const top = (py / fy) * this.near
      const bottom = ((-height + py) / fy) * this.near
      const fov = 2 * Math.atan((top - bottom) / (2 * this.near))

      this.camera.reset(left, right, top, bottom, this.near, this.far, fov)
      this.camera.focalLength = fx
      this.camera.principalPointX = px
      this.camera.principalPointY = py
      this.camera.imageWidth = width
      this.camera.imageHeight = height
    }
  }

  setIntrinsics(intrinsics: CameraIntrinsics) {
    this.intrinsics = { ...intrinsics }
    this.resetCamera()
  }

  // Change the view size. This is a no-op if the camera has not been initialized.
  setViewSize(viewWidth: number, viewHeight: number) {
    if (this.camera && this.intrinsics) {
      this.intrinsics.imageWidth = viewWidth;
      this.intrinsics.imageHeight = viewHeight;
      this.resetCamera()
    }
  }

  // Change the camera's near and far planes.
  setNearFar(viewNear: number, viewFar: number) {
    if (this.camera && this.intrinsics) {
      this.near = viewNear
      this.far = viewFar
      this.resetCamera()
    }
  }

  // Set the camera view information.
  setLocation(loc: Point3Pod) {
    if (this.camera) {
      this.camera.position.set(loc.x, loc.y, loc.z)
      this.camera.updateMatrixWorld()
      gvGeomModel()?.setRendererIsDirty()
    }
  }

  // Set the camera view information.
  setRotation(rot: QuaternionPod) {
    if (this.camera) {
      this.camera.quaternion.set(rot.x, rot.y, rot.z, rot.w)
      this.camera.updateMatrixWorld()
      gvGeomModel()?.setRendererIsDirty()
    }
  }

  // Set the camera orientation as view-up and view-direction vectors. The view direction
  // is the direction from the camera origin to the principal point in the viewport.
  setViewOrientation(viewUp: Vector3Pod, viewDir: Vector3Pod) {
    if (this.camera && this.intrinsics) {
      const q = this.getLocation();
      q.plus(viewDir);
      this.camera.up.set(viewUp.dx, viewUp.dy, viewUp.dz);
      this.camera.lookAt(q.x, q.y, q.z);
    }
  }

  getView(): CameraView {
    const view: CameraView = {} as CameraView;
    
    if (!this.intrinsics || !this.camera) return view

    view.far = this.far
    view.near = this.near
    view.intrinsics = { ...this.intrinsics }
    view.position = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z }
    view.rotation = 
      { x: this.camera.quaternion.x,
        y: this.camera.quaternion.y,
        z: this.camera.quaternion.z,
        w: this.camera.quaternion.w }
    return view
  }

  setFromView(view: CameraView) {
    if (!this.camera) return
    this.setNearFar(view.near, view.far)
    this.setIntrinsics(view.intrinsics)
    this.camera.setRotationFromQuaternion(
      new THREE.Quaternion( view.rotation.x, view.rotation.y, view.rotation.z, view.rotation.w ))
    this.camera.position.x = view.position.x
    this.camera.position.y = view.position.y
    this.camera.position.z = view.position.z
  }

  // Return the camera world location.
  getLocation(loc?: Point3): Point3 {
    let q = loc;
    if (!q) {
      q = new Point3(0, 0, 0);
    }
    if (this.camera) {
      const p = this.camera.getWorldPosition(this.camLocThree);
      q.set(p.x, p.y, p.z);
    }

    return q;
  }

  // Return the camera view direction as a unit vector. The view direction is
  // the direction from the camera origin to the principal point in the viewport.
  // If param <dir> is provided it is used to receive the vector, otherwise a new
  // vector is allocated and returned.
  getUnitViewDir(dir?: Vector3): Vector3 {
    let v = dir;
    if (!v) {
      v = new Vector3(0, 0, -1);
    }

    if (this.camera && this.intrinsics) {
      const worldDir = this.camera.getWorldDirection(this.viewDirThree);
      v.set(worldDir.x, worldDir.y, worldDir.z);
    }

    return v;
  }

  // Return a unit ray-direction vector through the given screen point. The screen
  // point is given a relative coordinates. If param <dir> is provided it is used
  // to receive the vector, otherwise a new vector is allocated and returned.
  getUnitRayDirThruScreenPoint(relX: number, relY: number, dir?: Vector3): Vector3 {
    let v = dir;
    if (!v) {
      v = new Vector3(0, 0, -1);
    }

    if (this.camera && this.intrinsics) {
      const ofx = this.oneOverFx;
      const ofy = this.oneOverFy;
      const ppx = this.intrinsics.principalPointX;
      const ppy = this.intrinsics.principalPointY;
      const w = this.intrinsics.imageWidth;
      const h = this.intrinsics.imageHeight;

      v.set(
        (w * relX - ppx) * ofx,
        -(h * relY - ppy) * ofy,
        -1);
      v.applyQuaternion(this.camera.quaternion)
      v.normalize();
    }

    return v;
  }

  worldToLocal(point: Point3Pod, out?: Point3): Point3 {
      let ret = out
      if (!ret) {
        ret = new Point3(0, 0, 0)
      }

      if (this.camera) {
      const matElems = this.camera.matrixWorldInverse.elements
        const { x, y, z } = point
        const w = 1

        let lx = matElems[0] * x + matElems[4] * y + matElems[8] * z + matElems[12] * w
        let ly = matElems[1] * x + matElems[5] * y + matElems[9] * z + matElems[13] * w
        let lz = matElems[2] * x + matElems[6] * y + matElems[10] * z + matElems[14] * w
        const lw = matElems[3] * x + matElems[7] * y + matElems[11] * z + matElems[15] * w

        if (lw !== 1 && lw !== 0) {
          const invW = 1 / lw
          lx *= invW
          ly *= invW
          lz *= invW
        }
        ret.x = lx
        ret.y = ly
        ret.z = lz
      }
      return ret
  }

  // Return a 2D point - a projection of a 3D world point on the screen, in canvas pixel coordinates as floating points.
  worldToScreenFloat(point: Point3Pod, out?: Point2): Point2 {
    let ret = out;
    if (!ret) {
      ret = new Point2(0, 0);
    }

    if (this.camera && this.intrinsics) {
      const matElems = this.camera.matrixWorldInverse.elements
      const w = 1 / (matElems[3] * point.x + matElems[7] * point.y + matElems[11] * point.z + matElems[15])

      const localX = (matElems[0] * point.x + matElems[4] * point.y + matElems[8] * point.z + matElems[12] ) * w
      const localY = ( matElems[1] * point.x + matElems[5] * point.y + matElems[9] * point.z + matElems[13] ) * w
      const localZ = ( matElems[2] * point.x + matElems[6] * point.y + matElems[10] * point.z + matElems[14] ) * w

      const fx = this.intrinsics.focalLengthX;
      const fy = this.intrinsics.focalLengthY;
      const px = this.intrinsics.principalPointX;
      const py = this.intrinsics.principalPointY;

      const invPointZ = 1.0 / localZ
      ret.set(
        (-localX * fx) * invPointZ + px,
        (localY * fy) * invPointZ + py,
      );
    }
    return ret;
  }

  // Return a 2D point - a projection of a 3D world point on the screen, in canvas pixel coordinates as integers.
  worldToScreenInt(point: Point3, out?: Point2): Point2 {
    const ret = this.worldToScreenFloat(point, out);
    ret.set(
      Math.floor(ret.x),
      Math.floor(ret.y),
    );
    return ret;
  }

  // Return the view width in pixels.
  getViewWidth(): number {
    return this.intrinsics?.imageWidth ?? 0;
  }

  // Return the view height in pixels.
  getViewHeight(): number {
    return this.intrinsics?.imageHeight ?? 0;
  }

  // Return the three-js camera.
  getThreeCamera(): GeomThreeCamera | undefined {
    return this.camera;
  }

  getThreeCameraProxy(): GeomThreeCamera | undefined {
    return this.cameraProxy;
  }

  // Sets wall pin markers for the view/camera.
  setMarkers(markers: Point2D[] | undefined) {
    this.markers = markers;
  }

  // Returns wall pin markers for the view/camera.
  getMarkers(){
    return this.markers;
  }

  directionLocalToWorld(v: Vector3) {
    const ret = workspace.v3.set(v.dx, v.dy, v.dz)
    if (!this.camera) {
      return ret
    }
    const world = workspace.threeV3.set(v.dx, v.dy, v.dz).applyQuaternion(this.camera.quaternion)
    return ret.set(world.x, world.y, world.z)
  }

  private createCameraProxy() {
    if (!this.camera) {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const scope = this
    this.cameraProxy = new Proxy(this.camera, {
      set(target: GeomThreeCamera, property: keyof GeomThreeCamera, value: unknown): boolean {
        if (property === `focalLength`) {
          const focalLength = value as number
          target[property] = focalLength
          if (scope.intrinsics) {
            scope.intrinsics.focalLengthX = focalLength
            scope.intrinsics.focalLengthY = focalLength
            scope.setIntrinsics(scope.intrinsics)
          }
        } else if (property === `principalPointX`) {
          const principalPoint = value as number
          target[property] = principalPoint
          if (scope.intrinsics) {
            scope.intrinsics.principalPointX = principalPoint
            scope.setIntrinsics(scope.intrinsics)
          }
        } else if (property === `principalPointY`) {
          const principalPoint = value as number
          target[property] = principalPoint
          if (scope.intrinsics) {
            scope.intrinsics.principalPointY = principalPoint
            scope.setIntrinsics(scope.intrinsics)
          }
        } else if (property === `imageWidth`) {
          const imageWidth = value as number
          target[property] = imageWidth
          if (scope.intrinsics) {
            scope.intrinsics.imageWidth = imageWidth
            scope.setIntrinsics(scope.intrinsics)
          }
        } else if (property === `imageHeight`) {
          const imageHeight = value as number
          target[property] = imageHeight
          if (scope.intrinsics) {
            scope.intrinsics.imageHeight = imageHeight
            scope.setIntrinsics(scope.intrinsics)
          }
        }
        return true
      }
    })
  }
}
