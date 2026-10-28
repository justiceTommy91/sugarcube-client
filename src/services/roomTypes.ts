import type { RoomTypesApiResponse } from 'models/roomTypes/types'
import fetchWrapper from './index'

export const fetchRoomTypes = (): Promise<RoomTypesApiResponse> =>
    fetchWrapper<RoomTypesApiResponse>('/rooms/', {
        method: 'GET',
    }).then((response) => response.data)
