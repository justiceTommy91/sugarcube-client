import type { RootState } from 'store'

import { StarterSetByRoomType, StarterSetPayload } from './types'

export const getStarterSetAllRoomsData = (state: RootState): StarterSetByRoomType => state.starterSet.allRoomsData
export const getStarterSetRoomCategories = (state: RootState): (keyof StarterSetByRoomType)[] =>
    state.starterSet.roomCategories
export const getStarterSetHasError = (state: RootState): string => state.starterSet.error || ''
export const getLoadingStarterSetId = (state: RootState): string | null => state.starterSet.loadingSetId
export const getStarterSetByIdError = (state: RootState): string | null => state.starterSet.setByIdError

export const getStarterSetById = (state: RootState, setId: string): StarterSetPayload | undefined => {
    const allRooms = getStarterSetAllRoomsData(state)
    return Object.values(allRooms)
        .flat()
        .find((set) => set.uuid === setId)
}
