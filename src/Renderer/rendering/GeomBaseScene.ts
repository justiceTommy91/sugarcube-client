import * as THREE from 'three'
import { ShadowMapViewer } from 'three/examples/jsm/utils/ShadowMapViewer'

import type {
  ColorRepresentation,
  PlaneType,
  PlaneData,
  Point2D,
  Location3,
  Placement,
} from 'Renderer/geomviewer/geom_types'
import type { FloorLines, PolygonData, PolygonType } from 'Renderer/assets/Types'
import { Point3 } from 'Renderer/geometry/Point3'
import type { SceneSampler, StackableSurfaceQueryResult } from 'Renderer/rendering/SceneSampler'
import { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import { InitialPosInfo } from 'Renderer/positioning/positioning_types'
import { RenderItem3D } from 'Renderer/model/RenderItem3D'
import FurnitureItem3D from 'Renderer/model/FurnitureItem3D'
import { PlaceableHint } from 'Renderer/PlaceableHint'
import { PositioningHelper } from 'Renderer/positioning/positioning_helper'
import { SceneSamplingVisualizer } from 'Renderer/positioning/scene_sampling_visualizer'
import type { EnvMapsSet } from 'Renderer/rendering/rendering_types'
import { getWorldForwardUnitVector } from 'Renderer/utils/posUtils'
import { isObjectInScene } from 'Renderer/rendering/rendering_utils'
import { Point2 } from 'Renderer/geometry/Point2'
import { Vector3 } from 'Renderer/geometry/Vector3'
import { computeIndirectStackablePoint } from 'utils/stackablesUX'
import {
  GHOST_ITEM_ID,
  MAX_BACK_SIDE_DISTANCE_TO_WALL_TO_HIDE,
  WALL_INTERSECTION_SHIFT
} from 'Renderer/constants'

import StackableSurfaceItem3D from "Renderer/model/StackableSurfaceItem3D"
import { PlacingBehavior } from 'Renderer/geomviewer/geom_constants'
import { gvCurrentCamera, gvGeomModel, gvDecorateEngine } from 'Renderer/foundation/geom_app'
import { type Ray } from 'Renderer/positioning/positioning_types'
import * as pu from 'Renderer/positioning/positioning_utilities'
import GhostItem3D from 'Renderer/model/GhostItem3D'
import { getBoundingCorners } from 'Renderer/utils/modelUtils'
import {
  isFurnitureItem3D,
  isArtItem3D,
  getParentAttachmentPolygon,
  shouldShowProductDimensions
} from 'Renderer/rendering/scene_utils'
import { extractQuaternionFromMat3 } from 'Renderer/geometry/utilities'
import { FloorPlacer } from "Renderer/FloorPlacer"
import EnvMapViewer from 'Renderer/utils/envmap_viewer'
import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import DirectionalLightCookie from 'Renderer/DirectionalLightCookie'
import { RoomDimensions } from 'Renderer/rendering/RoomDimensions'
import { SceneGraph } from '@geomagical/sugarcube-rendering-shared'
import { transformPolygonVerticesToWorldSpace } from 'Renderer/geometry/PolygonUtils'
import { DynamicMeasurements } from './DynamicMeasurements'

// Potential data problem. Correct ceiing normal must me looking downwards and distance must be positive.
function orientCeilingPlaneToRoomCenter(ceilingPlane: PlaneType) {
  const isNormalLookingUp = ceilingPlane.rot[2][1] > 0
  if (isNormalLookingUp) {
    ceilingPlane.rot[2][0] *= (-1)
    ceilingPlane.rot[2][1] *= (-1)
    ceilingPlane.rot[2][2] *= (-1)
  }

  if (ceilingPlane.d < 0) {
    ceilingPlane.d = Math.abs(ceilingPlane.d)
  } 
}

// Potential data problem. Polygon transformation must leave the polygon looking downwards. 
function orientCeilingPolygonToRoomCenter(ceilingPol: PolygonType) {
  const t = ceilingPol.transform
  const transformationMat = new THREE.Matrix4().set(
    t[0][0], t[0][1], t[0][2], t[0][3],
    t[1][0], t[1][1], t[1][2], t[1][3],
    t[2][0], t[2][1], t[2][2], t[2][3],
    t[3][0], t[3][1], t[3][2], t[3][3] 
  )

  // The basis vectors from a transformation matrix are the orientation of the transformed local coordinate system.
  // The transformation forward (z) is the direction the polygon will look when transformed, so the polygon normal.
  const polygonNormal = getWorldForwardUnitVector(transformationMat)
  const isNormalLookingUp = polygonNormal[1] > 0
  
  if (isNormalLookingUp) {
    // Flip transformation forward 180º. This flips polygon normal 180º when transformed.
    ceilingPol.transform[2][0] *= (-1)
    ceilingPol.transform[2][1] *= (-1)
    ceilingPol.transform[2][2] *= (-1)
  }
}

const workspace = {
  pt2: new Point2(0, 0),
  pt3: new Point3(0, 0, 0),
}

export type InitialPositionType = 'wall' | 'floor' | 'wall-floor-edge'

export abstract class GeomBaseScene {
  protected width = 0
  protected height = 0
  protected invWidth = 0.0
  protected invHeight = 0.0

  protected isDirty = false
  protected renderItems: Map<string, RenderItem3D> = new Map()
  protected stackableSurfaces: Map<string, StackableSurfaceItem3D> = new Map()
  protected hasWallAnchored = false
  protected hasArtItems = false
  protected hasRugs = false
  protected hasStaticStackableSurfaces = false
  protected shouldUseFrontSideShadows = true

  protected sceneSampler: SceneSampler

  protected floorLines: FloorLines | null = null
  protected placeableHint: PlaceableHint | null = null
  protected positioningHelper: PositioningHelper | null = null
  protected sceneSamplingVisualizer: SceneSamplingVisualizer | null = null

  protected envMapsSet: EnvMapsSet | null = null
  protected shouldUseAlternateEnvmap = false
  protected useRoomBuilderEnvMap = true
  protected envMapViewer: EnvMapViewer | null = null

  // THREE.Textures owned by this scene
  protected textures: THREE.Texture[] = []

  protected directionalLights: THREE.DirectionalLight[] = []
  protected pointLights: THREE.PointLight[] = []
  protected spotLights: THREE.SpotLight[] = []
  protected areaLights: THREE.RectAreaLight[] = []
  protected lightHelperObjects: THREE.Object3D[] = []
  protected directionalLightCookie: DirectionalLightCookie | null = null

  protected shadowMapDebugObj: ShadowMapViewer | null = null
  
  protected legacyPlaneData: PlaneData | null = null
  protected planeData: PlaneData | null = null
  protected polygonData: PolygonData | null = null
  protected sceneBoundingBox: THREE.Box3 | null = null

  protected loadedDataSizeBytes = 0.0

  protected blockingItemsRaycastCheck = false
  protected blockingItemsRaycastDistance = 2.0
  protected blockingItemsWallFacingCheck = false
  protected blockingItemsWallFacingCheckInDollhouse = false

  protected floorPlacer: FloorPlacer | null = null

  protected roomDimensions: RoomDimensions | null = null
  protected dynamicMeasurements: DynamicMeasurements | null = null

  // A transient Point2 instance to be used wherever a temporary point2 is needed.
  protected transientPoint2 = new Point2(0, 0)

  protected sceneGraph: SceneGraph | null = null
  protected screenshotVisibilityCache = new Map<THREE.Object3D, boolean>()

  constructor() {
    this.sceneSampler = this.createSceneSampler()

    this.getStackableSurfaceItem = this.getStackableSurfaceItem.bind(this)
  }

  public getOrInitSceneGraph(): SceneGraph {
    if (!this.sceneGraph) {
      const m = gvDecorateEngine()
      this.sceneGraph = new m.SceneGraph();
    }
    return this.sceneGraph;
  }

  public changeLoadedDataSizeBytes(deltaBytes: number) {
    this.loadedDataSizeBytes += deltaBytes
  }

  public getLoadedDataSizeBytes() {
    return this.loadedDataSizeBytes
  }

  public setDimensions(width: number, height: number) {
    this.width = width
    this.height = height
    this.invWidth = 1.0 / this.width
    this.invHeight = 1.0 / this.height
  }

  public getDimensions(): [number, number] {
    return [this.width, this.height]
  }

  public setFloorLines(floorLines: FloorLines, wallShift: number) {
    this.floorLines = floorLines

    this.roomDimensions = new RoomDimensions(this.floorLines, wallShift, this.hasWallThickness())
    this.roomDimensions.setEnabled(!!gvGeomModel()?.retrieveRoomDimensionsEnabled())

    this.dynamicMeasurements = new DynamicMeasurements()
    this.dynamicMeasurements.setEnabled(!!gvGeomModel()?.retrieveDynamicMeasurementsEnabled())

    const scene = this.getObjectsScene()
    if (scene) {
      scene.add(this.roomDimensions.getRootObject())
      scene.add(this.dynamicMeasurements.getRootObject())
    }
  }

  // eslint-disable-next-line class-methods-use-this
  protected hasWallThickness() {
    return false
  }

  public getFloorLines(): FloorLines | null {
    return this.floorLines
  }

  public getVisualRoomDimensions() {
    return this.roomDimensions
  }

  public getDynamicMeasurements() {
    return this.dynamicMeasurements
  }

    // renderObject might be already in the scene if it's attached to a parent.
  public addRenderItem(renderItem: RenderItem3D): void { 
    const renderObject = renderItem.getObject()
    if (renderObject) {
      this.ensureIsInScene(renderObject)
    }

    if (!renderItem.isStackableSurfaceItem() || !renderItem.getParent())
      this.addToRenderItems(renderItem)
    this.updateHasWallAnchored()
    this.updateHasArtItems()
    this.updateHasRugs()
    if (isFurnitureItem3D(renderItem) || isArtItem3D(renderItem)) {
      const shouldEnable = !!gvGeomModel()?.retrieveProductDimensionsEnabled() &&
        shouldShowProductDimensions(renderItem)
      renderItem.getProductDimensions().setEnabled(shouldEnable)
    }
  }

  private addToRenderItems(renderItem: RenderItem3D) {
    this.renderItems.set(String(renderItem.getId()), renderItem)
  }

  public addTexture(texture: THREE.Texture) {
    this.textures.push(texture)
  }

  public updateHasWallAnchored() {
    const renderItems = [...this.renderItems.values()]
    this.hasWallAnchored = renderItems.some((el) => isFurnitureItem3D(el) && el.isBoundToWall())
  }

  public updateHasArtItems() {
    const renderItems = [...this.renderItems.values()]
    this.hasArtItems = renderItems.some((el) => el.isArtItem())
  }

  public updateHasRugs() {
    const renderItems = [...this.renderItems.values()]
    this.hasRugs = renderItems.some((el) => isFurnitureItem3D(el) && el.getIsRug())
  }

  public addStackableSurfaceItem (stackableSurfaceItem: StackableSurfaceItem3D): void {
    if (!stackableSurfaceItem) {
        return
    }
    const renderObject = stackableSurfaceItem.getObject()
    if (!renderObject?.userData.stackablePlaneId) {
      return
    }

    // There are two types of stackable surfaces: 1 .- ones that are parts of moving furniture, have parent objects
    // and move with them and 2.- ones that exist in the room itself, those are called "static" surfaces.
    if (!stackableSurfaceItem.getParent()) {
      this.hasStaticStackableSurfaces = true
      this.addRenderItem(stackableSurfaceItem)
    }

    const stringId = String(renderObject.userData.stackablePlaneId)
    this.stackableSurfaces.set(stringId, stackableSurfaceItem)
  }

  public removeStackableSurfaceItem(stackableSurfaceItem: StackableSurfaceItem3D) {
    this.stackableSurfaces.delete(stackableSurfaceItem.getId())
  }

  public updateItemModel (itemId: string, model: THREE.Object3D): void {
    const renderItem = this.renderItems.get(itemId)
    if (!renderItem) {
      return
    }
    renderItem.setObject(model)
  }

  public ensureIsInScene (renderObject: THREE.Object3D): void {
    const objectsScene = this.getObjectsScene()
    if (!objectsScene) {
      return
    }
    if (!isObjectInScene(renderObject, objectsScene)) {
      objectsScene.add(renderObject)
    }
  }

  public deleteRenderItem (itemOrId: string | RenderItem3D): void {
    const renderItem = typeof(itemOrId) === 'string' ? this.renderItems.get(itemOrId) : itemOrId
    
    if (!renderItem) {
      return
    }
    const objectsScene = this.getObjectsScene()
    if (objectsScene) {
      const renderObject = renderItem.getObject()
      if (renderObject) {
        objectsScene.remove(renderObject)
      }
    }
    if (renderItem.isStackableSurfaceItem())
      this.stackableSurfaces.delete(renderItem.getId())
    else 
      this.renderItems.delete(renderItem.getId())

    this.updateHasWallAnchored()
    this.updateHasArtItems()
    this.updateHasRugs()

    if (this.dynamicMeasurements && this.dynamicMeasurements.getTrackedItem() === renderItem) {
      this.dynamicMeasurements.setTrackingItem(null)
    }
  }

  public extractStackableSurfaces (): Map<string, StackableSurfaceItem3D> { 
    const result = new Map(this.stackableSurfaces)
    this.stackableSurfaces.clear()
    return result
  }

  public extractRenderItems (): RenderItem3D[] { 
    const objectsScene = this.getObjectsScene()
    if (!objectsScene) {
      return []
    }
    const renderItems = Array.from(this.renderItems.values())
    this.renderItems.clear()
    renderItems.forEach(renderItem => {
      const renderObject = renderItem.getObject()
      if (renderObject) {
        objectsScene.remove(renderObject)
      }
    })

    this.updateHasWallAnchored()
    this.updateHasArtItems()
    this.updateHasRugs()

    return renderItems
  }

  public setEnvMapsSet(envMapsSet: EnvMapsSet) {
    this.envMapsSet = {
      ...envMapsSet
    }

    const envMap = this.getEnvMap()
    this.getObjectsScene()?.traverse((child) => {
      if (child instanceof THREE.Mesh
        && child.material
        && (child.material instanceof THREE.MeshStandardMaterial
          || child.material instanceof CustomStandardMaterial)
      ) {
        child.material.envMap = envMap
      }
    })
    this.envMapViewer?.setEnvMap(envMap)

    this.setIsDirty(true)
  }

  public switchEnvMap(shouldUseAlternateEnvmap: boolean, useRoomBuilderEnvMap: boolean) {
    this.shouldUseAlternateEnvmap = shouldUseAlternateEnvmap
    this.useRoomBuilderEnvMap = useRoomBuilderEnvMap
    const envMap = this.getEnvMap()
    this.getObjectsScene()?.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material && child.material.envMap) {
          child.material.envMap = envMap
        }
    })
    this.envMapViewer?.setEnvMap(envMap)
  }

  public getEnvMap() {
    let result = null
    if (this.envMapsSet?.roomHasRenderedEquirectangular && this.useRoomBuilderEnvMap) {
      result = this.envMapsSet?.generatedDefault
    }
    else if (this.envMapsSet?.roomHasEquirectangular) {
      result = this.envMapsSet?.loadedDefault
    } else {
      result = (this.shouldUseAlternateEnvmap
        ? this.envMapsSet?.loadedDefault 
        : this.envMapsSet?.clamShell) || null
    }
    return result
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  /* eslint-disable no-unused-vars */
  public insertRenderItems(renderItems: RenderItem3D[], hideViewBlockingItems: boolean): void { 
    renderItems.forEach((renderItem) => {
      this.addToRenderItems(renderItem)
      const renderObject = renderItem.getObject()
      if (!renderObject) {
        return
      }
      // Add the root items only to the scene graph to avoid altering
      // the child-parent relationships if any (eg. for stackables).
      if (!renderObject.parent) {
        this.getObjectsScene()?.add(renderObject)
      }
      // Replace any existing envMap, skipping items that don't
      // use envMaps (eg. ArtItems).
      renderObject.traverse((node) => {
        const mesh = node as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
        if (mesh.isMesh && mesh.material) {
          if (mesh.material.envMap) {
            mesh.material.envMap = this.getEnvMap()
          }
          mesh.material.shadowSide = this.shouldUseFrontSideShadows ? THREE.FrontSide : null
        }
      })
    })

    this.updateHasWallAnchored()
    this.updateHasArtItems()
    this.updateHasRugs()
  }

  public insertStackableSurfaces (stackableSurfaces: Map<string, StackableSurfaceItem3D>): void {
    stackableSurfaces.forEach((value, key) => {
      this.stackableSurfaces.set(key, value);
    });
  }

  public refreshStackableStaticProperties(): void {
    if (this.stackableSurfaces) {
        this.stackableSurfaces.forEach((surface) => {
            surface.refreshStaticProperties()
        })
    }
  }

  public dispose (): void {
    this.onDeactivate()

    this.renderItems.forEach((item) => {
      gvGeomModel()?.deleteSceneItem(item)
    })

    this.stackableSurfaces.forEach((item) => {
      gvGeomModel()?.deleteSceneItem(item)
    })

    if (this.placeableHint) {
      this.placeableHint.cleanup()
    }

    if (this.positioningHelper) {
      this.positioningHelper.dispose()
    }

    this.directionalLights.forEach(light => { light.dispose() })
    this.pointLights.forEach(light => { light.dispose() })
    this.spotLights.forEach(light => { light.dispose() })
    this.areaLights.forEach(light => { light.dispose() })
    this.textures.forEach(texture => { texture.dispose() })

    if (this.envMapsSet) {
      this.envMapsSet.loadedDefault?.dispose()
      this.envMapsSet.generatedDefault?.dispose()
      this.envMapsSet.clamShell?.dispose()
    }

    this.envMapViewer?.dispose()

    if (this.roomDimensions) {
      this.roomDimensions.dispose()
    }

    if (this.dynamicMeasurements) {
      this.dynamicMeasurements.dispose()
    }

    this.renderItems.clear()
    this.stackableSurfaces.clear()

    this.floorLines = null
    this.placeableHint = null
    this.positioningHelper = null
    this.sceneSamplingVisualizer = null
    this.envMapsSet = null
    this.envMapViewer = null
    this.textures = []
    this.directionalLights = []
    this.pointLights = []
    this.spotLights = []
    this.areaLights = []
    this.lightHelperObjects = []
    this.legacyPlaneData = null
    this.planeData = null
    this.polygonData = null
    this.sceneBoundingBox = null
    this.floorPlacer = null
    this.roomDimensions = null
    this.sceneGraph = null;
  }

  public getRenderItem (id: string): RenderItem3D | undefined { 
    return this.renderItems.get(id)
  }

  public getRenderItemByColorId(colorId: number) {
    return [...this.renderItems.values()]
      .find(renderItem => renderItem.colorId === colorId)
  }

  public getStackableSurfaceItem (id: string): StackableSurfaceItem3D | undefined { 
    return this.stackableSurfaces.get(id)
  }

  public getStackableSurfacesForRenderItem (itemOrId: string | RenderItem3D): StackableSurfaceItem3D[] {
    const renderItem = typeof(itemOrId) === 'string' ? this.renderItems.get(itemOrId) : itemOrId

    if (!renderItem) {
      return []
    }

    const result: StackableSurfaceItem3D[] = []
    renderItem.getChildren().forEach(child => {
      if (child instanceof StackableSurfaceItem3D) {
        result.push(child as StackableSurfaceItem3D)
      }
    })
    return result;
  }

  // Return all the furniture items that are stacked on the item with ID parentID,
  // or an empty list if parentId has no stacked children.
  // Look for items that are stacked on a plane.
  // From the plane the item is stacked on, find the surface and then the
  // from the surface find the parent furniture item. If that parent has the
  // same ID as parentId, we found an item of interest.
  public getStackedItemsForParent(parentId: string): (FurnitureItem3D)[] { 
    const stackedItems: (FurnitureItem3D)[] = []
    this.renderItems.forEach((item: RenderItem3D) => {
      let surfaceId = null
      if (!item.isFurnitureItem()) {
        return
      }
      const furnitureItem = item as FurnitureItem3D
      surfaceId = furnitureItem.getParent()?.getId()
      const surface = this.getStackableSurfaceItem(String(surfaceId))
      const surfaceParentId = surface?.getParentId()
      if (surfaceParentId === parentId && this.getRenderItem(surfaceParentId)) {
        stackedItems.push(furnitureItem)
      }
    })
    return stackedItems
  }

  // Given a list of stackable-surfaces IDs, return a map of the furniture items stacked
  // on these surfaces keyed by the surface IDs.
  public getStackedItemsForSurfaces(surfaceIds: string[]): 
    Map<string, (FurnitureItem3D)[]> | undefined {
    if (surfaceIds.length > 0) {
      const items = new Map<string, FurnitureItem3D[]>();
      surfaceIds.forEach(id => { items.set(id, []) });

      this.renderItems.forEach((item: RenderItem3D) => {
        if (!item.isFurnitureItem()) {
          return
        }
        const furnitureItem = item as FurnitureItem3D
        const parentSurfaceId = furnitureItem.getParentId()
        if (parentSurfaceId) {
          items.get(parentSurfaceId)?.push(furnitureItem)
        }
      })
      return items
    }
    return undefined
  }

  public getStaticSurfacePlaneIDsAtPoint(relX: number, relY: number): string[] {
    return this.sceneSampler.getStaticSurfacePlaneIDsAtPoint(this.transientPoint2.set(relX, relY))
  }

  public getStackableSurfaceAtPoint(relX: number, relY: number,
    filterIds: string[] = [], mouseBelowSurfInteract = true): StackableSurfaceQueryResult | null {
    let ret: StackableSurfaceQueryResult | null = null

    // eslint-disable-next-line no-param-reassign
    let usefilterIds: string[] | null = filterIds.map(id => String(id))
    if (usefilterIds.length === 0) {
      usefilterIds = null
    }
    const intersect = this.sceneSampler.getRenderObjectAtPoint(this.transientPoint2.set(relX, relY), usefilterIds)

    const stackablePlaneId: string | undefined = intersect?.objHit?.userData?.stackablePlaneId
    if (stackablePlaneId) {
        const surface = this.getStackableSurfaceItem(stackablePlaneId)

        if (!surface?.getWantsIndirectMouseInteraction()) {
          ret = {
            stackablePlaneId,
            worldPoint: intersect.point,
            directHit: true,
            parentPoint: null,
            localPoint: null,
          }
        } else {
          const numRet = computeIndirectStackablePoint(relX, relY, [parseInt(stackablePlaneId, 10)],
            mouseBelowSurfInteract)
          if (numRet) {
            ret = {
              ...numRet,
              parentPoint: numRet.parentPoint || null,
              localPoint: numRet.localPoint || null,
              stackablePlaneId: String(numRet.stackablePlaneId)
            }
          }
        }
    } else {
      const numRet = computeIndirectStackablePoint(relX, relY, 
        usefilterIds ? usefilterIds.map(id => parseInt(id, 10)) : [], mouseBelowSurfInteract)
      if (numRet) {
        ret = {
          ...numRet,
          parentPoint: numRet.parentPoint || null,
          localPoint: numRet.localPoint || null,
          stackablePlaneId: String(numRet.stackablePlaneId)
        }
      }
    }

    if (usefilterIds !== null && ret && !usefilterIds.includes(ret.stackablePlaneId)) {
      return null
    }

    if (ret) {
        const surface = this.getStackableSurfaceItem(ret.stackablePlaneId)
        if (surface?.isErased()) {
          return null
        }
        if (!surface?.getWantsIndirectMouseInteraction() && !ret.directHit) {
          return null
        }
        if (surface) {
          const surfaceObject = surface.getObject()
          if (surfaceObject && ret.worldPoint) {
            ret.localPoint = surfaceObject.worldToLocal(ret.worldPoint.clone())
          }
          const surfaceParentId = surface.getParentId()
          if (surfaceParentId) {
            const parentItem = this.getRenderItem(surfaceParentId)
            const parentObject = parentItem?.getObject()
            if (parentObject && ret.worldPoint) {
              ret.parentPoint = parentObject.worldToLocal(ret.worldPoint.clone())
            }
          } else {
            ret.parentPoint = null
          }
        } else {
            ret.parentPoint = null
        }
    }

    return ret
  }
  


  // Return a list of RenderItem instances, that are currently in the scene (FurnitureItem, ArtItem, etc.).
  public getRenderItems (): IterableIterator<RenderItem3D> {
    return this.renderItems.values()
  }

  // Return all THREE.Object3D's that are currently in the scene, including render items,
  // static surfaces, helper objects, etc.
  public getRenderObjects (): THREE.Object3D[] { 
    return this.getObjectsScene()?.children || []
  }

  public getRenderItemIDAtPoint (relX: number, relY: number): string | null {
    return this.sceneSampler.getRenderItemIdAtPoint(this.transientPoint2.set(relX, relY))
  }

  public getObjectIdAtPointUsingBbox (
    relX: number,
    relY: number,
    findNearest: boolean,
    filterFn?: (itemId: string) => boolean
  ): string | null { 
    return this.sceneSampler.getObjectIdAtPointUsingBbox(this.transientPoint2.set(relX, relY), findNearest, filterFn)
  }

  public abstract findPlaceableFloorPos () : InitialPosInfo | null 
  
  public getRoomDefaultFloorPos(): Point3 | undefined {
    const roomDefaultpos2 = this.floorPlacer?.getRoomDefaultFloorPos()
    return roomDefaultpos2 && this.sceneSampler.sampleFloor(roomDefaultpos2)?.position 
  }

  public findPlaceablePos(positionType: InitialPositionType) {
    switch(positionType) {
      case 'wall':
        return this.findPlaceableWallPos()
        break
      case 'wall-floor-edge':
        return this.findPlaceableWallFloorEdgePosition()
      default:
        return this.findPlaceableFloorPos()
    }
  }

  protected findPlaceableWallPos() {
    const [width, height] = this.getDimensions()
    const positions = this.findPlaceableWallPositions()

    const poss = positions.positions2D
    const poss3 = positions.positions3D
    if (positions) {
      let id = null
      for (let count = 0; count < poss.length; count += 1) {
        const position2D = poss[count]
        const position3D = poss3[count]
        const stringId = this.getObjectIdAtPointUsingBbox(position2D[0], position2D[1], true)
        id = stringId ? parseInt(stringId, 10) : null
        if (id === null) {
          const positionObject = { 
            pos2D: [position2D[0] * width, position2D[1] * height],
            pos3D: position3D
          }
          return positionObject
        }
      }
    }
    return null
  }

  protected findPlaceableWallFloorEdgePosition() {
    const wallPositions = this.findPlaceableWallPositions()
    if (!wallPositions) {
      return null
    }

    const [width, height] = this.getDimensions()
    const isBlockingPlacing = (itemId: string) => {
      const item = this.getRenderItem(itemId)
      return item?.shouldBlockWallFloorEdgePlacing() ?? false
    }
    let foundPostionObject = null
    for (let i = 0; i < wallPositions.positions3D.length; i += 1 ) {
      const loc3 = wallPositions.positions3D[i]
      const surface = pu.getSurfaceById(Number(loc3.bindTo))
      if (surface) {
        loc3.localPos = pu.projectWallPosOnFloor(loc3.localPos, surface).position
        const panoPt2 = gvCurrentCamera()?.worldToScreenInt(
          workspace.pt3.set(loc3.localPos.x, loc3.localPos.y, loc3.localPos.z)
        )
        if (panoPt2) {
          const [relX, relY] = this.toRelativeCoords(panoPt2.x, panoPt2.y)
          const id = this.getObjectIdAtPointUsingBbox(relX, relY, false, isBlockingPlacing)
          if (id === null) {
            foundPostionObject = { 
              pos2D: [relX * width, relY * height],
              pos3D: loc3
            }
            break
          }
        }
      }
    }
  
    return foundPostionObject
  }

  protected findPlaceableWallPositions() {
    const positions2D: number[][] = []
    const positions3D: Location3[] = []

    const point = workspace.pt2

    // Constants below from the original findPlaceableWallPositions from WallSpiceWgl,
    // converted to relative coordinates.
    // Search start point vertical offset from screen center.
    const startYOffset = -0.05
    // Horizontal and vertical boundaries to prevent returning positions which are too close to screen edges.
    const xBoundary = 0.05
    const yBoundary = 0.1
    // Horizontal and vertical position search steps.
    const xStep = 0.05
    const yStep = 0.06667

    const midX = 0.5
    const midY = 0.5
    const startY = midY + startYOffset
    for (let y = startY; y < 1.0 - yBoundary && y > yBoundary; ) {
      for (let x = midX; x < 1.0 - xBoundary && x > xBoundary;) {
        const surfaceClassOffset = this.sceneSampler.sampleSurfaceClass(point.set(x, y + yStep))
        const sampledResult = this.sceneSampler.sampleRelativePoint(point.set(x, y))
        const surfaceClass = sampledResult?.plane.class

        if (sampledResult && surfaceClass === 'wall' && surfaceClassOffset === 'wall') {
          positions2D.push([x, y])

          const point3: Location3 = {
            bindTo: `${sampledResult?.plane.id}`,
            localPos: {
              x:sampledResult ? sampledResult.position.x : 0,
              y:sampledResult ? sampledResult.position.y : 0,
              z:sampledResult ? sampledResult.position.z : 0
            }
          }

          positions3D.push(point3)
        }
        x = midX - (x - midX)
        if (x >= midX) {
          x += xStep
        }
      }
      y = startY - (y - startY)
      if (y <= startY) {
        y -= yStep
      }
    }

    return {
      positions2D,
      positions3D,
    }
  }

  public static repositionFloorToWall(placement: Placement) {
    const itemBackDir = placement.rotation ?
      new Vector3(0, 0, -1).applyQuaternion({
        x: placement.rotation[0],
        y: placement.rotation[1],
        z: placement.rotation[2],
        w: placement.rotation[3],
      }) : new Vector3(0, 0, 1)
    const result = pu.castRayToNearestWallPlane({
      origin: placement.location3.localPos,
      dir: itemBackDir,
    }, true, true)
    return result ?? undefined
  }

  public static repositionWallToFloor(placement: Placement, wall: PlaneType | null | undefined) {
    if (!wall) {
      return undefined
    }
    const result = pu.projectWallPosOnFloor(placement.location3.localPos, wall)
    return result.position
  }

  public doItemRaycast (relX: number, relY: number, item: RenderItem3D): Point3 | null { 
    return this.sceneSampler.doItemRaycast(this.transientPoint2.set(relX, relY), item)
  }

  public doStackableSurfaceRaycast(relX: number, relY: number, surfaceId: string): Point3 | null {
    let position: Point3 | null = null
    const surface = this.getStackableSurfaceItem(surfaceId)
    if (surface) {
      position = this.doItemRaycast(relX, relY, surface)
    }
    return position
  }

  public getAllStackableSurfaces() {
    return this.stackableSurfaces
  }

  public getStaticStackableSurfaces() {
    return Array.from(this.stackableSurfaces.values()).filter(surf => !surf.getParent());
  }

  public getVisibleStackableSurfaces() {
    const surfaces: THREE.Mesh[] = []
    const objectsScene = this.getObjectsScene()
    if (objectsScene) {
        objectsScene.traverseVisible((obj) => {
            if (obj instanceof THREE.Mesh && obj.userData.isStackableSurface) {
                surfaces.push(obj)
            }
        })
    }
    return surfaces
  }

  public getHasWallAnchored() {
    return this.hasWallAnchored
  }

  public getHasStaticStackableSurfaces() {
    return this.hasStaticStackableSurfaces
  }

  public getHasRugs() {
    return this.hasRugs
  }

  public setLights(directional: THREE.DirectionalLight[], point: THREE.PointLight[], spot: THREE.SpotLight[],
    area: THREE.RectAreaLight[]) {
    const scene = this.getObjectsScene()
    this.directionalLights.forEach((light) => { scene?.remove(light, light.target) })
    this.pointLights.forEach((light) => { scene?.remove(light) })
    this.spotLights.forEach((light) => { scene?.remove(light, light.target) })
    this.areaLights.forEach((light) => { scene?.remove(light) })
    this.directionalLights.length = 0
    this.pointLights.length = 0
    this.spotLights.length = 0
    this.areaLights.length = 0

    directional.forEach((light) => {
      scene?.add(light, light.target)
      this.directionalLights.push(light)
    })
    point.forEach((light) => {
      scene?.add(light)
      this.pointLights.push(light)
    })
    spot.forEach((light) => {
      scene?.add(light, light.target)
      this.spotLights.push(light)
    })
    area.forEach((light) => {
      scene?.add(light)
      this.areaLights.push(light)
    })
  }

  public setLightHelperObjects(objects: THREE.Object3D[]) {
    this.lightHelperObjects.forEach((obj) => {
      this.getObjectsScene()?.remove(obj)
    })
    this.lightHelperObjects.length = 0
    objects.forEach((obj) => {
      this.getObjectsScene()?.add(obj)
      this.lightHelperObjects.push(obj)
    })
  }

  public setLightHelpersVisible(onoff: boolean) {
    this.lightHelperObjects.forEach((obj) => {
      obj.visible = onoff
    })
  }

  public setShadowMapDebugObj(object: ShadowMapViewer) {
    this.shadowMapDebugObj = object
  }

  public getShadowMapDebugObj() {
    return this.shadowMapDebugObj
  }

  public setEnvMapViewer(envMapViewer: EnvMapViewer) {
    this.envMapViewer?.dispose()
    this.envMapViewer = envMapViewer
  }

  public getEnvMapViewer() {
    return this.envMapViewer
  }

  public switchEnvMapVisualizationFormat(onoff: boolean) {
    this.envMapViewer?.setShowAsEquirectangular(onoff)
  }

  public setEnvironmentBackgroundVisible(onoff: boolean) {
    const scene = this.getObjectsScene()
    if (!scene) {
      return
    }

    if (!onoff) {
      scene.background = null
      return
    }

    const envMap = this.getEnvMap()
    if (envMap) {
      scene.background = envMap
    }
  }

  public setDirectionalLightCookie(cookie: DirectionalLightCookie) {
    if (this.directionalLightCookie) {
      this.directionalLightCookie.dispose()
    }
    this.directionalLightCookie = cookie
  }

  public getDirectionalLightCookie() {
    return this.directionalLightCookie
  }


  public abstract setLightsIntensities(
    directionalLightIntensities: number[],
    pointLightIntensities: number[],
    spotLightIntensities: number[],
    areaLightIntensities: number[],
    usingPBR: boolean,
  ): void

  public floorRotation() {
    const floorPlane = this.planeData?.planeData.find(p => p.class === "floor")
    if (floorPlane) {
      const quat = extractQuaternionFromMat3(floorPlane.rot)
      const q = new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3])
      const euler = new THREE.Euler().setFromQuaternion(q, "ZYX")
      return euler.z
    }
    return 0
  }

  public setPlaneData(planeData: PlaneData) {
    this.planeData = planeData
    const ceilingPlane = this.planeData.planeData.find(p => p.class === "ceiling")
    if (ceilingPlane) {
      orientCeilingPlaneToRoomCenter(ceilingPlane)
    }
    this.placeableHint = new PlaceableHint(this)
    const renderObject = this.placeableHint.getVisualObject()
    if (renderObject) {
      this.getObjectsScene()?.add(renderObject)
    }
  }

  public getPlaneData(): PlaneData | null { 
    return this.planeData
  }

  public setLegacyPlaneData(planeData: PlaneData) {
    this.legacyPlaneData = planeData
  }

  public getLegacyPlaneData(): PlaneData | null {
    return this.legacyPlaneData
  }

  public setPolygonData(polygonData: PolygonData) {
    this.polygonData = polygonData
    const ceilingPol = this.polygonData.plane_polygons.find(p => p.class === "ceiling")
    if (ceilingPol) {
      orientCeilingPolygonToRoomCenter(ceilingPol)
    }
    // Pre-transform vertices of polygons to world space to avoid doing this every time we test intersections with them.
    if (this.polygonData) {
      this.polygonData.plane_polygons.forEach((poly) => {
        poly.parameters.transformedVertices = transformPolygonVerticesToWorldSpace(poly)
      })
    }

    // Use the transformed vertices to fill a bounding box around the polygons
    const pointCloudWorld = polygonData.plane_polygons.reduce((acc, { parameters: { transformedVertices } }) => 
      [...acc, ...transformedVertices?.map(point => new THREE.Vector3(point.x, point.y, point.z)) || []]
    , [] as Array<THREE.Vector3>)
    this.sceneBoundingBox = new THREE.Box3().setFromPoints(pointCloudWorld)
  }

  public getPolygonData(): PolygonData | null {
    return this.polygonData
  }

  public getSceneBoundingBox(): THREE.Box3 | null {
    return this.sceneBoundingBox
  }

  public getSceneCenter() {
    return this.sceneBoundingBox?.getCenter(new THREE.Vector3())
  }

  public getSceneSize() {
    return this.sceneBoundingBox?.getSize(new THREE.Vector3())
  }

  public abstract setWallColor(color: ColorRepresentation | undefined | null): void

  // Convert a 2D point from pano (pixel) to relative screen coordinates and return the result.
  public toRelativeCoords(pixelsX: number, pixelsY: number) {
    return [pixelsX * this.invWidth, pixelsY * this.invHeight] as Point2D
  }

  public toPixelCoords(relX: number, relY: number) {
    return [
      Math.floor(relX * this.width),
      Math.floor(relY * this.height),
    ]
  }

  // Get the scene sampler which will allow to sample this scene from a camera
  // which is the current one according to the ViewManager.
  public getSceneSampler(): SceneSampler { return this.sceneSampler }

  // Called when this scene is assigned to the render engine.
  public onActivate(): void { 
    this.placeableHint?.activate()
  }

  // Called when this scene is unassigned from the render engine.
  public onDeactivate(): void { 
    this.placeableHint?.deactivate()
  }

  public getIsDirty(): boolean {
    return this.isDirty
  }

  // Enable scene "dirty" state, which will force re-rendering on the next frame.
  public setIsDirty(isDirty: boolean): void {
    this.isDirty = isDirty
  }

  // The scene keeps a single, shared ghost item. This function returns it.
  public getGhostItem (): GhostItem3D | undefined {
    const ghost = this.renderItems.get(GHOST_ITEM_ID)
    if (ghost?.isGhostItem()) {
        return ghost as GhostItem3D
    }
    return undefined
  }

  // Make sure the shared ghost item is visible. A no-op if there is no ghost item.
  public showGhost (): void {
    const ghost = this.getGhostItem()
    if (ghost) {
        ghost.setVisible(true)
    }
  }

  // Make sure the shared ghost item is hidden. A no-op if there is no ghost item.
  public hideGhost (): void {
    const ghost = this.getGhostItem()
    if (ghost) {
        ghost.setVisible(false)
    }
  }

  public setPositioningHelperActive(shouldBeEnabled: boolean) {
    if (!this.planeData) {
      return
    }
    if (shouldBeEnabled && !this.positioningHelper) {
      this.positioningHelper = new PositioningHelper(this)
      this.positioningHelper.setTargetScreenPositionStatic({x: this.width * 0.5, y: this.height * 0.75})
    }
    this.positioningHelper?.setActive(shouldBeEnabled)
    this.setIsDirty(true)
  }

  public setSceneSamplingVisualizerActive(shouldBeEnabled: boolean) {
    if (shouldBeEnabled && !this.sceneSamplingVisualizer) {
      this.sceneSamplingVisualizer = new SceneSamplingVisualizer(this)
      this.sceneSamplingVisualizer.samplePoint({x: 0.5, y: 0.5})
    }
    this.sceneSamplingVisualizer?.setActive(shouldBeEnabled)
    this.setIsDirty(true)
  }

  public updatePositioningHelper(allowedOnFloor: boolean,
    allowedOnWall: boolean, allowedOnWallFloorEdge: boolean,
    sizeX: number, sizeY: number, sizeZ: number) {
      this.positioningHelper?.setParameters(allowedOnFloor, allowedOnWall, allowedOnWallFloorEdge, sizeX, sizeY, sizeZ)
  }

  // Handle mouse move event, e.g. to add interactivity to debug features.
  // X and Y are relative coordinates.
  public handleMouseMove (relX: number, relY: number): void {
    if (this.positioningHelper?.isActive()) {
      this.positioningHelper.dragTargetToScreenPoint({x: this.width * relX, y: this.height * relY})
      this.setIsDirty(true)
    }
    if (this.sceneSamplingVisualizer?.isActive()) {
      this.sceneSamplingVisualizer.samplePoint({ x: relX, y: relY })
      this.setIsDirty(true)
    }
  }

  public abstract onItemLoadedAndPositioned (renderItemId: string): void

  // Get three scene in which render items are.
  public abstract getObjectsScene (): THREE.Scene | null

  protected abstract createSceneSampler(): SceneSampler

  public onCanvasResize(screenSize: THREE.Vector2) {
    if (this.roomDimensions) {
      this.roomDimensions.setResolution(screenSize)
    }
    if (this.dynamicMeasurements) {
      this.dynamicMeasurements.setResolution(screenSize)
    }
    this.envMapViewer?.setResolution(screenSize)
    this.renderItems.forEach(renderItem => renderItem.onRenderDimensionsChange)
  }

  public getShouldUseFrontSideShadows() {
    return this.shouldUseFrontSideShadows
  }

  public setFrontSideShadows(shouldUseFrontSideShadows: boolean) {
    this.shouldUseFrontSideShadows = shouldUseFrontSideShadows
    this.getObjectsScene()?.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material)
          // eslint-disable-next-line no-param-reassign
          obj.material.shadowSide = this.shouldUseFrontSideShadows ? THREE.FrontSide : null
    })
  }

  public setDebugSettings(debugSettings: DebugSettings) {
    this.switchEnvMapVisualizationFormat(debugSettings.environmentVizEquirect)
    this.setEnvironmentBackgroundVisible(debugSettings.environmentVizBackground)
    this.setLightHelpersVisible(debugSettings.lightsViz)
    this.switchEnvMap(debugSettings.useAlternateEnvMap, debugSettings.useRoomBuilderEnvMap)
  }

  // Restore visibility of furniture items that were hidden previously and
  // hide items that may be too close to the camera and block the view.
  public refreshViewBlockingItemsVisibility(hideViewBlockingItems: boolean) {

    this.renderItems.forEach((renderItem) => {
      renderItem.traverse((childItem) => {
        const renderObject = childItem.getObject()
        if (!renderObject) {
          return true
        }
        if ((renderObject.userData?.wasBlockingView)) {
          renderObject.visible = true
          renderObject.userData.wasBlockingView = false
        }
        return true;
      })
    })

    if (hideViewBlockingItems) {
      this.hideViewBlockingItems()
    }
  }

  private hideViewBlockingItems() {
    const itemsToHide = new Set<string>()
    const cameraPos = gvCurrentCamera()?.getLocation()
    if (cameraPos && this.blockingItemsRaycastCheck) {
      // Ray hits that are further away than minDistance will be ignored.
      const minDistanceSq = this.blockingItemsRaycastDistance * this.blockingItemsRaycastDistance

      // Points in viewport relative coordinates.
      const screenPointsToCheck = [
        [0.15, 0.15], [0.5, 0.15], [0.85, 0.15],
        [0.15, 0.50], [0.5, 0.50], [0.85, 0.50],
        [0.15, 0.85], [0.5, 0.85], [0.85, 0.85],
      ]
      // Ray-test regular furniture items for potential view blocking.
      screenPointsToCheck.forEach(([relX, relY]) => {
        const id = this.sceneSampler.getRenderItemIdAtPoint(this.transientPoint2.set(relX, relY))
        if (id) {
          const renderItem = this.getRenderItem(id)
          if (renderItem) {
            const point = this.doItemRaycast(relX, relY, renderItem)
            if (point && point.distanceToSq(cameraPos) <= minDistanceSq) {
              itemsToHide.add(id)
            }
          }
        }
      })
    }

    // Wall items that are facing away from camera must be hidden always.
    this.renderItems.forEach((renderItem) => {
      if (itemsToHide.has(renderItem.getId())) {
        return
      }
      if (this.isItemShouldBeHidden(renderItem)) {
        itemsToHide.add(renderItem.getId())
      }
    })

    itemsToHide.forEach((id) => {
      if (!id) {
        return
      }
      const renderItem = this.getRenderItem(String(id))
      if (renderItem) {
        this.hideViewBlockingItem(renderItem)
      }
    })
  }

  // eslint-disable-next-line class-methods-use-this
  protected hideViewBlockingItem(renderItem: RenderItem3D) {    
      renderItem.traverse((childItem) => {
        const renderObject = childItem.getObject()
        if (!renderObject) {
          return true
        }
        if (!renderObject.userData) {
          renderObject.userData = {}
        }
        if (renderObject.visible) {
          renderObject.userData.wasBlockingView = true
          renderObject.visible = false
        }
        return true;
      })    
  }

  protected isFloorItemAgaintWallCheckEnabled() {
    return this.blockingItemsWallFacingCheck
  }

  protected isItemShouldBeHidden(renderItem: RenderItem3D): boolean {
    const itemIsArt = renderItem.isArtItem()
    return (
      this.isWallItemFacingAway(renderItem) && (
        itemIsArt || this.isItemFullyOccludedByAttachingWall(renderItem)
          || this.isItemOccludedOnlyByOuterPolygons(renderItem)
      )
    ) || (
      this.isFloorItemAgaintWallCheckEnabled() && isFurnitureItem3D(renderItem)
        && this.isFloorItemAgainstBackFacingWall(renderItem)
    )
  }

  // For a given render item returns true if the item is attached to a wall
  // and currently is facing away from the camera, i.e. the camera is behind the wall this item is attached to.
  // eslint-disable-next-line class-methods-use-this
  private isWallItemFacingAway(renderItem: RenderItem3D): boolean {
    const renderObject = renderItem.getObject()
    if (!renderObject) {
      return false
    }
    const camera = gvCurrentCamera()?.getThreeCamera()
    if (!camera) {
      return false
    }
    const itemIsArt = renderItem.isArtItem()
    const itemAttachedToWall = itemIsArt ||
      (isFurnitureItem3D(renderItem) && (renderItem.getPlacingBehavior() === PlacingBehavior.ON_WALL))
    if (itemAttachedToWall) {
      const worldForward = renderObject.getWorldDirection(new THREE.Vector3())
      // Item is facing away from the camera when its "forward" vector and vector from the camera to the object
      // are facing the same direction, i.e. their dot product is positive.
      const cameraToObj = new THREE.Vector3().subVectors(renderObject.position, camera.position)
      const dotProduct = cameraToObj.dot(worldForward)
      return dotProduct > 0
    }
    return false
  }

  // For a given wall item; returns true if it's fully occluded by the wall that it's attached to.
  isItemFullyOccludedByAttachingWall(renderItem: RenderItem3D): boolean {
    const renderObject = renderItem.getObject()
    if (!renderObject) {
      return false
    }

    const attachmentPolygon = getParentAttachmentPolygon(renderItem)
    const cameraLocation = gvCurrentCamera()?.getLocation() || new Point3(0, 0, 0)
    const itemBbox = new THREE.Box3().expandByObject(renderObject)
    const itemForward = renderObject.getWorldDirection(new THREE.Vector3())
    const forwardOffset = new Vector3(...itemForward.multiplyScalar(WALL_INTERSECTION_SHIFT).toArray())
    return getBoundingCorners(itemBbox).every(cornerPoint => {
      cornerPoint.plus(forwardOffset)
      const cornerToCamDir = Vector3.vecP1toP2(cornerPoint, cameraLocation).normalize()
      const intersections = this.sceneSampler.rawRaycastSample(cornerPoint, cornerToCamDir)
      return intersections.some(intersection => intersection.plane.id === attachmentPolygon?.id)})
  }

  // Returns true only when an item is occluded by bounding polygons; which are outside walls on
  // the perimerter of the room's geometry, or the ceiling/floor.
  isItemOccludedOnlyByOuterPolygons(renderItem: RenderItem3D): boolean {
    const renderObject = renderItem.getObject()
    if (!renderObject) {
      return false
    }

    const cameraLocation = gvCurrentCamera()?.getLocation() || new Point3(0, 0, 0)
    const itemBbox = new THREE.Box3().expandByObject(renderObject)
    const corners = getBoundingCorners(itemBbox)

    // To handle a special case where a wall might be narrower than the item's width
    // failing to capture the corners, the lower corners are replaced with their medials.
    corners[0].x = (corners[0].x + corners[1].x) / 2
    corners[1].z = (corners[1].z + corners[2].z) / 2
    corners[2].x = (corners[2].x + corners[3].x) / 2
    corners[3].z = (corners[3].z + corners[0].z) / 2

    // An item is occluded by bounding surfaces when the rays shot from the corners towards
    // the camera have only a single intersecting polygon each. Note windows/doors are ignored
    // cause the containing walls would be intersected instead.
    const candidates = [`wall`, `ceiling`, `floor`]
    const itemForward = renderObject.getWorldDirection(new THREE.Vector3())
    const forwardOffset = new Vector3(...itemForward.multiplyScalar(WALL_INTERSECTION_SHIFT).toArray())
    return corners.every(cornerPoint => {
      cornerPoint.plus(forwardOffset)
      const cornerToCamDir = Vector3.vecP1toP2(cornerPoint, cameraLocation).normalize()
      const intersections = this.sceneSampler.rawRaycastSample(cornerPoint, cornerToCamDir)
      return intersections.filter(intrx => candidates.includes(intrx.plane.class)).length <= 1
    })
  }

  // eslint-disable-next-line class-methods-use-this
  private isFloorItemAgainstBackFacingWall(furnitureItem: FurnitureItem3D): boolean {
    const isOnFloor = furnitureItem.getPlacingBehavior() === PlacingBehavior.ON_FLOOR
    if (!isOnFloor) {
      return false
    }

    const renderObject = furnitureItem.getObject()
    if (!renderObject) {
      return false
    }

    const worldBackward = renderObject.getWorldDirection(new THREE.Vector3()).negate() // Already normalized.
    const bbox = furnitureItem.getBbox()
    const bboxSize = bbox.getSize(new THREE.Vector3())
    const halfHeight = 0.5 * (furnitureItem.getIsDefaultRotation() ? bboxSize.y : bboxSize.x)
    // The center of item's bounding box.
    const centerPoint = renderObject.localToWorld(new THREE.Vector3(0, halfHeight, 0.0))
    const ray: Ray = {
      origin: centerPoint,
      dir: { dx: worldBackward.x, dy: worldBackward.y, dz: worldBackward.z },
    }
    const checkIfVisible = false
    const checkIfValid = true
    const intersection = pu.castRayToNearestWallPlane(ray, checkIfVisible, checkIfValid)
    if (!intersection || !intersection.normal) {
      return false
    }
    const backFaceDistance = intersection.distance - 0.5 * bboxSize.z
    if (backFaceDistance > MAX_BACK_SIDE_DISTANCE_TO_WALL_TO_HIDE) {
      return false
    }
    // Not checking alignment with the wall for now.

    const camera = gvCurrentCamera()?.getThreeCamera()
    if (!camera) {
      return false
    }
    const cameraToObj = new THREE.Vector3().subVectors(renderObject.position, camera.position).normalize()
    const wallNormal = intersection.normal
    const dotProduct = cameraToObj.x * wallNormal.dx + cameraToObj.y * wallNormal.dy + cameraToObj.z * wallNormal.dz
    return dotProduct > 0.0
  }

  enableInspectorMode(enable: boolean) {
    this.renderItems.forEach((item) => {
      item.enableDebugControls(enable)
    })
  }

  public getRoomDimensions() {
    return this.roomDimensions
  }

  public getRoomDimensionsEnabled() {
    if (!this.roomDimensions) {
      return false
    }
    return this.roomDimensions.getIsEnabled()
  }

  public setRoomDimensionsEnabled(enable: boolean) {
    if (!this.roomDimensions) {
      return
    }
    this.roomDimensions.setEnabled(enable)
    this.setIsDirty(true)
  }

  public setProductDimensionsEnabled(enable: boolean) {
    this.renderItems.forEach((renderItem) => {
      if (isFurnitureItem3D(renderItem) || isArtItem3D(renderItem)) {
        const shouldEnable = enable && shouldShowProductDimensions(renderItem)
        renderItem.getProductDimensions().setEnabled(shouldEnable)
      }
    })
    this.setIsDirty(true)
  }

  public hideAllProductDimensions() {
    this.renderItems.forEach((renderItem) => {
      if (isFurnitureItem3D(renderItem) || isArtItem3D(renderItem)) {
        renderItem.getProductDimensions().setVisible(false)
      }
    })
    this.setIsDirty(true)
  }

  public setDynamicMeasurementsEnabled(enable: boolean) {
    if (!this.dynamicMeasurements) {
      return
    }
    this.dynamicMeasurements.setEnabled(enable)
    this.setIsDirty(true)
  }

  public onBeforeScreenshot() {
    this.screenshotVisibilityCache.clear()
    this.renderItems.forEach((renderItem) => {
      if (isFurnitureItem3D(renderItem) || isArtItem3D(renderItem)) {
        const threeObject = renderItem.getProductDimensions().getRootObject()
        this.screenshotVisibilityCache.set(threeObject, threeObject.visible)
        threeObject.visible = false
      }
    })
    if (this.roomDimensions) {
      const threeObject = this.roomDimensions.getRootObject()
      this.screenshotVisibilityCache.set(threeObject, threeObject.visible)
      threeObject.visible = false
    }
    if (this.dynamicMeasurements) {
      const threeObject = this.dynamicMeasurements.getRootObject()
      this.screenshotVisibilityCache.set(threeObject, threeObject.visible)
      threeObject.visible = false
    }
  }

  public onAfterScreenshot() {
    this.screenshotVisibilityCache.forEach((wasVisible, object) => {
      object.visible = wasVisible
    })
  }
}
