/*
 * Vector3 - 3D vector.
 */

import { Matrix3x3 } from "Renderer/geomviewer/geom_types";
import { EPSILON } from "./config";
import type { Point3Pod } from './Point3'
import type { QuaternionPod } from "./Quaternion"

// A plain-old-data 3D vector type for added flexibility.
export type Vector3Pod = { dx: number, dy: number, dz: number }

// A 3D affine vector class.
export class Vector3 {
    dx: number;
    dy: number;
    dz: number;

    constructor(dx: number, dy: number, dz: number) {
        this.dx = dx;
        this.dy = dy;
        this.dz = dz;
    }

    // Return vector p2 - p1.
    static vecP1toP2(p1: Point3Pod, p2: Point3Pod): Vector3 {
        return new Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    }

    // Return a new vector w = v * s.
    static scale(v: Vector3Pod, s: number): Vector3 {
        return new Vector3(v.dx * s, v.dy * s, v.dz * s);
    }

    // Return a new vector w = v1 + v2.
    static plus(v1: Vector3Pod, v2: Vector3Pod): Vector3 {
        return new Vector3(v1.dx + v2.dx, v1.dy + v2.dy, v1.dz + v2.dz);
    }

    // Return a new vector w = v1 - v2.
    static minus(v1: Vector3Pod, v2: Vector3Pod): Vector3 {
        return new Vector3(v1.dx - v2.dx, v1.dy - v2.dy, v1.dz - v2.dz);
    }

    // Return a new vector w, equal to cross product v1 x v2.
    static cross(v1: Vector3Pod, v2: Vector3Pod): Vector3 {
        return new Vector3(v1.dy * v2.dz - v1.dz * v2.dy,
            v1.dz * v2.dx - v1.dx * v2.dz,
            v1.dx * v2.dy - v1.dy * v2.dx);
    }

    // Return a new vector, a copy of <this>.
    clone() {
        return new Vector3(this.dx, this.dy, this.dz)
    }

    // Set <this> to (dx, dy, dz) and return <this>.
    set(dx: number, dy: number, dz: number): this {
        this.dx = dx;
        this.dy = dy;
        this.dz = dz;
        return this;
    }

    copy(v: Vector3Pod): this {
        this.dx = v.dx;
        this.dy = v.dy;
        this.dz = v.dz;
        return this;
    }

    // Return the dot-product of <this> with v.
    dot(v: Vector3Pod): number {
        return this.dx * v.dx + this.dy * v.dy + this.dz * v.dz;
    }

    cross(v: Vector3Pod) {
        const { dx, dy, dz } = this
        this.dx = dy * v.dz - dz * v.dy
        this.dy = dz * v.dx - dx * v.dz
        this.dz = dx * v.dy - dy * v.dx
        return this
    }

    len(): number {
        return Math.sqrt(this.sqrdLen())
    }

    // Return the length of <this> squared, |this|^2.
    sqrdLen(): number {
        return this.dx * this.dx + this.dy * this.dy + this.dz * this.dz;
    }

    // Scale <this> by s, <this> = <this> * s, and return this.
    scale(s: number): this {
        this.dx *= s;
        this.dy *= s;
        this.dz *= s;
        return this;
    }

    // Multiply <this> by -1, and return this
    negate(): this {
        return this.scale(-1)
    }

    // Adds v to <this>, <this> = <this> + v, and return this.
    plus(v: Vector3Pod): this {
        this.dx += v.dx;
        this.dy += v.dy;
        this.dz += v.dz;
        return this;
    }

    // Subtract v from <this>, <this> = <this> - v, and return this.
    minus(v: Vector3Pod): this {
        this.dx -= v.dx;
        this.dy -= v.dy;
        this.dz -= v.dz;
        return this;
    }

    // Normalize <this> in place and return this. A no-op if the vector length
    // is less than EPSILON.
    normalize(): this {
        let l = this.sqrdLen();
        if (l >= EPSILON) {
            l = 1 / Math.sqrt(l);
            this.dx *= l;
            this.dy *= l;
            this.dz *= l;
        }
        return this;
    }

    applyQuaternion(q: QuaternionPod): this {
        const x = this.dx;
        const y = this.dy;
        const z = this.dz;
        const qx = q.x;
        const qy = q.y;
        const qz = q.z;
        const qw = q.w;

        // calculate quat * vector
        const ix = qw * x + qy * z - qz * y;
        const iy = qw * y + qz * x - qx * z;
        const iz = qw * z + qx * y - qy * x;
        const iw = - qx * x - qy * y - qz * z;

        // calculate result * inverse quat
        this.dx = ix * qw + iw * - qx + iy * - qz - iz * - qy;
        this.dy = iy * qw + iw * - qy + iz * - qx - ix * - qz;
        this.dz = iz * qw + iw * - qz + ix * - qy - iy * - qx;

        return this;
    }

    mulMat(m: Matrix3x3): this {
        const x = this.dx
        const y = this.dy
        const z = this.dz
        this.dx = x * m[0][0] + y * m[1][0] + z * m[2][0]
        this.dy = x * m[0][1] + y * m[1][1] + z * m[2][1]
        this.dz = x * m[0][2] + y * m[1][2] + z * m[2][2]
        return this
    }

    isEqual(v: Vector3Pod): boolean {
        return this.dx === v.dx && this.dy === v.dy && this.dz === v.dz;
    }

    isEpsEqual(v: Vector3Pod): boolean {
        return Math.abs(this.dx - v.dx) <= EPSILON &&
            Math.abs(this.dy - v.dy) <= EPSILON &&
            Math.abs(this.dz - v.dz) <= EPSILON;
    }

    angleTo(v: Vector3): number {
        const denominator = Math.sqrt(this.sqrdLen() * v.sqrdLen())
        if (denominator === 0) {
            return Math.PI / 2
        }

        const theta = this.dot(v) / denominator
        // clamp, to handle numerical problems
        return Math.acos(Math.max(-1, Math.min(1, theta)))
    }

    projectOn(v: Vector3): Vector3 {
        const denominator = v.sqrdLen()
        if (denominator === 0) {
            return this.set(0, 0, 0)
        }
        const scalar = v.dot(this) / denominator
        return this.copy(v).scale(scalar)
    }
}

export function toVector3(v: Vector3Pod | number[]): Vector3 {
    if (Array.isArray(v)) {
        return new Vector3(
            (v.length > 0) ? v[0] : 0,
            (v.length > 1) ? v[1] : 0,
            (v.length > 2) ? v[2] : 0);
    }

    return new Vector3(v.dx, v.dy, v.dz);
}
