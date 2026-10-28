/* eslint-disable no-nested-ternary */
import type {
    FurnitureItemParameters,
    Placement,
    PointXYZ,
    SceneInfo,
    StackableSurfaceParameters,
    ViewerSettings,
} from 'Renderer/geomviewer'
import { PlacingBehavior, PlacingOptions, ToneMapType } from 'Renderer/geomviewer/geom_constants'
import { allScenesAreStandard3D, isRoomBuilderScene, sceneHasGeneratedEnvmap } from 'models/scenes/utils'
import { cutoffDate } from 'Renderer/rendering/envmap_rendering_utils'
import { SMARTA_STATUS_PENDING } from 'constants/stateTypes'
import { getLightIntensitiesLists } from './lightUtils'
import { isWallPlaceableOnly, isWallOrFloor, isWallAndFloor, isSnapRotatable } from './placeables'

// Local type definition for placeable info in furniture data.
type PlaceableType = {
    version: number
    combinations: number[][]
    anchors: {
        category: 'floor' | 'wall'
        constraint?: string
        position?: number[]
        matrixModel?: number[][]
    }[]
}

// Local type definition for placement info in furniture data.
type PlacementType = {
    x: number | null
    y: number | null
    z?: number
    headingI?: number
    headingJ?: number
    headingK?: number
    heading: number
    parentIdOrSurface?: string
    parentAttachment?: number
    placement?: Placement
}

// Local type definition for the info required to extract placement for the duplicated item
type PlacementForDuplicatedProps = {
    isAddedFromDuplicate?: boolean
    parentAttachment?: number
}

// Verify that p is an object of type PlaceableType and return it as an object
// of that type if so. Otherwise return undefined.
function asPlaceable(p: unknown): PlaceableType | undefined {
    if (p && (p as PlaceableType).anchors !== undefined && (p as PlaceableType).combinations !== undefined) {
        return p as PlaceableType
    }
    return undefined
}

// Verify that c is an object containing combinable-placement information and return
// it as an object type if so. Otherwise return undefined.
function asCombinablePlacement(c: unknown): FurnitureItemParameters['combinablePlacement'] {
    if (c !== undefined) {
        const combinablePlacement = c as FurnitureItemParameters['combinablePlacement']
        if (combinablePlacement && 'parentId' in combinablePlacement && 'localTransform' in combinablePlacement) {
            return combinablePlacement
        }
    }

    return undefined
}

// Construct and return a bit-vector of placing options from placeable data information.
function placementFromPlaceableData(placeableData?: PlaceableType, geometryTypes?: string[]): PlacingOptions {
    /* eslint-disable no-bitwise */
    let placingOptions = 0
    if (isWallPlaceableOnly(placeableData)) {
        placingOptions |= PlacingOptions.WALL_ONLY
    }
    if (isWallOrFloor(placeableData, geometryTypes)) {
        placingOptions |= PlacingOptions.WALL_OR_FLOOR
    }
    if (isWallAndFloor(placeableData)) {
        placingOptions |= PlacingOptions.WALL_AND_FLOOR
    }
    if (isSnapRotatable(placeableData)) {
        placingOptions |= PlacingOptions.SNAP_ROTATABLE
    }

    return placingOptions
    /* eslint-enable no-bitwise */
}

export function swapPlacingBehaviour(
    swapOutBehavior: PlacingBehavior,
    swapInPlaceables: PlaceableType,
    geometryTypes?: string[],
) {
    const canGoOnWall =
        isWallPlaceableOnly(swapInPlaceables) ||
        isWallOrFloor(swapInPlaceables, geometryTypes) ||
        isWallAndFloor(swapInPlaceables)
    const canGoOnFloor = !(isWallPlaceableOnly(swapInPlaceables) || isWallAndFloor(swapInPlaceables))
    if (swapOutBehavior === PlacingBehavior.ON_WALL) {
        return canGoOnWall ? PlacingBehavior.ON_WALL : PlacingBehavior.ON_FLOOR
    }
    return canGoOnFloor ? PlacingBehavior.ON_FLOOR : PlacingBehavior.ON_WALL
}

// Verify that stackableData, of unknown type is a valid array of stackable-surface parameters.
// Returns an array of validated stackable-surface parameters or undefined.
function validateStackablesData(stackablesData: unknown): StackableSurfaceParameters[] | undefined {
    if (!stackablesData || !Array.isArray(stackablesData)) {
        return undefined
    }

    const stackables = stackablesData as StackableSurfaceParameters[]
    const validatedStackables = stackables.filter((stackable) => {
        if (!stackable.id || !stackable.transform || !stackable.parameters) {
            return false
        }
        if (!Array.isArray(stackable.transform)) {
            return false
        }
        if (stackable.parameters.type === 'circle' && !stackable.parameters.radius) {
            return false
        }
        if (stackable.parameters.type === 'polygon') {
            return Array.isArray(stackable.parameters.vertices)
        }
        return true
    })

    return validatedStackables
}

// Returns the legacy placing behavior hint of a furniture item, see hint below.
function getplacingBehaviorHint(placeables?: PlaceableType, anchorCombinationIndex?: number): string | undefined {
    if (!placeables || anchorCombinationIndex === undefined) {
        return undefined
    }
    if (isWallAndFloor(placeables)) {
        return PlacingBehavior.WALL_AND_FLOOR
    }

    const anchorIndex = placeables.combinations[anchorCombinationIndex]?.[0]
    const anchor = placeables.anchors[anchorIndex]
    if (anchor?.category === 'wall') {
        return PlacingBehavior.ON_WALL
    }

    return PlacingBehavior.ON_FLOOR
}

// Helper function. Constructs and returns the 3d placement object from the 3d composition data information.
export function extractPlacementFrom3dCompositionProps(props: PlacementType): Placement | undefined {
    if (props.parentAttachment === undefined || !props.parentIdOrSurface) {
        return undefined
    }
    if (
        !(
            typeof props.x === 'number' &&
            typeof props.y === 'number' &&
            typeof props.z === 'number' &&
            typeof props.headingI === 'number' &&
            typeof props.headingJ === 'number' &&
            typeof props.headingK === 'number' &&
            typeof props.heading === 'number'
        )
    ) {
        return undefined
    }

    const placement: Placement = {
        kind: 'location3Legacy',
        location3: {
            localPos: {
                x: props.placement?.location3.localPos.x ?? props.x,
                y: props.placement?.location3.localPos.y ?? props.y,
                z: props.placement?.location3.localPos.z ?? props.z,
            },
            bindTo: `${props.parentAttachment}`,
        },
        rotation: [
            props.placement?.rotation?.[0] ?? props.headingI,
            props.placement?.rotation?.[1] ?? props.headingJ,
            props.placement?.rotation?.[2] ?? props.headingK,
            props.placement?.rotation?.[3] ?? props.heading,
        ],
        parentId: props.parentIdOrSurface,
    }

    return placement
}

// Helper function. Constructs and returns the 3d placement object the model needs for item duplication.
export function extractPlacementForDuplicateItem(props: PlacementForDuplicatedProps) {
    if (!props.isAddedFromDuplicate) {
        return undefined
    }

    return {
        location3: {
            bindTo: props.parentAttachment,
        },
    }
}

// Helper function. Constructs and returns an object of type GeomViewer.FurnitureItemParameters
// from react furniture-item properties.
export function furniturePropsToFurnitureItemParams(props: Record<string, unknown>): FurnitureItemParameters {
    const placeables = asPlaceable(props.placeables)

    const params: FurnitureItemParameters = {
        id: String(props.id || ''),
        globalProductId: props.globalProductId as string,

        modelUrl: props.modelUrl as string,

        min: props.min as PointXYZ,
        max: props.max as PointXYZ,
        scale: props.scale as number,
        rotX: props.rotX as number,
        heading: props.heading as number,

        isRug: props.isRug as boolean,
        canStack: !!props.stacks || !!props.canStack,
        hasTallLegs: props.hasTallLegs as boolean,
        isCubicStructure: props.isCubicStructure as boolean,

        stackables: validateStackablesData(props.stackables),
        rotatedStackables: validateStackablesData(props.stackablesAlternate),

        uncompressedModelSize: props.uncompressedModelSize as number,

        mirrorOption: props.mirrorType as FurnitureItemParameters['mirrorOption'],
        shouldMirrorItem: !!props.mirrorOptionEnabled,

        placingOptions: placementFromPlaceableData(placeables, props.geometryTypes as string[]),

        stackOnSurfaceId: props.stackedPlane as string,

        combinablePlacement: asCombinablePlacement(props.combinablePlacement),

        metadata: props.metadata,

        placeables: placeables as FurnitureItemParameters['placeables'],
        anchorCombinationIndex: props.anchorCombinationIndex as number,

        // Legacy prop. Behavior hint was removed from some environments yet legacy web client
        // depends on it for positioning, so it's generated here from the anchors combinations.
        placingBehaviorHint:
            props.placingBehavior && props.placingBehavior !== PlacingBehavior.NONE
                ? (props.placingBehavior as PlacingBehavior)
                : (getplacingBehaviorHint(placeables, props.anchorCombinationIndex as number) as PlacingBehavior),

        // Legacy prop. It should go away in favor of placingBehaviorHint above. However, it
        // looks like it's still needed to correctly deal with potential bad data from backend.
        swappedOutPlacingBehavior: props.swappedOutPlacingBehavior as PlacingBehavior,

        isAddedFromDuplicate: !!props.isAddedFromDuplicate,

        swappedInItem: false,

        hasSmartaPlacement: !!props.smartaPlacement,

        pendingSmartaPlacement: props.smartaPlacementState === SMARTA_STATUS_PENDING,

        isNoninteractable: !!props.isNoninteractable,
    }

    return params
}

// Returns the scene dependent debug settings. These settings
// override the initial settings on scene initialization.
export function getSceneDependentInitialDebugSettings(previewSettings: ViewerSettings, scene: SceneInfo) {
    const isStandard3DScene = allScenesAreStandard3D(scene)
    const isRoomBuilderSource = isRoomBuilderScene(scene)
    const isOldRoomBuilderScene = isRoomBuilderSource && new Date(scene.createdAt) < cutoffDate
    const isRoomBuilderWithEnvmap = isRoomBuilderSource && sceneHasGeneratedEnvmap(scene)
    return {
        toneMappingType: previewSettings.onOffOptions.usePBR ? 2 : 0,
        useFilmicLUT: previewSettings.onOffOptions.usePBR,
        disableParallaxMapping: !isStandard3DScene && !previewSettings.isSyntheticScene,
        environmentRotation: isStandard3DScene ? (isRoomBuilderSource && !isRoomBuilderWithEnvmap ? 0 : 270) : 90,
        useRoomBuilderEnvMap: !isOldRoomBuilderScene && !isRoomBuilderWithEnvmap,
        shadowFalloff: isRoomBuilderSource ? 0.35 : 2.0,
        saturationDampIntensity: 0.0,
        useAlternateEnvMap: previewSettings.isSyntheticScene && !scene?.manifest?.equirectangular,
        disable3DCompositionSave: !scene?.gltfManifest,
        sunLightIntensity: 5,
        toneMapCurve: previewSettings.toneMapType,
        toneMappingExposureCompensation: previewSettings.exposureCompensation,
        autoExposure: previewSettings.onOffOptions.useAutoExposure,
        pointLightIntensities: [],
        directionalLightIntensities: [],
        areaLightIntensities: [],
        spotLightIntensities: [],
        ...getLightIntensitiesLists(scene, previewSettings.onOffOptions.usePBR),
    }
}

// Returns the scene dependent viewer settings. These settings
// override the initial settings on scene initialization.
export function getSceneDependentInitialViewerSettings(scene: SceneInfo) {
    const standard3D = allScenesAreStandard3D(scene)
    const usePBR =
        standard3D ||
        Object.values(scene?.manifest?.lighting?.lights || {})
            .flat()
            .some((light) => 'pbr' in light)

    const toneMapType: ToneMapType = standard3D ? ToneMapType.ACESFilmic : ToneMapType.BlenderFilmic
    const exposureCompensation = 0.0
    const useAutoExposure = standard3D

    return {
        onOffOptions: {
            usePBR,
            useAutoExposure,
        },
        toneMapType,
        exposureCompensation,
    }
}

// Generic deep equality check
function deepEqual<T>(a: T, b: T): boolean {
    if (a === b) return true

    if (typeof a !== typeof b || a === null || b === null) return false

    if (typeof a !== 'object') return false

    const keysA = Object.keys(a as object)
    const keysB = Object.keys(b as object)

    if (keysA.length !== keysB.length) return false

    return keysA.every((key) => {
        if (!keysB.includes(key)) return false
        const valA = (a as Record<string, unknown>)[key]
        const valB = (b as Record<string, unknown>)[key]
        return deepEqual(valA, valB)
    })
}

// Prevent unnecessary settings updates that would trigger rerenders
// and disrupt temporal anti-aliasing (TAA) accumulation.
export function deepCompareViewerSettings(a: ViewerSettings, b: ViewerSettings): boolean {
    return deepEqual(a, b)
}
