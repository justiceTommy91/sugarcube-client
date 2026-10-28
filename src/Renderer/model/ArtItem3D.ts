import type Renderer from "Renderer"
import type { ArtFrameData, ItemPlacementData, Placement } from "Renderer/geomviewer"
import { NOTIFY_SCENE_ITEM_UPDATE } from "Renderer/geomviewer/geom_constants"
import WallspiceWebgl from "Renderer/WallspiceWebgl"
import { ArtItemBehavior } from "Renderer/positioning/art_item_behavior"
import { GrandCentral } from "Renderer/GrandCentral"
import {
  EVT_WALL_ART_LOAD_END,
  NOTIFY_RENDER_ITEM_POSITIONING_READY,
  NOTIFY_ART_ITEM_READY,
} from "Renderer/constants"
import * as THREE from 'three'
import { PointXY, Point2D } from 'Renderer/geomviewer/geom_types'
import { convertArtPlacementFromSave, convertArtPlacementToSave } from 'Renderer/model/gltf_composition_utils'
import type { DragResult } from 'Renderer/positioning/positioning_system'
import { gvCurrentScene, gvCurrentSettings } from "Renderer/foundation/geom_app"
import type CustomStandardMaterial from "Renderer/CustomStandardMaterial"
import { ProductDimensions } from 'Renderer/model/ProductDimensions'
import * as artTypes from '../../constants/artTypes'
import { RenderItem3D } from "./RenderItem3D"
import { BaseItem } from "./BaseItem"
import { createArtItemModel } from './art_item_util'

let maxArtItemOffset = 0.005

type Corners = [Point2D, Point2D, Point2D, Point2D]

class ArtItem3D extends RenderItem3D {
  private size: number;
  private frameData: ArtFrameData;
  private selected = false;
  public zoffset = maxArtItemOffset;
  private ratio: number;
  private orientation: string;
  private artMaterial: CustomStandardMaterial | THREE.MeshStandardMaterial;
  private artSize: [number, number];
  private positioningBehavior: ArtItemBehavior;
  private planeIndex?: number;
  private shadowMesh?: THREE.Mesh;
  private productDimensions: ProductDimensions

  constructor(
    id: string,
    renderer: Renderer,
    incomingPlacement: Placement,
    artImage: { artImageData: ImageData, msFileDownloadTime: number },
    frameData: ArtFrameData,
    size: number
  ) {
    let placement = incomingPlacement
    if (placement.kind === `location3Legacy`) {
      placement = convertArtPlacementFromSave(incomingPlacement)
    }
    super(id, renderer, placement.location3)

    this.size = size;
    this.frameData = frameData;
    this.selected = false;
    maxArtItemOffset += 0.005;

    this.ratio = parseFloat((artImage.artImageData.width / artImage.artImageData.height).toFixed(2));

    if (artImage.artImageData.width >= artImage.artImageData.height) {
      this.orientation = artTypes.ART_LANDSCAPE;
    } else {
      this.orientation = artTypes.ART_PORTRAIT;
    }

    this.artMaterial = WallspiceWebgl.createArtMaterial(artImage.artImageData);

    this.artSize = [(this.size * this.ratio), this.size];

    const config = {
      zOffset: this.getZoffset(),
      sizeY: this.getHeight() || 0
    }
    this.positioningBehavior = new ArtItemBehavior(config, this)
    this.metrics.sFileDownloadTime = artImage.msFileDownloadTime * 0.001

    this.productDimensions = this.createProductDimensions()
    this.loadFrame(placement);
  }

  // Getter methods
  public override getCorners(): Corners {
    const renderObject = this.getObject()
    const camera = this.Renderer.getCamera()
    let ret: Corners = [[0, 0], [0, 0], [0, 0], [0, 0]]
    if (!camera || !renderObject) {
      return ret
    }
    ret = WallspiceWebgl.projBoundBox(renderObject.matrixWorld, this.bbox, camera) as Corners
    return ret
  }

  private getZoffset() {
    return this.zoffset || maxArtItemOffset;
  }

  public getProductDimensions() {
    return this.productDimensions
  }

  updateFrame(frameData: ArtFrameData, size: number) {
    this.frameData = frameData;
    this.setSizeNoReload(size);
    if (this.productDimensions) {
      this.productDimensions.dispose()
    }
    this.productDimensions = this.createProductDimensions()
    this.loadFrame();
  }

  private setSizeNoReload(size: number) {
    this.size = size;
    this.artSize = [(size * this.ratio), size];
  }

  override setPositionFromScreenPoint(screenPoint: PointXY) {
    const isValid = this.positioningBehavior.setTargetScreenPositionStatic([screenPoint.x, screenPoint.y])
    return isValid
  }

  override dragTargetToScreenPoint(screenPoint: PointXY): DragResult {
    const result = this.positioningBehavior.dragTargetToScreenPoint([screenPoint.x, screenPoint.y])
    const dynamicMeasuremments = gvCurrentScene()?.getDynamicMeasurements()
    if (dynamicMeasuremments && dynamicMeasuremments.getTrackedItem() === this) {
        dynamicMeasuremments.refresh()
    }
    return result
  }

  override setVisible(shouldBeVisible: boolean) {
    super.setVisible(shouldBeVisible);
    this.updateRenderObject();
  }

  setSelected(shouldBeSelected: boolean) {
    this.selected = shouldBeSelected;
    if (this.selected) {
      this.enableOutline(this.selected);
    } else {
      this.disableOutline();
    }
    this.updateOutlineThickness();
    this.updateRenderObject();
  }

  onSelect() {
    this.setSelected(true);
    this.productDimensions.onObjectSelect()
    const dynamicMeasurements = gvCurrentScene()?.getDynamicMeasurements()
    if (this.productDimensions.isEnabled() && dynamicMeasurements && dynamicMeasurements.getIsEnabled()) {
        dynamicMeasurements.setTrackingItem(null)
    }
  }

  onSelectEnd() {
    this.setSelected(false);
    this.productDimensions.onObjectSelectEnd()
  }

  onHover() {
    this.enableOutline(this.selected);
    this.updateOutlineThickness();
    gvCurrentScene()?.getDynamicMeasurements()?.setTrackingItem(this)
    this.productDimensions.onObjectHover()
  }

  onHoverEnd() {
    if (!this.selected) {
      this.disableOutline();
    }
    this.updateOutlineThickness();
    const dynamicMeasuremments = gvCurrentScene()?.getDynamicMeasurements()
    if (dynamicMeasuremments && dynamicMeasuremments.getTrackedItem() === this) {
        dynamicMeasuremments.setTrackingItem(null)
    }
    this.productDimensions.onObjectHoverEnd(this.selected)
  }

  override onDragStart() {
    super.onDragStart();

    // Exchange the current z-offset with the highest artItem
    if (this.Renderer.scene && this.getZoffset() < maxArtItemOffset) {
      const renderItems = Array.from(this.Renderer.scene.getRenderItems());
      const isArtItem3D = (obj: BaseItem): obj is ArtItem3D => obj.isArtItem();

      const maxItem = (renderItems.filter(isArtItem3D) as unknown as ArtItem3D[])
        .reduce(
          (max, cur) => cur.getZoffset() > max.zoffset ? cur : max,
          { zoffset: 0 }) as ArtItem3D;

      const temp = maxItem.zoffset;
      maxItem.zoffset = this.zoffset;
      this.zoffset = temp;

      gvCurrentScene()?.getDynamicMeasurements()?.setTrackingItem(this)
      gvCurrentScene()?.hideAllProductDimensions()
    }
  }

  override onDragFinish() {
    super.onDragFinish()
    this.dispatchItemPlacementUpdate()
    const dynamicMeasuremments = gvCurrentScene()?.getDynamicMeasurements()
    if (dynamicMeasuremments && dynamicMeasuremments.getTrackedItem() === this) {
        dynamicMeasuremments.setTrackingItem(null)
    }
    this.productDimensions.onObjectDragFinish()
  }

  private updateOutlineThickness() {
    if (!this.Renderer) {
      return;
    }
    this.Renderer.setOutlineThickness();
  }

  override updateRenderObject() {
    super.updateRenderObject()

    const { Renderer } = this

    const lightDirection = Renderer.getLightDirectionByIndex(this.planeIndex);
    const cast = WallspiceWebgl.cardinalToVector(lightDirection);
    WallspiceWebgl.setShadowMeshDirection(this.shadowMesh, cast);

    Renderer.onChildUpdate()
    this.productDimensions.onParentTransformUpdated()
  }

  private async loadFrame(placement?: Placement) {
    this.Renderer?.pinsManager?.addItem(this)

    this.metrics.msStartLoad = Date.now();

    if (this.getObject()) {
      this.removeFromScene();
      this.unsetObject();
    }

    const { frame, shadowMesh, bbox } = this.makeFrameModel();
    frame.name = this.name;
    frame.matrixAutoUpdate = false;
    frame.visible = true;
    frame.add(this.productDimensions.getRootObject())

    this.bbox.copy(bbox)
    this.shadowMesh = shadowMesh
    this.setObject(frame);
    // this.visualizeDebugBoundBox(0x00FF00);
    this.addToScene();
    GrandCentral.getDispatcher().dispatchNotification({
      what: NOTIFY_RENDER_ITEM_POSITIONING_READY,
      payload: {
        furnitureItemId: this.id
      }
    });

    this.metrics.msEndLoad = Date.now();
    this.metrics.sLoadTime = (this.metrics.msEndLoad - this.metrics.msStartLoad) * 0.001;
    this.metrics.sTotalTime = this.metrics.sLoadTime + this.metrics.sFileDownloadTime

    if(placement?.kind === 'location2Legacy') {
      this.positioningBehavior.setTargetScreenPositionStatic(placement.location2)
    }

    if (this.selected) {
      this.setSelected(true);
    }
    document.dispatchEvent(new Event(EVT_WALL_ART_LOAD_END));
    this.positioningBehavior.refreshTargetTransform()

    this.Renderer.onChildUpdate(() => this.notifyScreenProjectionUpdate())
    this.dispatchItemReadyUpdate()

    // Art items are late-initialized in the composition initialization process (since it's
    // handled through react) that it misses some scene building steps. Thus; called here.
    // TODO: Remove method when items' initialization is refactored out of react UI code.
    this.onItemLoadedAndPositioned()
  }

  private createProductDimensions() {
    const width = this.artSize[0]
    const height = this.artSize[1]

    let outerL = -width * 0.5
    let outerR = width * 0.5
    let outerB = -height * 0.5
    let outerT = height * 0.5

    if (this.frameData.matte && this.frameData.matte.sections) {
      const matDesc = this.frameData.matte.sections
      for (let i = 0; i < matDesc.length; i += 1) {
        const extrusionDist = matDesc[i].profile[matDesc[i].profile.length - 1][0]
        outerL -= extrusionDist
        outerR += extrusionDist
        outerB -= extrusionDist
        outerT += extrusionDist
      }
    }

    if (this.frameData.sections) {
      const frDesc = this.frameData.sections
      for (let i = 0; i < frDesc.length; i += 1) {
        const extrusionDist = frDesc[i].profile[frDesc[i].profile.length - 1][0]
        outerL -= extrusionDist
        outerR += extrusionDist
        outerB -= extrusionDist
        outerT += extrusionDist
      }
    }
    const sx = outerR - outerL
    const sy = outerT - outerB
    return new ProductDimensions(sx, sy, 0.0)
  }

  private makeFrameModel() {
    const model = createArtItemModel({
      artSize: this.artSize,
      material: this.artMaterial,
      frameData: this.frameData,
      useFilmicLUT: this.Renderer.useFilmicLUT,
      castAndReceiveShadows: gvCurrentSettings()?.viewerSettings?.is3dMeshScene || false,
      envMap: gvCurrentScene()?.getEnvMap() || undefined,
      envMapIntensity: gvCurrentSettings()?.debugSettings?.environmentIntensity
    })
    return model
  }

  override isArtItem() { // eslint-disable-line class-methods-use-this
    return true;
  }

  getHeight(): number {
    let height = 0;
    if (this.artSize[1]) {
      height = this.artSize[1]
    }
    return height;
  }

  // Get placement in the format required by 3D GLTF composition format, in which parenting rules and
  // scene graph is different from the one used in the viewer (e.g. items are parents of surfaces they're attached to).
  getSavePositioningInfo() {
    return convertArtPlacementToSave(this)
  }

  getItemPlacementData(): ItemPlacementData {
    const position = this.getScreenPosition2D()
    const positioningInfo = this.getSavePositioningInfo()
    return {
      x: position[0],
      y: position[1],
      additionalContacts: [],
      ...positioningInfo,
      corners: this.getCorners(),
      stackedOnSurfaceId: undefined
    }
  }

  public override dispatchItemReadyUpdate(): void {
    GrandCentral.getDispatcher().dispatchNotification({
      what: NOTIFY_ART_ITEM_READY,
      payload: {
          itemId: this.id
      }
    })
    super.dispatchItemReadyUpdate()
  }

  // Dispatch a SceneItemUpdateNotification-Geometry notification.
  public dispatchItemPlacementUpdate() {
    const notification = {
      what: NOTIFY_SCENE_ITEM_UPDATE,
      payload: {
        itemId: this.id,
        stateInfo: `Geometry`,
        itemData: this.getItemPlacementData()
      },
    }
    GrandCentral.getDispatcher().dispatchNotification(notification);
  }

  endIsNigh(): void {
    this.Renderer?.pinsManager?.removeItem(this)
    super.endIsNigh()
    this.productDimensions.dispose()
  }

  public override onRenderDimensionsChange(newSize: PointXY) {
    this.productDimensions.setResolution(newSize)
  }
}

export default ArtItem3D
