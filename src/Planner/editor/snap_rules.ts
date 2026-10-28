/* eslint-disable max-classes-per-file */
/* eslint-disable class-methods-use-this */
import * as THREE from 'three'

import type { Wall, WallsGraph } from 'Planner/editor/walls_graph'
import {
  AXIS_SNAP_THRESHOLD,
  AXIS_SNAP_LINE_THRESHOLD,
  WALL_LINE_ANGLE_SNAP_THRESHOLD_DEG,
} from 'Planner/planner_constants'
import { EPSILON } from 'Renderer/geometry'
import type { Vector2Like } from 'Planner/api_types'

const projectOnLine = (p: THREE.Vector2, origin: THREE.Vector2, dir: THREE.Vector2) =>
  origin.clone().add(dir.clone().multiplyScalar(p.clone().sub(origin).dot(dir)))

const intersectLines = (p1: THREE.Vector2, dir1: THREE.Vector2, p2: THREE.Vector2, dir2: THREE.Vector2) => {
  const cross = dir1.x * dir2.y - dir1.y * dir2.x
  if (Math.abs(cross) < EPSILON) {
    return null
  }
  const s = ((p2.x - p1.x) * dir1.y - (p2.y - p1.y) * dir1.x) / cross
  const t = ((p2.x - p1.x) * dir2.y - (p2.y - p1.y) * dir2.x) / cross
  return {
    point: p1.clone().add(dir1.clone().multiplyScalar(t)),
    s,
    t,
  }
}

const snapVectorToAngle = (vector: THREE.Vector2, refVector: THREE.Vector2, angle: number) => {
  const center = new THREE.Vector2()
  const d1 = refVector.clone().rotateAround(center, angle)
  const d2 = refVector.clone().rotateAround(center, -angle)
  return Math.abs(vector.dot(d1)) >= Math.abs(vector.dot(d2)) ? d1 : d2
}

export type SnapLine = { p1: Vector2Like, p2: Vector2Like }

export const SNAP_TYPE_LINES = 'lines'
export const SNAP_TYPE_ANGLE = 'angle'
export const SNAP_TYPE_PARALLEL = 'parallel'
export type SnapType = typeof SNAP_TYPE_LINES | typeof SNAP_TYPE_ANGLE | typeof SNAP_TYPE_PARALLEL

export type NoSnap = {
  isActive: false
}
export type LineSnap = {
  isActive: true
  type: typeof SNAP_TYPE_LINES
  lines: SnapLine[]
}
export type AngleSnap = {
  isActive: true
  type: typeof SNAP_TYPE_ANGLE | typeof SNAP_TYPE_PARALLEL
  pairs: { line1: SnapLine, line2: SnapLine, isOnVertex: boolean }[]
  wallIds: { wall1: string, wall2: string }[]
}
export type SnapState = NoSnap | LineSnap | AngleSnap

export interface VertexSnapRule {
  trySnap(vertexId: string, toPosition: THREE.Vector2, wallsGraph: WallsGraph): THREE.Vector2
  getSnapState(vertexId: string, point: THREE.Vector2, wallsGraph: WallsGraph): SnapState
}

export interface WallSnapRule {
  trySnap(wallId: string, normalMovement: THREE.Vector2, wallsGraph: WallsGraph): THREE.Vector2
  getSnapState(wallId: string, wallsGraph: WallsGraph): SnapState
}

type Axis = `x` | `y`
export class AxisSnap<A extends Axis> implements VertexSnapRule {
  private axis: A
  private otherAxis: A

  constructor(axis: A) {
    this.axis = axis
    this.otherAxis = (this.axis === 'x' ? `y` : `x`) as A
  }

  public trySnap(vertexId: string, toPosition: THREE.Vector2, wallsGraph: WallsGraph): THREE.Vector2 {
    const axisValues = [...wallsGraph.getVertices().keys()]
      .filter(id => id !== vertexId)
      .map((id) => wallsGraph.getVertexPosition(id)[this.axis])
    const snapValue = axisValues.reduce<number | null>((best, val) => {
        const d = Math.abs(val - toPosition[this.axis])
        if (d >= AXIS_SNAP_THRESHOLD) {
          return best
        }
        if (best === null) {
          return val
        }
        return Math.abs(best - toPosition[this.axis]) <= d ? best : val
      }, null)

    if (snapValue === null) {
      return toPosition
    }

    const result = new THREE.Vector2()
    result[this.axis] = snapValue
    result[this.otherAxis] = toPosition[this.otherAxis]
    return result
  }

  public getSnapState(vertexId: string, point: THREE.Vector2, wallsGraph: WallsGraph): SnapState {
    const snappedPositions = [...wallsGraph.getVertices().keys()]
      .filter(id => id !== vertexId)
      .map((id) => wallsGraph.getVertexPosition(id))
      .filter(p => Math.abs(p[this.axis] - point[this.axis]) < AXIS_SNAP_LINE_THRESHOLD)
    if (snappedPositions.length === 0) {
      return { isActive: false }
    }
    // Add vertex's self position to properly form a snap line.
    snappedPositions.push(wallsGraph.getVertexPosition(vertexId))
    const p1 = snappedPositions.reduce((min, p) => p[this.otherAxis] < min[this.otherAxis] ? p : min)
    const p2 = snappedPositions.reduce((max, p) => p[this.otherAxis] > max[this.otherAxis] ? p : max)
    return { isActive: true, lines: [{p1, p2}], type: SNAP_TYPE_LINES }
  }
}

export class XSnap extends AxisSnap<`x`> {
  constructor() { super(`x`) }
}

export class YSnap extends AxisSnap<`y`> {
  constructor() { super(`y`) }
}

export class VertexWallsAngleSnap implements VertexSnapRule {
  private angleRad: number
  private angleThresholdRad: number

  constructor(angleDeg: number, angleThresholdDeg: number) {
    this.angleRad = angleDeg * Math.PI / 180
    this.angleThresholdRad = angleThresholdDeg * Math.PI / 180
  }

  public trySnap(vertexId: string, toPosition: THREE.Vector2, wallsGraph: WallsGraph): THREE.Vector2 {
    const vertex = wallsGraph.getVertexById(vertexId)
    if (!vertex) {
      return toPosition
    }

    const [vertex1Pos, vertex2Pos] = wallsGraph.getVertexNeighborVertices(vertexId)
      .map(vert => vert ? wallsGraph.getVertexPosition(vert.id) : undefined)
    if (!vertex1Pos || !vertex2Pos) {
      return toPosition
    }

    const straightLine = new THREE.Vector2().subVectors(vertex2Pos, vertex1Pos)
    const vert1ToPoint = new THREE.Vector2().subVectors(toPosition, vertex1Pos)
    const lenSq = straightLine.lengthSq()
    if (lenSq === 0) {
      return toPosition
    }
    const t = vert1ToPoint.dot(straightLine) / straightLine.lengthSq()
    if (t <= 0 || t >= 1) {
      return toPosition
    }
    const vecA = vertex1Pos.clone().sub(toPosition)
    const vecB = vertex2Pos.clone().sub(toPosition)
    const currentAngle = vecA.angleTo(vecB)
    if (Math.abs(currentAngle - this.angleRad) > this.angleThresholdRad) {
      return toPosition
    }

    const lineLength = straightLine.length()
    const sinA = Math.sin(this.angleRad)

    // Special handling of snapping to a straight line case.
    if (sinA < EPSILON) {
      const projected = vertex1Pos.clone().addScaledVector(straightLine, t)
      return projected
    }

    // Here we want to find a point to snap to, so walls between vertex1Pos, vertex3Pos and snapped point
    // will have the angle equal to this.angleRad.
    // All possible snap points lay on a circle through vertex1Pos and vertex2Pos (see Inscribed Angle Theorem).
    const radius = lineLength / (2 * sinA)
    const h = (lineLength / 2) / Math.tan(this.angleRad)
    const midPoint = vertex1Pos.clone().add(vertex2Pos).multiplyScalar(0.5)
    const normal = new THREE.Vector2(-straightLine.y, straightLine.x).normalize()
    const side = Math.sign(straightLine.cross(vert1ToPoint))

    const center = midPoint.addScaledVector(normal, side * h)
    const toCenter = toPosition.clone().sub(center)
    if (toCenter.lengthSq() < 1e-10) {
      return toPosition
    }

    return toCenter.normalize().multiplyScalar(radius).add(center)
  }

  public getSnapState(vertexId: string, point: THREE.Vector2, wallsGraph: WallsGraph): SnapState {
    const vertex = wallsGraph.getVertexById(vertexId)
    if (!vertex) {
      return { isActive: false }
    }
    const [vertex1Pos, vertex2Pos] = wallsGraph.getVertexNeighborVertices(vertexId)
      .map(vert => vert ? wallsGraph.getVertexPosition(vert.id) : undefined)
    if (!vertex1Pos || !vertex2Pos) {
      return { isActive: false }
    }
    const vecA = vertex1Pos.clone().sub(point)
    const vecB = vertex2Pos.clone().sub(point)
    const currentAngle = vecA.angleTo(vecB)
    if (Math.abs(currentAngle - this.angleRad) > this.angleThresholdRad) {
      return { isActive: false }
    }

    return {
      isActive: true,
      type: SNAP_TYPE_LINES,
      lines: [
        { p1: vertex1Pos, p2: point },
        { p1: point, p2: vertex2Pos },
      ]
    }
  }
}

export class StraightLineWallSnap extends VertexWallsAngleSnap {
  constructor() { super(180.0, WALL_LINE_ANGLE_SNAP_THRESHOLD_DEG) }
}

export class WallDirectionSnap implements VertexSnapRule {
  private angleRad: number
  private angleThresholdRad: number

  constructor(angleDeg: number, angleThresholdDeg: number) {
    this.angleRad = (angleDeg * Math.PI / 180) % Math.PI
    if (this.angleRad > Math.PI / 2) {
      this.angleRad = Math.PI - this.angleRad
    }
    this.angleThresholdRad = angleThresholdDeg * Math.PI / 180
  }

  public trySnap(vertexId: string, toPosition: THREE.Vector2, wallsGraph: WallsGraph): THREE.Vector2 {
    const vertex = wallsGraph.getVertexById(vertexId)
    if (!vertex) {
      return toPosition
    }
    const [vertex1Pos, vertex2Pos] = wallsGraph.getVertexNeighborVertices(vertexId)
      .map(vert => vert ? wallsGraph.getVertexPosition(vert.id) : undefined)
    if (!vertex1Pos || !vertex2Pos) {
      return toPosition
    }

    const wallDirections: THREE.Vector2[] = []
    wallsGraph.getWalls().forEach((wall) => {
      if (wall.vertexIds.includes(vertexId)) {
        return
      }
      wallDirections.push(wallsGraph.getWallDirection(wall).normalize())
    })

    const vecA = toPosition.clone().sub(vertex1Pos)
    const vecB = vertex2Pos.clone().sub(toPosition)
    if (vecA.lengthSq() < EPSILON || vecB.lengthSq() < EPSILON) {
      return toPosition
    }
    vecA.normalize()
    vecB.normalize()

    // Attempt to snap both neighbor walls, or both of them at the same time.
    let bestA: { dir: THREE.Vector2; diff: number } | null = null
    let bestB: { dir: THREE.Vector2; diff: number } | null = null
    for (let i = 0; i < wallDirections.length; i += 1) {
      const wallDir = wallDirections[i]
      const angleA = vecA.angleTo(wallDir)
      const diffA = Math.min(Math.abs(angleA - this.angleRad), Math.abs(angleA - Math.PI + this.angleRad))
      if (diffA < this.angleThresholdRad && (!bestA || diffA < bestA.diff)) {
        bestA = { dir: snapVectorToAngle(vecA, wallDir, this.angleRad), diff: diffA }
      }
      const angleB = vecB.angleTo(wallDir)
      const diffB = Math.min(Math.abs(angleB - this.angleRad), Math.abs(angleB - Math.PI + this.angleRad))
      if (diffB < this.angleThresholdRad && (!bestB || diffB < bestB.diff)) {
        bestB = { dir: snapVectorToAngle(vecB, wallDir, this.angleRad), diff: diffB }
      }
    }

    let finalResult: THREE.Vector2 | null = null
    if (bestA && bestB) {
      finalResult = intersectLines(vertex1Pos, bestA.dir, vertex2Pos, bestB.dir)?.point ?? null
    } else if (bestA) {
      finalResult =  projectOnLine(toPosition, vertex1Pos, bestA.dir)
    } else if (bestB) {
      finalResult = projectOnLine(toPosition, vertex2Pos, bestB.dir)
    }
    // Sometimes, e.g. when both walls are nearly parallel, their intersection can jump too far away
    // from the original point, ignore such cases to avoid sudden long distance snapping.
    const snapJumpThreshold = 0.1
    if (finalResult && (finalResult.distanceToSquared(toPosition) > snapJumpThreshold * snapJumpThreshold)) {
      return toPosition
    }
    return finalResult ?? toPosition
  }

  public getSnapState(vertexId: string, point: THREE.Vector2, wallsGraph: WallsGraph): SnapState {
    const vertex = wallsGraph.getVertexById(vertexId)
    if (!vertex) {
      return { isActive: false }
    }
    const [vertex1, vertex2] = wallsGraph.getVertexNeighborVertices(vertexId)
    if (!vertex1 || !vertex2) {
      return  { isActive: false }
    }
    const vertex1Pos = wallsGraph.getVertexPosition(vertex1.id)
    const vertex2Pos = wallsGraph.getVertexPosition(vertex2.id)

    const referenceWalls: Wall[] = []
    wallsGraph.getWalls().forEach((wall) => {
      if (wall.vertexIds.includes(vertexId)) {
        return
      }
      referenceWalls.push(wall)
    })

    const vecA = vertex1Pos.clone().sub(point)
    const vecB = vertex2Pos.clone().sub(point)

    // Case where the dragging vertex's own two walls form the expected angle.
    if (vecA.lengthSq() > EPSILON && vecB.lengthSq() > EPSILON) {
      const angleAB = vecA.angleTo(vecB)
      const angleABNormalized = angleAB > Math.PI / 2 ? Math.PI - angleAB : angleAB
      if (Math.abs(angleABNormalized - this.angleRad) < 0.1 * this.angleThresholdRad) {
        const wallIds = { wall1: vertex.wallIds[0], wall2: vertex.wallIds[1] }
        return {
          isActive: true,
          type: SNAP_TYPE_ANGLE,
          pairs: [{
            line1: { p1: point, p2: vertex1Pos },
            line2: { p1: point, p2: vertex2Pos },
            isOnVertex: true,
          }],
          wallIds: [wallIds] }
      }
    }

    type Candidate = {
      pair: { line1: SnapLine; line2: SnapLine, isOnVertex: boolean }
      wallIds: { wall1: string, wall2: string }
      distSq: number
    }
    const bestCandidates: Candidate[] = []
    let bestA: Candidate | undefined
    let bestB: Candidate | undefined

    for (const wall of referenceWalls) {
      const wallVertex1 = wallsGraph.getVertexById(wall.vertexIds[0])
      const wallVertex2 = wallsGraph.getVertexById(wall.vertexIds[1])
      if (!wallVertex1 || !wallVertex2) {
        // eslint-disable-next-line no-continue
        continue
      }

      const wallDir = wallsGraph.getWallDirection(wall)
      const wallVertex1Pos = wallsGraph.getVertexPosition(wallVertex1.id)
      const wallVertex2Pos = wallsGraph.getVertexPosition(wallVertex2.id)

      const getSnappingLines = (neighborVertex: THREE.Vector2, neighborWallId: string): Candidate => {
        const intersection = Math.abs(this.angleRad) > 0.0
          ? intersectLines(point, neighborVertex.clone().sub(point), wallVertex1Pos, wallDir)
          : null

        if (!intersection) {
          return {
            pair: {
              line1: { p1: point, p2: neighborVertex },
              line2: { p1: wallVertex1Pos, p2: wallVertex2Pos },
              isOnVertex: false
            },
            wallIds: {
              wall1: neighborWallId,
              wall2: wall.id,
            },
            distSq: Number.POSITIVE_INFINITY,
          }
        }

        const line1 = intersection.t < 0.0
          ? { p1: intersection.point, p2: neighborVertex }
          : intersection.t > 1.0
            ? { p1: point, p2: intersection.point }
            : { p1: point, p2: neighborVertex }

        const line2 = intersection.s < 0.0
          ? { p1: intersection.point, p2: wallVertex1Pos }
          : intersection.s > 1.0
            ? { p1: wallVertex2Pos, p2: intersection.point }
            : { p1: wallVertex1Pos, p2: wallVertex2Pos }

        const isOnVertex = (Math.abs(intersection.t) < EPSILON || Math.abs(intersection.t - 1.0) < EPSILON) &&
          Math.abs(intersection.s) < EPSILON || Math.abs(intersection.s - 1.0) < EPSILON

        return {
          pair: { line1, line2, isOnVertex },
          distSq: intersection.point.distanceToSquared(point),
          wallIds: {
            wall1: neighborWallId,
            wall2: wall.id,
          },
        }
      }

      const angleA = vecA.angleTo(wallDir)
      const angleANormalized = angleA > Math.PI / 2 ? Math.PI - angleA : angleA
      if (Math.abs(angleANormalized - this.angleRad) < 0.1 * this.angleThresholdRad) {
        const candidate = getSnappingLines(vertex1Pos, vertex.wallIds[0])
        if (!bestA || candidate.distSq < bestA.distSq) {
          bestA = candidate
        }
      }

      const angleB = vecB.angleTo(wallDir)
      const angleBNormalized = angleB > Math.PI / 2 ? Math.PI - angleB : angleB
      if (Math.abs(angleBNormalized - this.angleRad) < 0.1 * this.angleThresholdRad) {
        const candidate = getSnappingLines(vertex2Pos, vertex.wallIds[1])
        if (!bestB || candidate.distSq < bestB.distSq) {
          bestB = candidate
        }
      }
    }

    if (bestA) {
      bestCandidates.push(bestA)
    }
    if (bestB) {
      bestCandidates.push(bestB)
    }

    const pairs = bestCandidates.map(c => c.pair)
    const wallIds = bestCandidates.map(c => c.wallIds)
    return bestCandidates.length > 0
      ? { isActive: true, type: SNAP_TYPE_ANGLE, pairs, wallIds }
      : { isActive: false }
  }
}

export class RightAngleWallsSnap extends WallDirectionSnap {
  constructor() { super(90.0, WALL_LINE_ANGLE_SNAP_THRESHOLD_DEG) }

  override getSnapState(vertexId: string, point: THREE.Vector2, wallsGraph: WallsGraph) {
    const result = super.getSnapState(vertexId, point, wallsGraph)
    if (result.isActive) {
      result.type = SNAP_TYPE_ANGLE
    }
    return result
  }
}

export class ParallelWallsSnap extends WallDirectionSnap {
  constructor() { super(0.0, WALL_LINE_ANGLE_SNAP_THRESHOLD_DEG) }

  override getSnapState(vertexId: string, point: THREE.Vector2, wallsGraph: WallsGraph) {
    const result = super.getSnapState(vertexId, point, wallsGraph)
    if (result.isActive) {
      result.type = SNAP_TYPE_PARALLEL
    }
    return result
  }
}

export class WallToVertexAxisAlignedSnap<A extends Axis> implements WallSnapRule {
  private axis: A
  private otherAxis: A

  constructor(axis: A) {
    this.axis = axis
    this.otherAxis = (this.axis === 'x' ? `y` : `x`) as A
  }

  trySnap(wallId: string, normalMovement: THREE.Vector2, wallsGraph: WallsGraph): THREE.Vector2 {
    const movingWall = wallsGraph.getWallById(wallId)
    if (!movingWall) {
      return normalMovement
    }
    const [vertex1, vertex2] = movingWall.vertexIds.map(id => wallsGraph.getVertexById(id))
    if (!vertex1 || !vertex2) {
      return normalMovement
    }
    const vertex1Pos = wallsGraph.getVertexPosition(vertex1.id)
    const vertex2Pos = wallsGraph.getVertexPosition(vertex2.id)

    const wall1 = wallsGraph.getVertexOtherWall(movingWall, vertex1)
    const wall2 = wallsGraph.getVertexOtherWall(movingWall, vertex2)
    if (!wall1 || !wall2) {
      return normalMovement
    }

    // We need to exclude neighbor vertices from alignment search as well.
    const vertex1Neighbor = wallsGraph.getVertexNeighborVertices(vertex1.id).filter(v => v?.id !== vertex2.id)[0]
    const vertex2Neighbor = wallsGraph.getVertexNeighborVertices(vertex2.id).filter(v => v?.id !== vertex1.id)[0]
    const axisValues = [...wallsGraph.getVertices().keys()]
      .filter(id => id !== vertex1.id && id !== vertex2.id && id !== vertex1Neighbor?.id && id !== vertex2Neighbor?.id)
      .map((id) => wallsGraph.getVertexPosition(id)[this.axis])
    const findSnapValueForVertex = (vertexPos: THREE.Vector2) => axisValues.reduce<number | null>((best, axisPos) => {
      const d = Math.abs(axisPos - vertexPos[this.axis])
      if (d >= AXIS_SNAP_THRESHOLD) {
        return best
      }
      if (best === null) {
        return axisPos
      }
      return Math.abs(best - vertexPos[this.axis]) <= d ? best : axisPos
    }, null)

    const snapValue1 = findSnapValueForVertex(vertex1Pos)
    const snapValue2 = findSnapValueForVertex(vertex2Pos)
    if (snapValue1 === null && snapValue2 === null) {
      return normalMovement
    }

    const wall1Dir = wallsGraph.getWallDirection(wall1).normalize()
    const wall2Dir = wallsGraph.getWallDirection(wall2).normalize()
    const vertex1Movement = wall1Dir.clone().multiplyScalar(normalMovement.lengthSq() / normalMovement.dot(wall1Dir))
    const vertex2Movement = wall2Dir.clone().multiplyScalar(normalMovement.lengthSq() / normalMovement.dot(wall2Dir))
    const scaleMovementToSnapValue = (snapValue: number | null, vertexPos: THREE.Vector2,
      movement: THREE.Vector2): number | null => {
      if (snapValue === null || Math.abs(movement[this.axis]) < EPSILON) {
        return null
      }
      const scale = (snapValue - vertexPos[this.axis]) / movement[this.axis]
      return Math.abs(scale - 1) * normalMovement.length() < AXIS_SNAP_THRESHOLD ? scale : null
    }
    const movementScale1 = scaleMovementToSnapValue(snapValue1, vertex1Pos, vertex1Movement)
    const movementScale2 = scaleMovementToSnapValue(snapValue2, vertex2Pos, vertex2Movement)
    if (movementScale1 === null && movementScale2 === null) {
      return normalMovement
    }

    let bestScale: number | null = null
    if (movementScale1 !== null && movementScale2 !== null) {
      bestScale = Math.abs(movementScale1 - 1) <= Math.abs(movementScale2 - 1)
        ? movementScale1
        : movementScale2
    } else {
      bestScale = movementScale1 ?? movementScale2
    }
    if (bestScale === null) {
      return normalMovement
    }
    return normalMovement.clone().multiplyScalar(bestScale)
  }

  getSnapState(wallId: string, wallsGraph: WallsGraph): SnapState {
    const movingWall = wallsGraph.getWallById(wallId)
    if (!movingWall) {
      return { isActive: false }
    }
    const [vertex1, vertex2] = movingWall.vertexIds.map(id => wallsGraph.getVertexById(id))
    if (!vertex1 || !vertex2) {
      return { isActive: false }
    }
    const vertex1Pos = wallsGraph.getVertexPosition(vertex1.id)
    const vertex2Pos = wallsGraph.getVertexPosition(vertex2.id)

    const vertex1Neighbor = wallsGraph.getVertexNeighborVertices(vertex1.id).filter(v => v?.id !== vertex2.id)[0]
    const vertex2Neighbor = wallsGraph.getVertexNeighborVertices(vertex2.id).filter(v => v?.id !== vertex1.id)[0]
    const referenceVertices = [...wallsGraph.getVertices().keys()]
      .filter(id => id !== vertex1.id && id !== vertex2.id && id !== vertex1Neighbor?.id && id !== vertex2Neighbor?.id)
      .map((id) => wallsGraph.getVertexPosition(id))

    const snappedPositions1 = referenceVertices
      .filter(p => Math.abs(p[this.axis] - vertex1Pos[this.axis]) < AXIS_SNAP_LINE_THRESHOLD)
    const snappedPositions2 = referenceVertices
      .filter(p => Math.abs(p[this.axis] - vertex2Pos[this.axis]) < AXIS_SNAP_LINE_THRESHOLD)

    if (snappedPositions1.length === 0 && snappedPositions2.length === 0) {
      return { isActive: false }
    }

    const result: SnapState = { isActive: true, type: SNAP_TYPE_LINES, lines: [] }
    if (snappedPositions1.length > 0) {
      snappedPositions1.push(vertex1Pos)
      const p1 = snappedPositions1.reduce((min, p) => vertex1Pos[this.otherAxis] < min[this.otherAxis] ? p : min)
      const p2 = snappedPositions1.reduce((max, p) => vertex1Pos[this.otherAxis] > max[this.otherAxis] ? p : max)
      result.lines.push({ p1, p2 })
    }
    if (snappedPositions2.length > 0) {
      snappedPositions2.push(vertex2Pos)
      const p1 = snappedPositions2.reduce((min, p) => vertex2Pos[this.otherAxis] < min[this.otherAxis] ? p : min)
      const p2 = snappedPositions2.reduce((max, p) => vertex2Pos[this.otherAxis] > max[this.otherAxis] ? p : max)
      result.lines.push({ p1, p2 })
    }
    return result
  }
}

export class WallToVertexXSnap extends WallToVertexAxisAlignedSnap<`x`> {
  constructor() { super(`x`) }
}

export class WallToVertexYSnap extends WallToVertexAxisAlignedSnap<`y`> {
  constructor() { super(`y`) }
}