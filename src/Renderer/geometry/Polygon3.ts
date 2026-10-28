/*
 * Polygon3
 */
import * as THREE from 'three'
import { epsilon } from 'Renderer/utils/NumericUtils'
import { checkEdgeCrossPlane } from './PolygonUtils'

// Edges of triangles in triangulated Polygon3.
type Poly3TriangleEdge = {
    line: [THREE.Vector3, THREE.Vector3];
    count: number;  // 1 for exterior edges and 2 for interior edges.
}

// Sort colinear intersections so that they all appear in sequence along their direction
// of colinearity. Note that the specific left-right or right-left order cannot be
// guaranteed, only they they appear in monotonic succession.
export function sortIntersection(intersections: { p: THREE.Vector3, entering: boolean }[]) {
    if (intersections.length < 3) {
        return;
    }

    // Find the biggest span from p0 to any other intersection point. It's not necessarily
    // the biggest overall span, but it will do.
    const p0 = intersections[0].p;
    let k = 0;
    let maxDist = 0;
    for (let i = 1; i < intersections.length; i += 1) {
        const d = p0.distanceToSquared(intersections[i].p);
        if (d > maxDist) {
            k = i;
            maxDist = d;
        }
    }

    // Build a tangent vector from the span we found above.
    const tangent = p0.clone().sub(intersections[k].p);

    // Use that tangent vector to order all the intersection points along it's direction.
    const q0 = intersections[0].p;
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    intersections.sort((i1, i2) => {
        v1.subVectors(i1.p, q0);
        v2.subVectors(i2.p, q0);

        const d1 = v1.dot(tangent);
        const d2 = v2.dot(tangent);
        return Math.sign(d1 - d2);
    });

    // Now we have all the colinear points in order, we remove enter-exit pairs that are coinciding.
    // because the order of these is undefined and their length = 0.
    const subseq = [...intersections]
    while (subseq.length > 1) {
        const i0 = subseq[0]
        const match = subseq.find(v => 
            (v.entering !== i0.entering) && 
            (v.p.distanceTo(i0.p) <= epsilon))

        subseq.splice(0, 1)
        if (match)
        {
            subseq.splice(subseq.indexOf(match), 1)
            intersections.splice(intersections.indexOf(i0), 1)
            intersections.splice(intersections.indexOf(match), 1)
        }
    }
}

// Planar 3D polygon, possibly triangulated embedded on a plane in 3-space.
// If the polygon is triangulated, it may have holes.
export class Polygon3 {
    // The basis unit vectors for the plane embedding the polygon.
    xAxis: THREE.Vector3;

    yAxis: THREE.Vector3;

    zAxis: THREE.Vector3;

    // The polygon vertices.
    vertices: THREE.Vector3[] = [];

    // Triangle indices, if the polygon is triangulated, with each successive group of
    // 3 indices representing the vertices of one triangle.
    indices?: number[];

    // Create a Polygon3 from polygon data in the scene manifest. The polygon's 2D
    // vertices are mapped to world space to form the Polygon3's 3D vertices.
    static CreateFromManifestPolygon(polyData: { [key: string]: unknown }): Polygon3 {
        const poly3 = new Polygon3();

        // Get the polygon local-to-world matrix.
        const transform = polyData.transform as number[][];
        const modelMat = new THREE.Matrix4();
        modelMat.fromArray(transform.flat());
        modelMat.transpose();

        // Map the polygon vertices to world space.
        const parameters = polyData.parameters as { [key: string]: unknown };
        const verts2D = parameters.vertices as [number, number][];
        poly3.vertices = verts2D.map(
            v => (new THREE.Vector3(v[0], v[1], 0)).applyMatrix4(modelMat)
        );

        // Grab the optional indices.
        poly3.indices = parameters.indices as number[] | undefined;

        // Finally get the embedding plane basis from the matrix.
        modelMat.extractBasis(poly3.xAxis, poly3.yAxis, poly3.zAxis);

        return poly3;
    }

    private constructor() {
        this.xAxis = new THREE.Vector3;
        this.yAxis = new THREE.Vector3;
        this.zAxis = new THREE.Vector3;
    }

    // Find all intersections of the polygon with the plane defined by normal vector n
    // and point on plane q. Each intersection consists of a 3D point p, in polygon
    // coordinate-space, and boolean entering that indicates whether the polygon enters
    // or exists the plane at that point.
    findIntersectionsWithPlane(
        plane: { n: THREE.Vector3, q: THREE.Vector3 },
        sort: boolean): { p: THREE.Vector3, entering: boolean }[] {

        let intersections = [];
        if (!this.indices || this.indices.length === 0) {
            intersections = this.findIntersectionsWithPolygonNotTriangulated(plane);
        } else {
            intersections = this.findIntersectionsWithTriangulatedPolygon(plane);
        }

        if (sort) {
            sortIntersection(intersections);
        }

        return intersections;
    }

    // Gather and return a list of all the polygon's exterior edges. The list has the form
    // [vi, vj], [vn, vk], ... The edges are presented in no particular order; but can be
    // sorted in a cyclic manner if specified. This function works with triangulated and 
    // non-triangulated polygons.
    gatherExteriorEdges(sort: boolean): [THREE.Vector3, THREE.Vector3][] {
        const exteriorEdges: [THREE.Vector3, THREE.Vector3][] = [];

        // Check whether we're dealing with a triangulated polygon.
        if (this.indices) {
            // The exterior edges are those triangle edges that have a count of one.
            // (Are shared by only one triangle.) For example, in the figure below,
            // edge [0, 2] is interior, while all other edges are exterior:
            //  1          0
            //   +--------+
            //   |      / |
            //   |    /   |
            //   |  /     |
            //   |/       |
            //   +--------+
            //  2          3
            const allEdges = this.gatherTriangleEdges();
            allEdges.forEach((value) => {
                if (value.count === 1)
                    exteriorEdges.push(value.line);
            });
        } else {
            // Build edges by walking the vertices along the polygon, [v0, v1], ...
            // [vn-1, vn].
            this.vertices.forEach((v, i) => {
                if (i === this.vertices.length - 1) {
                    exteriorEdges.push([v, this.vertices[0]]);
                } else {
                    exteriorEdges.push([v, this.vertices[i + 1]]);
                }
            });
        }

        if (sort) {
            let nextVertex = exteriorEdges[0][1];
            exteriorEdges.forEach((currentEdge, i) => {
                const iNext = exteriorEdges.findIndex(edge => edge !== currentEdge && edge.includes(nextVertex));
                const nextEdge = exteriorEdges[iNext];

                if (nextEdge[1].equals(nextVertex)) {
                    nextEdge.reverse();
                }

                const iIncrement = (i + 1) % exteriorEdges.length;
                exteriorEdges[iNext] = exteriorEdges[iIncrement];
                exteriorEdges[iIncrement] = nextEdge;
                nextVertex = nextEdge[1];
            });
        }

        return exteriorEdges;
    }

    // Gather and return all the polygon's triangle edges. Each edge consists of vertex
    // v0, v1 and a count, which indicates by how many triangles the edge is shared.
    // Count is either 1 for boundary (exterior) edges and 2 for interior edges.
    gatherTriangleEdges(): Map<string, Poly3TriangleEdge> {
        const edges: Map<string, Poly3TriangleEdge> = new Map();
        if (!this.indices) {
            return edges;
        }

        const numIndices = this.indices.length;
        const numTriangles = numIndices / 3;
        for (let i = 0; i < numTriangles; i += 1) {
            const tri = [
                this.indices[3 * i + 0],
                this.indices[3 * i + 1],
                this.indices[3 * i + 2],
            ];

            this.fixTriangleWinding(tri);

            const lines = [
                [tri[0], tri[1]],
                [tri[1], tri[2]],
                [tri[2], tri[0]],
            ];

            lines.forEach(line => {
                const ordered = [...line].sort();
                const key = `${ordered[0]},${ordered[1]}`;

                let e = edges.get(key);
                if (e) {
                    e.count += 1;
                } else {
                    e = {
                        line: [
                            this.vertices[line[0]],
                            this.vertices[line[1]],
                        ],
                        count: 1
                    }

                    edges.set(key, e);
                }
            });
        }

        return edges;
    }

    // Find and return the index of the first polygon vertex that lies above the given
    // plane. The plane is defined by normal vector n and point-on-the-plane q. A point
    // p is considered above the plane if it lies on the side where n is pointing away.
    // Returns -1 if all vertices are below the plane.
    private findFirstVertexAbovePlane(plane: { n: THREE.Vector3, q: THREE.Vector3 }): number {
        const count = this.vertices.length;
        for (let i = 0; i < count; i += 1) {
            const v = this.vertices[i]
            const dv = (new THREE.Vector3()).subVectors(v, plane.q)
            const isAboveFloor = (dv.dot(plane.n) > 0)

            if (isAboveFloor) {
                return i;
            }
        }
        return -1;
    }

    // Make sure that the triangle defined by the given three indices is oriented CCW. I.e.
    // it's normal points in the same direction as the embedding plane's normal.
    private fixTriangleWinding(tri: number[]) {
        const va = this.vertices[tri[0]];
        const vb = this.vertices[tri[1]];
        const vc = this.vertices[tri[2]];

        const s0 = (new THREE.Vector3()).subVectors(vb, va);
        const s1 = (new THREE.Vector3()).subVectors(vc, va);
        const cn = (new THREE.Vector3()).crossVectors(s0, s1);

        // Skip and assume winding is correct if triangle is degenerate.
        if (cn.length() < 10e-5) return;

        const windingCorrect = (this.zAxis.dot(cn) >= 0);

        /* eslint-disable no-param-reassign */
        if (!windingCorrect) {
            const tmp = tri[0];
            tri[0] = tri[2];
            tri[2] = tmp;
        }
        /* eslint-enable no-param-reassign */
    }

    // Find all intersection of polygon with plane for a non-triangulated polygon.
    private findIntersectionsWithPolygonNotTriangulated(
        plane: { n: THREE.Vector3, q: THREE.Vector3 }): { p: THREE.Vector3, entering: boolean }[] {

        const intersections: { p: THREE.Vector3, entering: boolean }[] = [];

        const q = this.findFirstVertexAbovePlane(plane);
        if (q === -1) {
            return [];
        }

        const vertexCount = this.vertices.length;
        for (let i = 0; i < vertexCount; i += 1) {
            // Form polygon edge (v0, v1) with successive vertices.
            const i0 = (q + i + 0) % vertexCount;
            const i1 = (q + i + 1) % vertexCount;
            const v0 = this.vertices[i0];
            const v1 = this.vertices[i1];

            const cross = checkEdgeCrossPlane([v0, v1], plane);
            if (cross.at === Infinity) {
                return intersections;
            }

            if (cross.cross) {
                const c = v1.clone().sub(v0).multiplyScalar(cross.at).add(v0);
                intersections.push({
                    p: c,
                    entering: cross.entering,
                });
            }
        }

        return intersections;
    }

    // Find all intersection of polygon with plane for a triangulated polygon.
    private findIntersectionsWithTriangulatedPolygon(
        plane: { n: THREE.Vector3, q: THREE.Vector3 }): { p: THREE.Vector3, entering: boolean }[] {

        const intersections: { p: THREE.Vector3, entering: boolean }[] = [];

        const exteriorEdges = this.gatherExteriorEdges(false /* not sorted */);
        const numEdges = exteriorEdges.length;
        for (let i = 0; i < numEdges; i += 1) {
            const line = exteriorEdges[i];
            const cross = checkEdgeCrossPlane(line, plane);

            if (cross.at === Infinity) {
                return intersections;
            }

            if (cross.cross) {
                const c = line[1].clone().sub(line[0]).multiplyScalar(cross.at).add(line[0]);
                intersections.push({
                    p: c,
                    entering: cross.entering,
                });
            }
        }

        return intersections;
    }
}
