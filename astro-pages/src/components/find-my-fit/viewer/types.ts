import type { FurnitureItem } from '@astro-services/furnitureService'

export type NormalizedPoint = [number, number]
export type Stroke = NormalizedPoint[]

export type Dimension = 'width' | 'height' | 'depth'

export type ConnectorLine = {
    from: NormalizedPoint
    to: NormalizedPoint
    /** 0–1 stroke opacity */
    opacity: number
    /** Stroke width in CSS px */
    width: number
}

export type DimensionLabels = {
    surfaceClass: 'wall' | 'floor'
    width: number // In meters.
    height: number // In meters.
    depth: number // In meters.
}

export type Quad = [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint]

export type BoxCorners8 = [
    NormalizedPoint,
    NormalizedPoint,
    NormalizedPoint,
    NormalizedPoint,
    NormalizedPoint,
    NormalizedPoint,
    NormalizedPoint,
    NormalizedPoint,
]

export type EasingFn = (t: number) => number

export type ProductData = FurnitureItem

export type ProductFamily = {
    name: string
    variants: { label: string; data: ProductData }[]
}

export type AnimParams = {
    animDuration: number // ms for commit/snap-back
    snapThresh: number // animation blend ramps up over this fraction of swipe
    eps: number // dead zone for occlusion toggle
    slideX: number // horizontal spread in view-space
    slideY: number // vertical spread in view-space
    viewY: number // vertical offset in view-space
    viewZ: number // depth offset in view-space (distance from camera)
}

export const DEFAULT_ANIM_PARAMS: Readonly<AnimParams> = {
    animDuration: 400,
    snapThresh: 0.35,
    eps: 0.15,
    slideX: 0.5,
    slideY: 0.5,
    viewY: 0,
    viewZ: 0,
}

export type { AnimationOverride } from '@gatsby/Renderer/geomviewer/geom_types'

// UI-level viewer mode, separate from the carousel's internal drawing/viewing mode.
// Search state is tracked separately via useFurnitureSearchByDimensions. Phases
// only represent what the user is doing, not whether a request is in flight.
export type ViewerMode =
    | { phase: 'drawing' }
    | { phase: 'adjusting' }
    | { phase: 'viewing' }
    | { phase: 'editing'; tool: 'resize' | 'erase' }
