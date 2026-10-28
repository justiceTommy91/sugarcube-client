// Primary: Patrick Rutkowski (patrick@geomagical.com)

import * as THREE from "three"
import { OR } from "utils/logic"

import
{
  STACKABLE_UX_MAX_INDIRECT_DISTANCE
}
from "Renderer/constants"
import { PointXYZ } from "Renderer/geomviewer/geom_types"
import { getStackableSurfaceItem3D } from 'Renderer/rendering/scene_utils'
import { gvCurrentCamera, gvCurrentScene } from "Renderer/foundation/geom_app"


//
// +--------------------------------------------------+
// | Utility routine, computeIndirectStackablePoint() |
// +--------------------------------------------------+
//
// Stackables surfaces can sometimes be difficult to hover over
// using the mouse. Some may be completely facing away from the
// eye. Others may be facing the eye at a glancing angle, leaving
// vanishingly little on-screen area to interact with. This
// routine takes nearby mouse positions, which may not be
// directly over any surface at all, and maps them to reasonable
// position on the surface in 3D space.
//
// This routine looks at all surfaces and returns the one that is
// nearest to the mouse.
//
// This routine works by intersecting a vertical 3D plane
// centered at the mouse with the set of 3D line segments making
// up our stackable surfaces (see the figures below). The cut
// plane will always run parallel to the y-axis and through the
// eye. From screen space the cut plane will appear to be a
// vertical line extruded into the scene.
//
// The math for intersecting this specific plane with 3D line
// segments is pleasantly trivial in cylindrical coordinates
// centered at the eye. Let `mTheta` be the angular coordinate of
// the cut plane. Let `t0` and `t1` be the angular coordinates of
// a given line segment. An intersection occurs simply if `t0 <
// mTheta < t1`.
//
// +----------------------+
// | Figure 1, Front View |
// +----------------------+
//
//   +-------------------+
//   |           .       |
//   |           .       |
//   |           .       |
//   |       (m) *       |
//   |           .       |
//   |           .       |
//   |           .       |
//   |           .       |
//   +-------------------+
//
// Let the mouse be at (m) in screen space.
//
// Draw a vertical line through the mouse.
//
// Extrude this line into the scene along vector from the eye.
// This extruction makes a plane. This is the cut plane.
//
// The cut plane may bisect some stackable surfaces.
//
// A point on the nearest bisected stackable, in the center of
// the bisection, is taken to be the point intended by the user
// for object placement.
//
// +-------------------------+
// | Figure 2, Top-Down View |
// +-------------------------+
//
//             mTheta             +---- x
//              /                /|
//        t0   /  t1            / |
//         *-----*             y  |
//           /                    z
//     . . ./ <--- cut plane
//   .     / .
//  .     /   .
//  .   eye   .
//  .         . <--- cylinder orientation
//   .       .
//     . . .
//
// This intersection math could be done with ordinary 3D
// intersection utilities capable of intersecting general planes
// with general line segments. However, in addition to being easy
// to code, this cylindrical system lends itself to very elegant
// and straight forward optimizations. For example, the `t0` and
// `t1` values could be precomputed for all the line segments
// currently on screen. If the `t0`'s and `t1`'s were stored in
// sorted order then a global intersection check would be
// effectively instantaneous.
//
// Such optimizations may be useful since this routine runs in
// the mouse's onMove() handler, where the performance may matter
// in scenes that have sufficiently numerous or complicated
// stackables. In current tests this routine appears to perform
// acceptably without optimization.
//

interface ExtendedCamera extends THREE.Camera {
  left: number
  right: number
  top: number
  bottom: number
  near: number
}

// <mouseBelowSurfInteract> determines if surfaces are found from a position (relX and relY) that is below the surface.
export
function
computeIndirectStackablePoint(relX: number, relY: number, filterIds: number[], mouseBelowSurfInteract = true): {
    stackablePlaneId: number,
    worldPoint: THREE.Vector3,
    directHit: boolean,
    parentPoint?: THREE.Vector3,
    localPoint?: PointXYZ
} | null
{
  const threeCamera = gvCurrentCamera()?.getThreeCamera() as THREE.Camera
  if (!threeCamera) {
    return null
  }

  const extCam = threeCamera as ExtendedCamera

  // Let `m` be the mouse position in eye coordinates.
  const m = new THREE.Vector3(
    + extCam.left + (extCam.right - extCam.left) * relX,
    + extCam.top + (extCam.bottom - extCam.top) * relY,
    - extCam.near
  )

  // Draw a vertical line on the viewport at the location of the
  // mouse. Project this vertical line into the scene in order to
  // extrude a plane. Do this projection along the eye's line of
  // sight, not perpendicular to the viewport. Let `n` be the
  // normal vector of this extruded plane.

  const y = new THREE.Vector3(0, 1, 0)
  const n = m.clone().cross(y)

  // Let `mTheta` be the cylindrical coordinate of the cut plane.

  const mTheta = Math.atan2(m.x, -m.z)

  // Gather up all surfaces in the scene, or if we have
  // `filterIds` then collect just the surfaces in the filtered
  // set.

  const surfaces : any[] = []

  if( filterIds.length === 0 )
  {
    const scene = gvCurrentScene()?.getObjectsScene()
    if (scene) {
      scene.traverse(
        (child : any) =>
        {
          const pid = child.userData.stackablePlaneId
          if( pid !== undefined && getStackableSurfaceItem3D(pid)?.getParent()) {
            surfaces.push(child)
          }
        }
      )
    }
  }
  else
  {
    filterIds.forEach(
      filterId =>
      {
        const s = getStackableSurfaceItem3D(String(filterId))
        if(s && s.getParent())
          surfaces.push(s.getObject())
      }
    )
  }

  // Loop over each surface and intersect it with the plane
  // `mTheta`. Gather the intersection information into `cuts.`

  interface CutInfo {
    surfaceItem : any // StackableSurfaceItem
    mid         : any // THREE.Vector3
  }

  let cuts : CutInfo[] = []

  surfaces.forEach(
    surface =>
    {
      // Get the RenderItem instance associated with this
      // `surface` (which is a THREE.Object3D).

      const surfaceItem = getStackableSurfaceItem3D(surface.userData.stackablePlaneId)
      if (!surfaceItem) {
        return
      }

      const verts : [number, number][] =
        surfaceItem.getPlaneParameters().parameters.vertices

      // The surface polygon is specified in a 2D xy-plane.
      // Transform this polygon into world space then view space.

      const points = verts.map(
        pt =>
        {
          return surface.localToWorld(
            new THREE.Vector3(pt[0], pt[1], 0)
          ).applyMatrix4(extCam.matrixWorldInverse)
        }
      )

      // Loop over each line segment in the surface polygon.

      let cutPoints = []

      const pointCount = points.length

      for(let i0 = 0; i0 < pointCount; i0++)
      {
        // A line segment is made up of this point plus the next
        // point.

        const i1 = (i0 + 1) % points.length;

        const v0 = points[i0]
        const v1 = points[i1]

        // Get the cylindrical coordinates of the line segment's
        // points.

        let t0 = Math.atan2(v0.x, -v0.z)
        let t1 = Math.atan2(v1.x, -v1.z)

        // In order for the expression `t0 < mTheta < t1` we must
        // have `t0 < t1`. Swap the parameters if this isn't
        // already true.

        if( t0 > t1 )
        {
          const t = t0
          t0 = t1
          t1 = t
        }

        if( t0 < mTheta && mTheta <= t1 )
        {
          // Let `d` be the distance from `v0` to `m`, but as a
          // ratio of the total distance from `v0` to `v1`.
          // Distances here are measured in the `n` direction
          // only. `d` will be in the range [0, 1]
          //
          // d = ((m - v0) * n) / ((v1 - v0) * n)

          const p = m.clone().sub(v0).dot(n)
          const q = v1.clone().sub(v0).dot(n)

          const d = p / q

          if( Number.isFinite(d) )
          {
            // cp = v0 + d * (v1 - v0)

            const cp = v0.clone().add(
              v1.clone().sub(v0).multiplyScalar(d)
            )

            cutPoints.push(cp)
          }
        }
      }

      cutPoints = cutPoints.sort(
        (a, b) =>
        {
          if (a.z < b.z) return -1
          if (a.z > b.z) return +1
          return 0
        }
      )

      if( cutPoints.length === 1 )
        cutPoints = []

      if( cutPoints.length >= 2 )
      {
        // mid = 0.5 * (cutPoints[0] + cutPoints[1])

        const c0 = cutPoints[0].clone()
        const c1 = cutPoints[1]

        const mid = c0.add(c1).multiplyScalar(0.5)

        cuts.push({ surfaceItem, mid })
      }
    }
  )

  const projectY = (
    p : THREE.Vector3
  ) =>
  {
    const ptp = new THREE.Vector4(p.x, p.y, p.z, 1)
    ptp.applyMatrix4(extCam.projectionMatrix)
    ptp.divideScalar(ptp.w)
    return (1 - ptp.y) / 2
  }

  cuts = cuts.filter(cut => {
    const cy = projectY(cut.mid)
    const dy = Math.abs(cy - relY)
    const isMousePosAboveSurface = (cy - relY) > 0
    const mouseBelowSurfInteractivity = mouseBelowSurfInteract ? true : isMousePosAboveSurface
    return mouseBelowSurfInteractivity && dy < STACKABLE_UX_MAX_INDIRECT_DISTANCE
  })

  cuts.sort(
    (a, b) =>
    {
      const da = Math.abs(projectY(a.mid) - relY)
      const db = Math.abs(projectY(b.mid) - relY)

      if (da > db) return +1
      if (da < db) return -1
      return 0
    }
  )

  if( cuts.length >= 1 )
  {
    return {
      stackablePlaneId: cuts[0].surfaceItem.id,
      worldPoint: cuts[0].mid.applyMatrix4(extCam.matrixWorld), // Return results in world space.
      directHit: false,
    }
  }

  return null
}

//
// +------------------------------------------------+
// | Utility routine, sufficientInteractableDepth() |
// +------------------------------------------------+
//
// Stacakble surfaces are split into three cataegories as they
// appear on the screen:
//
// 1. Surfaces which are amply visible and oriented toward the
//    eye.
//
// 2. Surfaces which are completely turned away from the eye.
//    The tops of these surfaces cannot be seen at all.
//
// 3. Surfaces which are technically turned toward the eye, but
//    just barely. Such surfaces may have no more than a sliver
//    of visible area.
//
// Surfaces is category #1 have no UI difficulties. Surfaces in
// category #2 are completely unusable under UI systems which
// require visible area to interact with. Surfaces in category #3
// may be technically usable, but if the user is required to
// hover over the surface's visible area then these surfaces may
// be very difficult to interact with.
//
// This routine is a boolean check which returns `true` for
// surfaces in category #1 (UI friendly surfaces) and `false` for
// surfaces in category #2 and #3 (UI unfriendly surfaces). This
// routine doesn't solve any of the UI problems associated with
// categories #2 and #3, it merely classifies them as such. This
// classification is then used by higher level UI code.
//
// Category #2 is very easy to define: If a surface is turned
// away from the eye then return `false`, case closed. The
// distinction between categories #1 and #3 is harder to quantify
// numerically. Most of the code in this routine deals with the
// distinction between categories #1 and #3.
//
// We want to return `false` if a surface "doesn't have enough
// visible space to interact with." But what exactly does this
// mean? Here's how we makes this determination:
//
// 1. Trace the surface's outline in screen space.
//
// 2. Draw an oriented bounding box around the surface (again,
//    in screen space).
//
// 3. Take the minimum of the width and the height. In the
//    diagram below we would take the height, because it appears
//    to be less than the width. We will call this minimum
//    extent the "characteristic depth" of the surface.
//
// 4. If the "characteristic depth" of the surface is less than
//    STACKABLE_UX_MIN_INTERACTABLE_DEPTH then the routine
//    returns `false`, indicating that the surface is too shallow
//    to interact with pleasantly. Otherwise return `true`,
//    indicating that the surface is fully visible to the eye in
//    an ordinary head-on way. The
//    STACKABLE_UX_MIN_INTERACTABLE_DEPTH constant is measured in
//    NDC screen space.
//
// Step (2) is accomplished by computing a 2D variance-covariance
// matrix from the surface's screen points, and then finding the
// eigenframe of this matrix. An axis-aligned bounding box in
// this eigenframe gives a reasonably oriented bounding box.
//
//                   height
//              +---------------+
//             /  ........     /
//            /   .      .    /
//        h  /   .       .   /         eigenvector 2
//       t  /   .       .   /        /
//      d  /  ..        .  /        /
//     i  /  .         .  /        /
//    w  / .          .  /        *------ eigenvector 1
//      /  .         .  /
//     /    .       .  /          ^ eigenframe of the
//    /     .      .  /              variance-covariance matrix:
//   /       ......  /  
//  +---------------+                 [ sigma-xx, sigma-xy ]
//                                    [ sigma-yx, sigma-yy ]
//

export
function
sufficientInteractableDepth(
  stackableItem        : any, // StackableSurfaceItem
  minInteractableDepth : number
)
{
  // Return `true` right away if we get bad data. This `if` is
  // defensive and typically should not trigger.

  if( OR
      || ! stackableItem?.plane.parameters
      || ! stackableItem?.renderObject )
  {
    return true
  }

  // Static stackables should not get the UX treatment in this
  // file. Assume they have sufficient interactable depth without
  // checking.

  if( ! stackableItem.parent )
    return true

  const verts : [number, number][] =
    stackableItem?.plane.parameters.vertices

  if( ! verts )
    return true

  // Let `screenPoints` be the stackable's polygon in screen
  // coordinates.

  const camera = stackableItem.Renderer.getCamera()
  if (!camera) {
    return true
  }

  const screenPoints = verts.map(
    vert =>
    {
      const pt = new THREE.Vector3(
        vert[0], vert[1], 0
      )

      const wp = stackableItem.renderObject.localToWorld(pt).applyMatrix4(camera.matrixWorldInverse)

      const wp4 = new THREE.Vector4(
        wp.x, wp.y, wp.z, 1
      )

      wp4.applyMatrix4(
        camera.projectionMatrix
      )

      wp4.divideScalar(wp4.w)

      return [wp4.x, wp4.y]
    }
  )

  // Check if the surface is facing away from the eye. Let `pt0`
  // be a point on the surface, and let `pt1` be a point above
  // `p0`. The surface's normal will be `n = p1 - p2`. Since the
  // eye is at (0, 0, 0) the point `pt0` is itself a vector from
  // the eye to the plane's origin. The dot product `n * pt1`
  // will be positive for surfaces facing away form the eye and
  // negative for surfaces facing toward the eye.

  const pt0 = new THREE.Vector3(0, 0, 0)
  const pt1 = new THREE.Vector3(0, 0, 1)

  stackableItem.renderObject.localToWorld(pt0).applyMatrix4(camera.matrixWorldInverse)
  stackableItem.renderObject.localToWorld(pt1).applyMatrix4(camera.matrixWorldInverse)

  const n = pt1.clone().sub(pt0)

  const dot = pt0.dot(n)

  if( dot > 0 )
    return false

  // Let `(xu, yu)` be the centroid of `screenPoints`.

  let xu = 0
  let yu = 0

  screenPoints.forEach(
    pt =>
    {
      xu += pt[0]
      yu += pt[1]
    }
  )

  xu /= screenPoints.length
  yu /= screenPoints.length

  // Let the variance-covariance matrix of `screenPoints` be
  //
  // | cxx, cxy |
  // | cyx, cyy |

  let cxx = 0
  let cyy = 0
  let cxy = 0

  screenPoints.forEach(
    pt =>
    {
      cxx += (pt[0] - xu) * (pt[0] - xu)
      cyy += (pt[1] - yu) * (pt[1] - yu)
      cxy += (pt[0] - xu) * (pt[1] - yu)
    }
  )

  cxx /= screenPoints.length
  cyy /= screenPoints.length
  cxy /= screenPoints.length

  const cyx = cxy

  // Let v0 and v1 be the eigenvectors of the variance-covariance
  // matrix.

  let v0 : [number, number]
  let v1 : [number, number]

  if( cxy === 0 )
  {
    // If cxy is zero then there is already no covariance. We're
    // already in the eigenframe. The global frame is itself the
    // eigenframe.

    v0 = [1, 0]
    v1 = [0, 1]
  }
  else
  {
    // Let `l0` be the first eigenvalue of the
    // variance-covariance matrix. To get the eigenvalue we solve
    // the quadratic `(cxx - l0)*(cyy - l0) - cxy * cyx = 0` in
    // `l0`.

    const a = 1
    const b = -(cxx + cyy)
    const c = (cxx * cyy - cxy * cyx)

    const l0 = (-b + Math.sqrt(b*b - 4*a*c)) / (2*a)

    // Compute the first eigenvector from the equation
    //
    // cxx * x + cxy * y = l0 * x

    v0 = [ 1, (l0 - cxx) / cxy ]

    const v0Len  = Math.sqrt(
      + v0[0] * v0[0]
      + v0[1] * v0[1]
    )

    v0[0] /= v0Len
    v0[1] /= v0Len

    // For symetric matrices the eigenvectors are always mutually
    // perpendicular. Get the second eigenvector by rotating the
    // first one 90 degrees.

    v1 = [ -v0[1], v0[0] ]
  }

  // Compute the bounding box of `screenPoints` in the
  // eigenframe.

  let minx = +Infinity
  let maxx = -Infinity
  let miny = +Infinity
  let maxy = -Infinity

  screenPoints.forEach(
    pt =>
    {
      // Let `(x, y)`, be the coordinates of `pt` in the
      // eigenframe.

      const x = v0[0] * (pt[0] - xu) + v0[1] * (pt[1] - yu)
      const y = v1[0] * (pt[0] - xu) + v1[1] * (pt[1] - yu)

      if (x < minx) minx = x
      if (x > maxx) maxx = x
      if (y < miny) miny = y
      if (y > maxy) maxy = y
    }
  )

  // Let `dx` and `dy` be the width and height of the bounding
  // box.

  const dx = maxx - minx
  const dy = maxy - miny

  // Let `ml` be the minimum dimension of the bounding box.

  const ml = (dx < dy) ? dx : dy

  return ml >= minInteractableDepth
}
