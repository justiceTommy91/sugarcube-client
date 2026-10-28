/* eslint-disable class-methods-use-this */
import * as THREE from 'three'
import { RenderItem3D } from 'Renderer/model/RenderItem3D'
import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import { FLOOR_STACKABLE_SURFACE_ID, EXTRA_HINT_STACKABLE, AO_LAYER } from 'Renderer/constants'
import * as pu from 'Renderer/positioning/positioning_utilities'
import type Renderer from 'Renderer'
import type { FurnitureItemParameters, Point2D, PointXY, Matrix3x3, Point3D,
  Location3 } from 'Renderer/geomviewer/geom_types'
import { GhostItemBehavior, GhostItemBehaviorConfig } from 'Renderer/positioning/ghost_item_behavior'
import { DragResult } from 'Renderer/positioning/positioning_system'
import { getStackableSurfaceItem3D, } from 'Renderer/rendering/scene_utils'
import {
  gvCurrentScene,
  gvCurrentCamera,
  gvCurrentSettings,
  gvRenderLibrary,
  gvDecorateEngine
} from 'Renderer/foundation/geom_app'
import { RendererContextType } from 'Renderer/rendering/Enums'
import * as WallSnap from 'Renderer/WallSnap'
import { Point2, Point3 } from 'Renderer/geometry'
import { getRotationMatrixFromQuaternion } from 'Renderer/geometry/utilities'
import { setMaterialOnBeforeCompileCallback } from 'Renderer/rendering/rendering_utils'

export type GhostOnUpdateFunc = (info: { corners: number[] }) => void
export type GhostItemParameters = Pick<FurnitureItemParameters, 'id' | 'rotX' | 'scale' | 'min' | 'max'>

const workspace = {
  pt2: new Point2(0, 0),
  pt3: new Point3(0, 0, 0),
  v1: new THREE.Vector3(),
  v2: new THREE.Vector3(),
  v3: new THREE.Vector3(),
}

type WallSnapBody = {
  rot: number
  pos: number[]
  lines: number[][][]
  normals: number[]
  corners: number[][]
  mass: number
  area: number
  density: number
  i: number
  radius: number
}

class GhostItem3D extends RenderItem3D {
  private onUpdate: GhostOnUpdateFunc
  private ghostItemParameters: GhostItemParameters
  private positioningBehavior: GhostItemBehavior
  private wallSnapBody: WallSnapBody | null = null
  private wallsnapHeading = 0.0

  constructor(id: string, renderer: Renderer, onUpdate: GhostOnUpdateFunc, ghostItemParameters: GhostItemParameters) {
    const location: Location3 = {
      localPos: { x: 0, y: 0, z: 0 },
      bindTo: '',
      hintExtraBindTo: EXTRA_HINT_STACKABLE,
    }
    super(id, renderer, location)

    this.onUpdate = onUpdate
    this.ghostItemParameters = ghostItemParameters

    this.positioningBehavior = new GhostItemBehavior(this.getPositioningBehaviorConfig(), this)

    this.createRenderObject()
    this.initWallsnapBody()
    this.setVisible(false)
  }

    public setVisible(visible: boolean) {
      super.setVisible(visible)
      if (visible) {
          this.onUpdate({ corners: this.getCorners().flat() })
      }
    }

    private createRenderObject() {
        let sx = 0.5 / this.ghostItemParameters.scale
        let sy = 0.5 / this.ghostItemParameters.scale
        let sz = 0.5 / this.ghostItemParameters.scale
        if (this.ghostItemParameters.min && this.ghostItemParameters.max) {
            sx = this.ghostItemParameters.max.x - this.ghostItemParameters.min.x
            sy = this.ghostItemParameters.max.y - this.ghostItemParameters.min.y
            sz = this.ghostItemParameters.max.z - this.ghostItemParameters.min.z
        }
        const geometry = new THREE.BoxGeometry(sx, sy, sz)
        if (this.ghostItemParameters.min) {
            geometry.translate(
                this.ghostItemParameters.min.x + sx * 0.5,
                this.ghostItemParameters.min.y + sy * 0.5,
                this.ghostItemParameters.min.z + sz * 0.5,
            )
        } else {
            geometry.translate(0, 0.5 * sy, 0)
        }

        const emmisiveColor = this.Renderer.debugSettings.useFilmicLUT ? 0xFFFFFF : 0x555555
        const material = new CustomStandardMaterial({
            color: 0xFFFFFF,
            emissive: emmisiveColor,
        })

        const envMap = gvCurrentScene()?.getEnvMap()
        const envMapIntensity = gvCurrentSettings()?.debugSettings?.environmentIntensity || 0
        if (envMap) {
          material.envMap = envMap
          material.envMapIntensity = envMapIntensity
        }

        // A tweak to workaround a shader error cause ThreeJS dropped support of WGL1 on r153.
        if (gvRenderLibrary()?.getRendererContextType() === RendererContextType.WebGL1Context) {
          setMaterialOnBeforeCompileCallback(
            material,
            (shader) => {
              shader.fragmentShader = shader.fragmentShader.replace(
                `#define STANDARD`,
                `#define STANDARD
                #extension GL_OES_standard_derivatives : enable
                `
              )
            }
          )
        }

        const obj = new THREE.Mesh(geometry, material)
        obj.layers.enable(AO_LAYER)
        this.setObject(obj)
        this.addToScene()
    }

    private initWallsnapBody() {
      const floorPlane = pu.getFloorPlane()
      if (floorPlane) {
        let sx = 0.5 / this.ghostItemParameters.scale
        let sz = 0.5 / this.ghostItemParameters.scale
        if (this.ghostItemParameters.min && this.ghostItemParameters.max) {
            sx = this.ghostItemParameters.max.x - this.ghostItemParameters.min.x
            sz = this.ghostItemParameters.max.z - this.ghostItemParameters.min.z
        }
          this.wallSnapBody = WallSnap.initBody(this, sx, sz, floorPlane, this.Renderer.intrinsics)
      }
  }

    private getPositioningBehaviorConfig(): GhostItemBehaviorConfig {
      return {
        scale: this.ghostItemParameters.scale,
        localBbox: {
          min: this.ghostItemParameters.min,
          max: this.ghostItemParameters.max
        },
      }
    }

    public setGhostPosition(screenPoint: Point2D) {
      let surfaceId: string | undefined
      const surfaceIdAtPoint = pu.getStackableSurfaceAtPoint({ x: screenPoint[0], y: screenPoint[1] })
      if (surfaceIdAtPoint) {
        const surfaceAvailable = !this.Renderer.getIsSurfaceErased(surfaceIdAtPoint)
        if (surfaceAvailable) {
          surfaceId = surfaceIdAtPoint
        }
      }
      this.setParent(surfaceId ? getStackableSurfaceItem3D(surfaceId) : null)

      const result = this.setPositionFromScreenPoint({ x: screenPoint[0], y: screenPoint[1] })
      if (!result) {
        return undefined
      }

      if (!surfaceId) {
        this.bindToSurface = FLOOR_STACKABLE_SURFACE_ID
      }
      return this.bindToSurface
    }

    public override dispatchItemPlacementUpdate(): void {
    }

    public override setPositionFromScreenPoint(screenPoint: PointXY): boolean {
      return this.positioningBehavior.setTargetScreenPositionStatic([screenPoint.x, screenPoint.y])
    }

    public override dragTargetToScreenPoint(/* screenPoint: PointXY */): DragResult {
      return { success: false }
    }

    public override isGhostItem() { // eslint-disable-line class-methods-use-this
        return true
    }

    public override getItemPlacementData() {
        return undefined
    }


    // Property for wallsnap.
    public get body() {
      return this.wallSnapBody
    }

    // Property for wallsnap.
    public get position() {
      let worldPos = {x: 0, y: 0, z: 0}
      if (this.sceneNode) {
          worldPos = this.sceneNode?.getAbsoluteTransform().pos
      }
      const screenPos = gvCurrentCamera()?.worldToScreenFloat(workspace.pt3.set(
          worldPos.x,
          worldPos.y,
          worldPos.z
      ))
      return [screenPos?.x || 0, screenPos?.y || 0]
    }

  // Property for wallsnap.
  public set position(screenPoint: Point2D | undefined) {
      // noop
  }

  // Property for wallsnap.
  public get orientation() {
      return this.wallsnapHeading
  }

  // Property for wallsnap.
  public set orientation(heading: number) {
    this.wallsnapHeading = heading
  }

  // Property for wallsnap.
  public get pose() {
    const result:
    {
        pos: [number, number, number], 
        rot: [[number, number, number], [number, number, number], [number, number, number]]
    } = {pos: [0, 0, 0], rot: [[1, 0, 0], [0, 1, 0], [0, 0, 1]]}
    const transformWorld = this.sceneNode?.getAbsoluteTransform()
    if (transformWorld)
    {
        result.rot = getRotationMatrixFromQuaternion(gvDecorateEngine().fromQuat(transformWorld.rot))
        result.pos = gvDecorateEngine().fromVec3(transformWorld.pos)
    }
    return result
  }

  // Property for wallsnap.
  // This property is set by WallSnap, and it corrects the passed orientation.
  // The same is done in FurnitureItem.update, where the renderObject is additionally rotated around x axis by 90 deg.
  public set pose(pose: {
      pos: Point3D,
      rot: Matrix3x3,
  }) {
    const rotWithHeading = pu.getFloorWithHeadingRotMat(this.wallsnapHeading, pose.rot)
    this.setPosAbsolute(gvDecorateEngine().toVec3(pose.pos))
    this.setRotAbsolute(rotWithHeading)
  }
}

export default GhostItem3D
