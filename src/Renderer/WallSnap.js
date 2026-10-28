/* eslint-disable no-underscore-dangle */
/* eslint @typescript-eslint/naming-convention: 0 */
// Primary: Patrick Rutkowski (patrick@geomagical.com)

import { Polygon3 } from "Renderer/geometry/Polygon3"
import { isPointInsidePolygon2D } from "Renderer/geometry/PolygonUtils"
import WallspiceWebgl from "Renderer/WallspiceMultiViewAdapter"
import { getFloorPlane } from "Renderer/utils/sceneUtils"
import * as THREE from "three"

import { WALL_INTERSECTION_SHIFT } from "Renderer/constants"

import { getNormalizedAngle } from 'Renderer/utils/posUtils'
import * as numeric from "Renderer/utils/NumericUtils"

import { collectClockwiseLoop } from "Renderer/utils/template_utils"

import { EPSILON } from "./geometry"

// System works solving a system of linear equations. There are two methods for performance reasons. Methods are cramer, and SVD decomposition.
// Cramer performs better for low amount of contacts, but hangs for many docens of seconds for big amount of contacts because it computes the determinant
// of a square n x n matrix recursively. This threshold is used to choose the best solving method performance wise. 
const CONTACT_COUNT_SOLVE_METHOD_THRESHOLD = 5

let _isInitialized = false // Whether WallSnap has been successfully initialized.
// private variables for the module
let _intrinsics
let _planes
let _floorLines
let _floorCircle
let _floorPlane

// Workaround for gfx-1763: Some times furniture items can get stuck in corners.
// These two variable are part of a workaround to address that problem.
// List of floor lines involved in last contacts.
const contactFloorLines = [];

// Setting renderItem's <pose> directly leads to undesired <distpatchItemPlacementUpdate> notifications.
// By using this auxiliar renderItem we avoid unneeded notifications downstream.
const workSpaceRenderItem = {
  position: null,
  orientation: null,
  pose: null,
  body: null
}

export
function
initForTesting(intrinsics, planes, floorLines) {
 _intrinsics = intrinsics;
 _planes = planes
 _floorLines = floorLines
 
 _floorPlane = getFloorPlane(planes)
 if (!_isInitialized) {
  _isInitialized = _intrinsics && _planes && _floorLines;
 }
}

export
function
init(intrinsics, planes, floorLines) {
 _intrinsics = intrinsics;
 _planes = planes
 _floorLines = floorLines
 _floorPlane = getFloorPlane(planes)
 // eslint-disable-next-line @typescript-eslint/no-use-before-define
 _floorCircle = createFloorCircle(_floorLines)
 if (!_isInitialized) {
  _isInitialized = _intrinsics && _planes && _floorLines;
 }
}

const useDebugView = false

function
rotMat(a)
{
  return [
    [ +Math.cos(a), -Math.sin(a) ],
    [ +Math.sin(a), +Math.cos(a) ]
  ]
}

function
debugConnect()
{
  if( ! useDebugView )
    return

  if( ! window.wallSnapDebugWS )
  {
    window.wallSnapDebugWSConnected = false
    window.wallSnapDebugWSQueue = []

    window.wallSnapDebugWS = new WebSocket("ws://localhost:8080")

    window.wallSnapDebugWS.onerror = (
      err =>
      {
        /* eslint-disable no-console */
        console.log("WS ERROR --------------")
        console.log(err)
        /* eslint-enable no-console */
        window.wallSnapDebugWS = new WebSocket("ws://localhost:8080")
      }
    )

    window.wallSnapDebugWS.onopen = (
      () =>
      {
        /* eslint-disable-next-line no-console */
        console.log("WS OPEN --------------")

        window.wallSnapDebugWSConnected = true

        window.wallSnapDebugWSQueue.forEach(msg => {
          window.wallSnapDebugWS.send(msg)
        })

        window.wallSnapDebugWSQueue = null
      }
    )
  }
}

function
debugSend(msg)
{
  if( ! useDebugView )
    return

  debugConnect()

  const msgJSON = JSON.stringify(msg)

  if( window.wallSnapDebugWSConnected )
    window.wallSnapDebugWS.send(msgJSON)
  else
    window.wallSnapDebugWSQueue.push(msgJSON)
}

function
sendFloorLines(lines)
{
  if( ! useDebugView )
    return

  debugSend({
    type: "lines",
    lines
  })
}

function
debugFrame()
{
  if( ! useDebugView )
    return

  debugSend({
    type: "frame"
  })
}

function
debugIter()
{
  if( ! useDebugView )
    return

  debugSend({
    type: "iter"
  })
}

function
debugContactsOrig(csOrig)
{
  if( ! useDebugView )
    return

  debugSend({
    type: "contactsOrig",
    contactsOrig: csOrig
  })
}

function
debugContacts(cs)
{
  if( ! useDebugView )
    return

  debugSend({
    type: "contacts",
    contacts: cs
  })
}

function
debugNormalShifts(shifts)
{
  if( ! useDebugView )
    return

  debugSend({
    type: "normalShifts",
    shifts
  })
}

function
debugGood(good)
{
  if( ! useDebugView )
    return

  debugSend({
    type: "good",
    good
  })
}

function
debugBody(body)
{
  if( ! useDebugView )
    return

  const pos = [
    body.pos[0],
    body.pos[1]
  ]

  const m = rotMat(body.rot)

  const corners = []

  for(let i = 0; i < body.corners.length; i++)
  {
    let q = body.corners[i]

    q = [
      pos[0] + m[0][0] * q[0] + m[0][1] * q[1],
      pos[1] + m[1][0] * q[0] + m[1][1] * q[1]
    ]

    corners.push(q)
  }

  debugSend({
    type: "body",
    corners
  })
}

function
debugMouseForce(mf)
{
  if( ! useDebugView )
    return

  debugSend({
    type: "mouseForce",
    mouseForce: mf
  })
}

function
debugForceIter(cs, fs)
{
  if( ! useDebugView )
    return

  debugSend({
    type: "forceIter",
    contacts: cs,
    forces: fs
  })
}

function
bake(renderItem, xy, orientation)
{
  const ri = renderItem

  const floorPoint = WallspiceWebgl.screenToPlaneWorld(
    xy, _floorPlane, _intrinsics
  )

  ri.position = xy
  ri.orientation = getNormalizedAngle(orientation)

  ri.pose = {
    pos: floorPoint,
    rot: _floorPlane.rot
  }
}

function
intersectLines(a0, a1, b0, b1)
{
  const ax = a1[0] - a0[0]
  const ay = a1[1] - a0[1]
  const bx = b1[0] - b0[0]
  const by = b1[1] - b0[1]

  const denom = ax * by - ay * bx

  if (Math.abs(denom) < EPSILON) {
    return null
  }

  const dx = b0[0] - a0[0]
  const dy = b0[1] - a0[1]

  const t = (dx * by - dy * bx) / denom
  const s = (dx * ay - dy * ax) / denom

  if (t < 0 || t > 1 || s < 0 || s > 1) {
    return null
  }

  return [a0[0] + t * ax, a0[1] + t * ay]
}

// <landingPlane> can be any plane of the room where the item lies. Not necessarily the floor plane.
export
function
initBody(ri, w, h, landingPlane, intrinsics)
{
  const body = {}

  body.rot = 0
  body.pos = [ 0, 0 ]
  body.lines = []
  body.normals = []
  body.corners = []
  body.mass = 20

  body.lines = [
    [ [ +w/2, +h/2 ], [ -w/2, +h/2 ] ],
    [ [ -w/2, +h/2 ], [ -w/2, -h/2 ] ],
    [ [ -w/2, -h/2 ], [ +w/2, -h/2 ] ],
    [ [ +w/2, -h/2 ], [ +w/2, +h/2 ] ],
  ]

  for(let i = 0; i < body.lines.length; i++)
  {
    const [ q0, q1 ] = body.lines[i]

    const n = [
      (q0[0] + q1[0]) / 2,
      (q0[1] + q1[1]) / 2
    ]

    const nLen = Math.sqrt(
      + n[0] * n[0]
      + n[1] * n[1]
    )

    n[0] /= nLen
    n[1] /= nLen

    body.normals.push(n)
  }

  body.area = w * h
  body.density = body.mass / body.area
  body.i = body.mass * (w * w + h * h) / 12

  body.corners = [
    [ +w/2, +h/2 ],
    [ -w/2, +h/2 ],
    [ -w/2, -h/2 ],
    [ +w/2, -h/2 ]
  ]

  body.radius = 0.5 * Math.sqrt(w * w + h * h)
  body.rot = ri.orientation
  if (intrinsics) {
    const floorPoint = WallspiceWebgl.screenToPlaneWorld(
      ri.position, landingPlane, intrinsics
    )
    body.pos = WallspiceWebgl.worldToPlane(landingPlane, floorPoint)
  }

  return body
}

//
// fb: base force (from mouse)
// tb: base torque (from mouse)
// cs: contact points
// fs: forces on contact points
// dt: target timestep
// ds: maximum spatial jump
//

function
positionalOffsets(body, fb, tb, cs, fs, dt, ds)
{
  const fn = [ fb[0], fb[1] ]
  let tau = tb

  for(let i = 0; i < fs.length; i += 1)
  {
    const [ c, n ] = cs[i]
    const f = Math.abs(fs[i])

    const fx = f * n[0]
    const fy = f * n[1]

    fn[0] += fx
    fn[1] += fy

    const rho0 = [
      c[0] - body.pos[0],
      c[1] - body.pos[1]
    ]

    tau += rho0[0] * fy - rho0[1] * fx
  }

  const m = body.mass
  const ti = body.i

  const fMag = Math.sqrt(fn[0] * fn[0] + fn[1] * fn[1])
  const dtf = Math.sqrt(2 * m * ds / fMag)
  const dta = Math.sqrt(Math.abs(2 * ds / body.radius * ti / tau))

  let dts

  if( fMag === 0 && tau === 0 )
    dts = 0
  else if( fMag === 0 )
    dts = dta
  else if( tau === 0 )
    dts = dtf
  else
    dts = (dtf < dta) ? dtf : dta

  const dtr = Math.min(dt, dts)

  const dx = 0.5 * (fn[0] / m) * dtr * dtr
  const dy = 0.5 * (fn[1] / m) * dtr * dtr
  const da = 0.5 * (tau / ti) * dtr * dtr

  return [ dx, dy, da, dtr ]
}

function getFloorLinePoints(floorLine, margin)
{
  const lineShifted = floorLine.points.map(p => [...p]);
  lineShifted[0][0] += margin * floorLine.n2[0]
  lineShifted[0][1] += margin * floorLine.n2[1]
  lineShifted[1][0] += margin * floorLine.n2[0]
  lineShifted[1][1] += margin * floorLine.n2[1]
  return lineShifted
}

function
floorLineSegs(floorLine, margin = 0.0)
{
  const points = getFloorLinePoints(floorLine, margin)

  return [
    {
      points: [
        points[0],
        points[1]
      ],
      normal: floorLine.n2
    },
    {
      points: [
        points[0],
        [
          points[0][0] - 10000 * floorLine.n2[0],
          points[0][1] - 10000 * floorLine.n2[1]
        ]
      ],
      normal: [
        -floorLine.t2[0],
        -floorLine.t2[1]
      ]
    },
    {
      points: [
        points[1],
        [
          points[1][0] - 10000 * floorLine.n2[0],
          points[1][1] - 10000 * floorLine.n2[1]
        ]
      ],
      normal: [
        +floorLine.t2[0],
        +floorLine.t2[1]
      ]
    }
  ]
}

function
contactPoints(body, ds, margin = 0.0)
{
  contactFloorLines.length = 0;

  const pos = [
    body.pos[0],
    body.pos[1]
  ]

  const m = rotMat(body.rot)

  const contacts = []

  for(let i = 0; i < body.corners.length; i++)
  {
    let q = body.corners[i]

    q = [
      pos[0] + m[0][0] * q[0] + m[0][1] * q[1],
      pos[1] + m[1][0] * q[0] + m[1][1] * q[1]
    ]

    let minDQY
    let jmin

    for(let j = 0; j < _floorLines.length; j++)
    {
      const floorLine = _floorLines[j]
      const points = getFloorLinePoints(floorLine, margin)
      const segs = floorLineSegs(floorLine, margin)

      for(let k = 0; k < segs.length; k++)
      {
        const ki = segs.length - k - 1
        const [ q0 ] = segs[ki].points
        const n = segs[ki].normal

        const dq = [
          q[0] - q0[0],
          q[1] - q0[1]
        ]

        const dqy = -(n[0] * dq[0] + n[1] * dq[1])

        if( dqy < 0 )
          break

        if( ki === 0 )
        {
          const i0 = (i > 0) ? (i - 1) : (body.corners.length - 1)
          const i1 = (i + 1) % body.corners.length

          let c0 = body.corners[i0]
          let c1 = body.corners[i1]

          c0 = [
            pos[0] + m[0][0] * c0[0] + m[0][1] * c0[1],
            pos[1] + m[1][0] * c0[0] + m[1][1] * c0[1]
          ]

          c1 = [
            pos[0] + m[0][0] * c1[0] + m[0][1] * c1[1],
            pos[1] + m[1][0] * c1[0] + m[1][1] * c1[1]
          ]

          const cp0 = intersectLines(q, c0, points[0], points[1])
          const cp1 = intersectLines(q, c1, points[0], points[1])

          if( ! cp0 && ! cp1 )
            break

          if( minDQY === undefined || dqy < minDQY )
          {
            minDQY = dqy
            jmin = j
          }
        }
      }
    }

    if( minDQY !== undefined )
    {
      contacts.push([
        q,
        [
          +_floorLines[jmin].n2[0],
          +_floorLines[jmin].n2[1]
        ],
        [
          0, jmin, i
        ]
      ])

      // Keep track of floor lines with contact points. Part of workaround for gfx-1763.
      contactFloorLines.push(_floorLines[jmin]);
    }
  }

  for(let k = 0; k < _floorLines.length; k++)
  {
    const endpointContacts = []

    const floorLine = _floorLines[k]
    const points = getFloorLinePoints(floorLine, margin)

    for(let i = 0; i < points.length; i++)
    {
      const q = points[i]

      let t2
      if( i === 0 )
        t2 = [ -floorLine.t2[0], -floorLine.t2[1] ]
      else
        t2 = [ +floorLine.t2[0], +floorLine.t2[1] ]

      let dqys = []

      for(let j = 0; j < body.lines.length; j++)
      {
        const bn = body.normals[j]

        const n = [
          m[0][0] * bn[0] + m[0][1] * bn[1],
          m[1][0] * bn[0] + m[1][1] * bn[1]
        ]

        n[0] = -n[0]
        n[1] = -n[1]

        const bodyLine = body.lines[j]

        let a = bodyLine[0]

        a = [
          pos[0] + m[0][0] * a[0] + m[0][1] * a[1],
          pos[1] + m[1][0] * a[0] + m[1][1] * a[1]
        ]

        const dq = [
          q[0] - a[0],
          q[1] - a[1]
        ]

        const dqy = dq[0] * n[0] + dq[1] * n[1]

        dqys.push([j, dqy, n])
      }

      let isInside = true

      for(let z = 0; z < dqys.length; z++)
      {
        const dqy = dqys[z][1]

        if( dqy < 0 )
        {
          isInside = false
          break
        }
      }

      if( ! isInside )
        continue

      dqys = dqys.sort((a, b) => a[1] - b[1])

      let found = false

      for(let di = 0; di < dqys.length; di++)
      {
        const dqy = dqys[di][1]
        const n = dqys[di][2]

        if( dqy > 10 * ds )
          continue

        const nDotN2 = (
          + n[0] * floorLine.n2[0]
          + n[1] * floorLine.n2[1]
        )

        const nDotT2 = (
          + n[0] * t2[0]
          + n[1] * t2[1]
        )

        if( nDotN2 >= 0 && nDotT2 >= 0 )
        {
          // In [ 1, k, i, dqys[di][0] ]] 1 means endpoint-contact. endpoints are the points that define the line.
          // k is the line idx. i is the endpoint idx, can be 0 or 1.
          endpointContacts.push([ q, n, [ 1, k, i, dqys[di][0] ]])
          found = true
          break
        }
      }

      if( ! found )
      {
        endpointContacts.push([
          q,
          dqys[0][2],
          [ 1, k, i, dqys[0][0] ]
        ])
      }
    }

    if( endpointContacts.length === 2 )
    {
      contacts.push([
        points[0],
        [...floorLine.n2],
        [ 4, k, 0 ]
      ])

      contacts.push([
        points[1],
        [...floorLine.n2],
        [ 4, k, 1 ]
      ])

      // Keep track of floor lines with contact points. Part of workaround for gfx-1763.
      contactFloorLines.push(floorLine);
    }
    else if( endpointContacts.length === 1 )
    {
      contacts.push(endpointContacts[0])

      // Keep track of floor lines with contact points. Part of workaround for gfx-1763.
      contactFloorLines.push(floorLine);
    }
  }

  return contacts
}

export
function
getCollisionInfo(renderItem, margin = 0.0)
{
  if (!renderItem.body) {
    return {
      valid: false,
      numContactPoints: 0,
      contactPoints: []
    }
  }

  const cp = contactPoints(renderItem.body, 0.01, margin)
  const result = {
    valid: true,
    numContactPoints: cp.length, 
    contactPoints: cp
  }
  return result
}

function
rotateAndShift(r, m, p)
{
  return [
    r[0] + m[0][0] * p[0] + m[0][1] * p[1],
    r[1] + m[1][0] * p[0] + m[1][1] * p[1]
  ]
}

function
rotate(m, p)
{
  return [
    m[0][0] * p[0] + m[0][1] * p[1],
    m[1][0] * p[0] + m[1][1] * p[1]
  ]
}

// Get the body's 2D world space lines. Function uses current body's position, but <rot> is optional.
// This enables the function to use body's current rotation (the default) or a target orientation for example.
function
getBodyLines(body, rot) {
  const m = rotMat(rot || body.rot)
  const bodyLines = [ 0, 1, 2, 3 ].map(
    i =>
    {
      const line = [
        rotateAndShift(body.pos, m, body.lines[i][0]),
        rotateAndShift(body.pos, m, body.lines[i][1])
      ]

      const normal = rotate(m, body.normals[i])

      return {
        line,
        normal,
        mid: [
          (line[0][0] + line[1][0]) / 2,
          (line[0][1] + line[1][1]) / 2
        ]
      }
    }
  )

  return bodyLines
}

function
getIntersection(body, floorLine)
{
  const bodyLines = getBodyLines(body)

  const floorLinePointsInside =
  (
    floorLine.points.filter(
      point =>
      {
        return bodyLines.every(
          ({ mid, normal }) =>
          {
            const dot = (
              + normal[0] * (point[0] - mid[0])
              + normal[1] * (point[1] - mid[1])
            )

            return dot < 0
          }
        )
      }
    )
  )

  const cps = bodyLines.map(
    ({ line }) =>
    {
      return intersectLines(
        line[0],
        line[1],
        floorLine.points[0],
        floorLine.points[1])
    }
  ).filter( x => !! x )

  if( cps.length > 2 )
    return 0

  const points = cps.concat(floorLinePointsInside)

  if( points.length !== 2 )
    return 0

  const dx = points[0][0] - points[1][0]
  const dy = points[0][1] - points[1][1]

  return Math.sqrt(dx * dx + dy * dy)
}

function
getMaxPenetrationDepth(body, floorLine) {
  const m = rotMat(body.rot)
  const bodyLines = getBodyLines(body)

  const intersectionPoints = []

  for (let i = 0; i < bodyLines.length; i += 1) {
    const line = bodyLines[i].line
    const intersection = intersectLines(
      line[0], line[1],
      floorLine.points[0], floorLine.points[1]
    )
    if (intersection) {
      intersectionPoints.push(intersection)
    }
  }

  for (let i = 0; i < floorLine.points.length; i += 1) {
    const floorPoint = floorLine.points[i]
    let isInside = true

    for (let j = 0; j < bodyLines.length; j++) {
      const mid = bodyLines[j].mid
      const normal = bodyLines[j].normal
      const dot = (
        normal[0] * (floorPoint[0] - mid[0]) +
        normal[1] * (floorPoint[1] - mid[1])
      )
      if (dot >= 0) {
        isInside = false
        break
      }
    }

    if (isInside) {
      intersectionPoints.push(floorPoint)
    }
  }

  if (intersectionPoints.length === 0) {
    return 0
  }

  let maxPenetration = 0
  for (let i = 0; i < body.corners.length; i += 1) {
    let corner = body.corners[i]

    corner = [
      body.pos[0] + m[0][0] * corner[0] + m[0][1] * corner[1],
      body.pos[1] + m[1][0] * corner[0] + m[1][1] * corner[1],
    ]

    const toCorner = [
      corner[0] - floorLine.points[0][0],
      corner[1] - floorLine.points[0][1],
    ]

    const signedDist = toCorner[0] * floorLine.n2[0] + toCorner[1] * floorLine.n2[1]

    if (signedDist < 0) {
      maxPenetration = Math.max(maxPenetration, -signedDist)
    }
  }
  return maxPenetration
}

function
determinant(m)
{
  if( m.length === 1 )
  {
    return m[0][0]
  }
  else if( m.length === 2 )
  {
    return m[0][0] * m[1][1] - m[0][1] * m[1][0]
  }
  else
  {
    return m[0].reduce(
      (r, e, i) =>
      {
        return r + (-1)**(i + 2) * e * determinant(
          m.slice(1).map(c => c.filter((_, j) => i !== j))
        )
      },
      0
    )
  }
}

//
// Solve a system of linear equations using Cramer's Rule.
//

function
cramer(A, x)
{
  const ret = []

  if( x.length === 0 )
    return ret

  const d0 = determinant(A)

  for(let i = 0; i < x.length; i++)
  {
    const AC = []
    for(let j = 0; j < A.length; j++)
      AC.push([...A[j]])

    for(let j = 0; j < A.length; j++)
      AC[j][i] = x[j]

    const d = determinant(AC)

    ret.push(d / d0)
  }

  return ret
}

// Solve a system of linear equations using SVD decomposition.
// https://en.wikipedia.org/wiki/Singular_value_decomposition
// Uses the pseudo-inverse which provides the best possible solution, especially when A is not invertible (singular). 
// In SVD decomposition A gets decomposed into U, S and V^T so that A = U * S * V^T. For system Ax = b ->  x = V * Sinv * U^T * b.
function solveUsingSVD(A, b) {
  const svd = numeric.svd(A);
  const U = svd.U;
  const S = svd.S; 
  const V = svd.V;

  const UT = numeric.transpose(U);
  // Pseudo-inverse: https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
  // Create the pseudo-inverse of S, handling small singular values.
  // By setting the inverse of zero singular values to zero, the pseudo-inverse effectively ignores the components of 
  // A that do not contribute to the solution. This prevents amplification of numerical errors and instability.
  const Sinv = numeric.diag(S.map(x => x > 1e-10 ? 1 / x : 0)); 
  // Compute V * Sinv * U^T
  const VSinv = numeric.dot(V, Sinv);
  const VSinvUT = numeric.dot(VSinv, UT);
  // x = V * Sinv * U^T * b
  return numeric.dot(VSinvUT, b);
}

export
function
populatefs(body, fb, tb, fs, cs)
{
  const mat = []

  for(let i = 0; i < cs.length; i++)
  {
    const row = []
    mat.push(row)

    row.push(0)
    for(let j = 0; j < cs.length; j++)
      row.push(0)
  }

  for(let i = 0; i < cs.length; i++)
  {
    const row = mat[i]

    const [ c, n ] = cs[i]

    const nx = n[0]
    const ny = n[1]

    const rho0 = [
      c[0] - body.pos[0],
      c[1] - body.pos[1]
    ]

    const thetaHatRho0 = [
      - rho0[1],
      + rho0[0]
    ]

    // force = mass * accel -> accel = force / mass
    // torque = inertia * angularAccel -> angularAccel = torque / inertia.
    row[0] = (
      (
        fb[0] * nx + fb[1] * ny
      ) / body.mass
      +
      (
        tb * (thetaHatRho0[0] * nx + thetaHatRho0[1] * ny)
      ) / body.i
    )

    // Angular acceleration.
    const z = (
      + thetaHatRho0[0] * nx
      + thetaHatRho0[1] * ny
    ) / body.i

    for(let j = 0; j < cs.length; j++)
    {
      const je = j + 1

      const [ cj, nj ] = cs[j]

      const rhoJ = [
        cj[0] - body.pos[0],
        cj[1] - body.pos[1]
      ]

      // To calculate a component of the force or torque exerted on the body at the current contact point.
      const niDotNJ = nx * nj[0] + ny * nj[1]

      // Additional torque component q produced by the contact point cs[j].
      const q = rhoJ[0] * nj[1] - rhoJ[1] * nj[0]

      // niDotNJ / body.mass: Contribution of the force component along the normal direction.
      // z * q:  Additional torque (q) produced by the contact point (j). 
      // This term represents the additional torque generated at contact point j due to its offset from the body's center of mass. 
      // It is multiplied by z to scale its contribution based on the orientation of the contact point relative to the body's center of mass.
      row[je] = niDotNJ / body.mass + z * q
    }
  }

  const x = []
  for(let i = 0; i < mat.length; i++)
    x.push(-mat[i].shift())

  if (mat.length > 0 && x.length > 0) {
    const numContactPoints = mat.length
    const useCramer = numContactPoints < CONTACT_COUNT_SOLVE_METHOD_THRESHOLD
    const res = useCramer ? cramer(mat, x) : solveUsingSVD(mat, x)
    for(let i = 0; i < res.length; i++) {
      fs[i] = res[i]
    }
  }
}

function
accels(body, fb, tb, fs, cs, mps)
{
  const ret = []

  const fn = [ fb[0], fb[1] ]
  let tau = tb

  for(let i = 0; i < fs.length; i++)
  {
    const [ c, n ] = cs[i]
    const f = Math.abs(fs[i])

    const fx = f * n[0]
    const fy = f * n[1]

    fn[0] += fx
    fn[1] += fy

    const rho0 = [
      c[0] - body.pos[0],
      c[1] - body.pos[1]
    ]

    tau += rho0[0] * fy - rho0[1] * fx
  }

  for(let i = 0; i < mps.length; i += 1)
  {
    const [ c, n ] = mps[i]

    const rho0 = [
      c[0] - body.pos[0],
      c[1] - body.pos[1]
    ]

    const thetaHatRho0 = [
      -rho0[1],
      +rho0[0]
    ]

    const a = [
      fn[0] / body.mass + thetaHatRho0[0] * tau / body.i,
      fn[1] / body.mass + thetaHatRho0[1] * tau / body.i
    ]

    const aOnN = a[0] * n[0] + a[1] * n[1]

    ret[i] = aOnN
  }

  return ret
}

function
normalShifts(body, fb, tb, fs, cs, mps, dt)
{
  const acs = accels(body, fb, tb, fs, cs, mps)
  const ret = []

  for(let i = 0; i < acs.length; i++)
    ret.push(0.5 * acs[i] * dt * dt)

  return ret
}

// We have line "normal" as if lines were planes. This normal points to the inside of the room.
// Mouse force direction can be projected to this normals to check if item is pushed agains the line/wall,
// or coming from behind in the unlike event it got out of the room bounds.
function 
isForceAgainstLine(forceDir2d, floorLines) {
  for (let k = 0; k < floorLines.length; k++) {
    const floorLine = floorLines[k];
    const l = forceDir2d[0] * floorLine.n2[0] + forceDir2d[1] * floorLine.n2[1];
    if (l < 0) {
      return true;
    }
  }

  return false;
}

// Checks if the request is a full 2π loop. If so, update the orientation to keep the correct sign the limits [-π, π].
// Orientation ranges from [-π, π]. Even -π and π represent the same rotation geometrically, we want to keep the correct sign 
// in the orientation state so that the UI can use it out of the box without any angle mapping/clamping downstream.
function
checkForOrientationUpdate(ri, targetRotRadians) {
  const prevRot = Math.round(ri.orientation * (180 / Math.PI))
  const targetRot = Math.round(targetRotRadians * (180 / Math.PI))
  const isTurning2PiAtOnce = Math.abs(prevRot) + Math.abs(targetRot) === 360
  const normalizedOrientation = getNormalizedAngle(targetRotRadians)
  if ( isTurning2PiAtOnce ) {
    ri.orientation = normalizedOrientation
    ri.body.rot = normalizedOrientation
  }
}

// For a determined angle in radians <rot> tells if any line of the body intersects with a line of the room <floorLine>.
function 
isBodyIntersectingWithFloorLine(body, floorLine, rot) {
  const bodyLines = getBodyLines(body, rot)

  // <intersectLines> returns the 2D intersectingLine or null if there is no intersection.
  const isBodyIntersecting = bodyLines.some(
    ({ line }) => !!intersectLines(
      line[0],
      line[1],
      floorLine.points[0],
      floorLine.points[1]
  ))  

  return isBodyIntersecting
}

function 
getPosProjectedToLine(pos2d, floorLine) {
  // Auxiliar vector from <floorLine> pos2d to obtain the distance from point to line.  
  const auxVec = [pos2d[0] - floorLine.points[0][0], pos2d[1] - floorLine.points[0][1]] 
  // Distance from body position to the <floorLine>.
  const dot = auxVec[0] * floorLine.n2[0] + auxVec[1] * floorLine.n2[1]
  // Project body position to line in line's normal direction.
  const projectedPoint = [
    pos2d[0] - dot * floorLine.n2[0],
    pos2d[1] - dot * floorLine.n2[1]
  ]

  return projectedPoint
}

function 
clampPointToPolygon(point, vertices) {
  function projectPointOntoEdge(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx === 0 && dy === 0) {
      return [x1, y1];
    }

    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t)); // Clamp t to the segment

    const projX = x1 + clampedT * dx;
    const projY = y1 + clampedT * dy;

    return [projX, projY];
  }

  const [px, py] = point;

  const polygon = vertices.map(vertex => { return{ x: vertex[0], y: vertex[1] } } );
  if (isPointInsidePolygon2D({x: point[0], y: point[1]}, polygon)) {
    return point;
  }

  // Find the closest point on the polygon's edges
  let closestPoint = null;
  let minDistance = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const [p1, p2] = [polygon[i], polygon[(i+1) % polygon.length]];
    const [projX, projY] = projectPointOntoEdge(px, py, p1.x, p1.y, p2.x, p2.y);

    const dist = Math.hypot(px - projX, py - projY);
    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = [projX, projY];
    }
  }
  return closestPoint;
}

// Points are [[x, y, z], ..], defined in world space
function 
projectFloorPointsToScreen(points, intrinsics) {
  const projectedPoints = []
  points.forEach(point => {
    const projection = 
      WallspiceWebgl.viewToScreen(
        point, 
        intrinsics[0],
        intrinsics[1],
        intrinsics[2],
        intrinsics[3]
      )
    projectedPoints.push(projection)
  })
  return projectedPoints;
}

// Computes the geometric median of a set of points using the Weiszfeld algorithm.
// points: [[x, y], ..]
// returns the geometric median as [x, y]
function geometricMedian(points, tolerance = 1e-7, maxIterations = 1000) {
  // Start with the centroid as the initial guess
  let currentPoint = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  currentPoint = [currentPoint[0] / points.length, currentPoint[1] / points.length];
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
      const numerator = [0, 0];
      let denominator = 0;

      for (let i = 0; i < points.length; i++) {
          const point = points[i];
          const distance = Math.hypot(currentPoint[0] - point[0], currentPoint[1] - point[1]);
          if (distance < tolerance) continue; // Avoid division by zero
          
          numerator[0] += point[0] / distance;
          numerator[1] += point[1] / distance;
          denominator += 1 / distance;
      }
      
      const nextPoint = [numerator[0] / denominator, numerator[1] / denominator];
      
      // Check for convergence
      if (Math.hypot(nextPoint[0] - currentPoint[0], nextPoint[1] - currentPoint[1]) < tolerance) {
          return nextPoint;
      }

      currentPoint = nextPoint;
  }
  return currentPoint;
}

// Returns the maximum distance from the center point to any of the points.
// points: [[x, y], ..]
// centerPoint: [x, y]
function
getMaxDistanceToCenter(points, centerPoint) {
  let maxDistance = 0;
  points.forEach(point => {
    const distance = Math.hypot(point[0] - centerPoint[0], point[1] - centerPoint[1]);
    maxDistance = Math.max(maxDistance, distance);
  });
  return maxDistance;
}

// Creates a circle polygon that approximates the floor polygon.
// floorLines: [{points: [[x, y], ..], n2: [nx, ny], t2: [tx, ty]}, ..]
// returns the circle polygon as [[x, y], ..]
function
createFloorCircle(floorLines) {
  const floorPoints = floorLines.flatMap(line => line.points)
  const [cx, cy] = geometricMedian(floorPoints)

  const maxRadius = getMaxDistanceToCenter(floorPoints, [cx, cy])
  const nrPoints = 50
  // Limit radius to avoid too large circles in case of own-room scans, where some outliers might be 1000 m away.
  const radius = Math.min(maxRadius, 50) 
  const circlePoints = []
  for (let i = 0; i < nrPoints; i++) {
    const angle = 2 * Math.PI * i / nrPoints
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    circlePoints.push([x, y])
  }
  return circlePoints
}

// Converts the screen position to a point on the floor plane and returns it in world coordinates. 
// The point is clamped to the polygon formed by the projected floor polygon in screen space.
// xy: [x, y]
// returns the clamped floor point as [x, y, z] in world space
function
xyToFloorWorld(xy) {
  if (!_floorCircle) {
    _floorCircle = createFloorCircle(_floorLines)
  }

  const circlePointsView = []
  for (let i = 0; i < _floorCircle.length; i++) {
    circlePointsView[i] = WallspiceWebgl.worldToView(WallspiceWebgl.planeToWorld(_floorPlane, _floorCircle[i]))
  }

  const clipped = WallspiceWebgl.preProjectionClip(circlePointsView)

  // Project the floor vertices to screen space, while clamping them between the near/far planes
  const projectedPoints = projectFloorPointsToScreen(clipped, _intrinsics)

  // Clamp the xy position to the polygon formed by the projected floor polygon in screen space.
  // This prevents the item from moving too fast when dragging far outside the room bounds.
  const clampedXy = clampPointToPolygon(xy, projectedPoints)
  const clampedFloorPoint = WallspiceWebgl.screenToPlaneWorld(clampedXy, _floorPlane, _intrinsics)
  return clampedFloorPoint
}

function
setPositionals(renderItem, xy, orientation) {
  const ri = renderItem
  let numContactPoints = null
  let cs = null;

  // This nullchecks should not exist if the initialization flow was ok.
  // The init method should arrange makeFloorLines and arrange all what is needed by this module
  // (or class later on) is in place before calling the setPositionals (aka "update()").
  // Note that I added the last condition: _isInitialized && ! ri.pose because what is inside
  // this if needs to run for initialization.
  if( ! ri.body || ! _floorLines || _isInitialized && ! ri.pose )
  {
    let bxy = xy
    let borientation = orientation

    if( bxy === undefined || bxy === null )
      bxy = ri.position

    if( borientation === undefined || borientation === null )
      borientation = ri.orientation

    bake(ri, bxy, borientation)

    return {
      valid: true,
      numContactPoints: 0
    }
  }

  const targetOrientation = orientation

  if( xy )
  {
    const floorWorld = xyToFloorWorld(xy)
    ri.body.targetPos = WallspiceWebgl.worldToPlane(_floorPlane, floorWorld)
  } else if (targetOrientation) { // If there is no <xy> and there is <targetOrientarion> we are rotating only.
    const instersectedFloorLine = _floorLines.find( line => isBodyIntersectingWithFloorLine(ri.body, line, targetOrientation) )
    // If the current and the target position are the same, there are no deltas so no forces so no physics. 
    // We need to activate the physics only if they are not active to avoid changing the target position while item rotates.
    const isPhysicsActive = ri.body.targetPos && ( ri.body.pos[0] !== ri.body.targetPos[0] && ri.body.pos[1] !== ri.body.targetPos[1] )
    if ( instersectedFloorLine && !isPhysicsActive ) {
      // The target position is used by the WallSnap for the item to stick back when it rotates. 
      // Needs to be set so that the system has this a reference direction to stick the item back. 
      // If not set, collisions and wallsnap don't take place while item rotates.
      ri.body.targetPos = getPosProjectedToLine(ri.body.pos, instersectedFloorLine)
    }
  }

  let targetPos = ri.body.targetPos
  if( ! targetPos )
    targetPos = ri.body.pos


  debugFrame()

  const ds = 0.01
  const dtn = 1

  let hist = []

  // Initialize reusable variables for the for loop.
  workSpaceRenderItem.position = ri.position
  workSpaceRenderItem.orientation= ri.orientation
  workSpaceRenderItem.pose = ri.pose
  workSpaceRenderItem.body = ri.body
  let screenPos = WallspiceWebgl.proj(
    WallspiceWebgl.planeToWorld(_floorPlane, ri.body.pos),
    _intrinsics[0],
    _intrinsics[1],
    _intrinsics[2],
    _intrinsics[3]
  )
  
  for(let loopi = 0; loopi < 1000; loopi++)
  {
    debugIter()

    debugBody(workSpaceRenderItem.body)

    const dp = [
      targetPos[0] - workSpaceRenderItem.body.pos[0],
      targetPos[1] - workSpaceRenderItem.body.pos[1]
    ]

    const dpLen = Math.sqrt(
      + dp[0] * dp[0]
      + dp[1] * dp[1]
    )

    if( dpLen > 0 )
    {
      dp[0] /= dpLen
      dp[1] /= dpLen
    }

    // Physics system does not provide kinematic behavior. This means the force can be constant and system provides same output.
    // Big forces makes the system inestable. We need a force magnitude that is small but above the minimum force required to move an object.
    // F = m * a, with a deltaPosition of 1 (to assure force moves the object), and a dtn = 1 used by the system: 
    // fMag = ri.body.mass * deltaPosition / (0.5 * deltaTime * deltaTime) -> ri.body.mass * 2 * deltaPosition,
    const fbMag = workSpaceRenderItem.body.mass * 2 * Math.min(dpLen, 1.0)

    const fb = [
      fbMag * dp[0],
      fbMag * dp[1]
    ]

    debugMouseForce(fb)

    let tb = 0

    if( targetOrientation || targetOrientation === 0 )
    {
      const v0 = [
        Math.cos(workSpaceRenderItem.body.rot),
        Math.sin(workSpaceRenderItem.body.rot)
      ]

      const v1 = [
        Math.cos(targetOrientation),
        Math.sin(targetOrientation)
      ]

      const xHat = [ +v0[0], +v0[1] ]
      const yHat = [ -v0[1], +v0[0] ]

      const vx = v1[0] * xHat[0] + v1[1] * xHat[1]
      const vy = v1[0] * yHat[0] + v1[1] * yHat[1]

      const drot = Math.atan2(vy, vx)

      tb = workSpaceRenderItem.body.i * drot / (0.5 * dtn * dtn)

      fb[0] /= 100
      fb[1] /= 100
    }

    cs = contactPoints(workSpaceRenderItem.body, ds)
    numContactPoints = cs.length

    const csOrig = cs
    let fs = []

    for(let j = 0; j < cs.length; j++)
      fs.push(0)

    while(true)
    {
      populatefs(workSpaceRenderItem.body, fb, tb, fs, cs)

      debugForceIter(cs, fs)

      let remove
      let removeForce

      for(let i = 0; i < fs.length; i++)
      {
        if( fs[i] < 0 )
        {
          if( remove === undefined || fs[i] < removeForce )
          {
            remove = i
            removeForce = fs[i]
          }
        }
      }

      if( remove === undefined )
        break

      const newcs = []
      const newfs = []

      for(let i = 0; i < fs.length; i++)
      {
        if( i !== remove )
        {
          newcs.push(cs[i])
          newfs.push(0)
        }
      }

      cs = newcs
      fs = newfs
    }

    debugContactsOrig(csOrig)
    debugContacts(cs)

    const [ dx, dy, da, dt ] = positionalOffsets(
      workSpaceRenderItem.body, fb, tb, cs, fs, dtn, ds
    )

    const ns = normalShifts(
      workSpaceRenderItem.body, fb, tb, fs, cs, csOrig, dt
    )

    debugNormalShifts(ns)

    let good = true
    for(let nsi = 0; nsi < ns.length; nsi++)
    {
      if( ns[nsi] <= - ds * ds ) {
        good = false
        break
      }
    }

    debugGood(good)

    if( true
        && good
        && Number.isFinite(dx)
        && Number.isFinite(dy)
        && Number.isFinite(da) )
    {
      // Compute euclidean distance the for the delta position, the arc distance for the delta angle and assing largest from d0 and d1 to d.
      const d0 = Math.sqrt(dx * dx + dy * dy)
      const d1 = Math.abs(da) * ri.body.radius
      const d = (d0 > d1) ? d0 : d1
      
      // If distance is not big enough, adjust orientation if needed and break the loop.
      if( d < 0.5 * ds * ds ) {
        // Orientation available means there is a orientation set requirement to the system.
        // Solver breaking in 1st iteration means the system may have as input a 2PI rotation at once. 
        if (orientation && loopi === 0) {
          // Early break prevents the orientation state update in the system. Check for it.
          checkForOrientationUpdate(workSpaceRenderItem, orientation)
        }

        // Disable wall collisions for out-of-bounds items.
        const isContact = contactFloorLines.length > 0
        const isComingFromOutside = !isForceAgainstLine(dp, contactFloorLines)
        if (isContact && isComingFromOutside) {
          workSpaceRenderItem.body.pos = [...targetPos]
          hist = []
        }

        break
      }

      hist.push([
        workSpaceRenderItem.body.pos[0],
        workSpaceRenderItem.body.pos[1],
        workSpaceRenderItem.body.rot,
        da
      ])

      workSpaceRenderItem.body.pos[0] += dx
      workSpaceRenderItem.body.pos[1] += dy
      workSpaceRenderItem.body.rot = getNormalizedAngle(workSpaceRenderItem.body.rot + da)

      const jitterThreshold = 10

      if( hist.length >= 2 * jitterThreshold )
      {
        let pos = 0
        let neg = 0

        for(let i = 0; i < 2 * jitterThreshold; i ++)
        {
          const v = hist[hist.length - 1 - i][3]

          if( v > 0 )
            pos += 1
          else if( v < 0 )
            neg += 1
        }

        if( pos === jitterThreshold && neg === jitterThreshold )
        {
          workSpaceRenderItem.body.pos[0] = hist[hist.length - 2 * jitterThreshold][0]
          workSpaceRenderItem.body.pos[1] = hist[hist.length - 2 * jitterThreshold][1]
          workSpaceRenderItem.body.rot = hist[hist.length - 2 * jitterThreshold][2]
          break
        }
      }
    } else {
      break
    }

    screenPos = WallspiceWebgl.proj(
      WallspiceWebgl.planeToWorld(_floorPlane, workSpaceRenderItem.body.pos),
      _intrinsics[0],
      _intrinsics[1],
      _intrinsics[2],
      _intrinsics[3]
    )

    bake(workSpaceRenderItem, screenPos, workSpaceRenderItem.body.rot)
  }

  // Results update in the RenderItem.
  ri.body.pos = workSpaceRenderItem.body.pos
  ri.body.rot = workSpaceRenderItem.body.rot
  bake(ri, screenPos, workSpaceRenderItem.body.rot)

  return {
    valid: true,
    numContactPoints,
    contactPoints: cs
  }
}

export
function
isInitialized() {
  return _isInitialized
}

export
function
pushOut(ri)
{
  const ds = 0.01

  if( ! ri.body || ! _floorLines ) {
    return true
  }

  let lines = [ ..._floorLines ]

  let totalDist = 0
  let gaveUp = false
  const maxTotal = 250
  while(lines.length > 0 && totalDist < maxTotal)
  {
    const linesAndRates = lines.map(
      line =>
      {
        return {
          line,
          rate: getIntersection(ri.body, line)
        }
      }
    ).sort(
      (a, b) => b.rate - a.rate
    )

    if( linesAndRates[0].rate <= 0 )
      break

    const line = linesAndRates.shift().line

    let dist = 0
    const maxDist = 20

    while( dist < maxDist )
    {
      const rate = getIntersection(ri.body, line)

      if( rate <= 0 )
        break

      ri.body.pos[0] += ds * line.n2[0]
      ri.body.pos[1] += ds * line.n2[1]

      dist += ds
      totalDist += ds
    }
    if (dist >= maxDist) {
      gaveUp = true
    }

    lines = linesAndRates.map(
      lineAndRate => lineAndRate.line
    )
  }

  if (totalDist >= maxTotal) {
    gaveUp = true
  }

  const screenPos = WallspiceWebgl.proj(
    WallspiceWebgl.planeToWorld(_floorPlane, ri.body.pos),
      _intrinsics[0],
      _intrinsics[1],
      _intrinsics[2],
      _intrinsics[3]
  )

  bake(ri, screenPos, ri.body.rot)

  const tolerance = 2.0 * ds
  const intersectionsLeft = _floorLines.some(line => getMaxPenetrationDepth(ri.body, line) > tolerance)
  return !(gaveUp || intersectionsLeft)
}

export
function
setPosition(renderItem, xy)
{
  if (!_isInitialized) {
    return { valid: false }
  }
  return setPositionals(renderItem, xy, null)
}

export
function
resetPosition(renderItem, floorPoint, plane)
{
  if (!renderItem.body) {
    return
  }
  renderItem.body.rot = renderItem.orientation
  renderItem.body.pos = WallspiceWebgl.worldToPlane(plane, floorPoint)
  renderItem.body.targetPos = null
}

export
function
setOrientation(renderItem, newOrientation)
{
  return setPositionals(renderItem, null, newOrientation)
}

export
function
makeFloorLines(planes, normalsSegmentationData, intrinsics, wallShift)
{
  const planePoints = []
  while( planePoints.length < planes.length )
    planePoints.push([])

  const extControlPoints = []
  while( extControlPoints.length < planes.length )
    extControlPoints.push([])

  const centroids = []
  while( centroids.length < planes.length )
    centroids.push([ 0, 0, 0 ])

  for(let y = 0; y < normalsSegmentationData.height; y += 1)
  {
    for(let x = 0; x < normalsSegmentationData.width; x += 1)
    {
      const idx = 4 * (y * normalsSegmentationData.width + x)

      const pixel = [
        normalsSegmentationData.data[idx + 0],
        normalsSegmentationData.data[idx + 1],
        normalsSegmentationData.data[idx + 2],
        normalsSegmentationData.data[idx + 3]
      ]

      const planeIndex = pixel[2] - 1

      if( planeIndex < 0) {
        continue
      }

      const plane = planes[planeIndex]
      if (!plane) {
        continue
      }

      const worldPos = WallspiceWebgl.screenToPlaneWorld(
        [x, y],
        plane,
        intrinsics
      )

      planePoints[planeIndex].push(worldPos)

      if( x === 0 || x === normalsSegmentationData.width - 1 )
        extControlPoints[planeIndex].push(worldPos)
    }
  }

  const floorPlane = getFloorPlane(planes)

  const fd = floorPlane.d
  const fxh = floorPlane.rot[0]
  const fyh = floorPlane.rot[1]
  const fzh = floorPlane.rot[2]

  const fcenter = [
    -fd * fzh[0],
    -fd * fzh[1],
    -fd * fzh[2]
  ]

  for(let i = 0; i < planePoints.length; i += 1)
  {
    const wall = planes[i]
    if( wall.class !== "wall" )
      continue

    // Cannot reasonably reconstruct the plane when less than 3 pixels
    const wallPoints = planePoints[i]
    if( wallPoints.length < 3 )
      continue

    const centroid = centroids[i]

    for(let j = 0; j < wallPoints.length; j += 1)
    {
      const p = wallPoints[j]

      centroid[0] += p[0] / wallPoints.length
      centroid[1] += p[1] / wallPoints.length
      centroid[2] += p[2] / wallPoints.length
    }
  }

  const lines = []

  for(let i = 0; i < planePoints.length; i += 1)
  {
    const wall = planes[i]
    if( wall.class !== "wall" )
      continue

    // Cannot reasonably reconstruct the plane when less than 3 pixels
    const wallPoints = planePoints[i]
    if( wallPoints.length < 3 )
      continue

    const wallExtControlPoints = extControlPoints[i]

    const wd = wall.d

    const wxh = wall.rot[0]
    const wyh = wall.rot[1]
    const wzh = wall.rot[2]

    const wcenter = [
      -wd * wzh[0],
      -wd * wzh[1],
      -wd * wzh[2]
    ]

    let right
    let left

    for(let j = 0; j < wallPoints.length; j += 1)
    {
      let p = wallPoints[j]

      p = [
        p[0] - wcenter[0],
        p[1] - wcenter[1],
        p[2] - wcenter[2]
      ]

      const px = (
        + p[0] * wxh[0]
        + p[1] * wxh[1]
        + p[2] * wxh[2]
      )

      left  = Math.min(left  || px, px)
      right = Math.max(right || px, px)
    }

    for(let j = 0; j < wallExtControlPoints.length; j += 1)
    {
      const ep = wallExtControlPoints[j]

      let dp = [
        ep[0] - centroids[i][0],
        ep[1] - centroids[i][1],
        ep[2] - centroids[i][2]
      ]

      const dpLen = Math.sqrt(
        + dp[0] * dp[0]
        + dp[1] * dp[1]
        + dp[2] * dp[2]
      )

      if( dpLen === 0 )
        continue

      dp[0] *= 1000 / dpLen
      dp[1] *= 1000 / dpLen
      dp[2] *= 1000 / dpLen

      dp = [
        dp[0] - wcenter[0],
        dp[1] - wcenter[1],
        dp[2] - wcenter[2]
      ]

      const px = (
        + dp[0] * wxh[0]
        + dp[1] * wxh[1]
        + dp[2] * wxh[2]
      )

      left  = Math.min(left  || px, px)
      right = Math.max(right || px, px)
    }

    const taus = []
    for(let j = 0; j < 2; j += 1)
    {
      const lambda = [left, right][j]

      const xip = [
        wcenter[0] + lambda * wxh[0],
        wcenter[1] + lambda * wxh[1],
        wcenter[2] + lambda * wxh[2]
      ]

      const nDotXIP = (
        + fzh[0] * xip[0]
        + fzh[1] * xip[1]
        + fzh[2] * xip[2]
      )

      const nDotYH = (
        + fzh[0] * wyh[0]
        + fzh[1] * wyh[1]
        + fzh[2] * wyh[2]
      )

      const tau = -(nDotXIP + fd) / nDotYH

      taus.push(tau)
    }

    const line = []
    for(let j = 0; j < 2; j += 1)
    {
      const tau = taus[j]
      const lambda = [left, right][j]

      let p = [
        wcenter[0] + lambda * wxh[0] + tau * wyh[0],
        wcenter[1] + lambda * wxh[1] + tau * wyh[1],
        wcenter[2] + lambda * wxh[2] + tau * wyh[2]
      ]

      p = [
        p[0] - fcenter[0],
        p[1] - fcenter[1],
        p[2] - fcenter[2]
      ]

      p = [
        fxh[0] * p[0] + fxh[1] * p[1] + fxh[2] * p[2],
        fyh[0] * p[0] + fyh[1] * p[1] + fyh[2] * p[2]
      ]

      line.push(p)
    }

    const dp = [
      line[1][0] - line[0][0],
      line[1][1] - line[0][1]
    ]

    const dpLen = Math.sqrt(
      + dp[0] * dp[0]
      + dp[1] * dp[1]
    )

    const tangent2D = [
      dp[0], dp[1]
    ]

    const normal2D = [
      dp[1], -dp[0]
    ]

    normal2D[0] /= dpLen
    normal2D[1] /= dpLen

    tangent2D[0] /= dpLen
    tangent2D[1] /= dpLen

    line[0][0] += wallShift * normal2D[0]
    line[0][1] += wallShift * normal2D[1]

    line[1][0] += wallShift * normal2D[0]
    line[1][1] += wallShift * normal2D[1]

    lines.push({
      points: line,
      n: wzh,
      n2: normal2D,
      t2: tangent2D,
      len: dpLen
    })
  }

  sendFloorLines(lines)

  init(intrinsics, planes, lines) // keep info in the module to operate

  return lines
}

// Helper to check if two lines are collinear
function areCollinear(line1, line2) {
  const [[x1, y1], [x2, y2]] = line1.points
  const [[x3, y3], [x4, y4]] = line2.points

  // Check if vectors from line1 to line2 points have near-zero cross products
  return Math.abs((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) < EPSILON &&
         Math.abs((x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1)) < EPSILON
}

// Helper to check if a line2 is completely overlapped by line1
function isLineOverlapped(line1, line2) {
  const [[x1a, y1a], [x1b, y1b]] = line1.points
  const [[x2a, y2a], [x2b, y2b]] = line2.points

  // Get min/max bounds for each line
  const [minX1, maxX1] = [Math.min(x1a, x1b), Math.max(x1a, x1b)]
  const [minY1, maxY1] = [Math.min(y1a, y1b), Math.max(y1a, y1b)]
  const [minX2, maxX2] = [Math.min(x2a, x2b), Math.max(x2a, x2b)]
  const [minY2, maxY2] = [Math.min(y2a, y2b), Math.max(y2a, y2b)]

  // Check if line2 is collinear with and fully within line1
  return (
    areCollinear(line1, line2) &&
    minX2 >= minX1 && maxX2 <= maxX1 &&
    minY2 >= minY1 && maxY2 <= maxY1
  )
}

/**
 * Removes lines fully contained within another.
 */
function cleanUpFloorLines(lines) {
  const cleanedLines = [] // Store lines that are not contained
  for (let i = 0; i < lines.length; i++) {
    let isContained = false

    for (let j = 0; j < lines.length; j++) {
      if (i === j) continue // Skip comparing the line with itself

      if (isLineOverlapped(lines[j], lines[i])) {
        isContained = true
        break
      }
    }

    if (!isContained) {
      cleanedLines.push(lines[i]) // Keep lines not contained
    }
  }

  return cleanedLines
}

//
// Summary
// -------
//
// `MakeFloorLinesFromPolys()` draws a 2D floor outline from wall
// polygons in the manifest.
//
//
// Parameters
// ----------
//
// `planeData`: List of infinite planes from the manifest (old
//              style data)
//
// `polygonData`: List of polygons from the manifest (new style
//                data)
//
// Notes
// ------
//
// The floor polygon itself is not used in this algorithm. Before
// we had polygons the manifest only recorded infinite unbounded
// planes. The algorithm here uses the infinite unbounded floor
// plane instead of the floor polygon. This is for consistency in
// case the infinite unbounded floor plane doesn't match the
// floor polygon in height or orientation, or something like
// that. The entire client still uses the infinite unbounded
// floor plane as the canonical floor, so we should too.
//

export
function
makeFloorLinesFromPolys(
  planeData,
  polygonData,
  intrinsics,
  useOpeningsAsWalls,
  wallShift
)
{
  // Sift through the plane data to find the floor plane.

  const floor = getFloorPlane(planeData)
  if (!floor) {
    return []
  }

  // Get the floor's (x, y, z) basis vectors and put them in to
  // THREE.Vector3 instances.

  const fxh = new THREE.Vector3(
    floor.rot[0][0],
    floor.rot[0][1],
    floor.rot[0][2])

  const fyh = new THREE.Vector3(
    floor.rot[1][0],
    floor.rot[1][1],
    floor.rot[1][2])

  const fzh = new THREE.Vector3(
    floor.rot[2][0],
    floor.rot[2][1],
    floor.rot[2][2])

  // Compute an arbitrary center point on the floor, call it
  // `fcenter`. Having this around makes some of the math later
  // in this function more pleasant.

  const fd = floor.d

  const fcenter = new THREE.Vector3(
    -fd * fzh.x,
    -fd * fzh.y,
    -fd * fzh.z)

  // In order to draw the floor outline we have to shift the wall
  // polygons down a little bit so that they properly and
  // unambiguously intersect with the floor plane. Instead of
  // shifting each polygon down we shift the floor up, which is
  // mathematically identical. Note that we're not shifting the
  // floor up for the entire application. This shift is internal
  // to this function only, and is just a mathematical convenience.

  fcenter.add(fzh.clone().multiplyScalar(WALL_INTERSECTION_SHIFT))

  // Map the raw polygon data from the manifest into Polygon
  // instances. Do this for walls only, skip floors and ceilings.

  const walls = polygonData.map(
    data =>
    {
      if( data.class === "wall" || data.class === "window" || data.class === "door" || 
         (useOpeningsAsWalls && data.class === "opening") )
        return Polygon3.CreateFromManifestPolygon(data)
      else
        return null
    }
  ).filter(n => !! n)

  //
  // Loop over each wall polygon and intersect it with the floor.
  // Store data and metadata about the floor lines in `lines`.
  // The `lines` array will eventually be returned to the caller.
  //
  // The algorithm works as follows. Consider a wall polygon with
  // a door cutout. The floor has been shifted up a little to
  // create a proper unambiguous intersection. Note that the
  // amount of the shift matters. If the shift is too large it
  // might subsume the entire door.
  //
  //
  //      v7                                         v0
  //       *----------------------------------------*
  //       |                                        |
  //       |              v4     v3                 |
  //       |              *------*                  |
  //       |              |      |                  |
  //       |              |      |                  |
  //       |              |      |                  |
  //       |              |      |                  |
  //  .....^..............v......^..................v..... floor
  //       |              |      |                  |
  //       *--------------*      *------------------*
  //      v6              v5    v2                   v1
  //
  //
  // 1. Loop over each exterior line in the polygon. The polygon
  //    will be triangulated, but we do not show the
  //    triangulation here in this diagram. The algorithm works
  //    by looping over the exterior lines only.
  //
  // 3. Record a floor crossing when visiting a line that crosses
  //    the floor. Record whether the crossing is an entry into
  //    the floor (marked 'v' in the diagram) or an exit from the
  //    floor (marked '^' in the diagram). It is possible to
  //    unambiguously determine whether a line is an entry or an
  //    exit because the wall's exterior lines are guaranteed to
  //    progress in a counterclockwise order. For example, the
  //    line `[v0, v1]` will always be given as`[v0, v1]`, never
  //    as `[v1, v0]`. In this diagram `[v0, v1]` is an entry
  //    line since `v0` is above the floor and `v1 is below the
  //    floor
  //
  // 4. All crossing points are now gathered (here there are 4 of
  //    them). Loop over crossing points pairwise. Each
  //    entry/exit pair constitutes a 2D floor line for the
  //    physics engine to use (here there are 2 such lines).
  //
  //
  // Here is an example of the top-down floor outline this
  // algorithm might draw. Normal vectors are drawn as arrows.
  // The wall with a door featured in the previous diagram is
  // pictured here at the top of this bird's eye view.
  //
  //
  //  *-------------*    *--------------*
  //  |       |              |          |
  //  |       |              |          |
  //  |       v              v          |
  //  |                              ^  |
  //  |--->                          |  |
  //  |                          *------*
  //  |                          |
  //  |            ^         <---|
  //  |            |             |
  //  *--------------------------*
  //

  const lines = []
  const floorPlane = { n: fzh, q: fcenter };
  walls.forEach(
    (wallPolygon, idx) =>
    {
      // Get a list of intersections (crossings) of the wall polygon with the floor plane.
      // The intersections are in world space.
      const crossings3d = wallPolygon.findIntersectionsWithPlane(floorPlane, true /* sorted */);

      // Map these intersections to a list of 2D intersection on the floor plane.
      const crossings = []
      // eslint-disable-next-line no-restricted-syntax
      for (const intersection of crossings3d) {
        // c3 is intersection relative to a point on floor plane.
        const c3 = new THREE.Vector3(
          intersection.p.x - floorPlane.q.x,
          intersection.p.y - floorPlane.q.y,
          intersection.p.z - floorPlane.q.z);

        // Project `c3` onto the floor plane's x and y basis vectors. This gives
        // us a 2D representation of `c3` on the floor.
        const c2 = new THREE.Vector2(
          (fxh.x * c3.x) + (fxh.y * c3.y) + (fxh.z * c3.z),
          (fyh.x * c3.x) + (fyh.y * c3.y) + (fyh.z * c3.z));

        crossings.push({
          c2,
          entering: intersection.entering,
        });
      }

      // If there are no crossings then we're done, skip this
      // wall polygon.

      if (crossings.length === 0) {
        return
      }

      // If there are an odd number of crossings then something
      // went wrong. Skip this wall polygon entirely.

      if (crossings.length % 2) {
        return
      }

      // Crossing points should proceed as `[entering, exiting,
      // entering, existing, ...]`. This might be reversed due to
      // chance. If the first crossing point is an exit then
      // reverse the order of the crossing points. This ought to
      // leave an entering point in the first array position.

      if( ! crossings[0].entering )
        crossings.reverse()

      // Use the 2D crossings to build line segments for the wall polygon
      // in the floor plane. To this end, loop over each pair of crossings.
      // Each pair should have an entry crossing followed by an exit crossing.
      // If this is not the case then something went wrong and we should
      // skip this wall polygon entirely.

      for(let i = 0; i < crossings.length / 2; i++)
      {
        const e0 = crossings[2 * i + 0]
        const e1 = crossings[2 * i + 1]

        if( ! e0.entering || e1.entering )
          return
      }

      // At this point we know that the set of crossings is well
      // formed. Loop over each crossing pair and record a floor
      // line for the physics engine to use. Store metadata about
      // each floor line in `lines`.

      while (crossings.length > 0)
      {
        const c0 = crossings.shift().c2
        const c1 = crossings.shift().c2

        // The physics engine expects 2D points to be small Arrays. The line is an
        // array of two 2D points:

        const line = [
          [c0.x, c0.y],
          [c1.x, c1.y]
        ]

        // Let `dp` be the 2D vector from the first crossing point to the second.

        const dp = [
          line[1][0] - line[0][0],
          line[1][1] - line[0][1]
        ]

        // Let `dpLen` be the length of `dp`, which is the length of the floor line.

        const dpLen = Math.sqrt(
          + dp[0] * dp[0]
          + dp[1] * dp[1]
        )

        if (dpLen < EPSILON)
          continue

        // Let the floor line's tangent vector be a unit vector pointing from the
        // line's first point to the second.

        const tangent2D = [
          dp[0], dp[1]
        ]

        tangent2D[0] /= dpLen
        tangent2D[1] /= dpLen

        // Let the floor line's normal vector be a unit vector
        // which is the tangent vector rotated by 90 degrees
        // counterclockwise.

        const normal2D = [
          dp[1], -dp[0]
        ]

        normal2D[0] /= dpLen
        normal2D[1] /= dpLen

        // Transform the floor's 2D normal vector into 3D world
        // space.

        const normal3D = new THREE.Vector3(
          normal2D[0] * fxh.x + normal2D[1] * fyh.x,
          normal2D[0] * fxh.y + normal2D[1] * fyh.y,
          normal2D[0] * fxh.y + normal2D[1] * fyh.z)

        // Shift the floor line out along its normal by a
        // distance of _wallShift. For more information on
        // _wallShift have a look at associated comment block
        // where it's defined.

        line[0][0] += wallShift * normal2D[0]
        line[0][1] += wallShift * normal2D[1]

        line[1][0] += wallShift * normal2D[0]
        line[1][1] += wallShift * normal2D[1]

        // The physics engine expects the following metadata for
        // each floor line:

        lines.push({
          points: line,
          n: [normal3D.x, normal3D.y, normal3D.z],
          n2: normal2D,
          t2: tangent2D,
          len: dpLen,
          surfaceId: String(polygonData[idx]?.id),
        })
      }
    }
  )

  const cleanLines = cleanUpFloorLines(lines)

  init(intrinsics, planeData, cleanLines) // keep info in the module to operate

  return cleanLines
}

export function makeFloorLinesFromTemplate(roomTemplate, planeData, intrinsics, wallShift) {
  const floorPlane = getFloorPlane(planeData)

  const fxh = { x: floorPlane.rot[0][0], y: floorPlane.rot[0][1], z: floorPlane.rot[0][2] }
  const fyh = { x: floorPlane.rot[1][0], y: floorPlane.rot[1][1], z: floorPlane.rot[1][2] }

  const loop = collectClockwiseLoop(roomTemplate)
  const floorLines = []
  for (let i = 0; i < loop.walls.length; i += 1) {
    const wall = loop.walls[i]
    const v1 = loop.vertices[i]
    const v2 = loop.vertices[(i + 1) % loop.vertices.length]
    if (!wall || !v1 || !v2) {
      continue
    }
    const dir = {
      x: v2.position.x - v1.position.x,
      y: v2.position.y - v1.position.y,
    }
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
    if (len > 0) {
      dir.x /= len
      dir.y /= len
    }

    // Following WallSnap conventions:
    const tangent = [dir.x, dir.y]
    const normal = [dir.y, -dir.x]
    const normal3D = {
      x: normal[0] * fxh.x + normal[1] * fyh.x,
      y: normal[0] * fxh.y + normal[1] * fyh.y,
      z: normal[0] * fxh.z + normal[1] * fyh.z,
    }

    const line = [[v1.position.x, v1.position.y], [v2.position.x, v2.position.y]]
    line[0][0] += wallShift * normal[0]
    line[0][1] += wallShift * normal[1]

    line[1][0] += wallShift * normal[0]
    line[1][1] += wallShift * normal[1]

    floorLines.push({
      len,
      n: normal3D,
      n2: normal,
      points: line,
      t2: tangent,
      surfaceId: String(wall.id)
    })
  }
  init(intrinsics, planeData, floorLines)
  return floorLines
}

export function cleanUp() {
  _floorLines = null;
  _floorCircle = null;
  _isInitialized = false;
}
