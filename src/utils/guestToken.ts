const GUEST_TOKEN_KEY = 'kreativ_guest_token'
const GUEST_COMPOSITION_ID_KEY = 'kreativ_guest_composition_id'
const MERGE_SCENE_ID_KEY = 'kreativ_merge_scene_id'

export const stashGuestToken = (token: string) => localStorage.setItem(GUEST_TOKEN_KEY, token)
export const getStashedGuestToken = (): string | null => localStorage.getItem(GUEST_TOKEN_KEY)
export const clearStashedGuestToken = () => localStorage.removeItem(GUEST_TOKEN_KEY)

export const stashGuestCompositionId = (id: string) => localStorage.setItem(GUEST_COMPOSITION_ID_KEY, id)
export const getStashedGuestCompositionId = (): string | null => localStorage.getItem(GUEST_COMPOSITION_ID_KEY)
export const clearStashedGuestCompositionId = () => localStorage.removeItem(GUEST_COMPOSITION_ID_KEY)

export const stashMergeSceneId = (id: string) => localStorage.setItem(MERGE_SCENE_ID_KEY, id)
export const getStashedMergeSceneId = (): string | null => localStorage.getItem(MERGE_SCENE_ID_KEY)
export const clearStashedMergeSceneId = () => localStorage.removeItem(MERGE_SCENE_ID_KEY)
