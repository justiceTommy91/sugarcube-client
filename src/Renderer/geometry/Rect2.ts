/*
 * Rect2
 */

// 2D axis-aligned rectangle.
export class Rect2 {
    // xMax < xMin or yMax < yMin represents an empty 2D rect.
    xMin = Infinity;

    yMin = Infinity;

    xMax = -Infinity;

    yMax = -Infinity;

    // Create an empty 2D rectangle.
    constructor(xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity) {
        this.xMin = xMin;
        this.yMin = yMin;
        this.xMax = xMax;
        this.yMax = yMax;
    }

    get empty(): boolean {
        return this.xMax < this.xMin || this.yMax < this.yMin;
    }

    get pMin() {
        return { x: this.xMin, y: this.yMin };
    }

    get pMax() {
        return { x: this.xMax, y: this.yMax };
    }

    get midX() {
        return this.empty ? 0 : 0.5 * (this.xMin + this.xMax);
    }

    get midY() {
        return this.empty ? 0 : 0.5 * (this.yMin + this.yMax);
    }

    get width() {
        return this.empty ? 0 : this.xMax - this.xMin;
    }

    get height() {
        return this.empty ? 0 : this.yMax - this.yMin;
    }

    // Expend the rectangle to include point p.
    expand(p: { x: number, y: number }) {
        if (p.x < this.xMin) this.xMin = p.x;
        if (p.y < this.yMin) this.yMin = p.y;
        if (p.x > this.xMax) this.xMax = p.x;
        if (p.y > this.yMax) this.yMax = p.y;
    }

    // Return whether p is inside the rectangle. The rectangle is treated as a closed set.
    isInside(p: { x: number, y: number }): boolean {
        return (this.xMin <= p.x && p.x <= this.xMax && this.yMin <= p.y && p.y <= this.yMax);
    }

    // Make the rectangle empty.
    makeEmpty() {
        this.xMin = Infinity;
        this.yMin = Infinity;
        this.xMax = -Infinity;
        this.yMax = -Infinity;
    }
}
