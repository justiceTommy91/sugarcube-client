import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'

import type { FloorLine } from 'Renderer/assets/Types'
import type { PlaneType, Point2D } from 'Renderer/geomviewer/geom_types'
import { EPSILON, Point2, Point3, Vector2, Vector3 } from 'Renderer/geometry'
import { gvCurrentCamera, gvCurrentScene, gvRenderLibrary, gvViewManager } from 'Renderer/foundation/geom_app'
import {
  getCeilingPlane,
  getFloorPlane,
  sampleScene,
  sampleCeilingAbovePoint
} from 'Renderer/positioning/positioning_utilities'
import { GrandCentral } from 'Renderer/GrandCentral'
import {
  NOTIFY_VIEWER_WARNING,
  NOTIFY_CAMERA_TRANSFORM_UPDATE,
} from 'Renderer/geomviewer/geom_constants'
import { RoomDimensionsInfo } from 'Renderer/geomviewer/geom_types'
import { convertMetersToPartsByLocale } from 'utils/convertDimensions'

type Wall = {
  id: string

  // 2D points in floor coordinates.
  floorPoint1: Point2
  floorPoint2: Point2

  // Actual world point where the line is rendered (with offset from the wall).
  worldCeilingPoint1: Point3
  worldCeilingPoint2: Point3
  worldMiddleCeilingPoint: Point3
  worldFloorPoint1: Point3
  worldFloorPoint2: Point3
  worldMiddleFloorPoint: Point3
  // Outward pointing normal.
  worldNormal: Vector3

  // Arrays storing connected walls for each end of this wall.
  // The connections are sorted by absolute angle.
  connectedWalls1: string[]
  connectedWalls2: string[]

  // Indices of this wall in connection arrays.
  indexInConnections1: number
  indexInConnections2: number
}

// Types for floor line processing.
export type DimensionFloorLine = Pick<FloorLine, 'points' | 'len' | 'surfaceId' | 'n2'>
type ProcessedFloorLine = {
  points: [number, number][]
  surfaceId: string
  len: number
  n2: Point2D
  angle: number
  distance: number
}
type SegmentCompareFunc = (seg1: ProcessedFloorLine, seg2: ProcessedFloorLine) => number
type SortedPoint = { pos: [number, number]; floorLine: ProcessedFloorLine }
type VertexCluster = {
  x: number
  y: number
  outgoingEdges: {
    line: ProcessedFloorLine
    pointIndex: 0 | 1
  }[]
}

function calcDistance(p1: [number, number], p2: [number, number]) {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function normalizeAngle(angle: number) {
  let norm = angle % 360
  if (norm < 0) {
    norm += 360
  }
  return norm >= 180 ? norm - 180 : norm
}

function calcAngleDifference (seg1: ProcessedFloorLine, seg2: ProcessedFloorLine) {
  const norm1 = normalizeAngle(seg1.angle)
  const norm2 = normalizeAngle(seg2.angle)
  return Math.min(Math.abs(norm1 - norm2), 180 - Math.abs(norm1 - norm2))
}

// Assuming that the plane is formed the way as floor plane is: normal points upward, while d is positive.
function planeToWorld(plane: PlaneType, pos: Point2) {
  
  const p = [pos.x, pos.y, 0]
  const d = plane.d
  const xAxis = plane.rot[0]
  const yAxis = plane.rot[1]
  const zAxis = plane.rot[2]

  const p0 = [-d * zAxis[0], -d * zAxis[1], -d * zAxis[2]]
  return new Point3 (
      p0[0] + xAxis[0] * p[0] + yAxis[0] * p[1] + zAxis[0] * p[2],
      p0[1] + xAxis[1] * p[0] + yAxis[1] * p[1] + zAxis[1] * p[2],
      p0[2] + xAxis[2] * p[0] + yAxis[2] * p[1] + zAxis[2] * p[2],
  )
}

function pointsAreEqual(p1: Point2, p2: Point2) {
  return Math.abs(p1.x - p2.x) < EPSILON && Math.abs(p1.y - p2.y) < EPSILON
}

function clamp(num:number, min: number, max: number) { return Math.min(Math.max(num, min), max) }

type DimensionVisualLine = {
  root: THREE.Group
  line1: Line2
  line2: Line2
  tick1: Line2
  tick2: Line2
  baseGapLength: number
}

type Dimension = {
  ceilingLine: DimensionVisualLine
  floorLine: DimensionVisualLine
}

const LINE_WIDTH = 1.25
const LINE_TICK_LENGTH = 0.2 // Length of side ticks.
const LINE_TICKS_WALL_GAP = 0.035 // Gap between the ends of the line ticks and the wall line.
const LINE_DISTANCE_FROM_WALL = LINE_TICK_LENGTH + LINE_TICKS_WALL_GAP // Total off-wall offset length.
const WALL_THICKNESS_CORRECTION_PLUS = 0.0
const WALL_THICKNESS_CORRECTION_MINUS = 0.125
const MIDDLE_GAP_PER_CHAR = 0.075 // Empirical value, average needed line gap per text character.

export class RoomDimensions {
  private rootObject: THREE.Group = new THREE.Group()
  protected walls = new Map<string, Wall>()
  private dimensionLines = new Map<string, Dimension>()
  private lineMaterial: LineMaterial
  private isEnabled = false
  private isValid = false
  private shouldBeVisible = false
  private dimensionsPlane: PlaneType | undefined
  private wallShift: number

  constructor(floorLines: DimensionFloorLine[], wallShift: number, hasWallThickness = false) {
    this.wallShift = wallShift
    this.lineMaterial = new LineMaterial({
      color: 0x000000,
      linewidth: LINE_WIDTH,
      transparent: true,
    })
    const renderer = gvRenderLibrary()?.renderer
    if (renderer) {
      this.setResolution(renderer.getSize(new THREE.Vector2()))
    }
    this.initDimensionsPlane()
    this.createWalls(floorLines, hasWallThickness)
    this.onCameraTransformChange = this.onCameraTransformChange.bind(this)

    if (this.isValid) {
      this.initRenderObject()
      GrandCentral.getDispatcher().addObserver(NOTIFY_CAMERA_TRANSFORM_UPDATE, this.onCameraTransformChange)
    }
  }

  public dispose() {
    this.lineMaterial.dispose()
    GrandCentral.getDispatcher().removeObserver(this.onCameraTransformChange)
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    this.setVisible(this.shouldBeVisible)
  }

  public getIsEnabled() {
    return this.isEnabled
  }

  public getRootObject() {
    return this.rootObject
  }

  public getDimensionsInfo(): RoomDimensionsInfo | undefined {
    const ret: RoomDimensionsInfo = {
      dimensions: [],
      isValid: this.isValid,
      isEnabled: this.isEnabled,
      shouldBeVisible: this.shouldBeVisible,
      opacity: this.lineMaterial.opacity,
    }
    if (!this.isValid) {
      return ret
    }

    const sceneDimensions = gvCurrentScene()?.getDimensions()
    const camera = gvCurrentCamera()
    if (!camera || !sceneDimensions) {
      return this.isValid ? undefined : ret
    }

    this.walls.forEach((wall) => {
      const dimension = this.dimensionLines.get(wall.id)
      if (!dimension) {
        return
      }
      const hasVisualLine = this.dimensionLines.has(wall.id) &&
        (dimension.ceilingLine.root.visible || dimension.floorLine.root.visible)
      const worldPoint1 = dimension.ceilingLine.root.visible ? wall.worldCeilingPoint1 : wall.worldFloorPoint1
      const worldPoint2 = dimension.ceilingLine.root.visible ? wall.worldCeilingPoint2 : wall.worldFloorPoint2
      const worldMiddlePoint = dimension.ceilingLine.root.visible
        ? wall.worldMiddleCeilingPoint
        : wall.worldMiddleFloorPoint

      const p1CameraSpace = camera.worldToLocal(worldPoint1)
      const p2CameraSpace = camera.worldToLocal(worldPoint2)
      const pMiddleCameraSpace = camera.worldToLocal(worldMiddlePoint)

      const screenPoint1 = camera.worldToScreenFloat(worldPoint1)
      const screenPoint2 = camera.worldToScreenFloat(worldPoint2)
      const screenMiddlePoint = camera.worldToScreenFloat(worldMiddlePoint)
      const relativePoint1 = { x: screenPoint1.x / sceneDimensions[0], y: screenPoint1.y / sceneDimensions[1] }
      const relativePoint2 = { x: screenPoint2.x / sceneDimensions[0], y: screenPoint2.y / sceneDimensions[1] }
      const relativeMiddlePoint = {
        x: screenMiddlePoint.x / sceneDimensions[0],
        y: screenMiddlePoint.y / sceneDimensions[1],
      }
      const length = wall.floorPoint1.distanceTo(wall.floorPoint2)
      ret.dimensions.push({
        id: wall.id,
        screenPoint1,
        screenPoint2,
        screenMiddlePoint,
        relativePoint1,
        relativePoint2,
        relativeMiddlePoint,
        point1BehindCamera: p1CameraSpace.z > 0.0,
        point2BehindCamera: p2CameraSpace.z > 0.0,
        pointMiddleBehindCamera: pMiddleCameraSpace.z > 0.0,
        length,
        hasVisualLine,
      })
    })
    return ret
  }

  public getIsValid() {
    return this.isValid
  }

  public setResolution(screenSize: THREE.Vector2) {
    this.lineMaterial.resolution.copy(screenSize)
  }

  private initRenderObject() {
    this.rootObject.name = `Room dimensions root`
    this.walls.forEach((wall) => {
      const ceilingDimensionLine = this.createDimensionLine(wall, true)
      const floorDimensionLine = this.createDimensionLine(wall, false)

      if (ceilingDimensionLine && floorDimensionLine) {
        this.dimensionLines.set(wall.id, {
          floorLine: floorDimensionLine,
          ceilingLine: ceilingDimensionLine,
        })
        this.rootObject.add(ceilingDimensionLine.root, floorDimensionLine.root)
      }
    })
    this.setVisible(true)
  }

  private createWalls(floorLines: DimensionFloorLine[], correctForThickness: boolean) {
    this.isValid = false

    this.walls.clear()
    const processedLines = this.processFloorLines(floorLines)
    const wallsInfo = RoomDimensions.connectWalls(processedLines)
    wallsInfo.forEach((wallInfo, id) => {
      this.walls.set(id, {
        id,
        floorPoint1: wallInfo.points[0],
        floorPoint2: wallInfo.points[1],
        connectedWalls1: wallInfo.connectedWalls1,
        connectedWalls2: wallInfo.connectedWalls2,
        indexInConnections1: wallInfo.indexInConnections1,
        indexInConnections2: wallInfo.indexInConnections2,
        worldCeilingPoint1: new Point3(0, 0, 0),
        worldCeilingPoint2: new Point3(0, 0, 0),
        worldMiddleCeilingPoint: new Point3(0, 0, 0),
        worldNormal: wallInfo.normal,

        worldFloorPoint1: new Point3(0, 0, 0),
        worldFloorPoint2: new Point3(0, 0, 0),
        worldMiddleFloorPoint: new Point3(0, 0, 0),
      })
    })

    if (!this.prepareRoomOutline()) {
      this.isValid = false
      RoomDimensions.reportCreationError()
      return
    }

    this.isValid = true
    this.initWorldPoints(correctForThickness)
  }

  private static reportCreationError() {
    GrandCentral.getDispatcher().dispatchNotification({
      what: NOTIFY_VIEWER_WARNING,
      payload: {
        warning: `RoomDimensionsFailed`,
        info: {
          description: `Unable to infer room dimensions from gltf.`,
        }
      }
    })
  }

  private static clusterSegments(segments: ProcessedFloorLine[], sortCompareFunc: SegmentCompareFunc,
    compareFunc: SegmentCompareFunc, threshold: number) {
    segments.sort(sortCompareFunc)
    const clusters: ProcessedFloorLine[][] = []
    let currentCluster: ProcessedFloorLine[] = [segments[0]]
    for (let i = 1; i < segments.length; i += 1) {
      const segment = segments[i]
      const firstInCluster = currentCluster[0]
  
      const diff = compareFunc(segment, firstInCluster)
      if (diff <= threshold) {
        currentCluster.push(segment)
      } else {
        clusters.push(currentCluster)
        currentCluster = [segment]
      }
    }
    clusters.push(currentCluster)
    return clusters
  }

  private static computeSegmentAngleDistance(p0: [number, number], p1: [number, number]) {
    const dx = p1[0] - p0[0]
    const dy = p1[1] - p0[1]

    let distanceFromOrigin: number
    if (Math.abs(dx) < Number.EPSILON) {
      distanceFromOrigin = Math.abs(p0[0])
    } else {
      const slope = dy / dx
      const interceptY = p0[1] - slope * p0[0]
      distanceFromOrigin = Math.abs(interceptY) / Math.sqrt(slope * slope + 1)
    }
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    return {
      distance: distanceFromOrigin,
      angle,
    }
  }

  // For a given list of floor line segments that lay on the same line,
  // return a list of points, sorted by distance along said line.
  private static sortPointsAlongTheLine(floorLines: ProcessedFloorLine[]): SortedPoint[] {
    let dir: [number, number] = [1, 0]
    for (const line of floorLines) {
      const [p1, p2] = line.points
      const dx = p2[0] - p1[0]
      const dy = p2[1] - p1[1]
      const len = Math.hypot(dx, dy)
      if (len > EPSILON) {
        dir = [dx / len, dy / len]
        break
      }
    }

    const origin = floorLines[0].points[0]
    const dotToReference = (p: [number, number]) => (p[0] - origin[0]) * dir[0] + (p[1] - origin[1]) * dir[1]
    const points: SortedPoint[] = floorLines.flatMap(floorLine => ([
      { pos: floorLine.points[0], floorLine },
      { pos: floorLine.points[1], floorLine },
    ]))

    points.sort((p1, p2) => dotToReference(p1.pos) - dotToReference(p2.pos))
    return points
  }

  // For a given sorted list of floor line points that lay on the same line,
  // return a list of points that only mark gaps between walls.
  // Wall/doors/walls/etc segments may overlay each other, and even form several "layers" along the line they lay in.
  // We're interested only in continuos "wall" lines, where more than 1 layer intersect,
  // and gaps between them, which this function provides.
  // E.g. situation may look like this (walls: w1, w1, door: d1):
  // w1-----d1-w1-----w2---w2-d1----w1---w2--w2-----w1
  // which, in "layered" representation is:
  // w1--------w1                   w1  ------------w1
  //                  w2---w2            w2--w2      
  //        d1----------------d1                     
  // This function turns in into (p - a point):
  // p------------------------p      p----------------p
  private static squashPointsSegments(sortedPoints: SortedPoint[]) {
    const layers: Set<string> = new Set()
    const flattenPoints: [number, number][] = []
    sortedPoints.forEach((point) => {
      if (!layers.has(point.floorLine.surfaceId)) {
        if (layers.size === 0) {
          // Started a new wall:
          flattenPoints.push(point.pos)
        }
        layers.add(point.floorLine.surfaceId)
      } else {
        layers.delete(point.floorLine.surfaceId)
        if (layers.size === 0) {
          // Reached a gap:
          flattenPoints.push(point.pos)
        }
      }
    })
    return flattenPoints
  }

  // This function takes a list of points that lays on the same line, and creates wall segments out of point pairs,
  // filtering out gaps that are smaller then provided minimal gap width.
  private static createWallsFromFlattenPoints(flattenPoints: [number, number][], n2: Point2D,
    minGapWidth = 0.01): ProcessedFloorLine[] {
    if (flattenPoints.length % 2 !== 0) {
      return []
    }
    let isWall = false
    const ret: ProcessedFloorLine[] = []
    let currentWallStartPoint: [number, number] = [0, 0]
    for (let index = 0; index < flattenPoints.length; index += 1) {
      const point = flattenPoints[index]
      if (isWall) {
        let wallEnded = false
        const hasNextPoint = index < flattenPoints.length - 1
        if (hasNextPoint) {
          const nextPoint = flattenPoints[index + 1]
          const gapWidth = calcDistance(point, nextPoint)
          if (gapWidth < minGapWidth) {
            index += 1 // Skip next point.
          } else {
            wallEnded = true
          }
        } else {
          wallEnded = true
        }

        isWall = !wallEnded
        if (wallEnded) {
          const { angle, distance: dist } = RoomDimensions.computeSegmentAngleDistance(currentWallStartPoint, point)
          ret.push({
            points: [currentWallStartPoint, point],
            surfaceId: '',
            len: calcDistance(point, currentWallStartPoint),
            n2,
            // surfaceClass: `wall`,
            angle,
            distance: dist,
          })
        }
      } else {
        isWall = true
        currentWallStartPoint = point
      }
    }
    return ret
  }

  private static flattenLineSegments(floorLines: ProcessedFloorLine[]) {
    if (floorLines.length < 1) {
      return floorLines
    }
    const sortedPoints = RoomDimensions.sortPointsAlongTheLine(floorLines)
    const flattenPoints = RoomDimensions.squashPointsSegments(sortedPoints)
    const newFloorLines = RoomDimensions.createWallsFromFlattenPoints(flattenPoints, floorLines[0].n2)
    return newFloorLines
  }

  private processFloorLines(lines: DimensionFloorLine[]): ProcessedFloorLine[] {
    if (lines.length === 0) {
      return []
    }
    // We want to group all segments that lay on the same lines within certain angle and position tolerance.
    // First, cluster segments by angle:
    const angleThresholdDeg = 1.5

    const processedLines: ProcessedFloorLine[] = lines
      .map(line => {
        // WallSnap adds this shift needed for physics, but it makes dimensions inaccurate.
        const newLine = { ...line }
        newLine.points = [
          [line.points[0][0] - this.wallShift * newLine.n2[0], line.points[0][1] - this.wallShift * newLine.n2[1]],
          [line.points[1][0] - this.wallShift * newLine.n2[0], line.points[1][1] - this.wallShift * newLine.n2[1]],
        ]
        return newLine
      })
      .map(line => {
        const { angle, distance } = RoomDimensions.computeSegmentAngleDistance(line.points[0], line.points[1])
        return {
        ...line,
        angle,
        distance,
      }})
    const angleSortFunc = (seg1: ProcessedFloorLine, seg2: ProcessedFloorLine) => seg1.angle - seg2.angle
    const angleClusters = RoomDimensions.clusterSegments(processedLines, angleSortFunc,
      calcAngleDifference, angleThresholdDeg)

    // As angles can cycle (e.g. -179 deg. and 179 deg. are on the opposite ends of the sorted list
    //  while geometrically  are close to each other), the first and the last clusters might
    // actually represent the same cluster. Let's try to merge them by re-clustering.
    if (angleClusters.length > 1) {
      const first = angleClusters.pop() || []
      const last = angleClusters.shift() || []
      const tailClusters = RoomDimensions.clusterSegments([...first, ...last], angleSortFunc, calcAngleDifference,
        angleThresholdDeg)
      angleClusters.push(...tailClusters)
    }

    // Then, within each angle cluster, cluster segments by distance from origin:
    const finalClusters: ProcessedFloorLine[][] = []
    const distanceThreshold = 0.1
    const distanceDiff = (seg1: ProcessedFloorLine, seg2: ProcessedFloorLine) => seg1.distance - seg2.distance
    angleClusters.forEach((angleCluster) => {
      const distanceClusters = RoomDimensions.clusterSegments(angleCluster, distanceDiff, distanceDiff,
        distanceThreshold)
      finalClusters.push(...distanceClusters)
    })

    // Squash each cluster into single wall(s).
    const retLines: ProcessedFloorLine[] = finalClusters.map(cluster => RoomDimensions.flattenLineSegments(cluster))
      .flat()

    // Reassign unique wall ids:
    let id = 1
    retLines.forEach((line) => {
      line.surfaceId = String(id)
      id += 1
    })

    return retLines
  }

  private static addPointToClusters(line: ProcessedFloorLine, pointIndex: 0 | 1, clusters: VertexCluster[],
    tolerance: number) {
    const toleranceSq = tolerance * tolerance
    const point = line.points[pointIndex]
    let existingCluster = clusters.find((cluster) => {
      const dx = point[0] - cluster.x
      const dy = point[1] - cluster.y
      const distSq = dx * dx + dy * dy
      return distSq <= toleranceSq
    })
    if (!existingCluster) {
      existingCluster = { x: point[0], y: point[1], outgoingEdges: []}
      clusters.push(existingCluster)
    }
    existingCluster.outgoingEdges.push({ line, pointIndex })
  }

  private static connectWalls(floorLines: ProcessedFloorLine[]) {
    const minLength = Math.min(...floorLines.map(l => l.len))
    const vertexMergeTolerance = Math.min(0.1, 0.5 * minLength)
    const clusters: VertexCluster[] = []
    floorLines
      .filter((line) => line.len > vertexMergeTolerance)
      .forEach((line) => {
        RoomDimensions.addPointToClusters(line, 0, clusters, vertexMergeTolerance)
        RoomDimensions.addPointToClusters(line, 1, clusters, vertexMergeTolerance)
      })

    const wallsInfo = new Map<string, { 
      points: Point2[]
      connectedWalls1: string[]
      connectedWalls2: string[]
      indexInConnections1: number
      indexInConnections2: number
      normal: Vector3
    }>()
    clusters.forEach((cluster) => {
      if (cluster.outgoingEdges.length === 0) {
        return
      }
      const connectedWalls: Array<string> = []
      const normals2D: Array<Point2> = []

      const vertexPosition = new Vector2(0, 0)
      cluster.outgoingEdges.forEach((edge) => {
        connectedWalls.push(edge.line.surfaceId)
        normals2D.push(new Point2(edge.line.n2[0], edge.line.n2[1]))

        const p = edge.line.points[edge.pointIndex]
        vertexPosition.plus(new Vector2(p[0], p[1]))
      })
      vertexPosition.scale(1.0 / cluster.outgoingEdges.length)
      connectedWalls.forEach((wallId, index) => {
        const normal2D = normals2D[index]
        const info = wallsInfo.get(wallId) || { 
          points: [], 
          connectedWalls1: [], 
          connectedWalls2: [],
          indexInConnections1: 0,
          indexInConnections2: 0,
          normal: new Vector3(normal2D.x, normal2D.y, 0).normalize().negate()
        }
        info.points.push(new Point2(vertexPosition.dx, vertexPosition.dy))

        if (info.points.length === 1) {
          info.connectedWalls1.push(...connectedWalls.filter(id => id !== wallId))
          info.indexInConnections1 = index
        } else {
          info.connectedWalls2.push(...connectedWalls.filter(id => id !== wallId))
          info.indexInConnections2 = index
        }
        wallsInfo.set(wallId, info)
      })
    })
    return wallsInfo
  }

  private deleteWall(wallId: string) {
    const wall = this.walls.get(wallId)
    if (!wall) {
      return
    }

    let connectedId = wall.connectedWalls1.indexOf(wallId)
    if (connectedId > -1) {
      wall.connectedWalls1.splice(connectedId, 1)
      if (wall.indexInConnections1 > connectedId) {
        wall.indexInConnections1 -= 1
      }
    }

    connectedId = wall.connectedWalls2.indexOf(wallId)
    if (connectedId > -1) {
      wall.connectedWalls2.splice(connectedId, 1)
      if (wall.indexInConnections2 > connectedId) {
        wall.indexInConnections2 -= 1
      }
    }

    this.walls.delete(wallId)
  }

  private calcWallClusterSizeSq(walls: Array<string>) {
    if (walls.length === 0) {
      return 0
    }

    const minPoint = new Point2(Infinity, Infinity)
    const maxPoint = new Point2(-Infinity, -Infinity)

    walls.forEach(wallId => {
      const wall = this.walls.get(wallId)
      if (wall) {
        minPoint.min(wall.floorPoint1).min(wall.floorPoint2)
        maxPoint.max(wall.floorPoint1).max(wall.floorPoint2)
      }
    })

    return minPoint.distanceToSq(maxPoint)
  }

  private findLargestWallCluster(wallClusters: Array<Array<string>>) {
    let maxClusterId = 0
    let maxClusterSizeSq = 0

    wallClusters.forEach((wallCluster, index) => {
      const clusterSizeSq = this.calcWallClusterSizeSq(wallCluster)
      if (clusterSizeSq > maxClusterSizeSq) {
        maxClusterId = index
        maxClusterSizeSq = clusterSizeSq
      }
    })

    return {maxClusterId, maxClusterSizeSq}
  }

  private filterWalls(wallsToKeep: Array<string>) {
    this.walls.forEach((wall) => {
      if (!wallsToKeep.includes(wall.id)) {
        this.deleteWall(wall.id)
      }
    })
  }

  private traverseWallOutline(startWallId: string, traverseCCW: boolean) {
    const outline: Array<string> = []
    let wall = this.walls.get(startWallId)
    let prevWallId = ''

    while(wall && !outline.includes(wall.id)) {
      outline.push(wall.id)

      const areWallPointsSorted = wall.connectedWalls1.includes(prevWallId)
      const connectedWallsNext = areWallPointsSorted ? wall.connectedWalls2 : wall.connectedWalls1
      const wallIndexInConnnections = areWallPointsSorted ? wall.indexInConnections2 : wall.indexInConnections1
      const numConnectedWalls = connectedWallsNext.length

      if (numConnectedWalls === 0) {
        return []
      }

      // Choose next or previous wall (by index) from the list of connected walls.
      const nextWallId = traverseCCW ? (wallIndexInConnnections + numConnectedWalls - 1) % numConnectedWalls
                                      : wallIndexInConnnections % numConnectedWalls

      prevWallId = wall.id
      wall = this.walls.get(connectedWallsNext[nextWallId])
    }

    return outline
  }

  // Filter out all the standalone and internal walls we do not want to show dimensions on.
  // This function returns false when it is impossible to show room dimensions. This can happen in 2 scenarios:
  //  - There are less than 4 connected walls in the room
  //  - Walls are too fragmented - there is no single connected wall cluster forming room's outline
  private prepareRoomOutline() {
    // --------------------------------------------------------- //
    // Find disconnected wall chains:
    //  - Find walls that have connections only on one end
    //  - Recursively traverse their connections on the other end while they have exactly one connection
    // --------------------------------------------------------- //
    const disconnectedWalls = new Array<string>()
    let disconnectedWallChains = new Array<Array<string>>()
    this.walls.forEach((wall) => {
      if (disconnectedWalls.includes(wall.id) || 
          (wall.connectedWalls1.length !== 0 && wall.connectedWalls2.length !== 0)) {
        return
      }

      disconnectedWalls.push(wall.id)
      const wallChain = [wall.id]

      let connectedWalls = wall.connectedWalls1.length === 0 ? wall.connectedWalls2 : wall.connectedWalls1
      let prevWall = wall.id
      while (connectedWalls.length === 1) {
        const connectedWall = this.walls.get(connectedWalls[0])
        if (!connectedWall) {
          break
        }

        disconnectedWalls.push(connectedWall.id)
        wallChain.push(connectedWall.id)
        connectedWalls = connectedWall.connectedWalls1.includes(prevWall) ? connectedWall.connectedWalls2
                                                                          : connectedWall.connectedWalls1

        prevWall = connectedWall.id
      }

      disconnectedWallChains.push(wallChain)
    })

    // Remove standalone walls
    disconnectedWallChains = disconnectedWallChains.filter(wallChain => wallChain.length >= 2)

    // --------------------------------------------------------- //
    // Find connected wall clusters:
    //  - For all remaining walls not contained in 'disconnectedWallChains' traverse their connections
    //    and group them into clusters
    // --------------------------------------------------------- //
    const connectedWalls = [...this.walls.keys()].filter(wallId => !disconnectedWalls.includes(wallId))

    const connectedWallClusters = new Array<Array<string>>
    const visited: Array<string> = []

    connectedWalls.forEach((wallId) => {
      if (visited.includes(wallId)) {
        return
      }

      const wallCluster: Array<string> = []

      const tempVisited = [wallId]
      while (tempVisited.length > 0) {
        const nextWallId = tempVisited.pop()
        if (nextWallId && !wallCluster.includes(nextWallId)) {
          wallCluster.push(nextWallId)

          const nextWall = this.walls.get(nextWallId)
          nextWall?.connectedWalls1.forEach(connectedWallId => {
            if (connectedWalls.includes(connectedWallId)) {
              tempVisited.push(connectedWallId)
            }
          })
          nextWall?.connectedWalls2.forEach(connectedWallId => {
            if (connectedWalls.includes(connectedWallId)) {
              tempVisited.push(connectedWallId)
            }
          })
        }
      }

      connectedWallClusters.push(wallCluster)
      visited.push(...wallCluster)
    })

    // --------------------------------------------------------- //
    // Find the largest wall cluster and the largest wall chain
    // --------------------------------------------------------- //
    const largestWallChain = this.findLargestWallCluster(disconnectedWallChains)
    const largestWallCluster = this.findLargestWallCluster(connectedWallClusters)

    // Largest wall cluster found should be at least half of the size of the whole room - 
    // otherwise we cannot reliably show dimensions since the room is too fragmented
    const roomSize = this.calcWallClusterSizeSq(disconnectedWallChains.flat().concat(connectedWallClusters.flat()))

    if (Math.max(largestWallChain.maxClusterSizeSq, largestWallCluster.maxClusterSizeSq) < roomSize * 0.5) {
      return false
    }

    // --------------------------------------------------------- //
    // Find room outline:
    //  - If the largest element is a wall cluster find its outline and discard all the internal walls
    //  - If the largest element is a disconnected wall chain we include all disconnected wall chains in the outline
    // --------------------------------------------------------- //
    let roomOutline: Array<string>
    if (largestWallChain.maxClusterSizeSq < largestWallCluster.maxClusterSizeSq) {
      const wallCluster = connectedWallClusters[largestWallCluster.maxClusterId]

      // Remove all the walls not contained in the largest found cluster
      this.filterWalls(wallCluster)

      // Find leftmost wall in the cluster
      let leftmostWallId = wallCluster[0]
      let minX = Infinity
      wallCluster.forEach(wallId => {
        const wall = this.walls.get(wallId)
        if (!wall) {
          return
        }

        const wallMinX = Math.min(wall.floorPoint1.x, wall.floorPoint2.x)
        if (wallMinX < minX) {
          minX = wallMinX
          leftmostWallId = wallId
        }
      })

      // Traverse the cluster in CCW and CW order and choose the largest traversal as its outline
      const roomOutline1 = this.traverseWallOutline(leftmostWallId, true)
      const roomOutline2 = this.traverseWallOutline(leftmostWallId, false)

      const roomOutlineSize1 = this.calcWallClusterSizeSq(roomOutline1)
      const roomOutlineSize2 = this.calcWallClusterSizeSq(roomOutline2)

      roomOutline = roomOutlineSize1 > roomOutlineSize2 ? roomOutline1 : roomOutline2
    } else {
      roomOutline = disconnectedWallChains.flat()
    }

    // Remove all the walls not contained in the found outline
    this.filterWalls(roomOutline)

    return this.walls.size >= 4
  }

  private initDimensionsPlane() {
    const ceilingPlane = getCeilingPlane()
    const floorPlane = getFloorPlane()
    if (!ceilingPlane || !floorPlane) {
      return
    }
    this.dimensionsPlane = { ...floorPlane }
    // We want dimensions to visually slightly above the ceiling plane.
    const verticalDelta = 0.025
    this.dimensionsPlane.d = -(ceilingPlane.d + verticalDelta)
  }

  private initWorldPoints(correctForThickness: boolean) {
    const floorPlane = getFloorPlane()
    if (!floorPlane) {
      return
    }

    // Init base values.
    this.walls.forEach((wall) => {
      const floorPoint1 = planeToWorld(floorPlane, wall.floorPoint1)
      const floorPoint2 = planeToWorld(floorPlane, wall.floorPoint2)

      // Offset points slightly from exact corners, to make sure we're hitting the correct ceiling polygon.
      const offset = 0.025
      const dir = floorPoint2.minus(floorPoint1).normalize().scale(offset)
      floorPoint1.plus(dir)
      floorPoint2.sub(dir)

      wall.worldFloorPoint1 = floorPoint1
      wall.worldFloorPoint2 = floorPoint2

      const ceilinPoint1 = sampleCeilingAbovePoint(floorPoint1)?.position || new Point3(0, 0, 0)
      const ceilinPoint2 = sampleCeilingAbovePoint(floorPoint2)?.position || new Point3(0, 0, 0)
      const distance1Sq = floorPoint1.distanceToSq(ceilinPoint1)
      const distance2Sq = floorPoint2.distanceToSq(ceilinPoint2)
      // If a ceiling polygon above the wall is parallel to the floor, use it to position the dimension line,
      // otherwise use the "canonical" ceiling plane.
      if (Math.abs(distance1Sq - distance2Sq) < EPSILON) {
        wall.worldCeilingPoint1 = ceilinPoint1
        wall.worldCeilingPoint2 = ceilinPoint2
      } else {
      wall.worldCeilingPoint1 = this.dimensionsPlane
        ? planeToWorld(this.dimensionsPlane, wall.floorPoint1)
        : new Point3(0, 0, 0)
      wall.worldCeilingPoint2 = this.dimensionsPlane
        ? planeToWorld(this.dimensionsPlane, wall.floorPoint2)
        : new Point3(0, 0, 0)
      }

      const normal3D = planeToWorld(floorPlane, new Point2(wall.worldNormal.dx, wall.worldNormal.dy))
      wall.worldNormal = new Vector3(normal3D.x, 0, normal3D.z).normalize()
    })
    // Apply offsets.
    this.walls.forEach((wall) => {
      const offsetFromWall = wall.worldNormal.clone().scale(LINE_DISTANCE_FROM_WALL)

      // Correct for wall thickness: when adjacent wall for outward looking corner,
      // slightly lengthen the line, otherwise, slightly shorten.
      if (correctForThickness) {
        const wallDirection = wall.worldCeilingPoint2.minus(wall.worldCeilingPoint1).normalize()
        const areWallPointsSorted = Vector3.cross(wallDirection, wall.worldNormal).dy > 0
        if (!areWallPointsSorted) {
          wallDirection.negate()
        }

        const connectedWall1 = wall.connectedWalls1.length !== 0 ? this.walls.get(wall.connectedWalls1[0]) : null
        if (connectedWall1) {
          const connectedDirection = connectedWall1.worldCeilingPoint2.minus(connectedWall1.worldCeilingPoint1)
          if (!pointsAreEqual(wall.floorPoint1, connectedWall1.floorPoint2)) {
            connectedDirection.negate()
          }
          const doExtend = wallDirection.clone().cross(connectedDirection).dy > 0
          const offset = doExtend
            ? wallDirection.clone().scale(WALL_THICKNESS_CORRECTION_PLUS)
            : wallDirection.clone().scale(WALL_THICKNESS_CORRECTION_MINUS)

          if ((areWallPointsSorted && doExtend) ||
              (!areWallPointsSorted && !doExtend)) {
            offset.negate()
          }

          wall.worldCeilingPoint1 = wall.worldCeilingPoint1.plus(offset)
          wall.worldFloorPoint1 = wall.worldFloorPoint1.plus(offset)
        }

        const connectedWall2 = wall.connectedWalls2.length !== 0 ? this.walls.get(wall.connectedWalls2[0]) : null
        if (connectedWall2) {
          const connectedDirection = connectedWall2.worldCeilingPoint1.minus(connectedWall2.worldCeilingPoint2)
          if (!pointsAreEqual(wall.floorPoint2, connectedWall2.floorPoint1)) {
            connectedDirection.negate()
          }
          const doExtend = wallDirection.clone().cross(connectedDirection).dy > 0
          const offset = doExtend
            ? wallDirection.clone().scale(WALL_THICKNESS_CORRECTION_PLUS)
            : wallDirection.clone().scale(WALL_THICKNESS_CORRECTION_MINUS)

          if ((areWallPointsSorted && !doExtend) ||
              (!areWallPointsSorted && doExtend)) {
            offset.negate()
          }

          wall.worldCeilingPoint2 = wall.worldCeilingPoint2.plus(offset)
          wall.worldFloorPoint2 = wall.worldFloorPoint2.plus(offset)
        }
      }

      wall.worldCeilingPoint1 = wall.worldCeilingPoint1.plus(offsetFromWall)
      wall.worldCeilingPoint2 = wall.worldCeilingPoint2.plus(offsetFromWall)
      wall.worldMiddleCeilingPoint.set(
        0.5 * (wall.worldCeilingPoint1.x + wall.worldCeilingPoint2.x),
        0.5 * (wall.worldCeilingPoint1.y + wall.worldCeilingPoint2.y),
        0.5 * (wall.worldCeilingPoint1.z + wall.worldCeilingPoint2.z),
      )

      wall.worldFloorPoint1 = wall.worldFloorPoint1.plus(offsetFromWall)
      wall.worldFloorPoint2 = wall.worldFloorPoint2.plus(offsetFromWall)
      wall.worldMiddleFloorPoint.set(
        0.5 * (wall.worldFloorPoint1.x + wall.worldFloorPoint2.x),
        0.5 * (wall.worldFloorPoint1.y + wall.worldFloorPoint2.y),
        0.5 * (wall.worldFloorPoint1.z + wall.worldFloorPoint2.z),
      )
    })
  }

  private createDimensionLine(wall: Wall, isCeiling: boolean): DimensionVisualLine | undefined {
    const worldPoint1 = isCeiling ? wall.worldCeilingPoint1 : wall.worldFloorPoint1
    const worldPoint2 = isCeiling ? wall.worldCeilingPoint2 : wall.worldFloorPoint2

    const dir = worldPoint2.minus(worldPoint1)
    const len = dir.len()
    const { wallLengthCm } = convertMetersToPartsByLocale(len, `ca/en`)
    const { wallLengthFeetPart, wallLengthInchesPart } = convertMetersToPartsByLocale(len, `us/en`)
    const maxTextLength = Math.max(`${wallLengthFeetPart}' ${wallLengthInchesPart}"`.length,
      `${wallLengthCm} cm`.length)

    const baseGapLength = MIDDLE_GAP_PER_CHAR * maxTextLength
    if (len <= baseGapLength) {
      return undefined
    }
    dir.normalize().scale(0.5 * (len - baseGapLength))
    const line1p1 = worldPoint1
    const line1p2 = worldPoint1.clone().plus(dir)
    const line2p1 = worldPoint2.clone().sub(dir)
    const line2p2 = worldPoint2
    const line1Geometry = new LineGeometry()
    line1Geometry.setPositions([
      line1p1.x, line1p1.y, line1p1.z,
      line1p2.x, line1p2.y, line1p2.z,
    ])
    const line1 = new Line2(line1Geometry, this.lineMaterial)

    const line2Geometry = new LineGeometry()
    line2Geometry.setPositions([
      line2p1.x, line2p1.y, line2p1.z,
      line2p2.x, line2p2.y, line2p2.z,
    ])
    const line2 = new Line2(line2Geometry, this.lineMaterial)

    const tick1Start = worldPoint1.clone()
      .plus(wall.worldNormal.clone().scale(LINE_TICK_LENGTH * 0.5).negate())
    const tick1End = worldPoint1.clone()
      .plus(wall.worldNormal.clone().scale(LINE_TICK_LENGTH * 0.5))
    const tick1Geometry = new LineGeometry()
    tick1Geometry.setPositions([
      tick1Start.x,
      tick1Start.y,
      tick1Start.z,
      tick1End.x,
      tick1End.y,
      tick1End.z,
    ])
    const tick1 = new Line2(tick1Geometry, this.lineMaterial)

    const tick2Start = worldPoint2.clone()
      .plus(wall.worldNormal.clone().scale(LINE_TICK_LENGTH * 0.5).negate())
    const tick2End = worldPoint2.clone()
      .plus(wall.worldNormal.clone().scale(LINE_TICK_LENGTH * 0.5))
    const tick2Geometry = new LineGeometry()
    tick2Geometry.setPositions([
      tick2Start.x,
      tick2Start.y,
      tick2Start.z,
      tick2End.x,
      tick2End.y,
      tick2End.z,
    ])
    const tick2 = new Line2(tick2Geometry, this.lineMaterial)

    const root = new THREE.Group()
    root.add(line1, line2, tick1, tick2)
    return { root, line1, line2, tick1, tick2, baseGapLength }
  }

  private onCameraTransformChange() {
    const cameraView = gvCurrentCamera()?.getUnitViewDir()
    if (!cameraView) {
      return
    }

    const topDownStaticViewVector = new Vector3(0, 0, -1)
    const topViewLabel = gvViewManager()?.getTopDownViewLabel()
    if (topViewLabel) {
      const view = gvViewManager()?.getCameraView(topViewLabel)
      if (view) {
        topDownStaticViewVector.applyQuaternion(view.rotation)
      }
    }

    this.walls.forEach(wall => this.chooseVisibleLine(wall))
    const minDot = 0.15
    const currDot = cameraView.dot(topDownStaticViewVector)
    this.lineMaterial.opacity = clamp((currDot - minDot) / (1.0 - minDot), 0, 1)
    this.adjustLineGapsToCamera()
  }

  private adjustLineGapsToCamera() {
    const camera = gvCurrentCamera()
    const threeCamera = camera?.getThreeCamera()
    const cameraPosition = camera?.getLocation()
    if (!threeCamera || !cameraPosition) {
      return
    }
    // Empirical values, at which the base gap looks ok.
    const baseCameraDistance = 15
    const baseCameraFov = 0.3717
    this.dimensionLines.forEach((dimension, id) => {
      const wall = this.walls.get(id)
      if (!wall) {
        return
      }

      const isCeilingLine = dimension.ceilingLine.root.visible
      const line = isCeilingLine ? dimension.ceilingLine : dimension.floorLine
      const worldPoint1 = isCeilingLine ? wall.worldCeilingPoint1 : wall.worldFloorPoint1
      const worldPoint2 = isCeilingLine ? wall.worldCeilingPoint2 : wall.worldFloorPoint2
      const worldMiddlePoint = isCeilingLine ? wall.worldMiddleCeilingPoint : wall.worldMiddleFloorPoint

      const dir = worldPoint2.minus(worldPoint1)
      const wallLength = dir.len()
      const distance = cameraPosition.distanceTo(worldMiddlePoint)
      const gapLength = clamp(line.baseGapLength * (threeCamera.fov / baseCameraFov) * (distance / baseCameraDistance),
        0.0, wallLength)
      dir.normalize().scale(0.5 * gapLength)

      const gapPoint1 = worldMiddlePoint.clone().sub(dir)
      const gapPoint2 = worldMiddlePoint.clone().plus(dir)

      line.line1.geometry.setPositions([
        worldPoint1.x, worldPoint1.y, worldPoint1.z,
        gapPoint1.x, gapPoint1.y, gapPoint1.z,
      ])
      line.line2.geometry.setPositions([
        gapPoint2.x, gapPoint2.y, gapPoint2.z,
        worldPoint2.x, worldPoint2.y, worldPoint2.z,
      ])
    })
  }

  private setVisible(visible: boolean) {
    this.shouldBeVisible = visible
    this.rootObject.visible = this.isEnabled && visible
    gvCurrentScene()?.setIsDirty(true)
  }

  private chooseVisibleLine(wall: Wall) {
    const camera = gvCurrentCamera()
    const floorPlane = getFloorPlane()
    const dimension = this.dimensionLines.get(wall.id)
    if (!floorPlane || !dimension || !camera) {
      return
    }

    const cameraPosition = camera.getLocation()

    // Offset corner points from corners for more reliable sampling.
    const wallDir2D = wall.floorPoint2.minus(wall.floorPoint1)
    const offset = 0.33 * wallDir2D.len()
    wallDir2D.normalize()
    const floor2DPoint1 = wall.floorPoint1.clone().plus(wallDir2D.clone().scale(offset))
    const floor2DPoint2 = wall.floorPoint2.clone().plus(wallDir2D.clone().scale(offset).negate())

    const floorPoint1 = planeToWorld(floorPlane, floor2DPoint1)
    const floorPoint2 = planeToWorld(floorPlane, floor2DPoint2)

    const threshold = 0.005
    // This worldNormal is always outward-facing.
    const isBackFacing = wall.worldNormal.dot(floorPoint1.minus(cameraPosition).normalize()) < threshold

    let onePointOccluded = false
    if (isBackFacing) {
      const screenPoint1 = camera.worldToScreenFloat(floorPoint1)
      const point1SampleResult = sampleScene(screenPoint1)
      onePointOccluded = !!point1SampleResult &&
        point1SampleResult.plane.class === `wall` &&
        point1SampleResult.position.distanceToSq(floorPoint1) > EPSILON

      if (!onePointOccluded) {
        const screenPoint2 = camera.worldToScreenFloat(floorPoint2)
        const point2SampleResult = sampleScene(screenPoint2)
        onePointOccluded = !!point2SampleResult &&
          point2SampleResult.plane.class === `wall` &&
          point2SampleResult.position.distanceToSq(floorPoint2) > EPSILON
      }
    }
    // Note that both lines invisible is possible too (e.g. on a partially occluded backfacing wall).
    dimension.floorLine.root.visible = isBackFacing && !onePointOccluded
    dimension.ceilingLine.root.visible = !dimension.floorLine.root.visible && !isBackFacing
  }
}