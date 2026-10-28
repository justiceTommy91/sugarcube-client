import type { PlaneType } from 'Renderer/geomviewer/geom_types'
import type { PolygonType } from 'Renderer/assets/Types'
import type { SceneSampler } from 'Renderer/rendering/SceneSampler'
import type { GeomCamera } from 'Renderer/multiview/geom_camera'
import type { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'

export type SceneContext = Pick<
  GeomBaseScene,
  | 'toRelativeCoords'
  | 'doStackableSurfaceRaycast'
  | 'getStackableSurfaceAtPoint'
>

export type CameraContext = Pick<
  GeomCamera,
  | 'getLocation'
  | 'getUnitRayDirThruScreenPoint'
  | 'worldToScreenFloat'
  | 'getIntrinsics'
  > & {
    getThreeCamera: () => THREE.PerspectiveCamera | undefined
  }

export type SceneSamplerContext = Pick<
  SceneSampler,
  | 'sampleSurfaceClass'
  | 'rawRaycastSample'
  | 'sampleRelativePoint'
  | 'samplePlane'
  | 'sampleWalls'
  | 'rawPlaneRaycastSample'
  | 'is3DWallPointVisible'
  | 'is3DWallPointValid'
  | 'rawBboxRaycast'
>

export interface PositioningContext {
  getPlaneData(): PlaneType[]
  getPolygonData(): PolygonType[]
  getFloorPlane(): PlaneType | undefined
  getCeilingPlane(): PlaneType | null
  getSurfaceById(id: number): PlaneType | undefined
  getScene(): SceneContext | undefined
  getSceneSampler(): SceneSamplerContext | undefined
  getCamera(): CameraContext | undefined
}

let positioningContext: PositioningContext | undefined

export function gvInitPositioningContext(posContext: PositioningContext) {
  positioningContext = posContext
}

export function gvClearPositioningContext() {
  positioningContext = undefined
}

export function gvPositioningConext(): PositioningContext | undefined {
  return positioningContext
}