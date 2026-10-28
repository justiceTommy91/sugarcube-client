import { useState, useEffect } from 'react'

import { usePlannerContext } from 'Planner/ui/components/PlannerContext'
import { ApiState, ApiErrorObserver } from 'Planner/api_types'

export const usePlannerApiState = (onError?: ApiErrorObserver) => {
    const { plannerApi } = usePlannerContext()
    const [apiState, setApiState] = useState<ApiState>(plannerApi.getState())

    useEffect(() => {
        const stateObserver = (state: ApiState) => {
            setApiState(state)
        }
        const errorObserver = (error: unknown) => {
            if (!onError) {
                return
            }
            onError(error)
        }
        plannerApi.addStateObserver(stateObserver)
        plannerApi.addErrorObserver(errorObserver)
        return () => {
            plannerApi.removeStateObserver(stateObserver)
            plannerApi.removeErrorObserver(errorObserver)
        }
    }, [onError])

    return apiState
}
