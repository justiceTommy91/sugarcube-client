/* eslint-disable class-methods-use-this */
import * as THREE from 'three'
import * as WallSnap from 'Renderer/WallSnap'

import type { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'
import type { BehaviorTarget, WallSnapBody, WallSnapAdapter } from 'Renderer/positioning/positioning_system'
import { PointXY, PointXYZ, Matrix3x3, Point2D, Point3D, Location3 } from 'Renderer/geomviewer/geom_types'
import { PositioningBehavior3D } from 'Renderer/positioning/positioning_behavior_3d'
import { DEFAULT_THREE_NATIVE_LAYER } from 'Renderer/constants'
import { Vector3, Point2, Point3 } from 'Renderer/geometry'
import * as pu from 'Renderer/positioning/positioning_utilities'
import { gvCurrentCamera, gvDecorateEngine } from 'Renderer/foundation/geom_app'
import { extractQuaternionFromMat3, makeRotationY, multiplyMatrices3x3 } from 'Renderer/geometry/utilities'
import { disposeMeshes } from 'Renderer/rendering/rendering_utils'

const workspace = {
  pt2: new Point2(0, 0),
  pt3: new Point3(0, 0, 0),
  v1: new THREE.Vector3(),
  v2: new THREE.Vector3(),
  v3: new THREE.Vector3(),
}
/**
 * PositioningHelper is a simple visual object that imitates a furniture item and its positioning behavior, allowing
 * to visually test the behavior functionality.
 * It can be enabled via debugSettings in the scene (in ui, in the Debug panel).
 */
export class PositioningHelper implements BehaviorTarget, WallSnapAdapter {
  private scene: GeomBaseScene

  private renderObject: THREE.Object3D | null = null
  private geometry: THREE.BoxGeometry | null = null
  private dragReferenceMarkerObject: THREE.Object3D | null = null
  private xMarker: THREE.Object3D | null = null
  private yMarker: THREE.Object3D | null = null
  private zMarker: THREE.Object3D | null = null

  private positioning: PositioningBehavior3D
  private sx = 0.5
  private sy = 1.5
  private sz = 0.5
  private dragReferencePoint = new Vector3(0, 0, 0)
  private heading = 0
  private wallsnapBody: WallSnapBody | null = null
  private active = false
  private boundToSurfaceId: string | undefined = undefined

  constructor(scene: GeomBaseScene) {
    this.scene = scene
    this.createRenderObject()
    this.positioning = new PositioningBehavior3D(this, {
      canBePlacedOnFloor: true,
      canBePlacedOnWall: true,
      canBePlacedOnWallFloorEdge: true,
      targetSizeX: this.sx,
      targetSizeY: this.sy,
      targetSizeZ: this.sz,
    })
  }

  public getWallSnapAdapter() {
    return this
  }

  public setParameters(allowedOnFloor: boolean,
    allowedOnWall: boolean, allowedOnWallFloorEdge: boolean,
    sizeX: number, sizeY: number, sizeZ: number) {
      this.geometry?.translate(0, -this.sy * 0.5, 0)
      this.geometry?.scale(1.0 / this.sx, 1.0 / this.sy, 1.0 / this.sz)
      this.sx = sizeX
      this.sy = sizeY
      this.sz = sizeZ
      this.geometry?.scale(this.sx, this.sy, this.sz)
      this.geometry?.translate(0, this.sy * 0.5, 0)

      if (this.xMarker) {
        this.xMarker.position.x = this.sx * 0.5
      }
      if (this.yMarker) {
        this.yMarker.position.y = this.sy * 1.0
      }
      if (this.zMarker) {
        this.zMarker.position.z = this.sz * 0.5
      }
      this.initWallSnap()
      WallSnap.pushOut(this)

      this.positioning.updateConfig({
        canBePlacedOnFloor: allowedOnFloor,
        canBePlacedOnWall: allowedOnWall,
        canBePlacedOnWallFloorEdge: allowedOnWallFloorEdge,
        targetSizeX: sizeX,
        targetSizeY: sizeY,
        targetSizeZ: sizeZ,
      })
  }

  public setTargetScreenPositionStatic(screenPoint: PointXY) {
    this.positioning.setTargetScreenPositionStatic([screenPoint.x, screenPoint.y])
  }

  public dragTargetToScreenPoint(screenPoint: PointXY) {
    this.positioning.dragTargetToScreenPoint([screenPoint.x, screenPoint.y])
  }

  public setDragReferencePoint(position: Vector3) {
    this.dragReferencePoint.set(position.dx, position.dy, position.dz)
    this.dragReferenceMarkerObject?.position.set(this.dragReferencePoint.dx, this.dragReferencePoint.dy,
      this.dragReferencePoint.dz)
  }

  public getDragReferencePointOnScreen(): Point2 | undefined {
    return this.getLocalPointProjectionOnScreen(workspace.pt3.set(this.dragReferencePoint.dx,
      this.dragReferencePoint.dy, this.dragReferencePoint.dz))
  }

  getLocalPointProjectionOnScreen(localPoint: PointXYZ): Point2 {
    const ret = new Point2(0.0, 0.0)
    const camera = gvCurrentCamera()
    if (!camera || !this.renderObject) {
      return ret
    }
    const worldPosition = this.renderObject.localToWorld(workspace.v1.set(localPoint.x, localPoint.y, localPoint.z))
    return camera.worldToScreenFloat(worldPosition)
  }

  public setPosRelative(pos: PointXYZ): void {
    if (!this.renderObject) {
      return
    }
    this.renderObject.position.set(pos.x, pos.y, pos.z)
    this.renderObject.updateMatrix()
    this.renderObject.updateMatrixWorld(true)
  }
  
  public setPosAbsolute(pos: PointXYZ): void{
    this.setPosRelative(pos)
  }

  public setRotRelative(rotation: Matrix3x3): void {
    if (!this.renderObject) {
      return
    }
    const quat = extractQuaternionFromMat3(rotation);
    this.renderObject.setRotationFromQuaternion(new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]))
    this.renderObject.updateMatrix()
    this.renderObject.updateMatrixWorld(true)
  }

  public setRotAbsolute(rotation: Matrix3x3): void {
    this.setRotRelative(rotation)
  }

  public getPosRelative(): PointXYZ {
    if (!this.renderObject) {
      return { x: 0, y: 0, z: 0 }
    }
    return this.renderObject.position
  }

  public getPosAbsolute(): PointXYZ {
    return this.getPosRelative()
  }

  public getRotRelative(): Matrix3x3 {
    if (!this.renderObject) {
      return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ]
    }
    const rot = this.renderObject.quaternion
    const m = new THREE.Matrix4()
    m.makeRotationFromQuaternion(rot)
    return [
      [m.elements[0], m.elements[1], m.elements[2]],
      [m.elements[4], m.elements[5], m.elements[6]],
      [m.elements[8], m.elements[9], m.elements[10]]]
  }

  public getRotAbsolute(): Matrix3x3 {
    return this.getRotRelative()
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  public bindToSurfaceId(surfaceId: string, isStacked: boolean) {
    this.boundToSurfaceId = surfaceId
  }

  public clearBindToSurface() {
    this.boundToSurfaceId = undefined
  }

  public getBoundToSurface() {
    return this.boundToSurfaceId
  }

  public getHeading() {
    return this.heading
  }

  public setHeading(value: number) {
    this.heading = value
    if (this.wallsnapBody) {
      this.wallsnapBody.rot = value
    }
  }

  public getLocation(): Location3 | undefined {
    if (!this.renderObject || !this.boundToSurfaceId) {
      return undefined
    }
    const worldPos = {
      x: this.renderObject.position.x,
      y: this.renderObject.position.y,
      z: this.renderObject.position.z
    }
    return {
      localPos: worldPos,
      bindTo: this.boundToSurfaceId
    }
  }

  public getWorldPosition(): PointXYZ | undefined {
    if (!this.renderObject) {
      return undefined
    }
    const worldPosition = this.renderObject.getWorldPosition(new THREE.Vector3)
    return {
      ...worldPosition
    }
  }

  public setActive(shouldBeActive: boolean) {
    const scene = this.scene.getObjectsScene()
    if (!this.renderObject || !scene) {
      return
    }
    this.active = shouldBeActive
    if (shouldBeActive) {
      scene.add(this.renderObject)
      this.initWallSnap()
    } else {
      scene.remove(this.renderObject)
      this.wallsnapBody = null
    }
  }

  public isActive() {
    return this.active
  }

  public get body() {
    return this.wallsnapBody
  }

  public get position() {
    if (!this.renderObject) {
      return undefined
    }
    const screenPos = gvCurrentCamera()?.worldToScreenFloat(workspace.pt3.set(
      this.renderObject.position.x,
      this.renderObject.position.y,
      this.renderObject.position.z,
    ))
    return [screenPos?.x || 0, screenPos?.y || 0]
  }

  public set position(screenPoint: Point2D | undefined) {
    // noop
  }

  public get orientation() {
    return this.getHeading()
  }

  public set orientation(orientation: number) {
    this.heading = orientation
  }

  public get pose() {
    const result: 
    {
        pos: [number, number, number], 
        rot: [[number, number, number], [number, number, number], [number, number, number]]
    } = {pos: [0, 0, 0], rot: [[1, 0, 0], [0, 1, 0], [0, 0, 1]]}

    const pos = this.getPosAbsolute()
    result.rot = this.getRotAbsolute()
    result.pos = [pos.x, pos.y, pos.z]
    return result;
  }

  // This property is set by WallSnap, and it corrects the passed orientation.
  // The same is done in FurnitureItem.update, where the renderObject is additionally rotated around x axis by 90 deg.
  public set pose(pose: {
    pos: Point3D,
    rot: Matrix3x3,
  }) {
    const headMat = makeRotationY(this.heading)
    const rotWithHeading = multiplyMatrices3x3([
      [...pose.rot[0]],
      [...pose.rot[2]],
      [-pose.rot[1][0], -pose.rot[1][1], -pose.rot[1][2]],
    ], headMat)
    const floorId = pu.getFloorPlane()?.id
    this.boundToSurfaceId = floorId ? String(floorId) : undefined

    this.setPosAbsolute(gvDecorateEngine().toVec3(pose.pos))
    this.setRotAbsolute(rotWithHeading)
  }

  private createRenderObject() {
    this.geometry = new THREE.BoxGeometry(1, 1, 1)
    this.renderObject = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({
      color: 0x808080,
      transparent: true,
      opacity: 0.6,
    }))
    this.geometry.scale(this.sx, this.sy, this.sz)
    this.geometry.translate(0, this.sy * 0.5, 0)

    const axesHelper = new THREE.AxesHelper(1)
    this.renderObject.add(axesHelper)

    const markerGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05)
    this.xMarker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: 0xFF0000 }))
    this.yMarker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: 0x00FF00 }))
    this.zMarker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: 0x0000FF }))
    this.xMarker.position.x = this.sx * 0.5
    this.yMarker.position.y = this.sy * 1.0
    this.zMarker.position.z = this.sz * 0.5

    const centerGeometry = new THREE.SphereGeometry(0.05)
    const centerMarker = new THREE.Mesh(centerGeometry, new THREE.MeshBasicMaterial({ color: 0x000000 }))

    const dragMarkerGeometry = new THREE.BoxGeometry(0.075, 0.075, 0.075)
    this.dragReferenceMarkerObject = new THREE.Mesh(dragMarkerGeometry,
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF }))
    this.dragReferenceMarkerObject.position.set(this.dragReferencePoint.dx, this.dragReferencePoint.dy,
      this.dragReferencePoint.dz)

    this.renderObject.add(centerMarker, this.dragReferenceMarkerObject, this.xMarker, this.yMarker, this.zMarker)

    this.renderObject.layers.set(DEFAULT_THREE_NATIVE_LAYER)
  }

  private initWallSnap() {
    const floorPlane = pu.getFloorPlane()
    const intrinsics = gvCurrentCamera()?.getIntrinsics()
    this.wallsnapBody = WallSnap.initBody(this, this.sx, this.sz, floorPlane,
      [intrinsics?.focalLengthX, intrinsics?.focalLengthY, intrinsics?.principalPointX, intrinsics?.principalPointY])
  }

  public setParent() {
    return false
  }

  public dispose() {
    if (!this.renderObject) {
      return
    }

    disposeMeshes(this.renderObject)
  }
  
  public setParentByRenderItemId() {
    return false
  }

  public setParentBySurfaceId(surfaceId: string | null) {
    if (surfaceId)
      this.boundToSurfaceId = surfaceId
    else 
      this.boundToSurfaceId = undefined
    return true
  }

  public setParentSurface(surfaceId: string) {
    this.boundToSurfaceId = surfaceId
  }

}