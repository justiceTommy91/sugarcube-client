import { useState, useEffect, useCallback } from 'react'

import { getWindow } from 'models/location/selectors'

export const useLocalStorageState = <T>(key: string, initialValue: T) => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = getWindow().localStorage?.getItem(key)
            return item ? JSON.parse(item) as T : initialValue
        } catch (error) {
            return initialValue
        }
    })

    const updateStoredValue = useCallback((value: T) => {
        setStoredValue(value)
        getWindow().localStorage?.setItem(key, JSON.stringify(value))
    }, [key])

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === key) {
                const newValue = getWindow().localStorage?.getItem(key)
                setStoredValue(newValue ? JSON.parse(newValue) as T : initialValue)
            }
        }

        getWindow().addEventListener?.('storage', handleStorageChange)

        return () => {
            getWindow().removeEventListener?.('storage', handleStorageChange)
        }
    }, [key, initialValue])

    return [storedValue, updateStoredValue] as const
}
