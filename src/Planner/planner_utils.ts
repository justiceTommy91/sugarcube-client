import * as THREE from 'three'

import type { Placeables, PointXYZ } from 'Renderer/geomviewer/geom_types'
import {
  composeTransform,
  extractPosition,
  extractQuaternionFromMat4,
  fromThreeMatrix4,
  getInverted,
  multiplyMatrices4x4,
} from 'Renderer/geometry/utilities'
import { makeFloorModelMatrix, makeWallModelMatrix } from 'Renderer/model/snap_rot_handler'
import { EPSILON } from 'Renderer/geometry'

import type { PlacementType, QuaternionLike, Vector2Like } from 'Planner/api_types'
import * as apiConstants from 'Planner/api_constants'

export const placeablesToPlacement = (placeables: Placeables | null | undefined): PlacementType => {
  if (!placeables || !placeables.anchors || placeables.anchors.length === 0) {
    return apiConstants.PLACEMENT_FLOOR_ONLY
  }

  const hasEdgeOnly = placeables.combinations.some((combination) => {
    if (combination.length < 2) {
      return false
    }
    const constrains = new Set<'floor' | 'wall'>()
    constrains.add(placeables.anchors[combination[0]].category)
    constrains.add(placeables.anchors[combination[1]].category)
    return constrains.size === 2
  })
  if (hasEdgeOnly) {
    return apiConstants.PLACEMENT_EDGE_ONLY
  }

  const hasFloor = placeables.anchors.some(a => a.category === 'floor')
  const hasWall = placeables.anchors.some(a => a.category === 'wall')
  if (hasFloor && hasWall) {
    return apiConstants.PLACEMENT_ANYWHERE
  }
  if (hasFloor) {
    return apiConstants.PLACEMENT_FLOOR_ONLY
  }
  if (hasWall) {
    return apiConstants.PLACEMENT_WALL_ONLY
  }
  return apiConstants.PLACEMENT_FLOOR_ONLY
}

// When fetched from the backend, composition items come with full combined world transforms.
// We need to decompose them into the transform of the item in the room (world position and Y rotation),
// and the transform of the gltf model inside its root node (what is called "snap rotation").
export const decomposeItemTransform = (pos: PointXYZ, rot: QuaternionLike, placeables: Placeables | null | undefined,
  index: number | null | undefined, bboxMaxX: number) => {
  const scale = { x: 1, y: 1, z: 1 }
  const mat = composeTransform(pos, [rot.x, rot.y, rot.z, rot.w], scale)

  const ret = {
    rootPos: { ...pos },
    rootRot: { ...rot },
    modelPos: { x: 0, y: 0, z: 0 },
    modelRot: { x: 0, y: 0, z: 0, w: 1},
  }

  if (!placeables || !placeables.anchors || placeables.anchors.length === 0) {
    return ret
  }
  const snapRotIndex = index || 0
  const anchor = placeables.anchors[snapRotIndex]
  if (!anchor || !anchor.matrixModel) {
    return ret
  }
  const modelMat = fromThreeMatrix4(anchor.category === 'wall'
    ? makeWallModelMatrix(anchor.matrixModel, bboxMaxX)
    : makeFloorModelMatrix(anchor.matrixModel))
  const inv = getInverted(modelMat)
  const rootMat = multiplyMatrices4x4(mat, inv)

  const rootRot = extractQuaternionFromMat4(rootMat)
  const modelRot = extractQuaternionFromMat4(modelMat)

  ret.rootPos = extractPosition(rootMat)
  ret.rootRot = { x: rootRot[0], y: rootRot[1], z: rootRot[2], w: rootRot[3] }
  ret.modelPos = extractPosition(modelMat)
  ret.modelRot = { x: modelRot[0], y: modelRot[1], z: modelRot[2], w: modelRot[3] }
  return ret
}

export const colorStyleToRGB255 = (style: string) => {
  const rgb = new THREE.Color()
    .setStyle(style, THREE.NoColorSpace)
    .getRGB({ r: 0, g: 0, b: 0 }, THREE.NoColorSpace)
  return {
    r: Math.round(255.0 * rgb.r),
    g: Math.round(255.0 * rgb.g),
    b: Math.round(255.0 * rgb.b),
  }
}

export const deduplicateAndMergeLines = (lines: { p1: Vector2Like; p2: Vector2Like }[]) => {
  // Group of segments on the same infinite line.
  const groups = new Map<
    string,
    {
      dir: { x: number; y: number }
      origin: { x: number; y: number }
      segments: [number, number][]
    }
  >()
  // Round float numbers to be used as keys.
  const round = (v: number) => Math.round(v * 1e8) / 1e8

  // Group all segments by the infinite line they lay on.
  lines.forEach(line => {
    let dx = line.p2.x - line.p1.x
    let dy = line.p2.y - line.p1.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < EPSILON) {
      return
    }
    dx /= len
    dy /= len

    // Make segments be the same direction.
    if (Math.abs(dx) > EPSILON) {
      if (dx < 0) {
        dx = -dx
        dy = -dy
      }
    } else {
      dx = 0
      if (dy < 0) {
        dy = -dy
      }
    }

    // Intersection of perpendicular from (0,0) to the infinite line —
    // we'll use it as the "origin" for all the segments on this infnite line.
    const p1DotDir = line.p1.x * dx + line.p1.y * dy
    const originX = line.p1.x - p1DotDir * dx
    const originY = line.p1.y - p1DotDir * dy
    const key = `${round(dx)},${round(dy)}|${round(originX)},${round(originY)}`
    const t1 = line.p1.x * dx + line.p1.y * dy
    const t2 = line.p2.x * dx + line.p2.y * dy

    const group = groups.get(key)
    if (group) {
      group.segments.push([Math.min(t1, t2), Math.max(t1, t2)])
    } else {
      groups.set(key, {
        dir: { x: dx, y: dy },
        origin: { x: originX, y: originY },
        segments: [[Math.min(t1, t2), Math.max(t1, t2)]],
      })
    }
  })

  // Merge overlapping segments.
  const result: { p1: Vector2Like; p2: Vector2Like }[] = []
  groups.forEach(({ dir, origin: foot, segments }) => {
    segments.sort((a, b) => a[0] - b[0])

    const merged: [number, number][] = [segments[0]]
    for (let i = 1; i < segments.length; i += 1) {
      const last = merged[merged.length - 1]
      const curr = segments[i]
      if (curr[0] <= last[1] + EPSILON) {
        last[1] = Math.max(last[1], curr[1])
      } else {
        merged.push(curr)
      }
    }

    merged.forEach(([tMin, tMax]) => {
      result.push({
        p1: { x: foot.x + tMin * dir.x, y: foot.y + tMin * dir.y },
        p2: { x: foot.x + tMax * dir.x, y: foot.y + tMax * dir.y },
      })
    })
  })

  return result
}

export const cross = (a: Vector2Like, b: Vector2Like): number => a.x * b.y - a.y * b.x

export const sub = (a: Vector2Like, b: Vector2Like) => ({ x: a.x - b.x, y: a.y - b.y })

export const add = (a: Vector2Like, b: Vector2Like) => ({ x: a.x + b.x, y: a.y + b.y })

export const normalize = (v: Vector2Like) =>{
  const len = Math.hypot(v.x, v.y)
  if (len <= EPSILON) {
    return null
  }
  return { x: v.x / len, y: v.y / len }
}

export const distSq = (a: Vector2Like, b: Vector2Like) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export const dot = (a: Vector2Like, b: Vector2Like) => a.x * b.x + a.y * b.y