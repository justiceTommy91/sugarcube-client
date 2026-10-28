import * as THREE from 'three'
import * as constants from 'Planner/planner_constants'
import type { WallElementSizeMetadata, InteractableItemType } from 'Planner/api_types'

export type ColorMap = Map<string, [number, number, number]>

export type WallInfo = {
    id: string
    originalLength: number
    length: number
    color: string
    vertex1Pos: THREE.Vector3
    vertex2Pos: THREE.Vector3
    vertex1Id: string
    vertex2Id: string
    neighborWallIds: [string, string]
}

export type VertexInfo = {
    id: string
    position: THREE.Vector3
    wallIds: [string, string]
    neighborVertexIds: [string, string]
}

export type MaybeVector3 = THREE.Vector3 | undefined
export type Corners4 = [MaybeVector3, MaybeVector3, MaybeVector3, MaybeVector3]
export type Corners8 = [
    MaybeVector3, MaybeVector3, MaybeVector3, MaybeVector3,
    MaybeVector3, MaybeVector3, MaybeVector3, MaybeVector3,
]


export type WallElementType = typeof constants.WALL_ELEMENT_TYPE_DOOR |
    typeof constants.WALL_ELEMENT_TYPE_WINDOW

export type WallElementInfo = {
    elementId: string
    currentSize: THREE.Vector2
    sizeMetadata?: WallElementSizeMetadata
    wallId: string
    class: WallElementType
    assetUuid: string | undefined // For elements present in the room template, assetUuid is undefined.
    centerWorldPos: THREE.Vector3
    corners: Corners4,
    roomIntersections: [MaybeVector3, MaybeVector3, MaybeVector3, MaybeVector3],
}

export type CompositionItemInfo = {
    itemId: string
    worldPosition: THREE.Vector3
    corners: Corners8,
}

export type RayCastResultObjectType = 'floor' | 'ceiling' | InteractableItemType

export type RayCastResult = {
    objectType: RayCastResultObjectType
    id: string, // Surface id or global wall element id.
    worldPosition: THREE.Vector3
    distance: number
}

export type OrbitCameraState = typeof constants.ORBIT_CAMERA_STATE_ENABLED
    | typeof constants.ORBIT_CAMERA_STATE_DISABLED
    | typeof constants.ORBIT_CAMERA_STATE_DRAGGING

export type InputState = typeof constants.INPUT_STATE_IDLE |
    typeof constants.INPUT_STATE_DRAGGING |
    typeof constants.INPUT_STATE_DRAGGING_EXTERNAL

export type LightaGenerationSettings = {
    lightIntensityPerM3: number
    roomIntensityFactor: number
    gridSize: number
    maxLampCount: number
    greedySamplingMinLampSize: number
    greedySamplingGridSize: number
    autoLightsRefresh: boolean
}

export type WallMoveMethod = 'method1' | 'method2'

export type PlannerSettings = {
    lights: LightaGenerationSettings
    wallMoveMethod: WallMoveMethod
}
export type PartialPlannerSettings = Partial<PlannerSettings>

export type BoundableSurfaceType = 'floor' | 'wall'
export type RefinedParentType = BoundableSurfaceType | 'item'

export type FurnitureSaveData = {
    uniqueId: string
    x: number
    y: number
    z: number
    heading: number
    headingI: number
    headingJ: number
    headingK: number
    parentType: RefinedParentType
    parentUniqueId: string
}

export type WallElementAxisDraggingState = typeof constants.WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED
    | typeof constants.WALL_ELEMENT_DRAGGING_AXIS_STATE_ENABLED
    | typeof constants.WALL_ELEMENT_DRAGGING_AXIS_STATE_SNAPPED

export type WallElementDraggingParams = {
    startWallId: string
    startElementPos2D: THREE.Vector2
    dragStartOffset2D: THREE.Vector2
    prevElementPos2D: THREE.Vector2
    prevWallId: string
    horizontalAxisState: WallElementAxisDraggingState
    verticalAxisState: WallElementAxisDraggingState
}

export type MutationFailureReason = typeof constants.MUTATION_FAIL_REASON_UNKNOWN
    | typeof constants.MUTATION_FAIL_REASON_WRONG_INPUT
    | typeof constants.MUTATION_FAIL_REASON_WALL_MIN_LENGTH
    | typeof constants.MUTATION_FAIL_REASON_WALL_ELEMENTS
    | typeof constants.MUTATION_FAIL_REASON_SELF_INTERSECTION

export type WallsGraphMutationResult = {
  success: true
} | {
  success: false
  obstacleWallId?: number
  reason: MutationFailureReason
}
