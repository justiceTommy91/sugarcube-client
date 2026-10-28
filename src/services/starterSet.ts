import { StarterSetPayload } from 'models/starterSet/types'
import fetchWrapper from './index'

export const fetchStarterSet = (): Promise<{ results: StarterSetPayload[] }> =>
    fetchWrapper<{ results: StarterSetPayload[] }>('/sets/starter_minimal/', {
        method: 'GET',
    }).then((response) => response.data)

export const fetchStarterSetById = (setId: string, sceneId: string): Promise<StarterSetPayload> =>
    fetchWrapper<StarterSetPayload>(`/sets/${setId}/`, {
        method: 'GET',
        params: { scene: sceneId },
    }).then((response) => response.data)
