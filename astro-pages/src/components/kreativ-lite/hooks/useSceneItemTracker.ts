import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { NOTIFY_SCENE_ITEM_UPDATE, NOTIFY_VIEWER_STATE_UPDATE } from '@gatsby/Renderer/geomviewer'
import type {
    SceneItemUpdateNotification,
    ViewerStateUpdateNotification,
    NotificationObserver,
} from '@gatsby/Renderer/geomviewer'
import { getGrandCentral } from '@gatsby/Renderer/GrandCentral'
import type { SmartaPlacedFurnitureEntry, SmartaSavedProperties } from '@astro-services/smartaService'
import type { PersistUserData } from '@gatsby/Renderer/geomviewer/geom_types'

const CAMERA_TYPE_PERSPECTIVE = 'perspective'
const CAMERA_TYPE_ORTHOGRAPHIC = 'orthographic'

type ItemGfxAttributes = Pick<
    NonNullable<SmartaPlacedFurnitureEntry['gfxAttributes']>,
    'additionalContacts' | 'stackedPlane' | 'mirrorOptionEnabled' | 'artData' | 'placingBehavior'
>

interface TrackedItem {
    furnitureId: number
    localItemNumber?: string
    /** gfxAttributes from the furniture item itself (placingBehavior, mirrorOptionEnabled, etc.). */
    itemGfxAttributes?: ItemGfxAttributes
    /** 3D placement data for this item to be sent to smarta in subsequent calls. */
    placement?: {
        x: number
        y: number
        z: number
        /** Quaternion W component (smarta calls this "heading"). */
        heading?: number
        /** Quaternion X component. */
        headingI?: number
        /** Quaternion Y component. */
        headingJ?: number
        /** Quaternion Z component. */
        headingK?: number
        parentAttachment?: number
        parentId?: string
        /** anchorCombinationIndex from smarta response — overrides itemGfxAttributes value. */
        anchorCombinationIndex?: number
    }
}

export interface SceneItemTracker {
    /**
     * Registers a placed item so the tracker can include it in smarta calls.
     */
    registerItem: (
        uniqueId: string,
        furnitureId: number,
        localItemNumber?: string,
        itemGfxAttributes?: ItemGfxAttributes,
    ) => void
    /**
     * Explicitly marks the scene as dirty (unsaved changes). Call this from
     * explicit user actions: add item, delete item, rotate item.
     */
    markDirty: () => void
    /**
     * Stores placement data from a smarta response. This is called immediately after a
     * successful smarta call so subsequent calls have accurate context right away, without
     * waiting for a viewer ItemPlacement event.
     */
    updatePlacementFromSmarta: (uniqueId: string, placement: NonNullable<TrackedItem['placement']>) => void
    getPlacedFurniture: () => SmartaPlacedFurnitureEntry[]
    /** Removes a previously registered item so it is excluded from future smarta calls. */
    unregisterItem: (uniqueId: string) => void
    /**
     * Returns the set of uniqueIds registered by the user (excludes combinable children and
     * pre-existing scene elements). Use this to cross-reference against live renderItems to
     * get a reactive count that reflects deletions.
     */
    getTrackedUniqueIds: () => ReadonlySet<string>
    /**
     * Returns smarta savedProperties including the latest camera state and erased segments.
     * Camera is captured from ViewChangeEnd events; erasedSegments from handleSaveDataUpdate callbacks.
     */
    getSavedProperties: () => SmartaSavedProperties
    /** Clears the dirty flag — call after a successful save. */
    resetDirtyFlag: () => void
    /**
     * Callback for ViewerContext's onSaveDataUpdate prop.
     * Receives PersistUserData from the renderer and updates the erased segments ref
     * with proper segment IDs (not plane IDs).
     */
    handleSaveDataUpdate: (userProps: PersistUserData) => void
}

/**
 * Tracks placed furniture items in the 3D scene.
 * Positions are seeded from smarta API responses (via updatePlacementFromSmarta) and
 * kept up-to-date by subscribing to NOTIFY_SCENE_ITEM_UPDATE (ItemPlacement) events
 * for items moved or repositioned after placement.
 *
 * Dirty tracking follows an action-based model: only explicit user actions set dirty
 * (add, delete, rotate, drag, orbit, erase). Viewer ItemPlacement events during restore
 * never set dirty — they only update position data.
 */
export function useSceneItemTracker(): {
    tracker: SceneItemTracker
    /** Reactive: true if any scene change has occurred since the last save. */
    isDirty: boolean
    /**
     * Stores erased segments from the initial restore echo without marking dirty.
     * Call this before the viewer fires its first onSaveDataUpdate echo. Not part of
     * the public SceneItemTracker interface — restore plumbing only.
     */
    captureRestoredSegments: (segments: number[]) => void
} {
    const itemsRef = useRef<Map<string, TrackedItem>>(new Map())
    const cameraRef = useRef<Record<string, unknown> | null>(null)
    const erasedSegmentsRef = useRef<number[]>([])
    const [isDirtyState, setIsDirtyState] = useState(false)

    useEffect(() => {
        const gc = getGrandCentral()

        // Track placed item positions from viewer events (for items moved after initial placement).
        const itemObserver = (notification: SceneItemUpdateNotification) => {
            const { stateInfo } = notification.payload

            if (stateInfo === 'ItemPlacement') {
                const { itemId, itemData } = notification.payload as {
                    itemId: string
                    itemData: {
                        x?: number
                        y?: number
                        p3?: { x: number; y: number; z: number }
                        heading?: number
                        parentIdOrSurface?: string
                        parentAttachment?: number
                        placement?: {
                            location3?: { localPos?: { x: number; y: number; z: number } }
                            rotation?: { x?: number; y?: number; z?: number; w?: number }
                        }
                    }
                }

                const tracked = itemsRef.current.get(itemId)
                if (!tracked) return

                const pos = itemData.placement?.location3?.localPos ?? itemData.p3
                const rot = itemData.placement?.rotation
                if (!pos) return

                tracked.placement = {
                    x: pos.x,
                    y: pos.y,
                    z: pos.z,
                    // Use quaternion W from rotation data (not itemData.heading which is the 2D angle).
                    heading: rot?.w,
                    headingI: rot?.x,
                    headingJ: rot?.y,
                    headingK: rot?.z,
                    parentAttachment: itemData.parentAttachment,
                    parentId: itemData.parentIdOrSurface,
                    // Preserve anchorCombinationIndex set by the original smarta response.
                    anchorCombinationIndex: tracked.placement?.anchorCombinationIndex,
                }
                return
            }

            // User finished dragging a floor item.
            if (stateInfo === 'DragEnd') {
                setIsDirtyState(true)
                return
            }

            // User finished dragging a stackable item.
            if (stateInfo === 'EndStackableDraggingMode') {
                setIsDirtyState(true)
                return
            }

            // User completed stackable placement (new placement or move; discardItem=true means cancelled).
            if (stateInfo === 'EndPlacementModeWithItem') {
                const discardItem = (notification.payload as { itemData?: { discardItem?: boolean } }).itemData
                    ?.discardItem
                if (!discardItem) setIsDirtyState(true)
            }
        }
        gc.addObserver(NOTIFY_SCENE_ITEM_UPDATE, itemObserver as NotificationObserver)

        // Track camera state for smarta's savedProperties.
        // Smarta uses the camera to determine optimal placement positions relative to placed items.
        const stateObserver = (notification: ViewerStateUpdateNotification) => {
            if (notification.payload.stateInfo !== 'ViewChangeEnd') return
            const { camera, source } = notification.payload
            if (!camera) return
            // Only user-initiated orbit sets dirty. ViewManager fires on programmatic camera
            // changes (initial scene setup, thumbnail capture) which are not user actions.
            if (source === 'OrbitMode') {
                setIsDirtyState(true)
            }
            const intrinsics = camera.getIntrinsics()
            const threeCamera = camera.getThreeCamera()
            if (!intrinsics || !threeCamera) return
            const cameraType = threeCamera.isPerspectiveCamera ? CAMERA_TYPE_PERSPECTIVE : CAMERA_TYPE_ORTHOGRAPHIC
            cameraRef.current = {
                translation: threeCamera.position.toArray(),
                rotation: threeCamera.quaternion.toArray(),
                type: cameraType,
                [cameraType]: {
                    aspectRatio: camera.getViewWidth() / camera.getViewHeight(),
                    yfov: (threeCamera as { fov: number }).fov,
                    znear: (threeCamera as { near: number }).near,
                    zfar: (threeCamera as { far: number }).far,
                    cxyNormalized: [
                        intrinsics.principalPointX / camera.getViewWidth(),
                        intrinsics.principalPointY / camera.getViewHeight(),
                    ],
                },
            }
        }
        gc.addObserver(NOTIFY_VIEWER_STATE_UPDATE, stateObserver as NotificationObserver)

        return () => {
            gc.removeObserver(itemObserver as NotificationObserver)
            gc.removeObserver(stateObserver as NotificationObserver)
        }
    }, [])

    /**
     * Called by ViewerContext's onSaveDataUpdate.
     * Sets dirty only if the incoming segments differ from what's already stored.
     * This correctly handles the restore echo: the viewer echoes back persistUserData
     * once on init with identical segments — captureRestoredSegments pre-populates
     * erasedSegmentsRef so the comparison sees no change and stays clean.
     */
    const handleSaveDataUpdate = useCallback((userProps: PersistUserData) => {
        const segments = userProps.magicEraser?.saveData?.erasedSegments
        if (segments !== undefined) {
            const prev = erasedSegmentsRef.current
            erasedSegmentsRef.current = segments
            // Sort before comparing so segment order from the viewer doesn't matter.
            // The viewer echoes back persistUserData on init — those segments are
            // identical to what captureRestoredSegments pre-populated, so no dirty.
            const sortedPrev = [...prev].sort((a, b) => a - b)
            const sortedNext = [...segments].sort((a, b) => a - b)
            const changed = sortedPrev.length !== sortedNext.length || sortedPrev.some((v, i) => v !== sortedNext[i])
            if (changed) setIsDirtyState(true)
        }
    }, [])

    const markDirty = useCallback((): void => {
        setIsDirtyState(true)
    }, [])

    const registerItem = useCallback(
        (uniqueId: string, furnitureId: number, localItemNumber?: string, itemGfxAttributes?: ItemGfxAttributes) => {
            itemsRef.current.set(uniqueId, { furnitureId, localItemNumber, itemGfxAttributes })
        },
        [],
    )

    const unregisterItem = useCallback((uniqueId: string): void => {
        itemsRef.current.delete(uniqueId)
    }, [])

    const updatePlacementFromSmarta = useCallback(
        (uniqueId: string, placement: NonNullable<TrackedItem['placement']>) => {
            const tracked = itemsRef.current.get(uniqueId)
            if (tracked) {
                tracked.placement = placement
            }
        },
        [],
    )

    const getPlacedFurniture = useCallback((): SmartaPlacedFurnitureEntry[] => {
        const result: SmartaPlacedFurnitureEntry[] = []
        itemsRef.current.forEach((item, uniqueId) => {
            if (!item.placement) return
            // Build gfxAttributes by merging item-level attributes with smarta's anchorCombinationIndex.
            // Mirrors Gatsby's getSmartaRecommendedPlacementData selector which reads from the render item.
            const gfxAttributes = {
                ...item.itemGfxAttributes,
                ...(item.placement.anchorCombinationIndex !== undefined && {
                    anchorCombinationIndex: item.placement.anchorCombinationIndex,
                }),
            }
            result.push({
                furnitureId: item.furnitureId,
                localItemNumber: item.localItemNumber ?? '',
                uniqueId,
                x: item.placement.x,
                y: item.placement.y,
                z: item.placement.z,
                heading: item.placement.heading,
                headingI: item.placement.headingI,
                headingJ: item.placement.headingJ,
                headingK: item.placement.headingK,
                parentAttachment: item.placement.parentAttachment,
                parentId: item.placement.parentId,
                gfxAttributes: Object.keys(gfxAttributes).length > 0 ? gfxAttributes : null,
            })
        })
        return result
    }, [])

    const getSavedProperties = useCallback(
        (): SmartaSavedProperties => ({
            ...(cameraRef.current && { camera: cameraRef.current }),
            ...(erasedSegmentsRef.current.length > 0 && { erasedSegments: erasedSegmentsRef.current }),
        }),
        [],
    )

    const getTrackedUniqueIds = useCallback((): ReadonlySet<string> => new Set(itemsRef.current.keys()), [])

    const resetDirtyFlag = useCallback((): void => {
        setIsDirtyState(false)
    }, [])

    const captureRestoredSegments = useCallback((segments: number[]) => {
        erasedSegmentsRef.current = segments
    }, [])

    const tracker = useMemo<SceneItemTracker>(
        () => ({
            registerItem,
            unregisterItem,
            markDirty,
            updatePlacementFromSmarta,
            getPlacedFurniture,
            getSavedProperties,
            getTrackedUniqueIds,
            resetDirtyFlag,
            handleSaveDataUpdate,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [], // all methods are stable useCallbacks — object never needs to change
    )

    return { tracker, isDirty: isDirtyState, captureRestoredSegments }
}
