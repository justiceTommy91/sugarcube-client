import React, { useContext, useEffect, useState } from 'react'

import uiStateService, { UiState } from 'services/uiState'

const UiStateContext = React.createContext<UiState | undefined>(undefined)

const UiStateProvider: React.FunctionComponent<React.PropsWithChildren> = ({ children }) => {
    const [uiState, setUiState] = useState(uiStateService.retrieve)

    useEffect(() => {
        const unsubscribe = uiStateService.onChange(setUiState)

        return () => {
            unsubscribe()
        }
    }, [])

    return <UiStateContext.Provider value={uiState}>{children}</UiStateContext.Provider>
}

export default UiStateProvider

export const useUiState = (): UiState => {
    const uiState = useContext(UiStateContext)
    if (!uiState) {
        throw new Error('missing required UiStateContext (did you wrap your component in UiContextProvider?)')
    }
    return uiState
}
