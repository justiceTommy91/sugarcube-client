import * as THREE from 'three'

import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import { ToneMapType } from 'Renderer/geomviewer'

import { computeLocalBoundingBox } from 'Planner/room_geometry'
import type { TemplateWallElementType } from 'Planner/room_template/room_template_types'
import type { RoomScene } from 'Planner/rendering/room_scene'
import { ObjectBlink } from 'Planner/rendering/object_blink'
import { WallElementResizer } from 'Planner/resizing/wall_element_resizer'

export class WallElementObject {
  private id: string
  private rootObject: THREE.Object3D
  private scene: RoomScene
  private blink: ObjectBlink
  private resizer: WallElementResizer

  constructor(id: string, type: TemplateWallElementType, threeObject: THREE.Object3D, scene: RoomScene) {
    this.id = id
    this.scene = scene
    this.rootObject = new THREE.Group()
    this.rootObject.userData.class = type
    this.initThreeObject(threeObject)
    this.blink = new ObjectBlink(this.rootObject, this.scene)
    this.resizer = new WallElementResizer(this)
  }

  private initThreeObject(threeObject: THREE.Object3D) {
    // We don't know if wall objects in the original template have their positions in the center
    // of their bounding box, so we want to correct for that.
    threeObject.updateMatrixWorld()
    const localBbox = computeLocalBoundingBox(threeObject)
    const localCenter = localBbox.getCenter(new THREE.Vector3())
    localCenter.z = 0.0

    this.rootObject.add(threeObject)
    threeObject.position.copy(localCenter).negate()
    this.rootObject.userData = { ...threeObject.userData }
    this.rootObject.userData.wallElementId = this.id

    this.rootObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const customMaterial = new CustomStandardMaterial().copy(child.material)
        customMaterial.setToneMapType(ToneMapType.ACESFilmic)
        child.material = customMaterial
        child.receiveShadow = true
        child.castShadow = true
        child.material.shadowSide = THREE.FrontSide
      }
      child.userData.wallElementId = this.id
    })
  }

  public getRootObject() {
    return this.rootObject
  }

  public doBlink() {
    this.blink.start(0.25)
  }

  public setSize(width: number, height: number) {
    this.resizer.setSize(width, height)
  }
}