import * as THREE from "three"

// Floating-point tolerance for the placing system.
export const PLACING_SYSTEM_TOLERANCE = 0.000001
// World space Y floor-offset to consider baseboards.
export const BASEBOARD_WORLD_HEIGHT_OFFSET = 0.5

export const COS_45 = Math.cos(45.0 * THREE.MathUtils.DEG2RAD)
