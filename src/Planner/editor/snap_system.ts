import * as THREE from 'three'

import {
  type VertexSnapRule,
  type WallSnapRule,
  type SnapLine,
  XSnap,
  YSnap,
  StraightLineWallSnap,
  RightAngleWallsSnap,
  ParallelWallsSnap,
  WallToVertexXSnap,
  WallToVertexYSnap,
  SNAP_TYPE_LINES,
  SNAP_TYPE_ANGLE,
  SNAP_TYPE_PARALLEL,
  LineSnap,
  AngleSnap,
} from 'Planner/editor/snap_rules'
import type { WallsGraph } from 'Planner/editor/walls_graph'
import { deduplicateAndMergeLines } from 'Planner/planner_utils'


export class SnapSystem {
  private vertexSnapRules: VertexSnapRule[] = []
  private wallSnapRules: WallSnapRule[] = []
  private wallsGraph: WallsGraph | null = null

  constructor() {
    this.vertexSnapRules.push(new XSnap())
    this.vertexSnapRules.push(new YSnap())
    this.vertexSnapRules.push(new RightAngleWallsSnap())
    this.vertexSnapRules.push(new ParallelWallsSnap())
    this.vertexSnapRules.push(new StraightLineWallSnap())

    this.wallSnapRules.push(new WallToVertexXSnap())
    this.wallSnapRules.push(new WallToVertexYSnap())
  }

  public initialize(wallsGraph: WallsGraph) {
    this.wallsGraph = wallsGraph
  }

  public snapVertexMovement(vertexId: string, moveDelta: THREE.Vector2): THREE.Vector2 {
    if (!this.wallsGraph) {
      return moveDelta
    }
    const fromPoint = this.wallsGraph.getVertexPosition(vertexId)
    const toPoint = fromPoint.clone().add(moveDelta)
    const wallsGraph = this.wallsGraph
    const finalPoint = this.vertexSnapRules.reduce((snappedPoint, rule) =>
      rule.trySnap(vertexId, snappedPoint, wallsGraph), toPoint.clone())
    return finalPoint.sub(fromPoint)
  }

  public snapWallMovement(wallId: string, normalMovement: THREE.Vector2): THREE.Vector2 {
    if (!this.wallsGraph) {
      return normalMovement
    }
    const wallsGraph = this.wallsGraph
    const snappedMovement = this.wallSnapRules.reduce((snappedPoint, rule) =>
      rule.trySnap(wallId, snappedPoint, wallsGraph), normalMovement.clone())
    return snappedMovement
  }

  public getVertexSnapState(vertexId: string) {
    if (!this.wallsGraph) {
      return undefined
    }
    const wallsGraph = this.wallsGraph
    const position = this.wallsGraph.getVertexPosition(vertexId)

    const allStates = this.vertexSnapRules.map(rule => rule.getSnapState(vertexId, position, wallsGraph))
    const lineSnaps: LineSnap[] = allStates
      .filter((state): state is LineSnap => state.isActive && state.type === SNAP_TYPE_LINES)
    const angleSnaps = allStates
       .filter((state): state is AngleSnap => state.isActive && state.type === SNAP_TYPE_ANGLE)
    const anglePairs = angleSnaps.flatMap(state => state.pairs)
    const angleSnapWallIds = new Set(angleSnaps.flatMap(state =>
      state.wallIds.flatMap(({ wall1, wall2 }) => [wall1, wall2])))
    const parallelPairs = allStates
      .filter((state): state is AngleSnap => state.isActive && state.type === SNAP_TYPE_PARALLEL)
      .flatMap(state => state.pairs.filter((_, index) => {
        const wallIds = state.wallIds[index]
        return !wallIds || (!angleSnapWallIds.has(wallIds.wall1) && !angleSnapWallIds.has(wallIds.wall2))
      }))
    const lines = deduplicateAndMergeLines(lineSnaps.flatMap(state => state.isActive ? state.lines : []))
    return {
      lines,
      anglePairs,
      parallelPairs,
    }
  }

  public getWallSnapState(wallId: string): SnapLine[] {
    if (!this.wallsGraph) {
      return []
    }
    const wallsGraph = this.wallsGraph
    const allStates = this.wallSnapRules.map(rule => rule.getSnapState(wallId, wallsGraph))
    const lineSnaps: LineSnap[] = allStates
      .filter((state): state is LineSnap => state.isActive && state.type === SNAP_TYPE_LINES)
    const allLines = deduplicateAndMergeLines(lineSnaps.flatMap(state => state.isActive ? state.lines : []))
    return allLines
  }
}