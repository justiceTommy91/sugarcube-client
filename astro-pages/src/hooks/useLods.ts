import { useQuery, useQueryClient } from '@tanstack/react-query'

const LODS_QUERY_KEY = ['lods']
const LODS_STORAGE_KEY = 'GeoLodsPreference'
const DEFAULT_LODS = 'lite'

type LodsState = { value: string | null }

function resolveLods(): LodsState {
    const stored = sessionStorage.getItem(LODS_STORAGE_KEY)
    if (stored !== null) return { value: stored || null }
    return { value: DEFAULT_LODS }
}

export const useLods = (): string | null => {
    const { data } = useQuery<LodsState>({
        queryKey: LODS_QUERY_KEY,
        queryFn: resolveLods,
        staleTime: Infinity,
    })
    return data ? data.value : DEFAULT_LODS
}

export const useSetLods = () => {
    const queryClient = useQueryClient()
    return (lods: string | null) => {
        sessionStorage.setItem(LODS_STORAGE_KEY, lods ?? '')
        queryClient.setQueryData<LodsState>(LODS_QUERY_KEY, { value: lods })
    }
}
