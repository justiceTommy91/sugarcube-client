import React from 'react'
import { useExperimentsState } from './useExperimentsState'

export const useFlags = () => {
    const {
        status,
        decisions: { flags },
    } = useExperimentsState()
    return React.useMemo(() => ({ status, flags }), [status, flags])
}
