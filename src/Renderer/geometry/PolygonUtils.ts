/*
 * Polygon Utilities
 */

import * as THREE from 'three'
import { Point2 } from 'Renderer/geometry/Point2'
import { Point3, Point3Pod } from 'Renderer/geometry/Point3'
import { Vector2 } from 'Renderer/geometry/Vector2'
import { Vector3, Vector3Pod } from 'Renderer/geometry/Vector3'
import { PlaneType, SurfaceClass, Matrix3x3, Matrix4x4 } from 'Renderer/geomviewer/geom_types'
import { coerceIfCloseToZero } from 'Renderer/utils/math_utils'
import { partition } from 'Renderer/utils/utils'
import { PolygonType } from 'Renderer/assets/Types'
import { EPSILON, EPSILON_SQRD } from './config';
import type { Polygon3 } from './Polygon3'
import { transpose3 } from './utilities'

// Produce a generator that visits successive edge (v_i, v_i+1) along the sequence
// of vertices. If wrapAround is true, the last edge generated (v_n, V_0), wraps around
// the sequence of vertices to close the polygon.
export function* edgeIterator2D(
    vertices: Iterable<Point2>, wrapAround: boolean): Generator<[Point2, Point2]> {

    let n = 0;
    let v0 = new Point2(0, 0);
    let v1 = new Point2(0, 0);

    /* eslint-disable no-restricted-syntax */
    for (const v2 of vertices) {
        // Go around vertices, visiting successive edges (v1, v2).
        if (n === 0) {
            v0 = v2; // Keep 1st vertex for wrap-around.
        } else {
            yield [v1, v2];
        }

        v1 = v2;
        n += 1;
    }
    /* eslint-enable no-restricted-syntax */

    if (wrapAround && n > 1) {
        yield [v1, v0];
    }
}

// Returns whether point p2 is inside polygon poly. Note that poly is treated as a closed
// set. I.e. the boundary of poly is considered as part of its interior.
export function isPointInsidePolygon2D(p2: Point2, poly: Iterable<Point2>): boolean {

    // Return whether horizontal half-ray with origin at p and x >= p.x intersects
    // line segment (s1, s2).
    function checkHalfRayIntersect(p: Point2, s1: Point2, s2: Point2): boolean {
        if (s2.y > s1.y) {
            if (s2.y > p.y && s1.y <= p.y) {
                const x = s1.x + (s2.x - s1.x) / (s2.y - s1.y) * (p.y - s1.y);
                return x >= p.x;
            }
        } else if (s2.y < s1.y) {
            if (s2.y < p.y && s1.y >= p.y) {
                const x = s1.x + (s2.x - s1.x) / (s2.y - s1.y) * (p.y - s1.y);
                return x >= p.x;
            }
        }

        return false;
    }

    /* eslint-disable no-restricted-syntax */
    let intersectionCount = 0;
    for (const e of edgeIterator2D(poly, true)) {
        if (checkHalfRayIntersect(p2, e[0], e[1])) {
            intersectionCount += 1;
        }
    }
    /* eslint-enable no-restricted-syntax */

    // Point is inside polygon when intersectionCount is odd.
    return !!(intersectionCount & 1); // eslint-disable-line no-bitwise
}

// Checks to see if x is inside triangle formed by v1, v2, v3
export function isPointInTriangle2D(pt: Point2, v1: Point2, v2: Point2, v3: Point2): boolean { 
    const sign = (p1: Point2, p2: Point2, p3: Point2) =>
        (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);

    const d1 = sign(pt, v1, v2);
    const d2 = sign(pt, v2, v3);
    const d3 = sign(pt, v3, v1);

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(hasNeg && hasPos);
}

export function isPointInTriangle3D(pt: Point3, 
                                    v0: Point3,
                                    v1: Point3,
                                    v2: Point3): boolean
{
    // u=P2−P1
    const u = Vector3.vecP1toP2(v0, v1)
    // v=P3−P1
    const v = Vector3.vecP1toP2(v0, v2)
    // n=u×v
    const n = Vector3.cross(u, v)

    // w=P−P1
    const w = Vector3.vecP1toP2(v0, pt)

    // Barycentric coordinates of the projection P′of P onto T:
    // γ=[(u×w)⋅n]/n²
    const gamma = coerceIfCloseToZero(Vector3.cross(u, w).dot(n) / n.dot(n))
    // β=[(w×v)⋅n]/n²
    const beta = coerceIfCloseToZero(Vector3.cross(w, v).dot(n) / n.dot(n))

    const alpha = coerceIfCloseToZero(1 - gamma - beta)

    // The point P′ lies inside T if:
    return ((alpha >= 0) && (alpha <= 1) &&
            (beta >= 0) && (beta <= 1) &&
            (gamma >= 0) && (gamma <= 1))
}

// Returns whether passed vector3 is above the provided plane.
export function isAbovePlane (
    v: THREE.Vector3, plane: { n: THREE.Vector3, q: THREE.Vector3 }) {

    const dv = [
        v.x - plane.q.x,
        v.y - plane.q.y,
        v.z - plane.q.z,
    ];

    return (
        dv[0] * plane.n.x
        + dv[1] * plane.n.y
        + dv[2] * plane.n.z   
    ) > 0;
}

// Return the target point that is closest to p on edge E=(e1, e2) and the squared distance
// from point p to that target point. Note that the target point may be either e1 or e2
// when the projection of p doesn't end up between e1 and e2.
export function sqrDistFromPointToEdge2D(
    p: Point2, e1: Point2, e2: Point2): { sqrdDist: number, target: Point2 } {

    const w = e2.minus(e1);
    const v = p.minus(e1);
    const vDotW = v.dot(w);

    if (vDotW <= 0) {
        // p is closest to point e1. The distance squared is |v|^2.
        return {
            sqrdDist: v.sqrdLen(),
            target: e1,
        };
    }

    const lenWSqrd = w.sqrdLen();
    if (lenWSqrd < EPSILON_SQRD) {
        // Edge is degenerate; return squared dist from p to e1.
        return {
            sqrdDist: v.sqrdLen(),
            target: e1,
        };
    }

    // Projection of v on w = (e1, e2).
    const proj = Vector2.scale(w, vDotW / lenWSqrd);
    if (proj.sqrdLen() >= lenWSqrd) {
        // p is closest to point e2. The distance squared is |e2 - p|^2.
        return {
            sqrdDist: (e2.minus(p)).sqrdLen(),
            target: e2,
        };
    }

    v.minus(proj);
    return {
        sqrdDist: v.sqrdLen(),
        target: Point2.add(e1, proj),
    };
}

// Find the closest distance from point p to the boundary of <poly> a polygon define by a
// sequence of 2D points. Return the result as a pair sqrdDist, the squared distance from
// p to <poly> and target, the point on the boundary of <poly> that is closest to p.
export function sqrdDistFromPointToPolygon(
    p: Point2, poly: Iterable<Point2>): { sqrdDist: number, target: Point2 } {

    let target = new Point2(0, 0);
    let minSqrdDist = Infinity;

    /* eslint-disable no-restricted-syntax */
    for (const e of edgeIterator2D(poly, true /* wrap around */)) {
        const q = sqrDistFromPointToEdge2D(p, e[0], e[1]);
        if (q.sqrdDist < minSqrdDist) {
            minSqrdDist = q.sqrdDist;
            target = q.target;
        }
    }
    /* eslint-enable no-restricted-syntax */

    return {
        sqrdDist: minSqrdDist,
        target,
    }
}

export function constructPlaneFromTransform(transform: Matrix4x4, id: number, planeClass: SurfaceClass): PlaneType {
    const x = transform[3][0]
    const y = transform[3][1]
    const z = transform[3][2]

    const rot: Matrix3x3 = [
        [transform[0][0], transform[0][1], transform[0][2]],
        [transform[1][0], transform[1][1], transform[1][2]],
        [transform[2][0], transform[2][1], transform[2][2]],
    ]
    const planeNormal = rot[2]
    const d = -(planeNormal[0] * x +
        planeNormal[1] * y +
        planeNormal[2] * z)
    return {
        id,
        d,
        rot,
        class: planeClass,
    }
}

// Find intersection between a ray and a triangle. Adopted from THREE.Ray.intersectTriangle.
// Returns null if intersection wasn't found, or the world position of intersection point, and the distance from
// the origin to the intersection point.
export function rayIntersectTriangle(p1: Point3, p2: Point3, p3: Point3, origin: Point3Pod, dir: Vector3Pod,
    backfaceCulling = true): {
        point: Point3;
        distanceFromOrigin: number;
    } | null {
    const edge1 = p2.minus(p1)
    const edge2 = p3.minus(p1)
    const normal = Vector3.cross(edge1, edge2)

    // Solve Q + t*D = b1*E1 + b2*E2 (Q = kDiff, D = ray direction,
    // E1 = kEdge1, E2 = kEdge2, N = Cross(E1,E2)) by
    //   |Dot(D,N)|*b1 = sign(Dot(D,N))*Dot(D,Cross(Q,E2))
    //   |Dot(D,N)|*b2 = sign(Dot(D,N))*Dot(D,Cross(E1,Q))
    //   |Dot(D,N)|*t = -sign(Dot(D,N))*Dot(Q,N)
    const direction = new Vector3(dir.dx, dir.dy, dir.dz)
    let dirDotNormal = direction.dot(normal)
    let sign
    if (dirDotNormal > 0) {
        if (backfaceCulling) {
            return null
        }
        sign = 1
    } else if (dirDotNormal < 0) {
        sign = - 1
        dirDotNormal = - dirDotNormal
    } else {
        return null
    }

    const diff = Vector3.minus(new Vector3(origin.x, origin.y, origin.z), new Vector3(p1.x, p1.y, p1.z))
    const DdQxE2 = sign * direction.dot(Vector3.cross(diff, edge2))

    if (DdQxE2 < 0) {
        // b1 < 0, no intersection
        return null
    }

    const DdE1xQ = sign * direction.dot(Vector3.cross(edge1, diff))
    if (DdE1xQ < 0) {
        // b2 < 0, no intersection
        return null
    }

    if (DdQxE2 + DdE1xQ > dirDotNormal) {
        // b1+b2 > 1, no intersection
        return null
    }

    // Line intersects triangle, check if ray does.
    const QdN = -sign * diff.dot(normal)
    if (QdN < 0) {
        // t < 0, no intersection
        return null
    }

    // Ray intersects triangle.
    const distanceFromOrigin = QdN / dirDotNormal
    return {
        point: Point3.add(origin, Vector3.scale(direction, distanceFromOrigin)),
        distanceFromOrigin,
    }
}

export function polygonRayCast(polygon: PolygonType, rayOrigin: Point3Pod, rayDirection: Vector3Pod,
                               backfaceCulling = true) {
   const { transformedVertices, indices } = polygon.parameters
   if (!transformedVertices) {
      return null
   }
   let intersect = null
   for (let i = 0; i < indices.length; i += 3) {
      if (i + 2 >= indices.length) {
        break
      }
      const idx1 = indices[i + 0]
      const idx2 = indices[i + 1]
      const idx3 = indices[i + 2]

      const vertex1 = transformedVertices[idx1]
      const vertex2 = transformedVertices[idx2]
      const vertex3 = transformedVertices[idx3]
      if (vertex1 && vertex2 && vertex3) {
        intersect = rayIntersectTriangle(vertex1, vertex2, vertex3, rayOrigin, rayDirection, backfaceCulling)
        if (intersect) {
           break
        }
      }
   }
   return intersect
}

// Check whether edge [v0, v1] crosses the plane defined by normal vector n and
// point-on-plane q. Return a tri-variate result with:
//   cross: boolean indicating whether the edges crosses the plane.
//   at: the affine distance along [v0, v1] where the crossing occurs.
//   entering: whether a crossing edge enters the plane (v0 is above and v1 is below).
// If anything goes wrong, such as the edge being parallel to the plane, return
// at === Infinity.
export function checkEdgeCrossPlane(
    edge: [THREE.Vector3, THREE.Vector3],
    plane: { n: THREE.Vector3, q: THREE.Vector3 }): { cross: boolean, at: number, entering: boolean } {

    const result = {
        cross: false,
        at: 0,
        entering: false,
    };

    // dv0 and dv1 are vector to v0 and v1 from a point on the plane.
    const dv0 = (new THREE.Vector3()).subVectors(edge[0], plane.q);
    const dv1 = (new THREE.Vector3()).subVectors(edge[1], plane.q);

    // Determine what side of plane `v0` and `v1` are on.
    const v0isAbovePlane = (dv0.dot(plane.n) > 0);
    const v1isAbovePlane = (dv1.dot(plane.n) > 0);

    // If both points are on the same side, we're done.
    if (v0isAbovePlane === v1isAbovePlane) {
        return result;
    }

    // Find the point of intersection c between the plane and the line segment.
    // We have:
    // c = v0 + t * (v1 - v0), c is between v0 and v1, t = scalar in [0, 1]
    // plane.n * (c - plane.q) = 0
    const vnumer = (new THREE.Vector3()).subVectors(plane.q, edge[0]);
    const vdenom = (new THREE.Vector3()).subVectors(edge[1], edge[0]);
    const numer = vnumer.dot(plane.n);
    const denom = vdenom.dot(plane.n);

    if (Math.abs(denom) < EPSILON) {
        // Plane and polygon are nearly parallel.
        result.at = Infinity;
        return result;
    }

    const t = numer / denom;

    // t should be between 0 and 1. If not something went wrong.
    if (t < -EPSILON || t > 1 + EPSILON) {
        result.at = Infinity;
        return result;
    }

    result.cross = true;
    result.at = Math.max(0, Math.min(1, t));
    result.entering = (v0isAbovePlane && !v1isAbovePlane);
    return result;
}

// Clip the polygon with the borders defined by the provided list of planes.
// Return the resulting clipped polygon's outer edges list sorted in a cyclic
// manner [vi, vi+1], [vi+1, vi+2], .... 
export function clipOuterEdgesByPlanes(
    polygon: Polygon3, planes: { n: THREE.Vector3, q: THREE.Vector3 }[]) {
    
    const edges = polygon.gatherExteriorEdges(true /* sorted */);

    planes.forEach(plane => {

        const clippedEdges: typeof edges = [];
        const iStartEdge = edges.findIndex(edge => isAbovePlane(edge[0], plane));
        if (iStartEdge === -1) {
            edges.splice(0, edges.length);
            return;
        }

        for (let i = 0; i < edges.length; i += 1) {
            const currentEdge = edges[(iStartEdge + i) % edges.length];
            const cross = checkEdgeCrossPlane(currentEdge, plane);
            const v0 = currentEdge[0];
            const v1 = currentEdge[1];

            if (cross.cross && cross.entering) {
                const c = v1.clone().sub(v0).multiplyScalar(cross.at).add(v0);
                clippedEdges.push([v0, c]);

            } else if (cross.cross && !cross.entering){
                const c = v1.clone().sub(v0).multiplyScalar(cross.at).add(v0);
                const earlierEdge = clippedEdges[clippedEdges.length - 1];
                clippedEdges.push([earlierEdge[1], c]);
                clippedEdges.push([c, v1]);

            } else if (isAbovePlane(currentEdge[0], plane)) {
                clippedEdges.push([v0, v1])
            }
        }

        edges.splice(0, edges.length, ...clippedEdges);
    });

    return edges;
}

// The extents of a polygon are the minimum and maximum values of the x-coordinates and y-coordinates. 
export function getPolyExtents(poly: [number, number][]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const vertex of poly) {
    const [x, y] = vertex;
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return new Point2((maxX - minX) / 2,  (maxY - minY) / 2)
}

// Uniformly sample the given polygon type and return the sampled points.
// The steps parameter controls the number of samples to take in each dimension, 
// the total number of samples will be steps * steps.
export function uniformlySamplePolygon(polygon: PolygonType, steps = 10): Array<Point3> {

    if (!polygon || !polygon.parameters.transformedVertices) {
        return []
    }

    const is = polygon.parameters.indices
    const vs = polygon.parameters.transformedVertices
    const tris = partition(is, 3)

    // find normal
    const origin = vs[is[0]]
    const a = Vector3.vecP1toP2(origin, vs[is[1]])
    const b = Vector3.vecP1toP2(origin, vs[is[2]])
    const n = Vector3.cross(a, b).normalize()

    // create basis vectors
    const u = a.normalize()
    const v = Vector3.cross(n, u).normalize()

    // basis matrix
    const M: Matrix3x3 = [[u.dx, v.dx, n.dx], [u.dy, v.dy, n.dy], [u.dz, v.dz, n.dz]]

    // project all vertices to new basis
    const tmpV = new Vector3(0, 0, 0)
    const vs2d = vs.map(vtx => { 
        tmpV.set(vtx.x - origin.x, vtx.y - origin.y, vtx.z - origin.z)
        tmpV.mulMat(M)
        return new Point2(tmpV.dx, tmpV.dy)
    })

    // find min/max coordinates of all vs
    const min = new Point2(Infinity, Infinity)
    const max = new Point2(-Infinity, -Infinity)
    vs2d.forEach(vert => {
        min.min(vert)
        max.max(vert)
    })

    // sample polygons in 2D by walking a spiral around the center point.
    const validSamples: Point2[] = []
    const dx = (max.x - min.x) / steps
    const dy = (max.y - min.y) / steps
    const directions = [new Point2(1, 0), new Point2(0, 1), new Point2(-1, 0), new Point2(0, -1)]
    const currentLocation = new Point2((max.x + min.x) / 2, (max.y + min.y) / 2)
    let currentDirection = directions[0]
    let changedDirectionCount = 0 // keep track of how many times we've changed direction
    let dirSteps = 1 // number of steps to travel in current direction
    for (let i = 0; i < steps * steps; i += 1) {
        // Is this a valid point? is it inside the triangles of our polygon?
        if (tris.some(tri => isPointInTriangle2D(currentLocation, vs2d[tri[0]], vs2d[tri[1]], vs2d[tri[2]]))) {
            validSamples.push(new Point2(currentLocation.x, currentLocation.y))
        }

        // Move to next location
        currentLocation.set(currentLocation.x + currentDirection.x * dx,
                            currentLocation.y + currentDirection.y * dy)

        // Change direction if needed
        dirSteps -= 1
        if (dirSteps === 0) {
            changedDirectionCount += 1
            dirSteps = Math.floor(changedDirectionCount / 2) + 1
            currentDirection = directions[(directions.indexOf(currentDirection) + 1) % directions.length]
        }
    }

    // project all points to back to 3D coords
    transpose3(M) // DANGER: invert the matrix in-place, M is now M^-1
    const samples: Point3[] = validSamples.map(p => {
        const vert = new Vector3(p.x, p.y, 0)
        vert.mulMat(M)
        return new Point3(vert.dx + origin.x, vert.dy + origin.y, vert.dz + origin.z)
    })

    return samples
}

function segmentsIntersect(p1: Point2, p2: Point2, p3: Point2, p4: Point2) {
    const d1x = p2.x - p1.x
    const d1y = p2.y - p1.y
    const d2x = p4.x - p3.x
    const d2y = p4.y - p3.y

    const det = d1x * d2y - d1y * d2x
    if (Math.abs(det) < EPSILON) {
        return undefined
    }

    const d3x = p3.x - p1.x;
    const d3y = p3.y - p1.y;

    const t = (d3x * d2y - d3y * d2x) / det
    const u = (d3x * d1y - d3y * d1x) / det

    let ret: Point2 | undefined
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        ret = new Point2(p1.x + t * d1x, p1.y + t * d1y)
    }
    const normal = new Vector2(d2y, -d2x).normalize()
    return { t, point: ret, normal }
}

export function segmentIntersectPolygon2D(p1: Point2, p2: Point2, poly: Iterable<Point2>) {
    let closestItersect: Point2 | undefined = undefined
    let normal: Vector2 | undefined = undefined
    let t = Infinity
    let minDistanceSq = Infinity

    for (const edge of edgeIterator2D(poly, true)) {
        const intersection = segmentsIntersect(p1, p2, edge[0], edge[1])
        if (intersection && intersection.point) {
            const distSq = p1.distanceToSq(intersection.point)
            if (distSq < minDistanceSq) {
                minDistanceSq = distSq
                closestItersect = intersection.point
                t = intersection.t
                normal = intersection.normal
            }
        }
    }
    return { point: closestItersect, t, normal }
}

export function transformPolygonVerticesToWorldSpace(polygon: PolygonType) {
    const transformedVertices = polygon.parameters.vertices.map((vert) => {
        const x = vert[0]
        const y = vert[1]
        const z = 0.0
        const m = polygon.transform

        const w = 1 / (m[3][0] * x + m[3][1] * y + m[3][2] * z + m[3][3])

        const retX = (m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3]) * w
        const retY = (m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3]) * w
        const retZ = (m[2][0] * x + m[2][1] * y + m[2][2] * z + m[2][3]) * w

        return new Point3(retX, retY, retZ)
    })
    return transformedVertices
  }