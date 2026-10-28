import { useState, useEffect } from 'react'
import { getComposition } from 'services/compositions'
import type { APIComposition } from 'models/compositions'

const useSharedComposition = (uuid: string, hasFinishedSaving: boolean | undefined) => {
    const [sharedCompositionData, setSharedCompositionData] = useState<APIComposition | null>(null)
    const [error, setError] = useState<boolean | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        setIsLoading(true)
        const fetchData = async () => {
            try {
                if (!uuid) {
                    setError(true)
                } else {
                    const response = await getComposition(uuid)
                    setSharedCompositionData(response.data)
                    setError(false)
                }

                setIsLoading(false)
            } catch (err) {
                setError(true)
            }
        }
        fetchData()
            .then(() => setIsLoading(false))
            .catch(() => setError(true))
    }, [uuid, hasFinishedSaving])
    return { isLoading, error, sharedCompositionData }
}

export default useSharedComposition
