import { useQuery } from '@tanstack/react-query'
import {
    fetchFurnitureWithDimensions,
    type FurnitureSearchResponse,
    type FurnitureSearchParams,
} from '../services/furnitureService'

interface UseFurnitureSearchResult {
    data: FurnitureSearchResponse | null
    loading: boolean
    isFetching: boolean
    error: string | null
    refetch: () => void
}

// Generic React Query wrapper for the furniture search API.
// Use this hook for one-off or debug consumers (e.g. FlagManager).
// Inside the Find My Fit viewer, use useFurnitureSearchByDimensions instead —
// it adds the imperative search trigger, state-machine callbacks, and ProductFamily grouping.
export const useFurnitureSearch = (params: FurnitureSearchParams | null): UseFurnitureSearchResult => {
    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['furniture-search', params],
        queryFn: () => {
            if (!params) throw new Error('params is required')
            return fetchFurnitureWithDimensions(params)
        },
        enabled: !!params,
        refetchOnWindowFocus: false,
    })

    return {
        data: data ?? null,
        loading: isLoading,
        isFetching,
        error: error instanceof Error ? error.message : null,
        refetch: () => { refetch() },
    }
}
