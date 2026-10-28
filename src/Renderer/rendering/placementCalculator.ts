/**
 * Find-my-fit placement calculators.
 *
 * Pure helpers for the three "query*" APIs exposed by GeomViewer:
 *   - computePlacementFromStrokes — sample strokes, pick dominant surface,
 *     build a 3D box and placement.
 *   - adjustPlacement — re-project a prior box with new dimensions while
 *     honoring wall/floor/ceiling and behind-camera constraints.
 *   - movePlacement — shift a prior box by a world-space delta.
 * These functions take a GeomCamera, SceneSampler, and
 * scene dimensions as parameters instead of reaching into `this`.
 */

import type {
  PlaneType,
  PointXYZ,
  Point2D,
  Placement,
  PlacementFromStrokesResult,
  AdjustedPlacementInfo,
  PlacementConstraintWarning,
} from 'Renderer/geomviewer/geom_types'
import type { SceneSampler } from 'Renderer/rendering/SceneSampler'
import type { GeomCamera } from 'Renderer/multiview/geom_camera'
import { Point3 } from 'Renderer/geometry/Point3'
import {
  planeOrigin,
  uvToWorld,
  signedDistToPlane,
  dot3,
  yAxisRotationQuat,
} from 'Renderer/geometry/utilities'
import {
  MIN_DIMENSION_M,
  MIN_EXTRUSION_DEPTH_M,
  WARN_DIM_WIDTH,
  WARN_DIM_HEIGHT,
  WARN_DIM_DEPTH,
  WARN_REASON_MIN_SIZE,
  WARN_REASON_WALL,
  WARN_REASON_CEILING,
  WARN_REASON_FLOOR,
} from 'Renderer/geomviewer/geom_constants'
import * as pu from 'Renderer/positioning/positioning_utilities'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SurfaceClass = 'wall' | 'floor'

type UVBounds = { uMin: number; uMax: number; vMin: number; vMax: number }

type Anchor = 'min' | 'max'

type SceneDims = readonly [number, number]

export type FMFPlacementOptions = {
  forceFloorPlacement?: boolean
  widthAnchor?: Anchor
  heightAnchor?: Anchor
  brushWidth?: number
}

// Cached decomposition of a plane into the axes/origin everything downstream
// uses. Avoids repeating `plane.rot[0]/[1]/[2]` + `planeOrigin(...)` all over.
type PlaneFrame = {
  plane: PlaneType
  xAxis: number[]
  yAxis: number[]
  normal: number[]
  d: number
  p0: PointXYZ
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Margin (meters) in front of the camera that box corners must clear. The
// pinhole projection in GeomCamera.worldToScreenFloat divides by camera-space
// Z, so any corner at-or-behind the camera plane projects to mirrored/garbage
// screen coordinates. Keep a small buffer so near-zero Z never slips through.
const BEHIND_CAMERA_MARGIN_M = 0.05

const PLANE_DENOM_EPSILON = 1e-6
const ON_PLANE_EPSILON_M = 0.01
// eslint-disable-next-line i18next/no-literal-string
const PLACEMENT_KIND = 'location3' as const

// ─────────────────────────────────────────────────────────────────────────────
// Plane / UV helpers
// ─────────────────────────────────────────────────────────────────────────────

function frameFromPlane(plane: PlaneType): PlaneFrame {
  const normal = plane.rot[2]
  const d = plane.d
  return {
    plane,
    xAxis: plane.rot[0],
    yAxis: plane.rot[1],
    normal,
    d,
    p0: planeOrigin(d, normal),
  }
}

function worldToUV(pt: PointXYZ, frame: PlaneFrame): { u: number; v: number } {
  const dx = pt.x - frame.p0.x
  const dy = pt.y - frame.p0.y
  const dz = pt.z - frame.p0.z
  return {
    u: dx * frame.xAxis[0] + dy * frame.xAxis[1] + dz * frame.xAxis[2],
    v: dx * frame.yAxis[0] + dy * frame.yAxis[1] + dz * frame.yAxis[2],
  }
}

function polygonUVBounds(
  vertices: ReadonlyArray<PointXYZ>,
  frame: PlaneFrame,
): UVBounds | null {
  if (vertices.length === 0) return null
  let uMin = Infinity
  let uMax = -Infinity
  let vMin = Infinity
  let vMax = -Infinity
  for (const vert of vertices) {
    const { u, v } = worldToUV(vert, frame)
    if (u < uMin) uMin = u
    if (u > uMax) uMax = u
    if (v < vMin) vMin = v
    if (v > vMax) vMax = v
  }
  return { uMin, uMax, vMin, vMax }
}

// Sign (±1) such that `extDirSign * normal` points toward the camera.
function extDirTowardCamera(frame: PlaneFrame, camPos: PointXYZ): number {
  return signedDistToPlane(camPos, frame.normal, frame.d) >= 0 ? 1 : -1
}

// ─────────────────────────────────────────────────────────────────────────────
// Behind-camera guard
// ─────────────────────────────────────────────────────────────────────────────

function anyCornerBehindCamera(
  frame: PlaneFrame,
  uvBounds: UVBounds,
  extrusionDepth: number,
  extDirSign: number,
  camera: GeomCamera,
): boolean {
  const { xAxis, yAxis, normal, p0 } = frame
  const { uMin, uMax, vMin, vMax } = uvBounds
  const extX = extDirSign * extrusionDepth * normal[0]
  const extY = extDirSign * extrusionDepth * normal[1]
  const extZ = extDirSign * extrusionDepth * normal[2]

  const base: ReadonlyArray<readonly [number, number]> = [
    [uMin, vMin], [uMax, vMin], [uMax, vMax], [uMin, vMax],
  ]
  const tmp: PointXYZ = { x: 0, y: 0, z: 0 }
  const local = new Point3(0, 0, 0)
  for (const [u, v] of base) {
    const wc = uvToWorld(p0, u, xAxis, v, yAxis)
    tmp.x = wc.x; tmp.y = wc.y; tmp.z = wc.z
    camera.worldToLocal(tmp, local)
    if (local.z > -BEHIND_CAMERA_MARGIN_M) return true
    tmp.x = wc.x + extX; tmp.y = wc.y + extY; tmp.z = wc.z + extZ
    camera.worldToLocal(tmp, local)
    if (local.z > -BEHIND_CAMERA_MARGIN_M) return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Result assembly (shared by compute/adjust/move paths)
// ─────────────────────────────────────────────────────────────────────────────

function buildPlacement(
  surfaceClass: SurfaceClass,
  planeId: number,
  frame: PlaneFrame,
  uvBounds: UVBounds,
  extDirSign: number,
  camera: GeomCamera,
  options: FMFPlacementOptions | undefined,
): Placement | undefined {
  const { xAxis, yAxis, normal, p0 } = frame
  const { uMin, uMax, vMin, vMax } = uvBounds
  const width = uMax - uMin
  const height = vMax - vMin
  const uMid = (uMin + uMax) / 2

  const floorPlane = options?.forceFloorPlacement ? pu.getFloorPlane() : null

  // Wall box re-anchored to the floor (item sits on floor, back against wall).
  if (floorPlane && surfaceClass === 'wall') {
    const wallPt = uvToWorld(p0, uMid, xAxis, vMin, yAxis)
    const floorNormal = floorPlane.rot[2]
    const floorD = floorPlane.d
    const dist = signedDistToPlane(wallPt, floorNormal, floorD)
    const floorPt: PointXYZ = {
      x: wallPt.x - dist * floorNormal[0],
      y: wallPt.y - dist * floorNormal[1],
      z: wallPt.z - dist * floorNormal[2],
    }

    const fx = floorPlane.rot[0]
    const fy = floorPlane.rot[1]
    const wallDir: PointXYZ = {
      x: extDirSign * normal[0],
      y: extDirSign * normal[1],
      z: extDirSign * normal[2],
    }
    const desiredHeading = Math.atan2(dot3(fx, wallDir), -dot3(fy, wallDir))
    const zeroHeading = Math.atan2(-fy[0], -fy[2])
    return {
      kind: PLACEMENT_KIND,
      location3: { localPos: floorPt, bindTo: String(floorPlane.id) },
      rotation: yAxisRotationQuat(desiredHeading + zeroHeading),
    }
  }

  if (surfaceClass === 'wall') {
    const vMid = (vMin + vMax) / 2
    return {
      kind: PLACEMENT_KIND,
      location3: {
        localPos: uvToWorld(p0, uMid, xAxis, vMid, yAxis),
        bindTo: String(planeId),
      },
    }
  }

  // Floor placement — orient widthAxis roughly toward camera.
  const vMid = (vMin + vMax) / 2
  const floorPos = uvToWorld(p0, uMid, xAxis, vMid, yAxis)

  const widthAxis = width >= height ? xAxis : yAxis
  const dotWFx = widthAxis[0] * xAxis[0] + widthAxis[1] * xAxis[1] + widthAxis[2] * xAxis[2]
  const dotWFy = widthAxis[0] * yAxis[0] + widthAxis[1] * yAxis[1] + widthAxis[2] * yAxis[2]
  const h0 = Math.atan2(dotWFy, dotWFx)

  const camPos = camera.getLocation()
  const sinH0 = Math.sin(h0)
  const cosH0 = Math.cos(h0)
  const fwdX = -sinH0 * xAxis[0] + cosH0 * yAxis[0]
  const fwdY = -sinH0 * xAxis[1] + cosH0 * yAxis[1]
  const fwdZ = -sinH0 * xAxis[2] + cosH0 * yAxis[2]

  const dCamX = camPos.x - floorPos.x
  const dCamY = camPos.y - floorPos.y
  const dCamZ = camPos.z - floorPos.z
  const dotCam = fwdX * dCamX + fwdY * dCamY + fwdZ * dCamZ
  const desiredHeading = dotCam < 0 ? h0 : h0 + Math.PI
  const zeroHeading = Math.atan2(-yAxis[0], -yAxis[2])

  return {
    kind: PLACEMENT_KIND,
    location3: { localPos: floorPos, bindTo: String(planeId) },
    rotation: yAxisRotationQuat(desiredHeading + zeroHeading),
  }
}

function buildPlacementResult(
  surfaceId: string,
  surfaceClass: SurfaceClass,
  planeId: number,
  frame: PlaneFrame,
  uvBounds: UVBounds,
  extrusionDepth: number,
  extDirSign: number,
  camera: GeomCamera,
  sceneDims: SceneDims,
  options: FMFPlacementOptions | undefined,
): PlacementFromStrokesResult {
  const { xAxis, yAxis, normal, p0 } = frame
  const { uMin, uMax, vMin, vMax } = uvBounds
  const width = uMax - uMin
  const height = vMax - vMin

  const extVecX = extDirSign * extrusionDepth * normal[0]
  const extVecY = extDirSign * extrusionDepth * normal[1]
  const extVecZ = extDirSign * extrusionDepth * normal[2]

  const uvCornerList: [number, number][] = [
    [uMin, vMin], [uMax, vMin], [uMax, vMax], [uMin, vMax],
  ]
  const worldCorners = uvCornerList.map(([u, v]) => uvToWorld(p0, u, xAxis, v, yAxis))
  const extrude = (wc: PointXYZ): PointXYZ => ({
    x: wc.x + extVecX, y: wc.y + extVecY, z: wc.z + extVecZ,
  })
  // Side face: wall base + extruded top (for rendering the side of the box).
  const extrusionWorldCorners = [
    worldCorners[0],
    worldCorners[1],
    extrude(worldCorners[1]),
    extrude(worldCorners[0]),
  ]

  const [sceneW, sceneH] = sceneDims
  const projectToScreen = (wc: PointXYZ): Point2D => {
    const sp = camera.worldToScreenFloat(wc)
    return [sp.x / sceneW, sp.y / sceneH]
  }

  const corners = worldCorners.map(projectToScreen) as [Point2D, Point2D, Point2D, Point2D]
  const extrusionCorners = extrusionWorldCorners.map(projectToScreen) as [Point2D, Point2D, Point2D, Point2D]

  // All 8 box corners: back face (on surface) + front face (extruded).
  // Back: BL(0), BR(1), TR(2), TL(3). Front: BL(4), BR(5), TR(6), TL(7).
  const boxCorners = [
    ...corners,
    projectToScreen(extrude(worldCorners[0])),
    projectToScreen(extrude(worldCorners[1])),
    projectToScreen(extrude(worldCorners[2])),
    projectToScreen(extrude(worldCorners[3])),
  ] as [Point2D, Point2D, Point2D, Point2D, Point2D, Point2D, Point2D, Point2D]

  return {
    surfaceId,
    surfaceClass,
    planeId,
    dimensions: { width, height, depth: extrusionDepth },
    corners,
    extrusionCorners,
    boxCorners,
    placement: buildPlacement(surfaceClass, planeId, frame, uvBounds, extDirSign, camera, options),
    uvBounds: { uMin, uMax, vMin, vMax },
    extrusionDepth,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension + UV bounds prep
// ─────────────────────────────────────────────────────────────────────────────

function clampMinDimensions(
  dims: { width: number; height: number; depth: number },
  warnings: PlacementConstraintWarning[],
): { width: number; height: number; depth: number } {
  let { width, height, depth } = dims
  if (width < MIN_DIMENSION_M) {
    width = MIN_DIMENSION_M
    warnings.push({ dimension: WARN_DIM_WIDTH, reason: WARN_REASON_MIN_SIZE, constrainedValue: MIN_DIMENSION_M })
  }
  if (height < MIN_DIMENSION_M) {
    height = MIN_DIMENSION_M
    warnings.push({ dimension: WARN_DIM_HEIGHT, reason: WARN_REASON_MIN_SIZE, constrainedValue: MIN_DIMENSION_M })
  }
  if (depth < MIN_DIMENSION_M) {
    depth = MIN_DIMENSION_M
    warnings.push({ dimension: WARN_DIM_DEPTH, reason: WARN_REASON_MIN_SIZE, constrainedValue: MIN_DIMENSION_M })
  }
  return { width, height, depth }
}

function computeAnchoredUVBounds(
  prior: UVBounds,
  width: number,
  height: number,
  wAnchor: Anchor,
  hAnchor: Anchor,
): UVBounds {
  const uMin = wAnchor === 'max' ? prior.uMax - width : prior.uMin
  const uMax = wAnchor === 'max' ? prior.uMax : prior.uMin + width
  const vMin = hAnchor === 'max' ? prior.vMax - height : prior.vMin
  const vMax = hAnchor === 'max' ? prior.vMax : prior.vMin + height
  return { uMin, uMax, vMin, vMax }
}

// ─────────────────────────────────────────────────────────────────────────────
// Boundary constraints: wall and floor variants
// ─────────────────────────────────────────────────────────────────────────────

function constrainWallBox(
  frame: PlaneFrame,
  planeId: number,
  uv: UVBounds,
  hAnchor: Anchor,
  options: FMFPlacementOptions | undefined,
  warnings: PlacementConstraintWarning[],
): UVBounds {
  let { uMin, uMax, vMin, vMax } = uv

  // Wall polygon footprint clamp — only where the wall physically exists.
  const wallPoly = pu.getPolygonById(planeId)
  const wb = wallPoly?.parameters.transformedVertices
    ? polygonUVBounds(wallPoly.parameters.transformedVertices, frame)
    : null
  if (wb) {
    if (uMax > wb.uMax) {
      uMax = wb.uMax
      if (uMax - uMin < MIN_DIMENSION_M) uMax = uMin + MIN_DIMENSION_M
      warnings.push({ dimension: WARN_DIM_WIDTH, reason: WARN_REASON_WALL, constrainedValue: uMax - uMin })
    }
    if (uMin < wb.uMin) {
      uMin = wb.uMin
      if (uMax - uMin < MIN_DIMENSION_M) uMin = uMax - MIN_DIMENSION_M
      warnings.push({ dimension: WARN_DIM_WIDTH, reason: WARN_REASON_WALL, constrainedValue: uMax - uMin })
    }
    if (vMax > wb.vMax) {
      vMax = wb.vMax
      if (vMax - vMin < MIN_DIMENSION_M) vMax = vMin + MIN_DIMENSION_M
      warnings.push({ dimension: WARN_DIM_HEIGHT, reason: WARN_REASON_WALL, constrainedValue: vMax - vMin })
    }
    if (vMin < wb.vMin) {
      vMin = wb.vMin
      if (vMax - vMin < MIN_DIMENSION_M) vMin = vMax - MIN_DIMENSION_M
      warnings.push({ dimension: WARN_DIM_HEIGHT, reason: WARN_REASON_WALL, constrainedValue: vMax - vMin })
    }
  }

  // Ceiling clamp on vMax.
  const ceiling = pu.getCeilingPlane()
  if (ceiling) {
    const cNormal = ceiling.rot[2]
    const topPt = uvToWorld(frame.p0, uMin, frame.xAxis, vMax, frame.yAxis)
    const cDist = signedDistToPlane(topPt, cNormal, ceiling.d)
    if (cDist < 0) {
      const den = cNormal[0] * frame.yAxis[0] + cNormal[1] * frame.yAxis[1] + cNormal[2] * frame.yAxis[2]
      if (Math.abs(den) > PLANE_DENOM_EPSILON) {
        vMax += cDist / den
        if (vMax - vMin < MIN_DIMENSION_M) vMax = vMin + MIN_DIMENSION_M
        warnings.push({ dimension: WARN_DIM_HEIGHT, reason: WARN_REASON_CEILING, constrainedValue: vMax - vMin })
      }
    }
  }

  // Floor clamp on vMin — only when height is pinned to vMax (item lifted off floor).
  const floor = options?.forceFloorPlacement ? pu.getFloorPlane() : null
  if (floor && hAnchor === 'max') {
    const fNormal = floor.rot[2]
    const botPt = uvToWorld(frame.p0, uMin, frame.xAxis, vMin, frame.yAxis)
    const fDist = signedDistToPlane(botPt, fNormal, floor.d)
    if (fDist > 0) {
      const den = fNormal[0] * frame.yAxis[0] + fNormal[1] * frame.yAxis[1] + fNormal[2] * frame.yAxis[2]
      if (Math.abs(den) > PLANE_DENOM_EPSILON) {
        vMin += fDist / den
        if (vMax - vMin < MIN_DIMENSION_M) vMin = vMax - MIN_DIMENSION_M
        warnings.push({ dimension: WARN_DIM_HEIGHT, reason: WARN_REASON_FLOOR, constrainedValue: vMax - vMin })
      }
    }
  }

  return { uMin, uMax, vMin, vMax }
}

function constrainFloorBox(
  frame: PlaneFrame,
  priorUV: UVBounds,
  uv: UVBounds,
  depthIn: number,
  extDirSign: number,
  warnings: PlacementConstraintWarning[],
): UVBounds & { depth: number } {
  let { uMin, uMax, vMin, vMax } = uv
  let depth = depthIn

  // Prior center picks the "inside" side of each wall. Using the prior (not
  // the new) center avoids flip-flop when the box is being dragged past a
  // wall's infinite plane.
  const priorUC = (priorUV.uMin + priorUV.uMax) / 2
  const priorVC = (priorUV.vMin + priorUV.vMax) / 2
  const boxCenter = uvToWorld(frame.p0, priorUC, frame.xAxis, priorVC, frame.yAxis)

  pu.getAllWallPlanes().forEach((wall) => {
    const wallPoly = pu.getPolygonById(wall.id)
    const wallVerts = wallPoly?.parameters.transformedVertices
    if (!wallVerts || wallVerts.length === 0) return

    const wn = wall.rot[2]
    const wd = wall.d
    // inside = +1 if the prior box sits on the "inside" half-space of this wall.
    const inside = signedDistToPlane(boxCenter, wn, wd) >= 0 ? 1 : -1
    const projU = (frame.xAxis[0] * wn[0] + frame.xAxis[1] * wn[1] + frame.xAxis[2] * wn[2]) * inside
    const projV = (frame.yAxis[0] * wn[0] + frame.yAxis[1] * wn[1] + frame.yAxis[2] * wn[2]) * inside
    if (Math.abs(projU) < PLANE_DENOM_EPSILON && Math.abs(projV) < PLANE_DENOM_EPSILON) return

    const wf = polygonUVBounds(wallVerts, frame)
    if (!wf) return

    // "U dominant" means the wall's inward normal projects more onto the floor's
    // U axis than its V axis, so the wall primarily constrains box width.
    const uDominant = Math.abs(projU) >= Math.abs(projV)
    const axisMiss = uDominant
      ? (vMax <= wf.vMin || vMin >= wf.vMax)
      : (uMax <= wf.uMin || uMin >= wf.uMax)
    if (axisMiss) return

    const base = signedDistToPlane(frame.p0, wn, wd) * inside
    // Corner constraint: base + u*projU + v*projV >= 0.
    const d00 = base + uMin * projU + vMin * projV
    const d10 = base + uMax * projU + vMin * projV
    const d11 = base + uMax * projU + vMax * projV
    const d01 = base + uMin * projU + vMax * projV
    if (d00 >= 0 && d10 >= 0 && d11 >= 0 && d01 >= 0) return

    if (uDominant) {
      const worstV = projV >= 0 ? vMin : vMax
      const uBound = -(base + worstV * projV) / projU
      if (projU > 0 && uMin < uBound) {
        uMin = uBound
        if (uMax - uMin < MIN_DIMENSION_M) uMin = uMax - MIN_DIMENSION_M
        warnings.push({ dimension: WARN_DIM_WIDTH, reason: WARN_REASON_WALL, constrainedValue: uMax - uMin })
      } else if (projU < 0 && uMax > uBound) {
        uMax = uBound
        if (uMax - uMin < MIN_DIMENSION_M) uMax = uMin + MIN_DIMENSION_M
        warnings.push({ dimension: WARN_DIM_WIDTH, reason: WARN_REASON_WALL, constrainedValue: uMax - uMin })
      }
    } else {
      const worstU = projU >= 0 ? uMin : uMax
      const vBound = -(base + worstU * projU) / projV
      if (projV > 0 && vMin < vBound) {
        vMin = vBound
        if (vMax - vMin < MIN_DIMENSION_M) vMin = vMax - MIN_DIMENSION_M
        warnings.push({ dimension: WARN_DIM_HEIGHT, reason: WARN_REASON_WALL, constrainedValue: vMax - vMin })
      } else if (projV < 0 && vMax > vBound) {
        vMax = vBound
        if (vMax - vMin < MIN_DIMENSION_M) vMax = vMin + MIN_DIMENSION_M
        warnings.push({ dimension: WARN_DIM_HEIGHT, reason: WARN_REASON_WALL, constrainedValue: vMax - vMin })
      }
    }
  })

  // Ceiling clamps depth (vertical extrusion above the floor box).
  const ceiling = pu.getCeilingPlane()
  if (ceiling) {
    const cNormal = ceiling.rot[2]
    const floorPt = uvToWorld(frame.p0, uMin, frame.xAxis, vMin, frame.yAxis)
    const topPt = {
      x: floorPt.x + depth * extDirSign * frame.normal[0],
      y: floorPt.y + depth * extDirSign * frame.normal[1],
      z: floorPt.z + depth * extDirSign * frame.normal[2],
    }
    const cDist = signedDistToPlane(topPt, cNormal, ceiling.d)
    if (cDist < 0) {
      // ndot ≈ -1 for near-parallel floor/ceiling.
      const dotNormals = frame.normal[0] * cNormal[0]
        + frame.normal[1] * cNormal[1]
        + frame.normal[2] * cNormal[2]
      const ndot = extDirSign * dotNormals
      if (Math.abs(ndot) > PLANE_DENOM_EPSILON) {
        const floorCeilDist = signedDistToPlane(floorPt, cNormal, ceiling.d)
        depth = -floorCeilDist / ndot
        if (depth < MIN_DIMENSION_M) depth = MIN_DIMENSION_M
        warnings.push({ dimension: WARN_DIM_DEPTH, reason: WARN_REASON_CEILING, constrainedValue: depth })
      }
    }
  }

  return { uMin, uMax, vMin, vMax, depth }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sample strokes against scene geometry to find the dominant wall/floor
 * surface, then compute a 3D bounding box with extrusion depth and placement.
 *
 * When brushWidth is provided each sample expands to 5 points (center + 4
 * edges) so the bbox covers the visual brush extent. Extrusion depth is
 * derived from non-dominant-plane hits (e.g. furniture in front of a wall),
 * clamped to MIN_EXTRUSION_DEPTH_M. When forceFloorPlacement is set and the
 * dominant surface is a wall, the box is extended down to the floor and
 * re-expressed as a floor box so it can slide freely across the floor.
 */
export function computePlacementFromStrokes(
  sampler: SceneSampler,
  sceneDims: SceneDims,
  camera: GeomCamera,
  strokes: Point2D[][],
  options?: FMFPlacementOptions,
): PlacementFromStrokesResult | null {
  const halfBrush = (options?.brushWidth ?? 0) / 2

  type HitEntry = {
    count: number
    surfaceClass: SurfaceClass
    plane: PlaneType
    positions: PointXYZ[]
  }
  const hitCounts = new Map<number, HitEntry>()
  const allHitPositions: PointXYZ[] = []

  const processSample = (relX: number, relY: number) => {
    const r = sampler.sampleRelativePoint({ x: relX, y: relY })
    if (!r?.plane || !r?.position) return
    const pos: PointXYZ = { x: r.position.x, y: r.position.y, z: r.position.z }
    allHitPositions.push(pos)
    if (r.plane.class !== 'wall' && r.plane.class !== 'floor') return
    const entry = hitCounts.get(r.plane.id)
    if (entry) {
      entry.count += 1
      entry.positions.push(pos)
    } else {
      hitCounts.set(r.plane.id, {
        count: 1,
        surfaceClass: r.plane.class as SurfaceClass,
        plane: r.plane,
        positions: [pos],
      })
    }
  }

  for (const stroke of strokes) {
    const step = Math.max(1, Math.floor(stroke.length / 20))
    for (let i = 0; i < stroke.length; i += step) {
      const [relX, relY] = stroke[i]
      processSample(relX, relY)
      if (halfBrush > 0) {
        processSample(relX - halfBrush, relY)
        processSample(relX + halfBrush, relY)
        processSample(relX, relY - halfBrush)
        processSample(relX, relY + halfBrush)
      }
    }
  }

  if (hitCounts.size === 0) return null

  const [bestId, bestEntry] = [...hitCounts.entries()]
    .reduce((best, curr) => (curr[1].count > best[1].count ? curr : best))
  const { surfaceClass, plane, positions } = bestEntry
  const surfaceId = `${surfaceClass}_${bestId}`

  const frame = frameFromPlane(plane)
  const uvs = positions.map((p) => worldToUV(p, frame))
  const uMin = Math.min(...uvs.map((c) => c.u))
  const uMax = Math.max(...uvs.map((c) => c.u))
  let vMin = Math.min(...uvs.map((c) => c.v))
  const vMax = Math.max(...uvs.map((c) => c.v))

  const camPos = camera.getLocation()
  const extDirSign = extDirTowardCamera(frame, camPos)

  // Extrusion depth: max signed projection of off-plane hits along the
  // toward-camera normal direction. Points on the plane are ignored.
  const maxProjection = allHitPositions.reduce((max, pos) => {
    const dx = pos.x - frame.p0.x
    const dy = pos.y - frame.p0.y
    const dz = pos.z - frame.p0.z
    const normalDist = dx * frame.normal[0] + dy * frame.normal[1] + dz * frame.normal[2]
    if (Math.abs(normalDist) < ON_PLANE_EPSILON_M) return max
    return Math.max(max, extDirSign * normalDist)
  }, 0)
  const extrusionDepth = Math.max(MIN_EXTRUSION_DEPTH_M, maxProjection)

  const floorPlane = options?.forceFloorPlacement ? pu.getFloorPlane() : null

  if (floorPlane && surfaceClass === 'wall') {
    // Drop wall vMin to the floor plane so the wall box's bottom sits on the floor.
    const floorNormal = floorPlane.rot[2]
    const floorD = floorPlane.d
    const bottomPt = uvToWorld(frame.p0, uMin, frame.xAxis, vMin, frame.yAxis)
    const num = signedDistToPlane(bottomPt, floorNormal, floorD)
    const den = floorNormal[0] * frame.yAxis[0] + floorNormal[1] * frame.yAxis[1] + floorNormal[2] * frame.yAxis[2]
    if (Math.abs(den) > PLANE_DENOM_EPSILON) {
      const t = num / den
      if (t > 0) vMin -= t
    }

    // Re-express as a floor box: wall box's bottom face becomes floor
    // footprint, wall box's vertical extent becomes upward floor extrusion.
    const wallExt: PointXYZ = {
      x: extDirSign * extrusionDepth * frame.normal[0],
      y: extDirSign * extrusionDepth * frame.normal[1],
      z: extDirSign * extrusionDepth * frame.normal[2],
    }
    const backLeft = uvToWorld(frame.p0, uMin, frame.xAxis, vMin, frame.yAxis)
    const backRight = uvToWorld(frame.p0, uMax, frame.xAxis, vMin, frame.yAxis)
    const floorCorners: PointXYZ[] = [
      backLeft,
      backRight,
      { x: backLeft.x + wallExt.x, y: backLeft.y + wallExt.y, z: backLeft.z + wallExt.z },
      { x: backRight.x + wallExt.x, y: backRight.y + wallExt.y, z: backRight.z + wallExt.z },
    ]

    const floorFrame = frameFromPlane(floorPlane)
    const floorUV = polygonUVBounds(floorCorners, floorFrame)
    if (!floorUV) return null

    const floorExtrusion = Math.max(MIN_EXTRUSION_DEPTH_M, vMax - vMin)
    const floorExtDirSign = extDirTowardCamera(floorFrame, camPos)

    // eslint-disable-next-line i18next/no-literal-string
    const floorSurfaceId = `floor_${floorPlane.id}`
    // eslint-disable-next-line i18next/no-literal-string
    const floorClass: SurfaceClass = `floor`
    return buildPlacementResult(
      floorSurfaceId, floorClass, floorPlane.id, floorFrame, floorUV,
      floorExtrusion, floorExtDirSign, camera, sceneDims, options,
    )
  }

  return buildPlacementResult(
    surfaceId, surfaceClass, bestId, frame, { uMin, uMax, vMin, vMax },
    extrusionDepth, extDirSign, camera, sceneDims, options,
  )
}

/**
 * Validate and re-project a prior placement against new desired dimensions
 * and boundary constraints (wall polygon, floor, ceiling). widthAnchor and
 * heightAnchor control which UV edge stays fixed while the other moves.
 *
 * Returns null if the prior is malformed, the plane is missing, or any of
 * the adjusted box's 8 world corners would fall at/behind the camera plane.
 */
export function adjustPlacement(
  camera: GeomCamera,
  sceneDims: SceneDims,
  prior: PlacementFromStrokesResult,
  newDimensions: { width: number; height: number; depth: number },
  options?: FMFPlacementOptions,
): AdjustedPlacementInfo | null {
  if (!prior.uvBounds || prior.extrusionDepth === undefined) return null

  let planeId = prior.planeId
  if (planeId === undefined) {
    const idMatch = prior.surfaceId.match(/_(\d+)$/)
    if (!idMatch) return null
    planeId = Number(idMatch[1])
  }
  const plane = pu.getSurfaceById(planeId)
  if (!plane) return null

  const frame = frameFromPlane(plane)
  const warnings: PlacementConstraintWarning[] = []
  // eslint-disable-next-line i18next/no-literal-string
  const wAnchor: Anchor = options?.widthAnchor ?? `min`
  // eslint-disable-next-line i18next/no-literal-string
  const hAnchor: Anchor = options?.heightAnchor ?? `min`
  const extDirSign = extDirTowardCamera(frame, camera.getLocation())

  const { width, height, depth: depth0 } = clampMinDimensions(newDimensions, warnings)
  let depth = depth0
  let uv = computeAnchoredUVBounds(prior.uvBounds, width, height, wAnchor, hAnchor)

  if (prior.surfaceClass === 'wall') {
    uv = constrainWallBox(frame, planeId, uv, hAnchor, options, warnings)
  } else if (prior.surfaceClass === 'floor') {
    const out = constrainFloorBox(frame, prior.uvBounds, uv, depth, extDirSign, warnings)
    uv = { uMin: out.uMin, uMax: out.uMax, vMin: out.vMin, vMax: out.vMax }
    depth = out.depth
  }

  // Perspective projection inverts sign across the camera plane — reject
  // placements where any corner would project past that boundary, otherwise
  // the bbox appears mirrored on the ceiling.
  if (anyCornerBehindCamera(frame, uv, depth, extDirSign, camera)) return null

  const result = buildPlacementResult(
    prior.surfaceId, prior.surfaceClass, planeId, frame, uv,
    depth, extDirSign, camera, sceneDims, options,
  )
  return { ...result, warnings }
}

/**
 * Shift a prior placement by a world-space delta. The delta is projected onto
 * the surface's UV axes so the box moves across the surface (e.g. along the
 * floor) while preserving its dimensions. Delegates to adjustPlacement for
 * final constraint validation.
 */
export function movePlacement(
  camera: GeomCamera,
  sceneDims: SceneDims,
  prior: PlacementFromStrokesResult,
  worldDelta: PointXYZ,
  options?: FMFPlacementOptions,
): AdjustedPlacementInfo | null {
  if (!prior.uvBounds || prior.planeId === undefined) return null
  const plane = pu.getSurfaceById(prior.planeId)
  if (!plane) return null

  const { xAxis, yAxis } = frameFromPlane(plane)
  const du = worldDelta.x * xAxis[0] + worldDelta.y * xAxis[1] + worldDelta.z * xAxis[2]
  const dv = worldDelta.x * yAxis[0] + worldDelta.y * yAxis[1] + worldDelta.z * yAxis[2]

  return adjustPlacement(
    camera,
    sceneDims,
    {
      ...prior,
      uvBounds: {
        uMin: prior.uvBounds.uMin + du,
        uMax: prior.uvBounds.uMax + du,
        vMin: prior.uvBounds.vMin + dv,
        vMax: prior.uvBounds.vMax + dv,
      },
    },
    prior.dimensions,
    options,
  )
}
