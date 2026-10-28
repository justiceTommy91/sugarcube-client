import { STARTER_SET_ACTION_TYPES } from './constants'
import { StarterSetByRoomType, StarterSetPayload } from './types'

export const requestStarterSets = () => ({
    type: STARTER_SET_ACTION_TYPES.REQUEST_STARTER_SET_DATA,
})

export const recievedStarterSets = (payload: StarterSetByRoomType) => ({
    type: STARTER_SET_ACTION_TYPES.RECIEVED_STARTER_SET_DATA,
    payload,
})

export const failedReceiveStarterSets = (error: string) => ({
    type: STARTER_SET_ACTION_TYPES.FAILED_RECEIVE_STARTER_SET_DATA,
    payload: { error },
})

export const setRoomCategories = (payload: (keyof StarterSetByRoomType)[]) => ({
    type: STARTER_SET_ACTION_TYPES.SET_ROOM_CATEGORIES,
    payload,
})

export const setSelectedStarterSetData = (roomType: string, roomCategory: keyof StarterSetByRoomType) => ({
    type: STARTER_SET_ACTION_TYPES.SET_SELECTED_STARTER_SET_DATA,
    roomType,
    roomCategory,
})

export const requestStarterSetById = (setId: string, sceneId: string) => ({
    type: STARTER_SET_ACTION_TYPES.REQUEST_STARTER_SET_BY_ID,
    setId,
    sceneId,
})

export const receivedStarterSetById = (payload: StarterSetPayload) => ({
    type: STARTER_SET_ACTION_TYPES.RECEIVED_STARTER_SET_BY_ID,
    payload,
})

export const failedReceiveStarterSetById = (setId: string, error: string) => ({
    type: STARTER_SET_ACTION_TYPES.FAILED_RECEIVE_STARTER_SET_BY_ID,
    payload: { setId, error },
})
