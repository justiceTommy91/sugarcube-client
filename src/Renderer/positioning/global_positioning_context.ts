/* eslint-disable class-methods-use-this */
import { gvCurrentCamera, gvCurrentScene } from 'Renderer/foundation/geom_app'
import type { PositioningContext } from 'Renderer/positioning/positioning_context'
import type { SceneSampler } from 'Renderer/rendering/SceneSampler'
import type { PlaneType } from 'Renderer/geomviewer/geom_types'

import { getFloorPlane, getCeilingPlane, getSurfaceById } from 'Renderer/positioning/positioning_utilities'

export class GlobalPositioningContext implements PositioningContext {
  public getPlaneData() { return gvCurrentScene()?.getPlaneData()?.planeData ?? []}
  public getPolygonData() { return gvCurrentScene()?.getPolygonData()?.plane_polygons ?? [] }
  public getScene() { return gvCurrentScene() }
  public getSceneSampler(): SceneSampler | undefined { return gvCurrentScene()?.getSceneSampler() }
  public getCamera() { return gvCurrentCamera() }
  public getFloorPlane() { return getFloorPlane() ?? undefined }
  public getCeilingPlane(): PlaneType | null { return getCeilingPlane() }
  public getSurfaceById(id: number): PlaneType | undefined { return getSurfaceById(id) }
}