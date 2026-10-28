import * as THREE from 'three'
import {
    EPSILON,
    Point2,
    Point2Pod,
    Point3,
    Point3Pod,
    segmentIntersectPolygon2D,
    isPointInsidePolygon2D,
    sqrdDistFromPointToPolygon,
    toVector3,
    Vector3,
    Vector3Pod
} from 'Renderer/geometry';
import type { Matrix3x3, PlaneType, SurfaceClass } from 'Renderer/geomviewer/geom_types';
import { PolygonType } from 'Renderer/assets/Types';
import type { PointSampleResult } from 'Renderer/rendering/SceneSampler';
import * as sceneUtils from "Renderer/utils/sceneUtils"
import {
    copyMatrix4,
    makeRotationY,
    multiplyMatrices3x3,
    transpose4,
    getInverted,
    extractQuaternionFromMat4,
} from 'Renderer/geometry/utilities';
import type { IntersectionInfo, Ray, ItemLoc3 } from './positioning_types';
import { gvPositioningConext } from './positioning_context'

// Extended surface-class type for local usage.
type SurfaceClassOrNone = SurfaceClass | 'none';

// Local workspace.
const workspace = {
    pt2: new Point2(0, 0),
    pt3: new Point3(0, 0, 0),
    vec3: new Vector3(0, 0, 0),

    mat4: new THREE.Matrix4(),
    xAxis: new THREE.Vector3(),
    yAxis: new THREE.Vector3(),
    zAxis: new THREE.Vector3()
}

export function createThreeMatrix4(rotation: Matrix3x3, position: Point3Pod, outMat?: THREE.Matrix4) {
    const targetMat = outMat || new THREE.Matrix4()
    workspace.xAxis.set(rotation[0][0], rotation[0][1], rotation[0][2])
    workspace.yAxis.set(rotation[1][0], rotation[1][1], rotation[1][2])
    workspace.zAxis.set(rotation[2][0], rotation[2][1], rotation[2][2])
    workspace.mat4.makeBasis(workspace.xAxis, workspace.yAxis, workspace.zAxis)
    workspace.mat4.setPosition(new THREE.Vector3(position.x, position.y, position.z))
    targetMat.copy(workspace.mat4)
    return targetMat
}

// Query the type of background at screen position panoPt2.
export function queryBackgroundTypeAtScreenPos(panoPt2: Point2Pod, ignore?: SurfaceClass): SurfaceClassOrNone {
    const scene = gvPositioningConext()?.getScene();
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    if (!scene || !sceneSampler) {
        // eslint-disable-next-line i18next/no-literal-string
        return 'none';
    }

    const [x, y] = scene.toRelativeCoords(panoPt2.x, panoPt2.y);

    // eslint-disable-next-line i18next/no-literal-string
    return sceneSampler.sampleSurfaceClass(workspace.pt2.set(x, y), ignore) || 'none';
}

// Return all the wall planes. Return an empty array if the scene is not ready or
// there is no wall planes.
export function getAllWallPlanes(): PlaneType[] {
    const allPlanes = gvPositioningConext()?.getPlaneData() || [];
    return allPlanes.filter((p) => p.class === 'wall');
}

// Find and return the furthest floor plane from the origin (lowest floor) in the
// current scene, or null if not found.
export function getFloorPlane(): PlaneType | null {
    const allPlanes = gvPositioningConext()?.getPlaneData() || [];
    return sceneUtils.getFloorPlane(allPlanes) || null;
}

// Find and return the furthest ceiling plane from the origin (highest ceiling) in
// the current scene, or null if not found.
export function getCeilingPlane(): PlaneType | null {
    const allPlanes = gvPositioningConext()?.getPlaneData() || [];
    const allCeilings = allPlanes.filter(p => p.class === "ceiling");
    const floor = getFloorPlane()
    const down = { x: floor?.rot[2][0] || 0, y: floor?.rot[2][1] || 1, z: floor?.rot[2][2] || 0 }
    down.y *= -1
    const withDots = allCeilings.map((ceiling) => {
        const dot = ceiling.rot[2][0] * down.x + ceiling.rot[2][1] * down.y + ceiling.rot[2][2] * down.z
        return { ...ceiling, dot }
    })
    const bestCeiling = withDots.sort((p1, p2) => {
        const alignmentDiff = p2.dot - p1.dot
        return Math.abs(alignmentDiff) > EPSILON ? alignmentDiff : p2.d - p1.d
    })[0]
    if (!bestCeiling) {
        return null
    }
    return allCeilings.find(c => c.id === bestCeiling.id) || null
}

export function sampleCeilingAbovePoint(point: Point3Pod): PointSampleResult | null {
    const floor = getFloorPlane()
    const sceneSampler = gvPositioningConext()?.getSceneSampler()
    if (!sceneSampler || !floor) {
        return null
    }
    const vertical = { dx: floor?.rot[2][0], dy: floor?.rot[2][1], dz: floor?.rot[2][2] }
    const results = sceneSampler.rawRaycastSample(workspace.pt3.set(point.x, point.y, point.z),
        workspace.vec3.set(vertical.dx, vertical.dy, vertical.dz))
    if (results.length === 0 || results[0].plane.class !== "ceiling") {
        return null
    }
    return results[0]
}

// Find and return the ceiling plane above the passed position in the current scene, or
// null if not found.
export function getCeilingPlaneAbovePoint(point: Point3Pod): PlaneType | null {
    const samplingResult = sampleCeilingAbovePoint(point)
    return samplingResult?.plane || null
}

// Return the plane with the given ID, or undefined if not found.
export function getSurfaceById(id: number): PlaneType | undefined {
    const allPlanes = gvPositioningConext()?.getPlaneData() || [];
    return allPlanes.find(plane => plane.id === id)
}

// Return the polygon with the given ID, or undefined if not found.
export function getPolygonById(id: number): PolygonType | undefined {
    const allPolys = gvPositioningConext()?.getPolygonData() || []
    return allPolys.find(poly => poly.id === id)
}

export function getFloorPolygonCentroid() {
    const allPolys = gvPositioningConext()?.getPolygonData() || []
    const floorPoly = allPolys.find(poly => poly.class === 'floor')
    if (!floorPoly) {
        return undefined
    }
    const centroid = new Point3(0, 0, 0)
    floorPoly.parameters.vertices.forEach((v) => {
        centroid.x += v[0]
        centroid.y += v[1]
    })
    centroid.x /= floorPoly.parameters.vertices.length
    centroid.y /= floorPoly.parameters.vertices.length
    const xform = copyMatrix4(floorPoly.transform)
    transpose4(xform)
    centroid.mulMat4(xform)
    return centroid
}

function* vertex2DIterator(vertices: [number, number][]): Generator<Point2> {
    const len = vertices.length
    for (let i = 0; i < len; i += 1) {
        yield new Point2(vertices[i][0], vertices[i][1])
    }
}

export function segment2DIntersectFloorEdge(worldP1: Point3, worldP2: Point3) {
    const allPolys = gvPositioningConext()?.getPolygonData() || []
    const floorPoly = allPolys.find(poly => poly.class === 'floor')
    if (!floorPoly) {
        return undefined
    }

    const transform = copyMatrix4(floorPoly.transform)
    transpose4(transform)
    const localP1 = worldP1.clone().mulMat4(getInverted(transform))
    const localP2 = worldP2.clone().mulMat4(getInverted(transform))

    const localIntersect = segmentIntersectPolygon2D(new Point2(localP1.x, localP1.y),
        new Point2(localP2.x, localP2.y), vertex2DIterator(floorPoly.parameters.vertices))
    let worldIntersect: Point3 | undefined
    let worldNormal: Vector3 | undefined
    if (localIntersect.point && localIntersect.normal) {
        worldIntersect = new Point3(localIntersect.point.x, localIntersect.point.y, 0.0).mulMat4(transform)
        const q = extractQuaternionFromMat4(transform)
        worldNormal = new Vector3(localIntersect.normal.dx, localIntersect.normal.dy, 0.0)
            .applyQuaternion({ x: q[0], y: q[1], z: q[2], w: q[3] })
    }
    return { point: worldIntersect, t: localIntersect.t, normal: worldNormal }
}

function isPointInsidePolygon(worldPoint: Point3, polygon: PolygonType) {
    const transform = copyMatrix4(polygon.transform)
    transpose4(transform)
    const localPoint = workspace.pt3.set(worldPoint.x, worldPoint.y, worldPoint.z).mulMat4(getInverted(transform))
    const iterator = vertex2DIterator(polygon.parameters.vertices)
    return isPointInsidePolygon2D(workspace.pt2.set(localPoint.x, localPoint.y), iterator)
}

export function isPointInsideFloorPolygon(worldPoint: Point3) {
    const allPolys = gvPositioningConext()?.getPolygonData() || []
    const floorPoly = allPolys.find(poly => poly.class === 'floor')
    if (!floorPoly) {
        return undefined
    }
    return isPointInsidePolygon(worldPoint, floorPoly)
}

export function closestPointOnFloorEdge(worldPoint: Point3Pod) {
    const allPolys = gvPositioningConext()?.getPolygonData() || []
    const floorPoly = allPolys.find(poly => poly.class === 'floor')
    if (!floorPoly) {
        return undefined
    }

    const transform = copyMatrix4(floorPoly.transform)
    transpose4(transform)
    const localPoint = workspace.pt3.set(worldPoint.x, worldPoint.y, worldPoint.z).mulMat4(getInverted(transform))
    const iterator = vertex2DIterator(floorPoly.parameters.vertices)
    const result = sqrdDistFromPointToPolygon(workspace.pt2.set(localPoint.x, localPoint.y), iterator)
    return workspace.pt3.set(result.target.x, result.target.y, 0.0).mulMat4(transform)
}

// Convert a point from pano to relative screen coordinates and return the result.
// Return the center screen point if a scene is not available.
export function panoToRelativeScreenPt(panoPt2: Point2Pod): Point2Pod {
    const scene = gvPositioningConext()?.getScene();
    if (!scene) {
        return { x: 0.5, y: 0.5 };
    }

    const [x, y] = scene.toRelativeCoords(panoPt2.x, panoPt2.y);
    return { x, y };
}

// Find the background plane visible at the given screen location and return it if it's a
// wall plane. Return null otherwise.
export function queryWallPlaneFromScreenPos(panoPt2: Point2Pod): PlaneType | null {
    const scene = gvPositioningConext()?.getScene();
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    if (!scene || !sceneSampler) {
        return null;
    }

    const [x, y] = scene.toRelativeCoords(panoPt2.x, panoPt2.y);
    const result = sceneSampler.sampleRelativePoint(workspace.pt2.set(x, y));
    const isWall = result?.plane.class === 'wall'
    return isWall ? result.plane : null;
}

// Sample a plane by casting a ray through the given screen point given in pano coordinates,
// using the current camera. Return the PointSampleResult or null in case of failure.
export function samplePlane(panoPt2: Point2, plane: PlaneType): PointSampleResult | null {
    const scene = gvPositioningConext()?.getScene();
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    if (!scene || !sceneSampler) {
        return null
    }

    const [x, y] = scene.toRelativeCoords(panoPt2.x, panoPt2.y);
    return sceneSampler.samplePlane(workspace.pt2.set(x, y), plane);
}

// Sample all walls in the scene and return the closest intersection or null if none is found.
// Note that only intersections within the wall boundaries are considered by this function.
export function sampleAllWalls(panoPt2: Point2): PointSampleResult | null {
    const scene = gvPositioningConext()?.getScene();
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    if (!scene || !sceneSampler) {
        return null
    }

    const [x, y] = scene.toRelativeCoords(panoPt2.x, panoPt2.y);
    return sceneSampler.sampleWalls(workspace.pt2.set(x, y));
}

// Sample the floor plane in the scene and return the closest intersection or null if none is found.
export function sampleFloor(panoPt2: Point2): PointSampleResult | null {
    const scene = gvPositioningConext()?.getScene();
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    const floorPlane = getFloorPlane();
    if (!scene || !sceneSampler || !floorPlane) {
        return null
    }

    const [x, y] = scene.toRelativeCoords(panoPt2.x, panoPt2.y);
    return sceneSampler.samplePlane(workspace.pt2.set(x, y), floorPlane);
}

export function getStackableSurfaceAtPoint(panoPt2: Point2Pod, filterIds?: string[], 
    mouseBelowSurfInteract = true): string | null {
    const scene = gvPositioningConext()?.getScene()
    if (!scene) {
        return null
    }
    const [relX, relY] = scene.toRelativeCoords(panoPt2.x, panoPt2.y)
    const result = scene.getStackableSurfaceAtPoint(relX, relY, filterIds, mouseBelowSurfInteract)
    return result?.stackablePlaneId || null
}

export function sampleStackableSurface(panoPt2: Point2Pod, surfaceId: string, indirect = false,
   mouseBelowSurfInteract = true): Point3 | null {
    const scene = gvPositioningConext()?.getScene()
    if (!scene) {
        return null
    }
    const [x, y] = scene.toRelativeCoords(panoPt2.x, panoPt2.y)
    let position: Point3 | null = null
    if (indirect) {
        const result = scene.getStackableSurfaceAtPoint(x, y, [surfaceId], mouseBelowSurfInteract)
        if (result?.worldPoint) {
            position = new Point3(result.worldPoint.x, result.worldPoint.y, result.worldPoint.z)
        }
    } else {
        position = scene.doStackableSurfaceRaycast(x, y, surfaceId)
    }
    if (!position) {
        return null
    }
    return position
}

// Cast a ray toward a plane and return the point of intersection, or null
// in case of failure such as when the ray and plane are parallel.
export function rayCastToPlane(ray: Ray, plane: PlaneType): Point3 | null {
    const norm = plane.rot[2];
    const normDotDir = norm[0] * ray.dir.dx + norm[1] * ray.dir.dy + norm[2] * ray.dir.dz;
    if (Math.abs(normDotDir) < EPSILON) {
        return null;
    }

    const normDotOrigin = ray.origin.x * norm[0] + ray.origin.y * norm[1] + ray.origin.z * norm[2];
    const rayDistance = -(normDotOrigin + plane.d) / normDotDir;
    return Point3.add(ray.origin, Vector3.scale(ray.dir, rayDistance));
}

// Project point pt in direction dir toward the target plane and returns the 3D intersection point.
// Returns null in case of failure (dir and plane are parallel).
export function projPtToPlane(pt: Point3Pod, dir: Vector3Pod, targetPlane: PlaneType): Point3 | null {
    const ray = { origin: pt, dir };
    const snapPoint = rayCastToPlane(ray, targetPlane)
    return snapPoint;
}

// Return the distance from point pt to the plane.
export function queryDistToPlane(pt: Point3Pod, plane: PlaneType): number {
    const normal: Vector3Pod = {
        dx: plane.rot[2][0],
        dy: plane.rot[2][1],
        dz: plane.rot[2][2]
    }
    const origin: Point3Pod = { x: 0, y: 0, z: 0 };
    return (Vector3.vecP1toP2(origin, pt).dot(normal)) + plane.d;
}

// Return the distance from point pt to the ceiling plane in the scene. Return null
// if no ceiling plane is found.
export function queryDistFromPointToCeiling(pt: Point3Pod): number | null {
    const ceiling = getCeilingPlaneAbovePoint(pt) || getCeilingPlane();
    if (ceiling) {
        return queryDistToPlane(pt, ceiling);
    }
    return null;
}

// Return the distance from point pt to the floor plane in the scene. Return null
// if no floor plane is found.
export function queryDistFromPointToFloor(worldPos3d: Point3Pod): number | null {
    const floor = getFloorPlane();
    if (floor) {
        return queryDistToPlane(worldPos3d, floor);
    }
    return null;
}

function isFrontFacing(plane: PlaneType): boolean {
  const scene = gvPositioningConext()?.getScene();
  if (!scene) return false;

  const polygons = gvPositioningConext()?.getPolygonData();
  if (!Array.isArray(polygons)) return false;

  const polygon = polygons.find(poly => poly.plane.id === plane.id);
  const indices = polygon?.parameters.indices;
  const vertices = polygon?.parameters.transformedVertices;

  if (!Array.isArray(vertices) || !Array.isArray(indices)) return false;

  const camera = gvPositioningConext()?.getCamera();
  if (!camera) return false;

  const crosses = [];

  for (let i = 0; i + 2 < indices.length; i += 3) {
    const p0 = camera.worldToScreenFloat(vertices[indices[i]]);
    const p1 = camera.worldToScreenFloat(vertices[indices[i + 1]]);
    const p2 = camera.worldToScreenFloat(vertices[indices[i + 2]]);

    const edge1 = { x: p1.x - p0.x, y: p1.y - p0.y };
    const edge2 = { x: p2.x - p0.x, y: p2.y - p0.y };

    const cross = edge1.x * edge2.y - edge1.y * edge2.x;
    crosses.push(cross);
  }

  if (crosses.length === 0) return false;

  const result = crosses.some(c => c <= 0); // If any triangle is front-facing
  return result
}

// Based on https://www.geometrictools.com/Documentation/DistancePoint3Triangle3.pdf
// by David Eberly
function closestPointOnTriangle(p: Vector3, a: Vector3, b: Vector3, c: Vector3): Vector3 {    
    const ab = Vector3.minus(b, a);
    const ac = Vector3.minus(c, a);
    const ap = Vector3.minus(p, a);

    const d1 = ab.dot(ap);
    const d2 = ac.dot(ap);
    if (d1 <= 0 && d2 <= 0) return a.clone(); // barycentric coords (1,0,0)

    const bp = Vector3.minus(p, b);
    const d3 = ab.dot(bp);
    const d4 = ac.dot(bp);
    if (d3 >= 0 && d4 <= d3) return b.clone(); // barycentric coords (0,1,0)

    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        return Vector3.plus(a, Vector3.scale(ab, v)); // barycentric (1-v, v, 0)
    }

    const cp = Vector3.minus(p, c);
    const d5 = ab.dot(cp);
    const d6 = ac.dot(cp);
    if (d6 >= 0 && d5 <= d6) return c.clone(); // barycentric (0,0,1)

    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
        const w = d2 / (d2 - d6);
        return Vector3.plus(a, Vector3.scale(ac, w)); // barycentric (1-w, 0, w)
    }

    const va = d3 * d6 - d5 * d4;
    const bc = Vector3.minus(c, b)
    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
        const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
        return Vector3.plus(b, Vector3.scale(bc, w)); // barycentric (0,1-w,w)
    }

    const denom = 1 / (va + vb + vc);
    const v = vb * denom;
    const w = vc * denom;

    return a.clone()
        .plus(Vector3.scale(ab, v))
        .plus(Vector3.scale(ac, w));
}

function addWallDistance(pos: Point3Pod, wall: PlaneType, results: PointSampleResult[]) {
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    if (!sceneSampler) return

    if (!isFrontFacing(wall)) return

    const wallNormal = wall.rot[2];
    const dir = new Vector3(-wallNormal[0], -wallNormal[1], -wallNormal[2]);

    const isect = sceneSampler.rawPlaneRaycastSample(
        new Point3(pos.x, pos.y, pos.z),
        dir,
        wall
    );
    if (!isect) return

    const wallPolygon = getPolygonById(wall.id);
    const vertices = wallPolygon?.parameters.transformedVertices;
    const indices = wallPolygon?.parameters.indices;

    if (!vertices || !indices) return

    // Get intersection point
    const intersectionPoint = isect.position;
    const projected = new Vector3(intersectionPoint.x, intersectionPoint.y, intersectionPoint.z);

    // find shortest distance to polygon edges or vertices
    let minDistSq = Infinity;
    let closestPoint: Vector3 | null = null;

    for (let i = 0; i < indices.length; i += 3) {

        const a = new Vector3(vertices[indices[i]].x, vertices[indices[i]].y, vertices[indices[i]].z);
        const b = new Vector3(vertices[indices[i + 1]].x, vertices[indices[i + 1]].y, vertices[indices[i + 1]].z);
        const c = new Vector3(vertices[indices[i + 2]].x, vertices[indices[i + 2]].y, vertices[indices[i + 2]].z);
        
        const p = new Vector3(projected.dx, projected.dy, projected.dz)
        const point = closestPointOnTriangle(p, a, b, c)

        
        const distSq = Vector3.minus(point, p).sqrdLen();
        if (distSq < minDistSq) {
            minDistSq = distSq;
            closestPoint = point.clone();
        }
    }

    if (closestPoint) {
        results.push({
            plane: wall,
            position: new Point3(closestPoint.dx, closestPoint.dy, closestPoint.dz)
        });
    }
}

// Returns a list of shortest distances from the given point to all walls
export function getWallDistances(pos: Point3Pod) {
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    if (!sceneSampler) {
        return [];
    }

    const wallDistances: PointSampleResult[] = [];
    const allWalls = getAllWallPlanes();

    for (const wall of allWalls) {
        addWallDistance(pos, wall, wallDistances)
    }

    wallDistances.sort((a, b) => a.position.distanceToSq(pos) - b.position.distanceToSq(pos));
    return wallDistances;
}

// Cast a ray through all wall planes in the scene and return a list of intersections.
// If checkIfVisible is true, only intersections that are visible are produced.
// If checkIfValid is true, only intersections that are strictly through the wall boundaries are produced.
// Returns an empty array if no intersection is found.
export function castRayToAllWalls(ray: Ray, checkIfVisible: boolean, checkIfValid = false): IntersectionInfo[] {
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    if (!sceneSampler) {
        return []
    }

    const origin = workspace.pt3.set(ray.origin.x, ray.origin.y, ray.origin.z);
    const dir = workspace.vec3.set(ray.dir.dx, ray.dir.dy, ray.dir.dz);

    const allSamples = getAllWallPlanes().map((plane) =>

        sceneSampler.rawPlaneRaycastSample(origin, dir, plane))
        .filter((result): result is PointSampleResult => !!result);
    let filteredSamples = allSamples

    if (checkIfVisible) {
        filteredSamples = allSamples.filter(
            isect => sceneSampler.is3DWallPointVisible(isect.position, isect.plane, true))
    }

    if (checkIfValid) {
        filteredSamples = allSamples.filter(
            isect => sceneSampler.is3DWallPointValid(isect.position, isect.plane, true))
    }
    const wallSamples = filteredSamples.filter(isect => isect.plane.class === 'wall')

    const intersections = wallSamples.map(isect => ({
        distance: origin.distanceTo(isect.position),
        point: isect.position,
        normal: toVector3(isect.plane.rot[2]),
        plane: isect.plane,
    }))

    intersections.sort((a, b) => a.distance - b.distance)
    return intersections;
}

export function castRayToItemBboxes(ray: Ray, filterFn?: (itemId: string) => boolean) {
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    if (!sceneSampler) {
        return null
    }
    return sceneSampler.rawBboxRaycast(ray.origin, ray.dir, true, filterFn)
}

// Cast a ray through all wall planes and return the nearest intersection. If strict is
// true, only intersections that are strictly through the wall boundaries are produced.
// Returns undefined if no intersection is found.
export function castRayToNearestWallPlane(ray: Ray, strict: boolean,
    checkIfValid = false): IntersectionInfo | undefined {
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    if (!sceneSampler) {
        return undefined;
    }
    const intersections = castRayToAllWalls(ray, strict, checkIfValid);
    return intersections.length > 0 ? intersections[0] : undefined;
}

// Cast a ray through the floor plane and return the intersection. Return undefined if
// no intersection is found.
export function castRayToFloorPlane(ray: Ray): IntersectionInfo | undefined {
    const sceneSampler = gvPositioningConext()?.getSceneSampler();
    if (!sceneSampler) {
        return undefined;
    }

    const floorPlane = getFloorPlane();
    if (floorPlane) {
        const origin = workspace.pt3.set(ray.origin.x, ray.origin.y, ray.origin.z);
        const dir = workspace.vec3.set(ray.dir.dx, ray.dir.dy, ray.dir.dz);
        const sampleResult = sceneSampler.rawPlaneRaycastSample(origin, dir, floorPlane);

        if (sampleResult) {
            const result: IntersectionInfo = {
                distance: sampleResult.position.distanceTo(origin),
                point: sampleResult.position,
                normal: toVector3(sampleResult.plane.rot[2]),
                plane: floorPlane,
            }

            return result;
        }
    }

    return undefined;
}

export function rawRaycastSample(ray: Ray) {
    const scene = gvPositioningConext()?.getScene()
    const sceneSampler = gvPositioningConext()?.getSceneSampler()
    if (!scene || !sceneSampler) {
        return []
    }
    return sceneSampler.rawRaycastSample(workspace.pt3.set(ray.origin.x, ray.origin.y, ray.origin.z),
        workspace.vec3.set(ray.dir.dx, ray.dir.dy, ray.dir.dz))
}

// Cast a ray through all the scene surfaces and return the intersection. Return undefined if
// no intersection is found.
export function castRayToAllSurfaces(ray: Ray): IntersectionInfo | undefined {
    const results = rawRaycastSample(ray)
    if (results.length === 0) {
        return undefined
    }
    const distances = results.map((res, idx) => ({
        distance: res.position.distanceToSq(ray.origin),
        idx,
    })).sort((d1, d2) => d1.distance - d2.distance)
    const nearestIdx = distances[0].idx
    const nearestDistance = distances[0].distance
    const nearest = results[nearestIdx]
    if (!nearest) {
        return undefined
    }
    const normal = new Vector3(nearest.plane.rot[2][0], nearest.plane.rot[2][1], nearest.plane.rot[2][2])
    return {
        distance: nearestDistance,
        point: nearest.position,
        normal,
        plane: nearest.plane,
    }
}

// Sample all walls infante planes in the scene and return the closest intersection or null if none is found.
// If strict is true, only intersections that are strictly through the wall boundaries are produced.
export function sampleAllWallsPlanes(panoPt2: Point2, strict: boolean): PointSampleResult | null {
    const scene = gvPositioningConext()?.getScene()
    const camera = gvPositioningConext()?.getCamera()
    if (!camera || !scene) {
      return null
    }
    const [x, y] = scene.toRelativeCoords(panoPt2.x, panoPt2.y);
    const origin = camera.getLocation()
    const dir: Vector3 = camera.getUnitRayDirThruScreenPoint(x, y)
    const intersectionInfo = castRayToNearestWallPlane({
        origin,
        dir,
    }, strict)
    if (!intersectionInfo || !intersectionInfo.point || !intersectionInfo.plane) {
        return null
    }
    return {
        position: intersectionInfo.point,
        plane: intersectionInfo.plane,
    }
}

// Sample the entire scene background at the given screen position and return the plane
// found there and the corresponding 3D position, or null if no plane is found.
export function sampleScene(panoPt2: Point2, legacySupport = false): PointSampleResult | null {
    const scene = gvPositioningConext()?.getScene()
    const sceneSampler = gvPositioningConext()?.getSceneSampler()
    if (!scene || !sceneSampler) {
        return null
    }

    const [x, y] = scene.toRelativeCoords(panoPt2.x, panoPt2.y)
    const sampleResult = sceneSampler.sampleRelativePoint(workspace.pt2.set(x, y))

    // This branch is to support legacy image based scenes with incorrect segmentation maps, where baseboard pixels
    // are segmented as "floor". Sample all walls in strict mode with baseboard correction applied and check if that
    // point is above the floor plane.
    if (legacySupport && sampleResult?.plane.class === 'floor') {
        const floorPlane = getFloorPlane()
        if (floorPlane) {
            const wallSampleResult = sampleAllWallsPlanes(panoPt2, true)
            if (wallSampleResult && wallSampleResult.plane) {
                const vertical = { dx: wallSampleResult.plane.rot[1][0], dy: wallSampleResult.plane.rot[1][1],
                    dz: wallSampleResult.plane.rot[1][2] }
                const projected = projPtToPlane(wallSampleResult.position, vertical, floorPlane)
                if (projected && projected.y < wallSampleResult.position.y) {
                    return wallSampleResult
                }
            }
        }
    }
    return sampleResult
}

// Clamp a 3D point between floor and ceiling planes.
// The function assumes that floor plane is always positioned below the ceiling plane in the room space.
export function clampPointToFloorCeiling(itemLoc: ItemLoc3): Point3 {
    const floorPlane = getFloorPlane()
    const ceilingPlane = getCeilingPlaneAbovePoint(itemLoc.pt3) || getCeilingPlane()
    let result = null
    // Small padding to allow the resulting point not to fail is3DWallPointVisible, which can happen when it
    // lay strictly on the planes intersection line.
    const padding = 0.01
    const vertical = { dx: itemLoc.boundToPlane.rot[1][0], dy: itemLoc.boundToPlane.rot[1][1],
        dz: itemLoc.boundToPlane.rot[1][2] }
    if (floorPlane) {
        result = projPtToPlane(itemLoc.pt3, vertical, floorPlane)
        if (result) {
            if (result.y < itemLoc.pt3.y) {
                result = null
            } else {
                result.y += padding
            }
        }
    }
    if (!result && ceilingPlane) {
        result = projPtToPlane(itemLoc.pt3, vertical, ceilingPlane)
        if (result) {
            if (result.y > itemLoc.pt3.y) {
                result = null
            } else {
                result.y -= padding
            }
        }
    }
    // If result is null, the point is already between floor and ceiling.
    return result || new Point3(itemLoc.pt3.x, itemLoc.pt3.y, itemLoc.pt3.z)
}

// For a given screen point, find a corresponding point on wall planes, clamped between floor and ceiling.
export function findWallPositionClamped(panoPt2: Point2): PointSampleResult | null {
    const scene = gvPositioningConext()?.getScene()
    const sceneSampler = gvPositioningConext()?.getSceneSampler()
    const camera = gvPositioningConext()?.getCamera()
    if (!scene || !sceneSampler || !camera) {
        return null
    }

    const [x, y] = scene.toRelativeCoords(panoPt2.x, panoPt2.y)
    const relPoint = workspace.pt2.set(x, y)

    const allSamples = getAllWallPlanes()
        .map((plane) => sceneSampler.samplePlane(relPoint, plane))
        .filter((result): result is PointSampleResult => !!result)
        .map((result) => ({
                position: clampPointToFloorCeiling({
                    pt3: result.position,
                    boundToPlane: result.plane,
                }),
            plane: result.plane,
        }))
        .filter(result => sceneSampler.is3DWallPointVisible(result.position, result.plane))
        .sort((p1, p2) =>
            p1.position.distanceToSq(camera.getLocation()) - p2.position.distanceToSq(camera.getLocation()))
    return allSamples[0] || null
}

// Given a 3D position, find the closest point on walls it can be projected to along floor's horizontal x and y) axes.
export function findClosestProjectionOnWalls(point: Point3Pod): PointSampleResult | null {
    let closestIntersection: PointSampleResult | null = null

    const intersections = getWallDistances(point)
    const result = intersections.length > 0 ? intersections[0] : null
    if (result) {
        closestIntersection = result
    }

    return (closestIntersection && closestIntersection.position && closestIntersection.plane)
        ? {
            position: closestIntersection.position,
            plane: closestIntersection.plane
        }
        : null
}

// Creates the Y rotation matrix for the heading and multiplies both to return the combined rotation matrix.
export function getFloorWithHeadingRotMat(heading: number, rot: Matrix3x3) {
  const headMat = makeRotationY(heading)
  const rotWithHeading = multiplyMatrices3x3([
      [...rot[0]],
      [...rot[2]],
      [-rot[1][0], -rot[1][1], -rot[1][2]],
  ], headMat)

  return rotWithHeading
}

// Project given position (on a wall) down to the floor.
export function projectWallPosOnFloor(position: Point3Pod, wallPlane: PlaneType): PointSampleResult {
  const floor = getFloorPlane()
  const result = {
    position: new Point3(position.x, position.y, position.z),
    plane: wallPlane,
  }
  if (!floor) {
    return result
  }

  const vertical = { dx: wallPlane.rot[1][0], dy: wallPlane.rot[1][1], dz: wallPlane.rot[1][2] }
  const projected = projPtToPlane(position, vertical, floor)
  if (!projected) {
    return result
  }

  result.position = projected

  // Small padding to allow the resulting point not to fail is3DWallPointVisible, which can happen when it
  // lay strictly on the planes intersection line.
  const padding = 0.01
  result.position.y = projected.y + padding
  return result
}
