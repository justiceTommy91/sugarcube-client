/* eslint-disable class-methods-use-this */
import Renderer from 'Renderer';
import type { ItemPlacementData, Quat4D, SceneItemMetrics } from 'Renderer/geomviewer';
import * as THREE from 'three';
import type { GeomCamera } from 'Renderer/multiview/geom_camera';
import { Point3, Point3Pod } from 'Renderer/geometry/Point3';
import { Vector3, Vector3Pod } from 'Renderer/geometry/Vector3';
import { Point2 } from 'Renderer/geometry/Point2';
import {
  Location3, PointXYZ, PointXY, Matrix3x3,
  Matrix4x4, Point2D, Placement, PlaneType, AnimationOverride,
} from 'Renderer/geomviewer/geom_types'
import {
  gvCurrentCamera, gvCurrentScene, gvCurrentSettings,
  gvViewManager, gvDecorateEngine,
} from 'Renderer/foundation/geom_app'
import { NOTIFY_SCENE_ITEM_UPDATE } from 'Renderer/geomviewer/geom_constants'
import { GrandCentral } from 'Renderer/GrandCentral'
import { DEFAULT_THREE_NATIVE_LAYER, EXTRA_HINT_DRAGGING_IN_HAND, EXTRA_HINT_STACKABLE } from 'Renderer/constants'
import { extractQuaternionFromMat3, composeTransform, getInverted,
  createIdentity3, createIdentity4, getRotationMatrixFromQuaternion, extractPosition } 
  from 'Renderer/geometry/utilities'
import type { DragResult } from 'Renderer/positioning/positioning_system'
import { getRenderItem3D, getStackableSurfaceItem3D } from 'Renderer/rendering/scene_utils'
import { RenderItemDebugControls } from 'Renderer/positioning/render_item_debug_controls'
import { Node, SceneGraph } from '@geomagical/sugarcube-rendering-shared/dist/release/decorate-engine'
import { getSurfaceById } from 'Renderer/positioning/positioning_utilities'
import { BaseItem } from './BaseItem'

const workspace = {
  vectorsArray: Array.from({ length: 8 }, () => new THREE.Vector3()),
  pt3: new Point3(0, 0, 0),
}

const scratchVec3A = new THREE.Vector3()
const scratchVec3B = new THREE.Vector3()
const scratchQuatA = new THREE.Quaternion()
const scratchQuatB = new THREE.Quaternion()

type ShaderInfo = {
  fragmentShader: string
  uniforms: Record<string, { value: number }>
}
type DitheredMaterial = THREE.Material & {
  uniforms?: Record<string, { value: number }>
  isMeshStandardMaterial?: boolean
}

/**
 * Represents a 3D rendering item.
 * This is an abstract class meant to be extended for concrete implementations.
 */
export abstract class RenderItem3D extends BaseItem {
  protected Renderer: Renderer
  protected id: string
  public colorId = -1
  public colorIdColor: THREE.Color = new THREE.Color()
  protected name: string
  protected metrics: SceneItemMetrics
  protected bbox = new THREE.Box3()
  private dragReferencePoint = new Vector3(0, 0, 0)
  protected renderingLayer = DEFAULT_THREE_NATIVE_LAYER

  protected bindToSurface: string | undefined = undefined
  protected hintExtraBindTo: string | undefined = ''
  protected sceneNode: Node
  private renderObject?: THREE.Object3D
  protected isDeleted = false
  private parent: RenderItem3D | null = null
  protected children: RenderItem3D[] = []
  protected visible = true
  protected isDragging = false
  // Setting dispatchProjectionUpdatesEnabled to false will disable dispatching
  // projection update notifications on every render object transform update.
  private dispatchProjectionUpdatesEnabled = true

  private debugControls: RenderItemDebugControls | null = null
  private baseScale = new THREE.Vector3(1, 1, 1)

  private animationOverride: AnimationOverride | null = null
  private lastAppliedOpacity = 1.0

  protected sceneGraph: SceneGraph
  private static nodeCounter = 0

  constructor(id: string, renderer: Renderer, location: Location3) {
    super();

    RenderItem3D.nodeCounter += 1;

    this.Renderer = renderer;

    this.sceneGraph = renderer.scene.getOrInitSceneGraph()

    const node = this.sceneGraph.addNode(String(RenderItem3D.nodeCounter))
    if (!node) {
      throw new Error('Failed to create scene node')
    }
    this.sceneNode = node

    this.id = id;
    this.name = `renderObject-${this.id}`;
    this.metrics = {
      id,
      msStartLoad: 0,
      msEndLoad: 0,
      msEndFlush: 0,
      sFileDownloadTime: 0,
      msStartParsing: 0,
      msBasisUniversalTextureTranscodingTime: 0,
      msDracoDecompress: 0,
      sLoadTime: 0,
      sFlushTime: 0,
      sTotalTime: 0,
      msReactUpdateTime: 0,
      LoadSize: 0,
      MeshCompression: `none`,
      TextureCompression: `none`,
      MbFileSizeTransferred: 0,
      isInitPosInRoomBounds: true
    };

    this.bindToSurface = location.bindTo;
    this.sceneGraph.update();

    this.sceneNode.setRelativePosition(location.localPos);
    this.sceneNode.setRelativeRotation(gvDecorateEngine().quatIdentity());
  }

  // Abstract methods meant to be implemented by concrete subclasses
  protected shouldHighLightOnDrag() {
    return false
  }

  abstract dispatchItemPlacementUpdate(): void;
  abstract getItemPlacementData(): ItemPlacementData | undefined;

  /**
   * Updates the underlying renderable object with current position, scale and rotation
   */
  updateRenderObject(): void {
    const renderObject = this.getObject()
    if (!renderObject) {
      return
    }

    this.sceneGraph.update();
    const sgTransform = this.sceneNode?.getAbsoluteTransform()

    if (sgTransform){
        renderObject.position.set(sgTransform.pos.x, sgTransform.pos.y, sgTransform.pos.z)
        renderObject.quaternion.set(sgTransform.rot.x, sgTransform.rot.y, sgTransform.rot.z, sgTransform.rot.w)
        renderObject.scale.copy(this.baseScale)
        renderObject.updateMatrix()
        renderObject.updateMatrixWorld(true)
    }

    if (this.animationOverride && this.animationOverride.blendFactor > 0) {
      const override = this.animationOverride
      const t = override.blendFactor

      const overrideWorldPos = scratchVec3A.set(0, 0, 0)
      const overrideWorldRot = scratchQuatA.set(0, 0, 0, 1)

      if (override.space === 'world') {
        if (override.position) {
          const p = override.position
          overrideWorldPos.set(p.x, p.y, p.z)
        }
        if (override.rotation) {
          const r = override.rotation
          overrideWorldRot.set(r[0], r[1], r[2], r[3])
        }
      } else if (override.space === 'view') {
        const cam = gvCurrentCamera()?.getThreeCamera()
        if (cam) {
          if (override.position) {
            if (override.anchorToRest) {
              // Project item's rest position into view space, add override as delta, convert back
              overrideWorldPos.copy(renderObject.position).applyMatrix4(cam.matrixWorldInverse)
              overrideWorldPos.set(
                overrideWorldPos.x + override.position.x,
                overrideWorldPos.y + override.position.y,
                overrideWorldPos.z + override.position.z,
              )
              overrideWorldPos.applyMatrix4(cam.matrixWorld)
            } else {
              overrideWorldPos.set(override.position.x, override.position.y, override.position.z)
              overrideWorldPos.applyMatrix4(cam.matrixWorld)
            }
          }
          if (override.rotation) {
            const r = override.rotation
            overrideWorldRot.set(r[0], r[1], r[2], r[3])
            overrideWorldRot.premultiply(scratchQuatB.setFromRotationMatrix(cam.matrixWorld))
          }
        }
      } else if (override.space === 'local') {
        if (override.position) {
          overrideWorldPos.copy(renderObject.position)
          overrideWorldPos.add(scratchVec3B.set(override.position.x, override.position.y, override.position.z)
            .applyQuaternion(renderObject.quaternion))
        }
        if (override.rotation) {
          overrideWorldRot.copy(renderObject.quaternion)
          const r = override.rotation
          overrideWorldRot.multiply(scratchQuatB.set(r[0], r[1], r[2], r[3]))
        }
      }

      if (override.position) renderObject.position.lerp(overrideWorldPos, t)
      if (override.rotation) renderObject.quaternion.slerp(overrideWorldRot, t)
      if (override.scale) {
        renderObject.scale.lerp(scratchVec3A.set(override.scale.x, override.scale.y, override.scale.z), t)
      }
      const targetOpacity = override.opacity !== undefined
        ? 1.0 + (override.opacity - 1.0) * t
        : 1.0
      if (targetOpacity !== this.lastAppliedOpacity) {
        this.applyDitheredOpacity(targetOpacity)
      }
      renderObject.updateMatrix()
      renderObject.updateMatrixWorld(true)
    } else if (this.lastAppliedOpacity !== 1.0) {
      this.applyDitheredOpacity(1.0)
    }

    this.Renderer.onChildUpdate()
  }

  setAnimationOverride(override: AnimationOverride | null): void {
    this.animationOverride = override
    this.updateRenderObject()
  }

  private applyDitheredOpacity(opacity: number): void {
    if (!gvCurrentSettings()?.viewerSettings?.onOffOptions.enableDitheredOpacity) return
    const renderObject = this.getObject()
    if (!renderObject) return

    this.lastAppliedOpacity = opacity

    renderObject.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const mat = child.material as DitheredMaterial
      if (!mat) return

      // Path 1: CustomStandardMaterial — has ditheredOpacity uniform directly
      if (mat.uniforms?.ditheredOpacity) {
        mat.uniforms.ditheredOpacity.value = opacity
        return
      }

      // Path 2: MeshStandardMaterial — inject dithering via onBeforeCompile
      if (!mat.isMeshStandardMaterial) return

      // Already patched — just update the uniform value
      if (mat.userData?.ditheredOpacityRef) {
        mat.userData.ditheredOpacityRef.value = opacity
        return
      }

      // First time: patch the material shader with dithered opacity
      const uniformRef = { value: opacity }
      mat.userData = mat.userData || {}
      mat.userData.ditheredOpacityRef = uniformRef

      const prevOnBeforeCompile = mat.onBeforeCompile
      mat.onBeforeCompile = (shader: ShaderInfo, renderer: THREE.WebGLRenderer) => {
        if (prevOnBeforeCompile) {
          prevOnBeforeCompile.call(mat, shader as Parameters<typeof prevOnBeforeCompile>[0], renderer)
        }
        if (shader.fragmentShader.includes(`ditheredOpacity`)) return

        shader.uniforms.ditheredOpacity = uniformRef
        shader.fragmentShader = shader.fragmentShader.replace(
          `varying vec3 vViewPosition;`,
          `varying vec3 vViewPosition;
          uniform float ditheredOpacity;
          float bayer2_do(vec2 a){a=floor(a);return fract(dot(a,vec2(.5, a.y*.75)));}
          float bayer4_do(vec2 a){return bayer2_do(.5*a)*.25+bayer2_do(a);}
          float bayer8_do(vec2 a){return bayer4_do(.5*a)*.25+bayer2_do(a);}`,
        )
        shader.fragmentShader = shader.fragmentShader.replace(
          `#include <opaque_fragment>`,
          `#include <opaque_fragment>
          float byr_do = min(1.0, bayer8_do(vec2(gl_FragCoord)));
          if (ditheredOpacity < 1.0 && ditheredOpacity < byr_do) { discard; }`,
        )
      }
      mat.needsUpdate = true
    })
  }

  /**
  * Pass given screen position to the underlying positioning system to compute and set object's world position.
  * 
  * Note: this method is possibly temporary, and is here to follow the existing pattern of having
  * positioning system internal to RenderItem. A cleaner way would be to have the positioning system
  * (or at least "2D to 3D" part of it) as an external layer between InputHandler and RenderItem.
  * In that case this method won't be needed.
  */
  abstract setPositionFromScreenPoint(screenPoint: PointXY): boolean;

  // <screenPoint> is the item reference point (pivot point) from where item is dragged.
  // <dragOffset> is 2D offset from the mouse cursor to the <screenPoint>.
  abstract dragTargetToScreenPoint(screenPoint: PointXY, dragOffset?: PointXY): DragResult

  containsObject(obj: THREE.Object3D | null) {
    if (obj === null) return false

    let result = false
    this.renderObject?.traverse(child => {
      if (child === obj) result = true
    })
    return result
  }

  getIsDeleted(): boolean {
    return this.isDeleted
  }

  getParent(): RenderItem3D | null {
    return this.parent
  }

  getParentId(): string | null {
    return this.parent?.getId() || null
  }

  getChildren(): RenderItem3D[] {
    return this.children
  }

  getChildrenIds(): string[] {
    return this.children.map(child => child.getId())
  }

  getRenderingLayer(): number {
    return this.renderingLayer
  }

  getBbox(): THREE.Box3 {
    return this.bbox;
  }

  getPlacement(): Placement {
    const rotation = gvDecorateEngine().fromQuat(this.sceneNode.getRelativeTransform().rot)

    const ret: Placement = {
      kind: `location3`,
      location3: { ...this.getLocation() },
      rotation
    }
    return ret
  }

  setPlacement(placement: Placement) {
    const rotation = placement.rotation
      ? getRotationMatrixFromQuaternion(placement.rotation)
      : undefined

    if (rotation) {
      this.setRotRelative(rotation)
    } else {
      this.setRotRelative(createIdentity3())
    }
    this.setPosRelative(placement.location3.localPos)

    this.bindToSurface = placement.location3.bindTo
    this.hintExtraBindTo = placement.location3.hintExtraBindTo
  }

  setPosRelative(pos: PointXYZ) {
    this.sceneNode.setRelativePosition(pos);
    this.updateChildrenTransforms()
  }

  setPosAbsolute(pos: PointXYZ) {
    this.sceneNode.setAbsolutePosition(pos);
    this.updateChildrenTransforms()
  }

  setRotRelative(rotation: Matrix3x3) {
    this.sceneNode.setRelativeRotation(gvDecorateEngine().toQuat(extractQuaternionFromMat3(rotation)));
    this.updateChildrenTransforms()
  }

  setRotAbsolute(rotation: Matrix3x3) {
    this.sceneNode.setAbsoluteRotation(gvDecorateEngine().toQuat(extractQuaternionFromMat3(rotation)));
    this.updateChildrenTransforms()
  }

  getPosRelative(): PointXYZ {
    return this.sceneNode.getRelativeTransform().pos
  }

  getPosAbsolute(): PointXYZ {
    return this.sceneNode.getAbsoluteTransform().pos
  }

  getRotRelative(): Matrix3x3 {
    const quat: [number, number, number, number] = 
      gvDecorateEngine().fromQuat(this.sceneNode.getRelativeTransform().rot)
    const result = getRotationMatrixFromQuaternion(quat)
    return result
  }

  getRotAbsolute(): Matrix3x3 {
    const quat: [number, number, number, number] = 
      gvDecorateEngine().fromQuat(this.sceneNode.getAbsoluteTransform().rot)
    const result = getRotationMatrixFromQuaternion(quat)
    return result
  }

  updateChildrenTransforms() {
    this.updateRenderObjects()
    this.notifyScreenProjectionUpdate()
  }

  updateRenderObjects() {
    // Update the threejs transforms of all render items that are a child of this item in the scene graph
    this.updateRenderObject()
    
    for (const child of this.children) {
      child.updateRenderObjects()
    }
  }

  getTransform(): Matrix4x4 {
    let result = createIdentity4();

    this.sceneGraph.update();
    const transform = this.sceneNode.getRelativeTransform();
    const quat: [number, number, number, number] = gvDecorateEngine().fromQuat(transform.rot)
    result = composeTransform(transform.pos, quat, {x: 1, y: 1, z: 1})
    return result
  }

  getWorldTransform(): Matrix4x4 {
    let result = createIdentity4();

    this.sceneGraph.update();
    const transform = this.sceneNode.getAbsoluteTransform()
    const quat: [number, number, number, number] = gvDecorateEngine().fromQuat(transform.rot)
    result = composeTransform(transform.pos, quat, {x: 1, y: 1, z: 1})
    return result
  }

  // Metrics related methods
  getMetric() {
    return { ...this.metrics };  // Return a copy to prevent mutations
  }

  getId() {
    return this.id
  }
  
  protected setLoadSize(total: number) {
    this.metrics.LoadSize = total;
  }

  protected getLoadSize() {
    return this.metrics.LoadSize;
  }

  // Render object manipulation methods
  public setObject(obj: THREE.Object3D) {
    if (this.renderObject){
      this.removeFromScene()
    }

    this.renderObject = obj

    if (this.renderObject) {
      this.baseScale.copy(this.renderObject.scale)
      this.updateRenderObject()
      this.addToScene()
    }
  }

  protected unsetObject() {
    this.removeFromScene()
    this.renderObject = undefined
  }

  getObject() {
    return this.renderObject;
  }

  getLocation(): Location3 {
    this.sceneGraph.update()
    return {
      localPos: { ...this.getPosRelative() },
      bindTo: this.bindToSurface ? this.bindToSurface : '',
      hintExtraBindTo: this.hintExtraBindTo
    }
  }

  getRotation(): Quat4D {
    const result = gvDecorateEngine().fromQuat(this.sceneNode.getAbsoluteTransform().rot)
    return result
  }

  // Returns the boundingbox of this renderitem and its children.
  getBoxRecursive() : THREE.Box3 {
    let box = new THREE.Box3()
    let hasBox = false

    this.traverse(childItem => {
      const childObject = childItem.getObject()
      if (!childObject) return true
      const childBox = new THREE.Box3().setFromObject(childObject)
      
      if (!hasBox) 
        box = childBox 
      else
        box = box.union(childBox)

      hasBox = true
      return true
    })

    if (!hasBox) {
        return new THREE.Box3()
    }

    return box
  }

  public getWorldPosition() {
    return extractPosition(this.getWorldTransform())
  }

  // Visibility methods
  public setVisible(shouldBeVisible: boolean) {
    this.visible = shouldBeVisible
    this.updateRenderObjectVisibility()
  }

  public getIsVisible(): boolean {
    return this.visible
  }

  protected updateRenderObjectVisibility() {
    if (this.renderObject) {
      this.renderObject.visible = this.visible
    }
    this.Renderer.onChildUpdate()
  }

  // Drag related methods
  onDragStart() {
    this.isDragging = true
    this.Renderer.highlightOn(this.shouldHighLightOnDrag());
  }

  onDragFinish() {
    this.isDragging = false
    this.Renderer.highlightOff();
  }

  public enableDispatchProjectionUpdates(enable: boolean) {
    this.dispatchProjectionUpdatesEnabled = enable
  }

  onChildDragStart() {
  }

  onChildDragFinish() {
  }

  // Scene manipulation methods
  addToScene() {
    this.Renderer.addToScene(this);
  }

  protected onItemLoadedAndPositioned() {
    gvCurrentScene()?.onItemLoadedAndPositioned(this.id)
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  public onRenderDimensionsChange(newSize: PointXY) {
  }

  private addChild(childItem: RenderItem3D) {
    this.children.push(childItem)
    childItem.sceneNode.reparent(this.sceneNode, gvDecorateEngine().TransformAction.PreserveRelative);
  }

  private removeChild(childItem: RenderItem3D) {
    const idx = this.children.indexOf(childItem)
    if (idx === -1) {
      return
    }
    this.children.splice(idx, 1)
    childItem.sceneNode.unparent(gvDecorateEngine().TransformAction.PreserveAbsolute);
  }

  // Recursively check if this item is an ancestor of potentialChild.
  public isAncestorOf(potentialChild: RenderItem3D): boolean {
    if (this === potentialChild) {
      return true
    }
    const parent = potentialChild.getParent()
    if (parent) {
        return this.isAncestorOf(parent)
    }
    return false
  }

  // Sets a room surface as parent
  setParentSurface(id: string) {
     this.bindToSurface = id
     this.setParent(null)
  }

  setParentBySurfaceId(parentId: string | null, draggingInHand = false): boolean {
    const parent = parentId ? getStackableSurfaceItem3D(parentId) : null

    // parentId can also refer to a room element which has no render item
    // So also set the bindToSurface
    if (parentId)
      this.bindToSurface = parentId

    return this.setParent(parent, draggingInHand)    
  }

  setParentByRenderItemId(parentId: string | null, draggingInHand = false) {
    const parent = parentId ? getRenderItem3D(parentId) : null

    // parentId can also refer to a room element which has no render item
    // So also set the bindToSurface
    if (parentId)
      this.bindToSurface = parentId
    return this.setParent(parent, draggingInHand)
  }

  setParent(parent: RenderItem3D | null, draggingInHand = false) {
    const hintStacked = parent !== null ? EXTRA_HINT_STACKABLE : undefined
    if (draggingInHand)
      this.hintExtraBindTo = EXTRA_HINT_DRAGGING_IN_HAND
    else
      this.hintExtraBindTo = hintStacked

    // Prevent potential circular parenting.
    if (parent && this.isAncestorOf(parent)) {
      this.updateParenting()
      return false
    }

    if (parent === this.parent) {
      this.updateParenting()
      return true
    }

    this.bindToSurface = parent?.id

    if (this.parent) {
      this.parent.removeChild(this)
    }
    this.parent = parent
    if (this.parent) {
      this.parent.addChild(this)
    }
    this.updateParenting()

    this.Renderer.updateOutline()

    return true
  }

  updateParenting() {
      this.Renderer.onChildUpdate()
  }

  removeFromScene() {
    this.Renderer.removeFromScene(this);
  }

  // Clean up methods
  endIsNigh() {
    if (!this.isDeleted) {
      this.isDeleted = true

      this.setParent(null)

      this.sceneGraph.remove(this.sceneNode)
      this.sceneNode.delete()

      this.Renderer.decrementLoadedItems(this.getLoadSize())
      this.removeFromScene()
      this.disposeObject()
      this.unsetObject()
    }
  }

  protected disposeObject() {
    if (!this.renderObject) {
      return
    }
    this.Renderer.furnitureManager.releaseModel(this.renderObject)
  }

  // Outline methods
  protected enableOutline(selected: boolean) {
    if (this.renderObject) {
      this.Renderer.addObjectToOutline(this.renderObject, selected);
    }
  }

  protected disableOutline() {
    if (this.renderObject) {
      this.Renderer.removeObjectFromOutline(this.renderObject);
    }
  }

  // Return the current world position projected to provided camera's screen space.
  public getScreenPosition2D(): [number, number] {
    const renderObject = this.getObject();
    if (!renderObject){
      return [0, 0];
    }
    const camera = gvCurrentCamera()
    if (!camera) {
      return [0, 0]
    }

    const worldPos = new THREE.Vector3();
    renderObject.getWorldPosition(worldPos);
    const screenPos = camera.worldToScreenFloat(new Point3(worldPos.x, worldPos.y, worldPos.z));
    if (!screenPos) {
      return [0, 0];  // If the position cannot be determined, exit early.
    }

    return [screenPos.x, screenPos.y];
  }

  public onCurrentCameraChange() {
    this.notifyScreenProjectionUpdate()
  }

  getCorners(camera?: GeomCamera): Point2D[] {
    const threeCamera = camera ? camera.getThreeCamera() : gvCurrentCamera()?.getThreeCamera()
    if (!threeCamera) {
      return []
    }

    const bbox = this.getBbox()
    workspace.vectorsArray[0].set(bbox.min.x, bbox.max.y, bbox.max.z)
    workspace.vectorsArray[1].set(bbox.min.x, bbox.min.y, bbox.max.z)
    workspace.vectorsArray[2].set(bbox.min.x, bbox.min.y, bbox.min.z)
    workspace.vectorsArray[3].set(bbox.min.x, bbox.max.y, bbox.min.z)
    workspace.vectorsArray[4].set(bbox.max.x, bbox.max.y, bbox.max.z)
    workspace.vectorsArray[5].set(bbox.max.x, bbox.min.y, bbox.max.z)
    workspace.vectorsArray[6].set(bbox.max.x, bbox.min.y, bbox.min.z)
    workspace.vectorsArray[7].set(bbox.max.x, bbox.max.y, bbox.min.z)

    const projectedBbox = new THREE.Box3()
    workspace.vectorsArray.forEach((point) => {
      if (this.renderObject) {
        point.applyMatrix4(this.renderObject.matrixWorld)
      }
      projectedBbox.expandByPoint(point.project(threeCamera))
    })

    return [
        [0.5 * (projectedBbox.min.x + 1), 1.0 - 0.5 * (projectedBbox.max.y + 1)],
        [0.5 * (projectedBbox.max.x + 1), 1.0 - 0.5 * (projectedBbox.max.y + 1)],
        [0.5 * (projectedBbox.max.x + 1), 1.0 - 0.5 * (projectedBbox.min.y + 1)],
        [0.5 * (projectedBbox.min.x + 1), 1.0 - 0.5 * (projectedBbox.min.y + 1)],
    ]
}

  protected shouldDispatchPlacementUpdate() {
    return this.dispatchProjectionUpdatesEnabled && !this.isDragging && !this.isDeleted
  }

  // Notify about the update, including the bounding box and metrics.
  protected notifyScreenProjectionUpdate() {
    if (!this.shouldDispatchPlacementUpdate()) {
      return
    }

    const updateStartTime = Date.now()

    this.dispatchItemPlacementUpdate()

    this.metrics.msReactUpdateTime += Date.now() - updateStartTime
  }

  protected getAdditionalUpdateData(): { [key: string]: unknown } {
    return {}
  }

    // Set target's drag reference point in target's local coordinates.
  setDragReferencePoint(position: Vector3): void {
    this.dragReferencePoint.set(position.dx, position.dy, position.dz)
  }

  // Get target's drag reference point projected on screen.
  getDragReferencePointOnScreen(): Point2 {
    return this.getLocalPointProjectionOnScreen(workspace.pt3.set(this.dragReferencePoint.dx,
      this.dragReferencePoint.dy, this.dragReferencePoint.dz))
  }

  getLocalPointProjectionOnScreen(localPoint: Point3Pod): Point2 {
    const ret = new Point2(0.0, 0.0)
    const camera = gvCurrentCamera()
    if (!camera) {
      return ret
    }
    const refPointWorldPos = this.localToWorld(localPoint)
    return camera.worldToScreenFloat(refPointWorldPos, ret)
  }

  // Dispatch a SceneItemUpdateNotification-ItemReady notification.
  public dispatchItemReadyUpdate() {
    const notification = {
      what: NOTIFY_SCENE_ITEM_UPDATE,
      payload: {
        itemId: this.id,
        stateInfo: `ItemReady`,
      }
    }
    // Item is loaded and ready but not yet rendered. Defer this update to next,
    // animation frame to make sure it's rendered as well.
    const renderEngine = gvViewManager()?.getRenderEngine()

    const dispatchNotification = () => {
      requestAnimationFrame(()=>{
        const updateStartTime = Date.now()
        GrandCentral.getDispatcher().dispatchNotification(notification)
        this.metrics.msReactUpdateTime += Date.now() - updateStartTime
      })
    };

    if (renderEngine) {
      renderEngine.addRenderCallback(dispatchNotification)
    } else {
      dispatchNotification()
    }
  }

  // If this item should be avoided when automatically placing new items on top of.
  public shouldBlockFloorPlacing(): boolean {
    return false
  }

  public shouldBlockWallFloorEdgePlacing(): boolean {
    return false
  }

  public worldToLocal(worldPosition: PointXYZ): PointXYZ {
    return { ...workspace.pt3
      .set(worldPosition.x, worldPosition.y, worldPosition.z)
      .mulMat4(getInverted(this.getWorldTransform())) }
  }

  public localToWorld(localPosition: PointXYZ): PointXYZ {
    return { ...workspace.pt3
      .set(localPosition.x, localPosition.y, localPosition.z)
      .mulMat4(this.getWorldTransform()) }
  }

  public localDirToWorld(localDirection: Vector3Pod): Vector3 {
    const worldRotation = this.sceneNode.getAbsoluteTransform().rot
    return (new Vector3(0, 0, 0).copy(localDirection)).applyQuaternion(worldRotation)
  }

  /**
   * Traverse all children hierarchy, including this object.
   * @param visitor function must return true to continue traversing, or false otherwise.
   */
  public traverse(visitor: (item: RenderItem3D) => boolean): void {
    const continueTraverse = visitor(this)
    if (continueTraverse) {
        const children = this.children
        for (let i = 0, l = children.length; i < l; i += 1) {
          children[i].traverse(visitor)
        }
    }
  }

  public enableDebugControls(enable: boolean) {
    // We may re-enable controls when switching scenes, just always recreate them.
    if (this.debugControls) {
      this.debugControls.dispose()
      this.debugControls = null
    }
    if (enable) {
      this.debugControls = new RenderItemDebugControls(this)
    }
  }

  public getSurfaceBoundTo(): PlaneType | null {
      if (typeof this.bindToSurface === "string" && this.bindToSurface.trim() !== "") {
          const id = Number(this.bindToSurface)
          if (Number.isFinite(id)) {
              return getSurfaceById(id) ?? null
          }
      }
      return null
  }

  public getWorldUpVector() {
    return this.getWorldDirection({ dx: 0, dy: 1, dz: 0 })
  }

  public getWorldForwardVector() {
    return this.getWorldDirection({ dx: 0, dy: 0, dz: 1 })
  }

  public getWorldDirection(localDirection: Vector3Pod): Vector3 {
    const worldRotation = this.sceneNode.getAbsoluteTransform().rot;
    return new Vector3(0, 0, 0).copy(localDirection).applyQuaternion(worldRotation)
  }
}
