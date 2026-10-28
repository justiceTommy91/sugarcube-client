import * as THREE from 'three'

import type { RoomScene } from 'Planner/rendering/room_scene'
import Fading from 'utils/fading'

import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'

const MAX_EMISSIVE_INTENSITY = 0.75

type OriginalValues = {
  color: THREE.Color
  emissive: THREE.Color
  intensity: number
}

const BLINK_COLOR = new THREE.Color(1.0, 0.0, 0.0)

export class ObjectBlink {
  private object: THREE.Object3D
  private scene: RoomScene
  private materials: CustomStandardMaterial[] = []
  private originalValues: OriginalValues[] = [];
  private currentFading: Fading | null = null

  constructor(object: THREE.Object3D, scene: RoomScene) {
    this.object = object
    this.scene = scene
  }

  private initMaterials() {
    this.materials.length = 0
    this.originalValues.length = 0
    this.object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof CustomStandardMaterial) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach(mtl => {
          this.materials.push(mtl)
          this.originalValues.push({
            color: mtl.color,
            emissive: mtl.emissive.clone(),
            intensity: mtl.emissiveIntensity || 0
          })
        })
      }
    })
  }

  public dispose() {
    if (this.currentFading) {
      this.currentFading.stop()
      this.currentFading = null
    }
    this.materials.length = 0
    this.originalValues.length = 0
  }

  public start(timeSecs = 0.75) {
    if (this.currentFading) {
      return
    }

    this.initMaterials()
    this.materials.forEach((mtl) => {
      mtl.emissive = BLINK_COLOR
      mtl.emissiveIntensity = 0.0
    })
    const blinksCount = 2
    this.currentFading = new Fading(timeSecs, (t: number) => {
      this.materials.forEach((mtl, i) => {
        // We blink using both emissive and base color,
        // because emissive only is barely visible on white objects
        // and base color only doesn't look good on dark ones.
        const lerpT = Math.abs(Math.sin(blinksCount * t * Math.PI))
        mtl.color = new THREE.Color().lerpColors(this.originalValues[i].color, BLINK_COLOR, lerpT)
        mtl.emissiveIntensity = MAX_EMISSIVE_INTENSITY * lerpT
        this.scene.setIsDirty(true)
      })
    }, () => {
      this.materials.forEach((mtl, i) => {
        mtl.emissive = this.originalValues[i].emissive
        mtl.emissiveIntensity = this.originalValues[i].intensity
        mtl.color = this.originalValues[i].color
        this.currentFading = null
      })
    })
  }
}