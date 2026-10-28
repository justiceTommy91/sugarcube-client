/*
 * Vector2 - 2D vector.
 */
import { EPSILON } from "./config";

export class Vector2 {
    dx: number;

    dy: number;

    constructor(dx: number, dy: number) {
        this.dx = dx;
        this.dy = dy;
    }

    clone() {
        return new Vector2(this.dx, this.dy)
    }

    // Return a new vector w = v * s.
    static scale(v: Vector2, s: number): Vector2 {
        return new Vector2(v.dx * s, v.dy * s);
    }

    // Return a new vector w = v1 - v2.
    static minus(v1: Vector2, v2: Vector2): Vector2 {
        return new Vector2(v1.dx - v2.dx, v1.dy - v2.dy);
    }

    // Return the dot-product of <this> with v.
    dot(v: Vector2): number {
        return this.dx * v.dx + this.dy * v.dy;
    }

    // Return the length of <this> squared, |this|^2.
    sqrdLen(): number {
        return this.dx * this.dx + this.dy * this.dy;
    }

    len(): number {
        return Math.sqrt(this.sqrdLen());
    }

    // Scale <this> by s, <this> = <this> * s, and return this.
    scale(s: number): this {
        this.dx *= s;
        this.dy *= s;
        return this;
    }

    // Subtract v from <this>, <this> = <this> - v, and return this.
    minus(v: Vector2): Vector2 {
        this.dx -= v.dx;
        this.dy -= v.dy;
        return this;
    }

    // Add v to <this>, <this> = <this> + v, and return this.
    plus(v: Vector2): Vector2 {
        this.dx += v.dx;
        this.dy += v.dy;
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
        }
        return this;
    }

    // Multiply <this> by -1, and return this
    negate(): this {
        return this.scale(-1)
    }
}

export function toVector2(v: { dx: number, dy: number } | number[]): Vector2 {
    if (Array.isArray(v)) {
        return new Vector2((v.length > 0) ? v[0] : 0, (v.length > 1) ? v[1] : 0);
    }

    return new Vector2(v.dx, v.dy);
}
