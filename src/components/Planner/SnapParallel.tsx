import React from 'react'

import type { Line2, Vector2Like } from 'Planner/api_types'
import { dot, normalize } from 'Planner/planner_utils'
import { EPSILON } from 'Renderer/geometry'

import './SnapParallel.scss'

export type SnapParallelProps = {
  line1: Line2
  line2: Line2
}

function getSegmentProjectionRange(line: Line2, direction: Vector2Like) {
  const t1 = dot(line.p1, direction)
  const t2 = dot(line.p2, direction)

  return {
    t1,
    t2,
    min: Math.min(t1, t2),
    max: Math.max(t1, t2),
  }
}

function getPointOnLineAtProjection(line: Line2, direction: Vector2Like, targetProjection: number): Vector2Like {
  const lineProjection = dot(line.p1, direction)
  const delta = targetProjection - lineProjection

  return {
    x: line.p1.x + direction.x * delta,
    y: line.p1.y + direction.y * delta,
  }
}

function getExtensionIfNeeded(line: Line2, direction: Vector2Like, targetProjection: number,
  targetPoint: Vector2Like): Line2 | undefined {
  const range = getSegmentProjectionRange(line, direction)

  const isInsideSegment = targetProjection >= range.min - EPSILON && targetProjection <= range.max + EPSILON
  if (isInsideSegment) {
    return undefined
  }

  const nearestEndpoint =
    Math.abs(targetProjection - range.t1) <
    Math.abs(targetProjection - range.t2)
      ? line.p1
      : line.p2

  return {
    p1: { ...nearestEndpoint },
    p2: { ...targetPoint },
  }
}

function computeSnappingPoints(line1: Line2, line2: Line2) {
  const direction = normalize({ x: line1.p2.x - line1.p1.x, y: line1.p2.y - line1.p1.y })
  if (!direction) {
    return null
  }

  const range1 = getSegmentProjectionRange(line1, direction)
  const range2 = getSegmentProjectionRange(line2, direction)

  const mergedMin = Math.min(range1.min, range2.min)
  const mergedMax = Math.max(range1.max, range2.max)

  const middleProjection = mergedMin + (mergedMax - mergedMin) * 0.5

  const line1Point = getPointOnLineAtProjection(line1, direction, middleProjection)
  const line2Point = getPointOnLineAtProjection(line2, direction, middleProjection)
  const dx = line2Point.x - line1Point.x
  const dy = line2Point.y - line1Point.y
  const middlePoint = {
    x: line1Point.x + 0.5 * dx,
    y: line1Point.y + 0.5 * dy,
  }
  const distance = Math.hypot(dx, dy)

  return {
    line1Point,
    line2Point,
    middlePoint,
    distance,
    line1Extension: getExtensionIfNeeded(line1, direction, middleProjection, line1Point),
    line2Extension: getExtensionIfNeeded(line2, direction, middleProjection, line2Point),
  }
}

export const SnapParallel = ({ line1, line2 }: SnapParallelProps) => {
  const snapping = computeSnappingPoints(line1, line2)
  if (!snapping) {
    return null
  }

  const dx = line1.p2.x - line1.p1.x
  const dy = line1.p2.y - line1.p1.y
  const angleRad = Math.atan2(dy, dx)
  const angleDeg = angleRad * (180 / Math.PI)

  const BOX_SIZE = 32
  const boxStyle = {
    left: `${snapping.middlePoint.x}px`,
    top: `${snapping.middlePoint.y}px`,
    width: `${BOX_SIZE}px`,
    height: `${BOX_SIZE * 0.5}px`,
    transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
  }

  const length = snapping.distance
  const middleLineStyle = {
    left: `${snapping.middlePoint.x}px`,
    top: `${snapping.middlePoint.y}px`,
    width: `${length}px`,
    transform: `translate(-50%, -50%) rotate(${angleDeg + 90}deg)`,
  }

  const createExtLine = (line: Line2 | undefined) => {
    if (!line) {
      return null
    }
    const extDx = line.p2.x - line.p1.x
    const extDy = line.p2.y - line.p1.y
    const middlePoint = {
      x: line.p1.x + 0.5 * extDx,
      y: line.p1.y + 0.5 * extDy,
    }
    const extLineStyle = {
      left: `${middlePoint.x}px`,
      top: `${middlePoint.y}px`,
      width: `${Math.hypot(extDx, extDy)}px`,
      transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
    }
    return <div className="ExtLine" style={extLineStyle} />
  }
  const extLine1 = createExtLine(snapping.line1Extension)
  const extLine2 = createExtLine(snapping.line2Extension)

  return (
    <>
      <div className="SnapParallel" style={boxStyle} />
      <div className="ExtLine" style={middleLineStyle} />
      { extLine1 }
      { extLine2 }
    </>
  )
}