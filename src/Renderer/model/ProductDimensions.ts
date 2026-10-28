/* eslint-disable no-continue */
/* eslint-disable max-classes-per-file */
import * as THREE from 'three'

import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'

import { gvCurrentCamera, gvCurrentScene, gvRenderLibrary } from 'Renderer/foundation/geom_app'
import { Point2, Point3, Point2Pod, Vector2, Vector3 } from 'Renderer/geometry'
import type { DimensionTypeStr, ProductDimensionsInfo } from 'Renderer/geomviewer/geom_types'
import { getGrandCentral } from 'Renderer/GrandCentral'
import { NOTIFY_CAMERA_TRANSFORM_UPDATE } from 'Renderer/geomviewer/geom_constants'
import { CustomLine2, screenSpaceDashVS } from 'Renderer/rendering/DimensionsCommon'
import { disposeMeshes } from 'Renderer/rendering/rendering_utils'

const SIZE_X = 0
const SIZE_Y = 1
const SIZE_Z = 2
type DimensionType = typeof SIZE_X | typeof SIZE_Y | typeof SIZE_Z

type DimensionVertex = {
  edgeIndexes: number[]
  localPoint: THREE.Vector3
  relScreenPoint: Point2
  visualObject: THREE.Mesh
}

type DimensionEdge = {
  solidLineObject: CustomLine2
  dashLineObject: CustomLine2
  faces: string[]
  visible: boolean
  vertex1: DimensionVertex
  vertex2: DimensionVertex
  dimension: DimensionType
  length: number
}

type DimensionFace = {
  id: string
  localPoint: THREE.Vector3
  localNormal: THREE.Vector3
  visible: boolean
}

const MIN_VISIBLE_SIZE = 0.05 // Sizes smaller than this will be collapsed to zero.
const DASH_LINE_WIDTH_PIX = 1.0
const SOLID_LINE_WIDTH_PIX = 1.75
const DASH_SIZE_PIX = 2.0
const GAP_SIZE_PIX = 2.0
const BOX_MARGIN_METERS = 0.01
const POINT_RADIUS_PIXELS = 3

class PointMesh extends THREE.Mesh {
  public isPointMesh = true
  public boundingBox = new THREE.Box3()
  // eslint-disable-next-line class-methods-use-this
  raycast() { }
}

export class ProductDimensions {
  private size = new Vector3(0, 0, 0)
  private pivot = new Point3(0, 0, 0)
  private rootObject = new THREE.Group()
  private solidLineMaterial: LineMaterial
  private dashLineMaterial: LineMaterial
  private pointMaterial: THREE.ShaderMaterial
  private allEdges: DimensionEdge[] = []
  private faces: Map<string, DimensionFace> = new Map
  private vertices: DimensionVertex[] = []
  private enabled = false
  private shouldBeVisible = false

  private lastBestSequence: DimensionEdge[] = []

  constructor(sizeX: number, sizeY: number, sizeZ: number, pivotX = 0, pivotY = 0, pivotZ = 0) {
    this.size.dx = sizeX > MIN_VISIBLE_SIZE ? sizeX : 0
    this.size.dy = sizeY > MIN_VISIBLE_SIZE ? sizeY : 0
    this.size.dz = sizeZ > MIN_VISIBLE_SIZE ? sizeZ : 0
    this.pivot.set(pivotX, pivotY, pivotZ)

    this.solidLineMaterial = new LineMaterial({
      color: 0xFFFFFF,
      linewidth: SOLID_LINE_WIDTH_PIX,
      transparent: true,
      depthTest: false,
      toneMapped: false,
    })
    this.dashLineMaterial = new LineMaterial({
      color: 0xFFFFFF,
      linewidth: DASH_LINE_WIDTH_PIX,
      transparent: true,
      dashed: true,
      dashSize: DASH_SIZE_PIX,
      gapSize: GAP_SIZE_PIX,
      depthTest: false,
      toneMapped: false,
    })
    this.pointMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        uniform vec2  resolution;
        uniform float radiusPixels;

        varying vec2 vUV;

        void main() {
          vUV = uv;

          vec4 centerNdc = projectionMatrix * modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec2 radiusNDC = radiusPixels * 2.0 / resolution;
          vec2 corner = (uv * 2.0 - 1.0);

          vec2 offsetClip = corner * radiusNDC * centerNdc.w;

          gl_Position = centerNdc;
          gl_Position.xy += offsetClip;
        }
      `,
      fragmentShader: `
        varying vec2 vUV;

        void main() {
          vec2 c = vUV * 2.0 - 1.0;
          float r2 = dot(c,c);
          if (r2 > 1.0) discard;
          gl_FragColor = vec4(1.0);
        }
      `,
      uniforms: {
        resolution: { value: new THREE.Vector2(1.0, 1.0) },
        radiusPixels: { value: POINT_RADIUS_PIXELS },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
    })
    this.dashLineMaterial.vertexShader = screenSpaceDashVS
    const renderer = gvRenderLibrary()?.renderer
    if (renderer) {
      this.setResolution(renderer.getSize(new THREE.Vector2()))
    }
    this.initVisualObject()

    this.onCameraTransformUpdated = this.onCameraTransformUpdated.bind(this)
    getGrandCentral().addObserver(NOTIFY_CAMERA_TRANSFORM_UPDATE, this.onCameraTransformUpdated)
  }

  public dispose() {
    getGrandCentral().removeObserver(this.onCameraTransformUpdated)
    this.solidLineMaterial.dispose()
    this.dashLineMaterial.dispose()
    this.pointMaterial.dispose()

    disposeMeshes(this.rootObject)
  }

  public setResolution(screenSize: Point2Pod) {
    this.solidLineMaterial.resolution.set(screenSize.x, screenSize.y)
    this.dashLineMaterial.resolution.set(screenSize.x, screenSize.y)
    this.pointMaterial.uniforms.resolution.value.set(screenSize.x, screenSize.y)
  }

  public getRootObject() {
    return this.rootObject
  }

  // Return outward pointing edge normal in screen space.
  private calcScreenSpaceNormal(edge: DimensionEdge) {
    const center = this.projectLocalPoint(new THREE.Vector3())
    if (!center) {
      return { x: 1.0, y: 0.0 }
    }
    const dir = edge.vertex2.relScreenPoint.minus(edge.vertex1.relScreenPoint).normalize()
    const n1 = new Vector2(dir.dy, -dir.dx)
    const n2 = new Vector2(-dir.dy, dir.dx)
    const midPoint = new Point2(0.5 * (edge.vertex1.relScreenPoint.x + edge.vertex2.relScreenPoint.x),
      0.5 * (edge.vertex1.relScreenPoint.y + edge.vertex2.relScreenPoint.y))

    const midToCenter = center.minus(midPoint).normalize()
    const normal = n1.dot(midToCenter) < 0.0 ? n1 : n2
    return { x: normal.dx, y: normal.dy }
  }

  public getDimensionsInfo(): ProductDimensionsInfo {
    // Furniture is not ready yet.
    if (!this.rootObject.parent || !this.rootObject.visible) {
      return { dimensions: [] }
    }
    this.vertices.forEach(vertex => this.updateVertexProjection(vertex))

    const types: DimensionTypeStr[] = [`size-x`, `size-y`, `size-z`]
    const dimensions = this.allEdges
      .filter(edge => edge.solidLineObject.visible)
      .map((edge) => {
        const middlePoint = {
          x: 0.5 * (edge.vertex1.relScreenPoint.x + edge.vertex2.relScreenPoint.x),
          y: 0.5 * (edge.vertex1.relScreenPoint.y + edge.vertex2.relScreenPoint.y),
        }
        return {
          relativePoint1: { ...edge.vertex1.relScreenPoint },
          relativePoint2: { ...edge.vertex2.relScreenPoint },
          relativeMiddlePoint: middlePoint,
          screenSpaceNormal: this.calcScreenSpaceNormal(edge),
          length: edge.length,
          typeStr: types[edge.dimension],
        }
      })
    return { dimensions }
  }

  public setRootTransform(mat: THREE.Matrix4) {
    this.rootObject.matrix.copy(mat)
    this.rootObject.matrix.decompose(this.rootObject.position, this.rootObject.quaternion, this.rootObject.scale)
  }

  public onParentTransformUpdated() {
    if (!this.rootObject.visible) {
      return
    }
    this.updateVisualState()
  }

  public onCameraTransformUpdated() {
    if (!this.rootObject.visible) {
      return
    }
    this.updateVisualState()
  }

  public setVisible(visible: boolean) {
    if (this.shouldBeVisible !== visible) {
      this.lastBestSequence.length = 0
    }
    this.shouldBeVisible = visible
    this.rootObject.visible = visible && this.enabled
    this.updateVisualState()
  }

  public getShouldBeVisible() {
    return this.shouldBeVisible
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled
    this.setVisible(this.shouldBeVisible)
  }

  public isEnabled() {
    return this.enabled
  }

  private updateVisualState() {
    this.faces.forEach(face => this.updateFaceVisibility(face))
    this.vertices.forEach(vertex => this.updateVertexProjection(vertex))
    this.allEdges.forEach(edge => this.updateEdgeVisibility(edge))
    this.buildSolidLine()
    this.vertices.forEach(vertex => this.updateVertexVisibility(vertex))
  }

  private initVisualObject() {
    this.rootObject.clear()

    const sx = this.size.dx
    const sy = this.size.dy
    const sz = this.size.dz

    const xMargin = sx > 0 ? BOX_MARGIN_METERS : 0
    const yMargin = sy > 0 ? BOX_MARGIN_METERS : 0
    const zMargin = sz > 0 ? BOX_MARGIN_METERS : 0
    const halfSx = 0.5 * sx + xMargin
    const halfSy = 0.5 * sy + yMargin
    const halfSz = 0.5 * sz + zMargin

    const p00 = [ halfSx - this.pivot.x, -halfSy - this.pivot.y,  halfSz - this.pivot.z]
    const p01 = [ halfSx - this.pivot.x, -halfSy - this.pivot.y, -halfSz - this.pivot.z]
    const p02 = [-halfSx - this.pivot.x, -halfSy - this.pivot.y, -halfSz - this.pivot.z]
    const p03 = [-halfSx - this.pivot.x, -halfSy - this.pivot.y,  halfSz - this.pivot.z]
    const p10 = [ halfSx - this.pivot.x,  halfSy - this.pivot.y,  halfSz - this.pivot.z]
    const p11 = [ halfSx - this.pivot.x,  halfSy - this.pivot.y, -halfSz - this.pivot.z]
    const p12 = [-halfSx - this.pivot.x,  halfSy - this.pivot.y, -halfSz - this.pivot.z]
    const p13 = [-halfSx - this.pivot.x,  halfSy - this.pivot.y,  halfSz - this.pivot.z]

    const points = [p00, p01, p02, p03, p10, p11, p12, p13]
    this.vertices = points.map((p) => ({
      localPoint: new THREE.Vector3().fromArray(p),
      relScreenPoint: new Point2(0, 0),
      edgeIndexes: [],
      visualObject: new PointMesh(new THREE.PlaneGeometry(), this.pointMaterial),
    }))

    const edges = [
      [p00, p01], [p01, p02], [p02, p03], [p03, p00],
      [p00, p10], [p01, p11], [p02, p12], [p03, p13],
      [p10, p11], [p11, p12], [p12, p13], [p13, p10],
    ]
    const faces = [
      [`-y`, `+x`], [`-y`, `-z`], [`-y`, `-x`], [`-y`, `+z`],
      [`+z`, `+x`], [`+x`, `-z`], [`-z`, `-x`], [`-x`, `+z`],
      [`+y`, `+x`], [`+y`, `-z`], [`+y`, `-x`], [`+y`, `+z`],
    ]
    const types: DimensionType[] = [
      SIZE_Z, SIZE_X, SIZE_Z, SIZE_X,
      SIZE_Y, SIZE_Y, SIZE_Y, SIZE_Y,
      SIZE_Z, SIZE_X, SIZE_Z, SIZE_X,
    ]
    const sizes = { [SIZE_X]: sx, [SIZE_Y]: sy, [SIZE_Z]: sz }

    this.allEdges = edges.map(([p1, p2], idx) => (
      {
        solidLineObject: new CustomLine2(new LineGeometry().setPositions([...p1, ...p2]), this.solidLineMaterial),
        dashLineObject: new CustomLine2(new LineGeometry().setPositions([...p1, ...p2]), this.dashLineMaterial),
        faces: faces[idx],
        visible: false,
        vertex1: this.vertices[points.indexOf(p1)],
        vertex2: this.vertices[points.indexOf(p2)],
        dimension: types[idx],
        length: sizes[types[idx]],
       }
    ))
    this.allEdges.forEach((edge, index) => {
      edge.vertex1.edgeIndexes.push(index)
      edge.vertex2.edgeIndexes.push(index)

      const name = `Product dimnesions line`
      edge.solidLineObject.name = name
      edge.dashLineObject.name = name
      edge.dashLineObject.computeLineDistances()
      this.rootObject.add(edge.solidLineObject, edge.dashLineObject)
    })
    this.vertices.forEach((vertex) => {
      vertex.visualObject.position.copy(vertex.localPoint)
      this.rootObject.add(vertex.visualObject)
    })
    this.initBoxFaces(sx, sy, sz)
    this.rootObject.visible = false
  }

  private initBoxFaces(sx: number, sy: number, sz: number) {
    this.faces.clear()
    const top = sy + BOX_MARGIN_METERS
    const bottom = -BOX_MARGIN_METERS
    const midX = 0.5 * sx
    const midY = 0.5 * top
    const midZ = 0.5 * sz
    const xPos = { id: `+x`, localPoint: new THREE.Vector3(midX, midY, 0),
      localNormal: new THREE.Vector3(1, 0, 0), visible: false }
    const xNeg = { id: `-x`, localPoint: new THREE.Vector3(-midX, midY, 0),
      localNormal: new THREE.Vector3(-1, 0, 0), visible: false }
    const yPos = { id: `+y`, localPoint: new THREE.Vector3(0, top, 0),
      localNormal: new THREE.Vector3(0, 1, 0), visible: false }
    const yNeg = { id: `-y`, localPoint: new THREE.Vector3(0, bottom, 0),
      localNormal: new THREE.Vector3(0, -1, 0), visible: false }
    const zPos = { id: `+z`, localPoint: new THREE.Vector3(0, midY, midZ),
      localNormal: new THREE.Vector3(0, 0, 1), visible: false }
    const zNeg = { id: `-z`, localPoint: new THREE.Vector3(0, midY, -midZ),
      localNormal: new THREE.Vector3(0, 0, -1), visible: false }

    this.faces.set(xPos.id, xPos)
    this.faces.set(xNeg.id, xNeg)
    this.faces.set(yPos.id, yPos)
    this.faces.set(yNeg.id, yNeg)
    this.faces.set(zPos.id, zPos)
    this.faces.set(zNeg.id, zNeg)
  }

  private updateFaceVisibility(face: DimensionFace) {
    const cameraPosition = gvCurrentCamera()?.getLocation()
    if (!cameraPosition) {
      return
    }
    const worldPoint = this.rootObject.localToWorld(face.localPoint.clone())
    const worldNormal = face.localNormal.clone().transformDirection(this.rootObject.matrixWorld)

    face.visible = worldNormal.dot(new THREE.Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z)
      .sub(worldPoint)) >= 0
  }

  private shouldEdgeBeVisible(edge: DimensionEdge) {
    return !!(this.faces.get(edge.faces[0])?.visible || this.faces.get(edge.faces[1])?.visible)
  }

  private updateEdgeVisibility(edge: DimensionEdge) {
    edge.visible = this.shouldEdgeBeVisible(edge)
    edge.solidLineObject.visible = edge.visible
    edge.dashLineObject.visible = false
  }

  private projectLocalPoint(localPoint: THREE.Vector3) {
    const camera = gvCurrentCamera()
    const scene = gvCurrentScene()
    if (!camera || !scene) {
      return undefined
    }
    const worldPoint1 = this.rootObject.localToWorld(localPoint.clone())

    const screenPoint1 = camera.worldToScreenFloat(worldPoint1)
    const relScreenPoint1 = scene.toRelativeCoords(screenPoint1.x, screenPoint1.y)
    return screenPoint1.set(relScreenPoint1[0], relScreenPoint1[1])
  }

  private updateVertexProjection(vertex: DimensionVertex) {
    const projected = this.projectLocalPoint(vertex.localPoint)
    if (projected) {
      vertex.relScreenPoint.copy(projected)
    }
  }

  private updateVertexVisibility(vertex: DimensionVertex) {
    vertex.visualObject.visible = vertex.edgeIndexes
      .map((idx) => this.allEdges[idx])
      .some(edge => edge.solidLineObject.visible)
  }

  private buildSolidLine() {
    const allSequences = this.collectDimensionSequenses()
    const scores = allSequences.map(s => ProductDimensions.scoreDimensionsSequence(s))
    const maxScoreIndex = scores.reduce((maxIdx, curr, idx) =>
      curr > scores[maxIdx] ? idx : maxIdx, 0)

    const hasValidLastSequence = this.lastBestSequence.length > 0 &&
      this.isSequenceValid(this.lastBestSequence) &&
      ProductDimensions.isSequenceAllOnScreen(this.lastBestSequence)
    const shouldSwitch = !hasValidLastSequence // || (bestScore - lastBestSequenceScore > switchCost)
    const chosenSequence = shouldSwitch ? allSequences[maxScoreIndex] : this.lastBestSequence
    if (!chosenSequence) {
      return
    }

    this.lastBestSequence = chosenSequence
    this.allEdges.forEach((edge) => { edge.solidLineObject.visible = false })
    chosenSequence.forEach((edge) => { edge.solidLineObject.visible = true })
    this.allEdges.forEach((edge) => { edge.dashLineObject.visible = edge.visible && !edge.solidLineObject.visible })
  }

  private static scoreDimensionsSequence(sequence: DimensionEdge[]) {
    let lenSq = 0
    // Prefer sequences with distinct angles, closer to 90 degree. The worst theoretical case is when
    // all three dimensions are on the same line, bringing total angle penalty to 3.
    let anglePenalty = 0
    const maxAnglePenalty = sequence.length

    let outOfScreenPenalty = 0
    const maxOutOfScreenPenalty = 2.0 * sequence.length
    for (let i = 0; i < sequence.length; i += 1) {
      const v1 = sequence[i].vertex1
      const v2 = sequence[i].vertex2
      lenSq += v1.relScreenPoint.distanceToSq(v2.relScreenPoint)
      if (i + 1 < sequence.length) {
        const v1n = sequence[i + 1].vertex1
        const v2n = sequence[i + 1].vertex2
        const dir1 = v2.relScreenPoint.minus(v1.relScreenPoint).normalize()
        const dir2 = v2n.relScreenPoint.minus(v1n.relScreenPoint).normalize()
        anglePenalty += Math.abs(dir1.dot(dir2))
      }
      if (v1.relScreenPoint.x < 0.0 || v1.relScreenPoint.x > 1.0 ||
        v1.relScreenPoint.y < 0.0 || v1.relScreenPoint.y > 1.0
      ) {
        outOfScreenPenalty += 1
      }
      if (v2.relScreenPoint.x < 0.0 || v2.relScreenPoint.x > 1.0 ||
        v2.relScreenPoint.y < 0.0 || v2.relScreenPoint.y > 1.0
      ) {
        outOfScreenPenalty += 1
      }
    }
    const score = sequence.length * 
      (lenSq * (1.0 - anglePenalty / maxAnglePenalty) * (1.0 - outOfScreenPenalty / maxOutOfScreenPenalty))
    return score
  }

  // Check if all edges of the sequence are visible and belong to the outer outline.
  private isSequenceValid(sequence: DimensionEdge[]) {
    return sequence.every(edge => this.shouldEdgeBeVisible(edge) &&
      (this.getVisibleEdgesCount(edge.vertex1) < 3 || this.getVisibleEdgesCount(edge.vertex2) < 3))
  }

  private static isSequenceAllOnScreen(sequence: DimensionEdge[]) {
    return sequence.every(edge => 
      edge.vertex1.relScreenPoint.x >= 0.0 && edge.vertex1.relScreenPoint.x <= 1.0 &&
      edge.vertex1.relScreenPoint.y >= 0.0 && edge.vertex1.relScreenPoint.y <= 1.0 &&
      edge.vertex2.relScreenPoint.x >= 0.0 && edge.vertex2.relScreenPoint.x <= 1.0 &&
      edge.vertex2.relScreenPoint.y >= 0.0 && edge.vertex2.relScreenPoint.y <= 1.0
    )
  }

  private getVisibleEdgesCount(v: DimensionVertex) {
    return v.edgeIndexes.reduce((acc, curr) => acc + (this.allEdges[curr].visible ? 1 : 0), 0)
  }

  private collectDimensionSequenses() {
    const outerEdges = this.allEdges.filter(e => e.visible &&
      (this.getVisibleEdgesCount(e.vertex1) < 3 || this.getVisibleEdgesCount(e.vertex2) < 3))
    return outerEdges.flatMap((edge) => [this.buildSequence(edge, edge.vertex1),
      this.buildSequence(edge, edge.vertex2)])
  }

  private buildSequence(startEdge: DimensionEdge, startVertex: DimensionVertex) {
    const collectedDimensions = new Set<DimensionType>()
      const sequence: DimensionEdge[] = []
      let nextEdge: DimensionEdge | undefined = startEdge
      let nextVertex = startVertex
      while(sequence.length < 3) {
        nextEdge = nextVertex.edgeIndexes
          .map(idx => this.allEdges[idx])
          .filter(edge => edge.visible)
          .find(edge => !sequence.includes(edge))
        if (!nextEdge || collectedDimensions.has(nextEdge.dimension)) {
          break
        }
        collectedDimensions.add(nextEdge.dimension)
        sequence.push(nextEdge)
        nextVertex = nextEdge.vertex1 === nextVertex ? nextEdge.vertex2 : nextEdge.vertex1
      }
      return sequence
  }

  public onObjectHover() {
    const dynamicMeasurements = gvCurrentScene()?.getDynamicMeasurements()
    if (dynamicMeasurements && dynamicMeasurements.getIsEnabled()) {
      this.setVisible(false)
    }
  }

  public onObjectHoverEnd(isSelected: boolean) {
    if (isSelected && !this.shouldBeVisible) {
      this.setVisible(true)
    }
  }

  public onObjectSelect() {
    const dynamicMeasurements = gvCurrentScene()?.getDynamicMeasurements()
    if (this.isEnabled() && dynamicMeasurements && dynamicMeasurements.getIsEnabled()) {
      dynamicMeasurements.setTrackingItem(null)
    }
    this.setVisible(true)
  }

  public onObjectSelectEnd() {
    this.setVisible(false)
  }

  public onObjectDragFinish() {
    this.setVisible(true)
  }
}