import { useQuery } from '@tanstack/react-query'
import type { APIScene } from 'models/scenes'
import { fetchScene } from '../services/sceneService'

// Omit sceneId from APIScene since it's returned as uuid from the API,
// but we want to normalise it to sceneId in our app. The api sceneId is a number
// while our app sceneId is a string.
export type SceneData = Omit<APIScene, 'sceneId'> & { sceneId: string }

interface UseSceneResult {
    scene: SceneData | null
    loading: boolean
    error: string | null
}

export const useScene = (sceneId: string, allowGuest?: boolean): UseSceneResult => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['scene', sceneId, { allowGuest }],
        queryFn: async () => {
            const scene = await fetchScene(sceneId, allowGuest)
            // The API returns `uuid`; we normalise to `sceneId` to match SceneInfo.
            // Gatsby does the same in src/models/scenes/reducers.js when scenes enter the Redux store.
            return { ...scene, sceneId: scene.uuid }
        },
        enabled: Boolean(sceneId),
    })

    return {
        scene: data ?? null,
        loading: isLoading,
        error: error instanceof Error ? error.message : null,
    }
}
