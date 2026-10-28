import { TransformControls } from 'three/examples/jsm/controls/TransformControls'

import type { RenderItem3D } from 'Renderer/model/RenderItem3D'
import { gvCurrentCamera, gvCurrentScene, gvRenderLibrary } from 'Renderer/foundation/geom_app'
import type { GeomCamera } from 'Renderer/multiview/geom_camera'
import { upperLeft3, fromThreeMatrix4 } from 'Renderer/geometry/utilities'

export class RenderItemDebugControls {
  private targetItem: RenderItem3D
  private controls: TransformControls | null = null

  constructor(item: RenderItem3D) {
    this.targetItem = item
    this.onControlChange = this.onControlChange.bind(this)

    const geomCamera = gvCurrentCamera()
    const camera = geomCamera?.getThreeCamera()
    const renderObject = this.targetItem.getObject()
    const threeRenderer = gvRenderLibrary()?.renderer
    const scene = gvCurrentScene()?.getObjectsScene()
    if (geomCamera && camera && renderObject && threeRenderer && scene) {
      this.controls = new TransformControls(camera, threeRenderer.domElement)
      this.controls.setSize(50.0)
      this.controls.setSpace(`local`)
      this.controls.attach(renderObject)
      this.controls.addEventListener('change', this.onControlChange)
      this.setupRaycaster(geomCamera)
      scene.add(this.controls)
    }
  }

  public dispose() {
    if (!this.controls) {
      return
    }
    this.controls.detach()
    if (this.controls.parent) {
      this.controls.parent.remove(this.controls)
    }
    this.controls.dispose()
  }

  // Default Three's `setFromCamera` method doesn't work with our camera, which is setup from intrinsics,
  // this method replace controls' raycaster setup method to work correctly.
  private setupRaycaster(camera: GeomCamera) {
    if (!this.controls) {
      return
    }
    const raycaster = this.controls.getRaycaster()
    raycaster.setFromCamera = (normalizedCoords: { x: number; y: number }) => {
      const relativeCoords = {
        x: (normalizedCoords.x + 1.0) / 2.0,
        y: 1.0 - (normalizedCoords.y + 1.0) / 2.0,
      }
      const start = camera.getLocation()
      const direction = camera.getUnitRayDirThruScreenPoint(relativeCoords.x, relativeCoords.y)
      raycaster.ray.origin.set(start.x, start.y, start.z)
      raycaster.ray.direction.set(direction.dx, direction.dy, direction.dz)
    }
  }

  private onControlChange() {
    const renderObject = this.targetItem.getObject()
    if (!renderObject) {
      return
    }
    const position = renderObject.position
    const rotation = upperLeft3(fromThreeMatrix4(renderObject.matrix))

    this.targetItem.setPosAbsolute(position)
    this.targetItem.setRotAbsolute(rotation)
    
    const scene = gvCurrentScene()
    if (scene) {
      scene.setIsDirty(true)
    }
  }
}