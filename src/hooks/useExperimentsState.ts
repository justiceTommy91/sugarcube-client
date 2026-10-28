import React from 'react'

import { type ExperimentsState, experimentsService } from 'services/experiments'

/**
 * @private This is a private shared hook used by useFlags and useExperiments, and shouldn't be referenced in user code.
 */
export const useExperimentsState = () => {
    const [state, setState] = React.useState<ExperimentsState>({
        status: 'pending',
        decisions: {
            flags: experimentsService.defaultFlagDecisions,
            variations: experimentsService.defaultVariationChoices,
        },
    })

    React.useEffect(() => {
        // FIXME: do we need a timeout here?
        const unsubscribe = experimentsService.synchronize(setState)

        return () => {
            unsubscribe()
        }
    }, [])

    return state
}
