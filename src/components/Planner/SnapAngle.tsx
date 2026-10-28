import React from 'react'

import type { Line2, Vector2Like } from 'Planner/api_types'
import { sub, add, cross, normalize, distSq } from 'Planner/planner_utils'
import { EPSILON } from 'Renderer/geometry'

import './SnapAngle.scss'

const EPSILON_SQ = EPSILON * EPSILON
const samePoint = (a: Vector2Like, b: Vector2Like) => Math.abs(a.x - b.x) <= EPSILON && Math.abs(a.y - b.y) <= EPSILON

const segmentIntersection = (line1: Line2, line2: Line2): Vector2Like | null => {
  const p = line1.p1
  const r = sub(line1.p2, line1.p1)

  const q = line2.p1
  const s = sub(line2.p2, line2.p1)

  const denominator = cross(r, s)

  if (Math.abs(denominator) <= EPSILON) {
    return null
  }

  const qMinusP = sub(q, p)

  const t = cross(qMinusP, s) / denominator
  const u = cross(qMinusP, r) / denominator

  if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) {
    return null
  }

  const intersection = {
    x: p.x + t * r.x,
    y: p.y + t * r.y,
  }

  return intersection
}

const outgoingFrom = (line: Line2, corner: Vector2Like): Line2 => {
  const p1IsCorner = samePoint(line.p1, corner)
  const p2IsCorner = samePoint(line.p2, corner)

  if (p1IsCorner && !p2IsCorner) {
    return { p1: corner, p2: line.p2 }
  }

  if (p2IsCorner && !p1IsCorner) {
    return { p1: corner, p2: line.p1 }
  }

  if (p1IsCorner && p2IsCorner) {
    return { p1: corner, p2: line.p2 }
  }

  const d1 = distSq(corner, line.p1)
  const d2 = distSq(corner, line.p2)
  if (d1 > d2 + EPSILON_SQ) {
    return { p1: corner, p2: line.p1 }
  }
  if (d2 > d1 + EPSILON_SQ) {
    return { p1: corner, p2: line.p2 }
  }
  return { p1: corner, p2: line.p2 }
}

function orientSegments(line1: Line2, line2: Line2) {
  const corner = segmentIntersection(line1, line2)
  if (!corner) {
    return null
  }
  return {
    corner,
    line1: outgoingFrom(line1, corner),
    line2: outgoingFrom(line2, corner),
  }
}

export type SnapAngleProps = {
  line1: Line2
  line2: Line2
}

export const SnapAngle = ({ line1, line2 }: SnapAngleProps) => {
  const oriented = orientSegments(line1, line2)
  if (!oriented) {
    return null
  }

  const dir1 = normalize(sub(oriented.line1.p2, oriented.line1.p1))
  const dir2 = normalize(sub(oriented.line2.p2, oriented.line2.p1))
  if (!dir1 || !dir2) {
    return null
  }

  const bisector = normalize(add(dir1, dir2))
  if (!bisector) {
    return null
  }
  const baseDir = cross(dir1, dir2) > 0 ? dir1 : dir2
  const angleRad = Math.atan2(baseDir.y, baseDir.x)
  const angleDeg = angleRad * (180 / Math.PI)

  const CORNER_BOX_SIZE = 16
  const halfDiagonal = CORNER_BOX_SIZE / Math.SQRT2
  const centerX = oriented.corner.x + bisector.x * halfDiagonal
  const centerY = oriented.corner.y + bisector.y * halfDiagonal

  const baseOffset = { x: -1, y: -1 }
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  const thicknessOffsetX = baseOffset.x * cos - baseOffset.y * sin
  const thicknessOffsetY = baseOffset.x * sin + baseOffset.y * cos
  const angleStyle = {
    left: `${centerX - CORNER_BOX_SIZE / 2 + thicknessOffsetX}px`,
    top: `${centerY - CORNER_BOX_SIZE / 2 + thicknessOffsetY}px`,
    width: `${CORNER_BOX_SIZE}px`,
    height: `${CORNER_BOX_SIZE}px`,
    transform: `rotate(${angleDeg}deg)`,
  }
  return (
    <div className="SnapAngle" style={angleStyle} />
  )
}