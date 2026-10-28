import { useState, useEffect, useCallback } from 'react'
import { getSearchCompletions } from 'services/searchCompletions'

export type UseSearchCompletionsResult = {
    searchCompletions: string[]
    isLoading: boolean
    error: boolean
    clearSearchResults(): void
    autocomplete(query: string): Promise<string[]>
}

const useSearchCompletions = (searchTerm?: string | null, shouldAutocomplete = true): UseSearchCompletionsResult => {
    const [searchCompletions, setSearchCompletions] = useState([] as string[])
    const [error, setError] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const autocomplete = useCallback(async (query: string): Promise<string[]> => {
        if (!query) {
            return []
        }

        setError(false)
        setIsLoading(true)
        try {
            const response = await getSearchCompletions(query)
            const {
                searchBox: { universal = [] },
            } = response.data
            // Results could be either completion, category or product.
            const completions = universal.reduce((acc, current) => {
                // Only supporting text completions for now
                if ('completion' in current) {
                    acc.push(current.completion.text)
                }
                return acc
            }, [] as string[])

            setSearchCompletions(completions)
            return completions
        } catch (err) {
            setError(true)
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (searchTerm && shouldAutocomplete) {
            autocomplete(searchTerm)
        }
    }, [searchTerm, shouldAutocomplete])

    const clearSearchResults = () => setSearchCompletions([])

    return { isLoading, error, searchCompletions, clearSearchResults, autocomplete }
}

export default useSearchCompletions
