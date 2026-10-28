import { useQueries } from '@tanstack/react-query'
import type { APIScene } from 'models/scenes'
import { fetchScene } from '../services/sceneService'

interface UseScenesResult {
    scenes: (APIScene | null)[]
    loading: boolean
    hasError: boolean
}

export const useScenes = (sceneIds: string[]): UseScenesResult => {
    const results = useQueries({
        queries: sceneIds.map((sceneId) => ({
            queryKey: ['scene', sceneId],
            queryFn: () => fetchScene(sceneId),
            enabled: Boolean(sceneId),
        })),
    })

    return {
        scenes: results.map((r) => r.data ?? null),
        loading: results.some((r) => r.isLoading),
        hasError: results.some((r) => r.isError),
    }
}
