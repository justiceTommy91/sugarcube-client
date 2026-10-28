import { useQuery } from '@tanstack/react-query'
import type { APIScene } from 'models/scenes'
import { fetchFMFShowrooms, type FMFShowroom } from '../services/showroomsService'
import { useScenes } from './useScenes'

interface UseFMFShowroomsResult {
    showrooms: FMFShowroom[]
    scenes: (APIScene | null)[]
    isLoading: boolean
    error: string | null
}

export const useFMFShowrooms = (): UseFMFShowroomsResult => {
    const { data: showrooms = [], isLoading: showroomsLoading, error: showroomsError } = useQuery({
        queryKey: ['fmf-showrooms'],
        queryFn: fetchFMFShowrooms,
    })

    const { scenes, loading: scenesLoading, hasError: scenesHasError } = useScenes(
        showrooms.map((s) => s.scene),
    )

    return {
        showrooms,
        scenes,
        isLoading: showroomsLoading || scenesLoading,
        error: showroomsError instanceof Error ? showroomsError.message
            : scenesHasError ? 'Failed to load scenes'
            : null,
    }
}
