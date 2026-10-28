import React, { useEffect, useState, createContext, useContext } from 'react'

import toastsService, { Toast, ToastId } from 'services/toasts'

const ToastsContext = createContext<readonly Toast[] | undefined>(undefined)

export type ToastsMutations = {
    showToast: (toast: Toast) => ToastId
    hideToast: (toastId: string) => void
    clearAllToasts: () => void
}

const ToastsMutationContext = createContext<ToastsMutations | undefined>(undefined)

const toastMutations: ToastsMutations = {
    showToast: toastsService.showToast,
    hideToast: toastsService.hideToast,
    clearAllToasts: toastsService.clearAllToasts,
}

const ToastsProvider: React.FunctionComponent<React.PropsWithChildren> = ({ children }) => {
    const [toasts, setToasts] = useState(() => toastsService.list())
    useEffect(() => {
        const unsubscribe = toastsService.onChange(setToasts)

        return () => {
            unsubscribe()
        }
    }, [])
    return (
        <ToastsContext.Provider value={toasts}>
            <ToastsMutationContext.Provider value={toastMutations}>{children}</ToastsMutationContext.Provider>
        </ToastsContext.Provider>
    )
}
export default ToastsProvider

export const useToasts = (): readonly Toast[] => {
    const toasts = useContext(ToastsContext)
    if (!toasts) {
        throw new Error('missing required ToastsContext (did you wrap your component in ToastsProvider?)')
    }
    return toasts
}

export const useToastsMutations = (): ToastsMutations => {
    const mutations = useContext(ToastsMutationContext)
    if (!mutations) {
        throw new Error('missing required ToastsMutationsContext (did you wrap your component in ToastsProvider?)')
    }
    return mutations
}
