import type { PointXYZ } from '@gatsby/Renderer/geomviewer/geom_types'
import { easeOutQuint, easeOutCubic, easeInOutCubic, linear, clamp, smootherstep } from '@gatsby/Renderer/utils/math_utils'

export { easeOutQuint, easeOutCubic, easeInOutCubic, linear, clamp, smootherstep }

// Handles negative indices correctly (e.g. wrapIndex(-1, 5) === 4).
export function wrapIndex(idx: number, count: number): number {
    return ((idx % count) + count) % count
}

export function lerpScale(factor: number, target: PointXYZ): PointXYZ {
    return {
        x: 1 + (target.x - 1) * factor,
        y: 1 + (target.y - 1) * factor,
        z: 1 + (target.z - 1) * factor,
    }
}

export function lerpOpacity(factor: number, target: number): number {
    return 1.0 + (target - 1.0) * factor
}
