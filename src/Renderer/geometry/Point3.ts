/*
 * Point3 - 3D point.
 */
import { Vector3, Vector3Pod } from 'Renderer/geometry/Vector3'
import type { Matrix4x4 } from "Renderer/geomviewer/geom_types"

// A plain-old-data 3D point type for added flexibility.
export type Point3Pod = { x: number, y: number, z: number }

// A 3D affine Point class.
export class Point3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // Return new point q = p + v.
    static add(p: Point3Pod, v: Vector3Pod): Point3 {
        return new Point3(p.x + v.dx, p.y + v.dy, p.z + v.dz);
    }

    // Return new point q = p - v.
    static sub(p: Point3Pod, v: Vector3Pod): Point3 {
        return new Point3(p.x - v.dx, p.y - v.dy, p.z - v.dz);
    }

    // Set <this> to (x, y, z) and return <this>.
    set(x: number, y: number, z: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(p: Point3Pod): this {
        this.x = p.x;
        this.y = p.y;
        this.z = p.z;
        return this;
    }

    clone() {
        return new Point3(this.x, this.y, this.z)
    }

    // Return vector w = <this> - p.
    minus(p: Point3Pod): Vector3 {
        return new Vector3(this.x - p.x, this.y - p.y, this.z - p.z);
    }

    // Set <this> = <this> + v and return <this>.
    plus(v: Vector3Pod): this {
        this.x += v.dx;
        this.y += v.dy;
        this.z += v.dz;
        return this;
    }

    // Set <this> = <this> - v and return <this>.
    sub(v: Vector3Pod): Point3 {
        this.x -= v.dx;
        this.y -= v.dy;
        this.z -= v.dz;
        return this;
    }

    // Return squared distance from this point to p.
    distanceToSq(p: Point3Pod) {
        const dx = p.x - this.x
        const dy = p.y - this.y
        const dz = p.z - this.z
        return dx * dx + dy * dy + dz * dz
    }

    // Return distance from this point to p.
    distanceTo(p: Point3Pod) {
        return Math.sqrt(this.distanceToSq(p))
    }

    mulMat4(m: Matrix4x4): this {
        const x = this.x
        const y = this.y
        const z = this.z

        const w = 1 / (m[0][3] * x + m[1][3] * y + m[2][3] * z + m[3][3])

        this.x = (m[0][0] * x + m[1][0] * y + m[2][0] * z + m[3][0]) * w
        this.y = (m[0][1] * x + m[1][1] * y + m[2][1] * z + m[3][1]) * w
        this.z = (m[0][2] * x + m[1][2] * y + m[2][2] * z + m[3][2]) * w
        return this
    }

    mulScalar(s: number): this {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    min(p: Point3Pod): this {
        this.x = Math.min(this.x, p.x)
        this.y = Math.min(this.y, p.y)
        this.z = Math.min(this.z, p.z)
        return this
    }

    max(p: Point3Pod): this {
        this.x = Math.max(this.x, p.x)
        this.y = Math.max(this.y, p.y)
        this.z = Math.max(this.z, p.z)
        return this
    }
}

export function toPoint3(xyz: { x: number, y: number, z: number } | number[]): Point3 {
    if (Array.isArray(xyz)) {
        return new Point3(
            (xyz.length > 0) ? xyz[0] : 0,
            (xyz.length > 1) ? xyz[1] : 0,
            (xyz.length > 2) ? xyz[2] : 0);
    }

    return new Point3(xyz.x, xyz.y, xyz.z);
}
