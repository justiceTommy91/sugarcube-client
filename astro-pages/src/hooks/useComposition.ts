import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchComposition, mapCompiledComposition, type ResolvedComposition } from '../services/compositionService'

interface UseCompositionResult {
    composition: ResolvedComposition | null
    loading: boolean
    error: string | null
}

export const useComposition = (compositionId: string): UseCompositionResult => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['composition', compositionId],
        queryFn: () => fetchComposition(compositionId),
        enabled: Boolean(compositionId),
    })

    const composition = useMemo(() => (data ? mapCompiledComposition(data) : null), [data])

    return {
        composition,
        loading: isLoading,
        error: error instanceof Error ? error.message : null,
    }
}
