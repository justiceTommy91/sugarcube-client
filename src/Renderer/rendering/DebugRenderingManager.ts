import * as THREE from 'three'

export type DebugPointOptions = {
  color?: THREE.ColorRepresentation
  radius?: number
}

export type DebugPlaneOptions = {
  colorHex?: number
  size?: number
}

// A class to be used for quickly render a point, line, etc in the scene.
// gvViewManager()?.getDebugRenderer().setPoint('test-point', x, y, z)
export class DebugRenderingManager {
  private scene: THREE.Scene | null = null
  private objects = new Map<string, THREE.Object3D>()

  public setScene(scene: THREE.Scene | null) {
    if (this.scene) {
      this.removeAll()
    }
    this.scene = scene
    this.objects.forEach(object => this.scene?.add(object))
  }

  public setPoint(name: string, x: number, y: number, z: number, options?: DebugPointOptions) {
    let object = this.objects.get(name)
    if (!object) {
      const radius = options?.radius || 0.025
      const color  = new THREE.Color(options?.color || 0xFF0000).convertLinearToSRGB()
      object = new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
      }))
      this.objects.set(name, object)
      if (this.scene) {
          this.scene.add(object)
      }
    }
    object.position.set(x, y, z)
    object.visible = true
  }

  public setArrow(name: string, x: number, y: number, z: number, dirX: number, dirY: number, dirZ: number,
    length = 1.0, color?: THREE.ColorRepresentation,
  ) {
    let object = this.objects.get(name)
    if (!object) {
      object = new THREE.ArrowHelper()
      this.objects.set(name, object)
      if (this.scene) {
          this.scene.add(object)
      }
    }
    if (object instanceof THREE.ArrowHelper) {
      object.position.set(x, y, z)
      object.setDirection(new THREE.Vector3(dirX, dirY, dirZ))
      object.setLength(length, 0.1, 0.02)
      if (color) {
        object.setColor(color)
      }
    }
    object.visible = true
  }

  public setPlane(name: string, normalx: number, normaly: number, normalz: number, d: number,
    options?: DebugPlaneOptions) {
    let object = this.objects.get(name)
    // THREE.PlanHelper doesn't have methods to easily update itself, we'll have to recreate it every time.
    if (object) {
      this.objects.delete(name)
      if (this.scene) {
          this.scene.remove(object)
      }
      (object as THREE.PlaneHelper).dispose()
    }
    const threePlane = new THREE.Plane(new THREE.Vector3(normalx, normaly, normalz), d)
    const size = options?.size || 1.0
    const color = options?.colorHex || 0xffffff
    object = new THREE.PlaneHelper(threePlane, size, color)
    this.objects.set(name, object)
    if (this.scene) {
        this.scene.add(object)
    }
  }

  public hideObject(name: string) {
    const object = this.objects.get(name)
    if (object) {
      object.visible = false
    }
  }

  public clear() {
    this.removeAll()
    this.objects.clear()
  }

  public removeAll() {
    this.objects.forEach(object => this.scene?.remove(object))
  }
}