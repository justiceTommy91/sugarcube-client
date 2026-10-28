import React from 'react'
import { useExperimentsState } from './useExperimentsState'

export const useExperiments = () => {
    const {
        status,
        decisions: { variations },
    } = useExperimentsState()
    return React.useMemo(() => ({ status, variations }), [status, variations])
}
