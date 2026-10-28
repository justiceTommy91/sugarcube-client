/* eslint-disable class-methods-use-this */
import * as THREE from 'three'

import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'

import { Point3, Point3Pod } from 'Renderer/geometry/Point3'
import { Vector3 } from 'Renderer/geometry/Vector3'
import type { RenderItem3D } from 'Renderer/model/RenderItem3D'
import { castRayToItemBboxes, rawRaycastSample, projPtToPlane } from 'Renderer/positioning/positioning_utilities'
import { CustomLine2, screenSpaceDashVS } from 'Renderer/rendering/DimensionsCommon'
import { gvCurrentCamera, gvCurrentScene, gvRenderLibrary } from 'Renderer/foundation/geom_app'
import { getGrandCentral } from 'Renderer/GrandCentral'
import { NOTIFY_CAMERA_TRANSFORM_UPDATE } from 'Renderer/geomviewer/geom_constants'
import { DYNAMIC_MEASUREMENTS_MIN_LENGTH } from 'Renderer/constants'
import { MathUtils } from 'three/src/math/MathUtils'
import type { DynamicMeasurementsInfo, MeasurementTypeStr } from 'Renderer/geomviewer/geom_types'
import { getRenderItem3D, isFurnitureItem3D } from './scene_utils'

type Measurement = {
  p1: Point3
  p2: Point3
  distance: number
  type: MeasurementTypeStr 
}

type VisualLine = {
  lineSolid: CustomLine2
  lineDashed: CustomLine2
  endTick: CustomLine2
  free: boolean
}

const DASH_LINE_WIDTH_PIX = 1.0
const SOLID_LINE_WIDTH_PIX = 1.25
const DASH_SIZE_PIX = 3.5
const GAP_SIZE_PIX = 3.5
const END_TICK_LENGTH_METERS = 0.2

const SIN_45 = Math.sin(45.0 * MathUtils.DEG2RAD)

export class DynamicMeasurements {
  private isEnabled = false
  private trackingItem: RenderItem3D | null = null
  private currentMeasurements: Measurement[] = []
  private rootObject: THREE.Group = new THREE.Group()
  private visualLinesCache: VisualLine[] = []
  private solidLineMaterial: LineMaterial
  private dashLineMaterial: LineMaterial
  private endTickMaterial: LineMaterial
  private cameraViewDirection = new Vector3(1.0, 0.0, 0.0)

  constructor() {
    this.solidLineMaterial = new LineMaterial({
      linewidth: SOLID_LINE_WIDTH_PIX,
      transparent: true,
      depthTest: true,
      toneMapped: false,
    })
    this.dashLineMaterial = new LineMaterial({
      linewidth: DASH_LINE_WIDTH_PIX,
      transparent: true,
      depthTest: true,
      depthFunc: THREE.GreaterDepth,
      toneMapped: false,
      dashed: true,
      dashSize: DASH_SIZE_PIX,
      gapSize: GAP_SIZE_PIX,
    })
    this.dashLineMaterial.color.set(0x007CC1).convertLinearToSRGB()
    this.solidLineMaterial.color.copy(this.dashLineMaterial.color)
    this.dashLineMaterial.vertexShader = screenSpaceDashVS
    this.endTickMaterial = this.solidLineMaterial.clone()
    this.endTickMaterial.depthTest = false
    const renderer = gvRenderLibrary()?.renderer
    if (renderer) {
      this.setResolution(renderer.getSize(new THREE.Vector2()))
    }
    this.onCameraTransformUpdated = this.onCameraTransformUpdated.bind(this)
    getGrandCentral().addObserver(NOTIFY_CAMERA_TRANSFORM_UPDATE, this.onCameraTransformUpdated)
    this.rootObject.visible = true
  }

  public getRootObject() {
    return this.rootObject
  }

  public dispose() {
    this.dashLineMaterial.dispose()
    this.solidLineMaterial.dispose()
    this.endTickMaterial.dispose()
    getGrandCentral().removeObserver(this.onCameraTransformUpdated)
  }

  public getIsEnabled() {
    return this.isEnabled
  }

  public setEnabled(enable: boolean) {
    this.isEnabled = enable
    if (!this.isEnabled) {
      this.setTrackingItem(null)
    }
    gvCurrentScene()?.setIsDirty(true)
  }

  public getMeasurementsInfo(): DynamicMeasurementsInfo {
    const result: DynamicMeasurementsInfo = {
      measurements: [],
      trackedItemId: this.trackingItem?.getId() || null,
      isEnabled: this.isEnabled,
    }

    const sceneDimensions = gvCurrentScene()?.getDimensions()
    const camera = gvCurrentCamera()
    if (!camera || !sceneDimensions) {
      return result
    }

    result.measurements = this.currentMeasurements.map((measurement) => {
      const screenPoint1 = camera.worldToScreenFloat(measurement.p1)
      const screenPoint2 = camera.worldToScreenFloat(measurement.p2)
      const relativePoint1 = { x: screenPoint1.x / sceneDimensions[0], y: screenPoint1.y / sceneDimensions[1] }
      const relativePoint2 = { x: screenPoint2.x / sceneDimensions[0], y: screenPoint2.y / sceneDimensions[1] }
      const relativeMiddlePoint = {
        x: relativePoint1.x + 0.5 * (relativePoint2.x - relativePoint1.x),
        y: relativePoint1.y + 0.5 * (relativePoint2.y - relativePoint1.y),
      }
      return {
        relativePoint1,
        relativePoint2,
        relativeMiddlePoint,
        length: measurement.distance,
        type: measurement.type,
      }
    })
    return result
  }

  public setResolution(screenSize: THREE.Vector2) {
    this.dashLineMaterial.resolution.copy(screenSize)
    this.solidLineMaterial.resolution.copy(screenSize)
    this.endTickMaterial.resolution.copy(screenSize)
  }

  public setTrackingItem(trackingItem: RenderItem3D | null) {
    this.trackingItem = trackingItem
    this.refresh()
  }

  public getTrackedItem() {
    return this.trackingItem
  }

  public refresh() {
    if (!this.isEnabled) {
      this.clear()
      return
    }
    this.recomputeMeasurements()
    this.updateVisualObject()
  }

  private recomputeMeasurements() {
    this.clear()
    if (!this.trackingItem) {
      return
    }
    const bbox = this.trackingItem.getBbox().clone()
    if (isFurnitureItem3D(this.trackingItem)) {
      const snapRotateTransform = this.trackingItem.getSnapRotModelMatrix()
      if (snapRotateTransform) {
        bbox.applyMatrix4(snapRotateTransform)
      }
    }
    const bboxSize = bbox.getSize(new THREE.Vector3())
    // For wall items, we want to shoot the ray at constant distance from the wall, to catch intersections
    // with thin art items, etc.
    const isArt = this.trackingItem.isArtItem()
    const isWallItem = isArt || (isFurnitureItem3D(this.trackingItem) && this.trackingItem.isBoundToWall())
    const rays = [
      {
        origin: this.trackingItem.localToWorld({ x:  0.5 * bboxSize.x, y: isArt ? 0.0 : 0.5 * bboxSize.y, z: 0.0 }),
        dir: this.trackingItem.localDirToWorld({ dx: 1, dy: 0, dz: 0 }),
        type: `+x`,
      },
      {
        origin: this.trackingItem.localToWorld({ x: -0.5 * bboxSize.x, y: isArt ? 0.0 : 0.5 * bboxSize.y, z: 0.0 }),
        dir: this.trackingItem.localDirToWorld({ dx: -1, dy: 0, dz: 0 }),
        type: `-x`,
      },
    ]
    if (isWallItem) {
      rays.push({
        origin: this.trackingItem.localToWorld({ x: 0, y: isArt ? 0.5 * bboxSize.y : bboxSize.y, z: 0.0 }),
        dir: this.trackingItem.localDirToWorld({ dx: 0, dy: 1, dz: 0 }),
        type: `+y`,
      },
      {
        origin: this.trackingItem.localToWorld({ x: 0, y: isArt ? -0.5 * bboxSize.y : 0.0, z: 0.0 }),
        dir: this.trackingItem.localDirToWorld({ dx: 0, dy: -1, dz: 0 }),
        type: `-y`,
      })
    } else {
      rays.push({
        origin: this.trackingItem.localToWorld({ x: 0, y: 0.5 * bboxSize.y, z:  0.5 * bboxSize.z }),
        dir: this.trackingItem.localDirToWorld({ dx: 0, dy: 0, dz: 1 }),
        type: `+z`,
      },
      {
        origin: this.trackingItem.localToWorld({ x: 0, y: 0.5 * bboxSize.y, z: -0.5 * bboxSize.z }),
        dir: this.trackingItem.localDirToWorld({ dx: 0, dy: 0, dz: -1 }),
        type: `-z`,
      })
    }
    
    rays.forEach((ray) => {
      if (isWallItem) {
        const wallOffset = 0.05
        ray.origin = this.findOriginOnSurface(ray.origin, wallOffset)
      }

      const wallResult = rawRaycastSample(ray)
        .filter(result => result.plane.class !== 'opening')
        .sort((r1, r2) => r1.position.distanceToSq(ray.origin) - r2.position.distanceToSq(ray.origin))[0]

      const filterFunc = (itemId: string) => {
        const item = getRenderItem3D(itemId)
        if (!item) {
          return false
        }
        const localOrigin = item.worldToLocal(ray.origin)
        return item !== this.trackingItem && !item.getBbox()
          .containsPoint(new THREE.Vector3(localOrigin.x, localOrigin.y, localOrigin.z))
      }
      let itemResult = castRayToItemBboxes(ray, filterFunc)

      // For wall items, shoot one more ray closer to the wall in attempt to catch image based art items.
      if (isWallItem) {
        const closeToWallOffset = 0.001
        ray.origin = this.findOriginOnSurface(ray.origin, closeToWallOffset)

        const itemResult2 = castRayToItemBboxes(ray, itemId => itemId !== this.trackingItem?.getId())
        if (itemResult2 && (!itemResult || itemResult2.intersect.range < itemResult.intersect.range)) {
          itemResult = itemResult2
        }
      }

      let distance = Infinity
      let point: Point3 | null = null
      if (wallResult && wallResult.position) {
        distance = wallResult.position.distanceTo(ray.origin)
        point = wallResult.position
      }
      if (itemResult && itemResult.intersect.point && itemResult.intersect.range < distance) {
        distance = itemResult.intersect.range
        point = new Point3(0, 0, 0).copy(itemResult.intersect.point)
      }
      if (point && distance < Infinity && distance > DYNAMIC_MEASUREMENTS_MIN_LENGTH) {
        this.currentMeasurements.push({
          type: ray.type as MeasurementTypeStr,
          p1: new Point3(0, 0, 0).copy(ray.origin),
          p2: point,
          distance,
        })
      }
    })
  }

  private updateVisualObject() {
    this.currentMeasurements.forEach((measurement) => {
      const object = this.trackingItem?.getObject()
      if (!object) {
        return
      }

      const line = this.retainFreeVisualLine()
      line.lineSolid.visible = true
      line.lineDashed.visible = true
      line.endTick.visible = true
      // Offset the endpoint a bit to prevent the end tick from submerging in walls.
      const offset = 0.01
      const offsetVec = measurement.p1.minus(measurement.p2).scale(offset)
      const endPoint = measurement.p2.clone().plus(offsetVec)
      const positions = [
        measurement.p1.x, measurement.p1.y, measurement.p1.z,
        endPoint.x, endPoint.y, endPoint.z,
      ]
      line.lineSolid.geometry.setPositions(positions)
      line.lineDashed.geometry.setPositions(positions)
      line.lineDashed.computeLineDistances()

      const isTopDownView = Math.abs(this.cameraViewDirection.dy) > SIN_45
      const measurementAxis = measurement.type[1]
      let tickPoint1 = new THREE.Vector3(0.0, 0.0, 0.0)
      let tickPoint2 = new THREE.Vector3(0.0, 0.0, 0.0)
      let tickAxis: 'x'| 'y' | 'z' = `x`
      switch(measurementAxis) {
        case 'x':
          tickAxis = isTopDownView ? `y` : `z`
          break
        case 'y':
          tickAxis = isTopDownView ? `x` : `z`
          break
        case 'z':
          tickAxis = isTopDownView ? `y` : `x`
          break
        default:
          break
      }
      tickPoint1[tickAxis] = 0.5 * END_TICK_LENGTH_METERS
      tickPoint2[tickAxis] = -0.5 * END_TICK_LENGTH_METERS
      const threeP2 = new THREE.Vector3(measurement.p2.x, measurement.p2.y, measurement.p2.z)
      tickPoint1 = object.localToWorld(tickPoint1).sub(object.getWorldPosition(new THREE.Vector3())).add(threeP2)
      tickPoint2 = object.localToWorld(tickPoint2).sub(object.getWorldPosition(new THREE.Vector3())).add(threeP2)
      line.endTick.geometry.setPositions([
        tickPoint1.x, tickPoint1.y, tickPoint1.z,
        tickPoint2.x, tickPoint2.y, tickPoint2.z,
      ])
    })
  }

  private clear() {
    this.currentMeasurements.length = 0
    this.visualLinesCache.forEach(line => this.releaseVisualLine(line))
  }

  private retainFreeVisualLine(): VisualLine {
    let freeLine = this.visualLinesCache.find(l => l.free)
    if (!freeLine) {
      freeLine = this.createVisualLine()
      this.visualLinesCache.push(freeLine)
    }
    freeLine.free = false
    return freeLine
  }

  private releaseVisualLine(line: VisualLine) {
    line.free = true
    line.lineSolid.visible = false
    line.lineDashed.visible = false
    line.endTick.visible = false
  }

  private createVisualLine(): VisualLine {
    const lineGeometry = new LineGeometry()
    lineGeometry.setPositions([
      0, 0, 0,
      0, 0, 0,
    ])
    const lineSolid = new CustomLine2(lineGeometry, this.solidLineMaterial)
    const lineDashed = new CustomLine2(lineGeometry.clone(), this.dashLineMaterial)
    const tickGeometry = new LineGeometry()
    tickGeometry.setPositions([
      0,  0.5 * END_TICK_LENGTH_METERS, 0,
      0, -0.5 * END_TICK_LENGTH_METERS, 0,
    ])
    const endTick = new CustomLine2(tickGeometry.clone(), this.endTickMaterial)

    this.rootObject.add(lineSolid, lineDashed, endTick)
    return {
      lineSolid,
      lineDashed,
      endTick,
      free: true,
    }
  }

  private onCameraTransformUpdated() {
    const viewDirection = gvCurrentCamera()?.getUnitViewDir()
    if (viewDirection) {
      this.cameraViewDirection.copy(viewDirection)
    }
  }

  // Project given world point onto the surface the tracking item is attached to, and offset it off surface.
  private findOriginOnSurface(worldPoint: Point3Pod, offset: number) {
    if (!this.trackingItem) {
      return worldPoint
    }
    const plane = this.trackingItem.getSurfaceBoundTo()
    if (!plane) {
      return worldPoint
    }
    const surfaceNormal = new Vector3(plane.rot[2][0], plane.rot[2][1], plane.rot[2][2]).normalize()
    const projected = projPtToPlane(worldPoint, surfaceNormal.clone().negate(), plane)
    if (projected) {
      projected.plus(surfaceNormal.clone().scale(offset))
      return projected
    }
    return worldPoint
  }
}