import React, { createContext, useContext, useMemo } from 'react'
import type { SceneItemTracker } from './hooks/useSceneItemTracker'
import { COMPOSITION_SAVE_STATE } from './hooks/useCompositionSave'
import type { CompositionSaveState, SavedComposition } from './hooks/useCompositionSave'
import type { FurnitureSearchItem } from './hooks/useKreativLiteSearch'
import type { FurnitureApiProduct } from '../../services/kreativLiteFurnitureService'

export interface SceneContextValue {
    tracker: SceneItemTracker
    /** Reactive: true if any scene change has occurred since the last save. */
    isDirty: boolean
    /**
     * Schedule combinable children (duvet, pillow, mattress, etc.) for automatic
     * placement when their parent item fires `ItemReady`. Call immediately after
     * `addSceneItem` for any parent that may have socket sets.
     *
     * @param uniqueId     The uniqueId passed to `addSceneItem` for the parent.
     * @param item         Raw item data with combinables fields.
     * @param supplemental Optional response-level products (from search API) merged
     *                     as a base before item-level `combinablesDefaultProducts`.
     */
    scheduleCombinable: (
        uniqueId: string,
        item: FurnitureSearchItem,
        supplemental?: ReadonlyMap<string, FurnitureApiProduct>,
    ) => void
    save: () => Promise<SavedComposition | null>
    share: () => Promise<SavedComposition | null>
    saveState: CompositionSaveState
    isSaving: boolean
    isSharing: boolean
    isSaved: boolean
    /** The share URL from the last successful share(), or null if not yet shared this session. */
    shareUrl: string | null
    /** Map of uniqueId → FurnitureSearchItem; bridges renderer IDs to product catalogue data. */
    roomProductsById: ReadonlyMap<string, FurnitureSearchItem>
    /** Associates a renderer uniqueId with its product data so it appears in the summary. */
    registerItemProduct: (uniqueId: string, item: FurnitureSearchItem) => void
}

const SceneContext = createContext<SceneContextValue | null>(null)

export const SceneContextProvider = ({
    children,
    tracker,
    isDirty,
    scheduleCombinable,
    save,
    share,
    saveState,
    isSaved,
    shareUrl,
    roomProductsById,
    addRoomItem,
}: {
    children: React.ReactNode
    tracker: SceneItemTracker
    isDirty: boolean
    scheduleCombinable: SceneContextValue['scheduleCombinable']
    save: SceneContextValue['save']
    share: SceneContextValue['share']
    saveState: SceneContextValue['saveState']
    isSaved: SceneContextValue['isSaved']
    shareUrl: SceneContextValue['shareUrl']
    roomProductsById: SceneContextValue['roomProductsById']
    addRoomItem: SceneContextValue['registerItemProduct']
}): React.ReactElement => {
    const value = useMemo(
        () => ({
            tracker,
            isDirty,
            scheduleCombinable,
            save,
            share,
            saveState,
            isSaving: saveState === COMPOSITION_SAVE_STATE.SAVING,
            isSharing: saveState === COMPOSITION_SAVE_STATE.SHARING,
            isSaved,
            shareUrl,
            roomProductsById,
            registerItemProduct: addRoomItem,
        }),
        [tracker, isDirty, scheduleCombinable, save, share, saveState, isSaved, shareUrl, roomProductsById, addRoomItem],
    )
    return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
}

export const useSceneContext = (): SceneContextValue => {
    const ctx = useContext(SceneContext)
    if (!ctx) throw new Error('useSceneContext must be used inside SceneContextProvider')
    return ctx
}
