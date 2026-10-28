/*
 * Point2 - 2D point.
 */
import { Vector2 } from 'Renderer/geometry/Vector2'

// A plain-old-data 2D point type for added flexibility.
export type Point2Pod = { x: number, y: number }

export class Point2 {
    x: number;

    y: number;

    constructor(x: number, y: number) {
        this.x = x;

        this.y = y;
    }

    // Return new point q = p + v.
    static add(p: Point2Pod, v: Vector2): Point2 {
        return new Point2(p.x + v.dx, p.y + v.dy);
    }

    // Set <this> to (x, y) and return <this>.
    set(x: number, y: number): Point2 {
        this.x = x;
        this.y = y;
        return this;
    }

    copy(p: Point2Pod): this {
        this.x = p.x;
        this.y = p.y;
        return this;
    }

    clone() {
        return new Point2(this.x, this.y)
    }

    // Return vector w = <this> - p.
    minus(p: Point2Pod): Vector2 {
        return new Vector2(this.x - p.x, this.y - p.y);
    }

    // Set <this> = <this> + v and return <this>.
    plus(v: Vector2): Point2 {
        this.x += v.dx;
        this.y += v.dy;
        return this;
    }

    min(v: Point2Pod): Point2 {
        this.x = Math.min(this.x, v.x);
        this.y = Math.min(this.y, v.y);
        return this;
    }

    max(v: Point2Pod): Point2 {
        this.x = Math.max(this.x, v.x);
        this.y = Math.max(this.y, v.y);
        return this;
    }

    // Return squared distance from this point to p.
    distanceToSq(p: Point2Pod) {
        const dx = p.x - this.x
        const dy = p.y - this.y
        return dx * dx + dy * dy
    }

    // Return distance from this point to p.
    distanceTo(p: Point2Pod) {
        return Math.sqrt(this.distanceToSq(p))
    }
}

export function toPoint2(xy: Point2Pod | number[]): Point2 {
    if (Array.isArray(xy)) {
        return new Point2((xy.length > 0) ? xy[0] : 0, (xy.length > 1) ? xy[1] : 0);
    }

    return new Point2(xy.x, xy.y);
}
