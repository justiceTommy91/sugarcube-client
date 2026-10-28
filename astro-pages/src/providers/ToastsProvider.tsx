import React, { createContext, useContext, useEffect, useState } from 'react'

import toastsService from '@astro-services/toastsService'
import type { Toast, ToastId, ToastOptions } from '@astro-services/toastsService'

const ToastsContext = createContext<readonly Toast[] | undefined>(undefined)

interface ToastsMutations {
    showToast: (options: ToastOptions) => ToastId
    hideToast: (id: ToastId) => void
}

const ToastsMutationContext = createContext<ToastsMutations | undefined>(undefined)

const toastsMutations: ToastsMutations = {
    showToast: toastsService.showToast,
    hideToast: toastsService.hideToast,
}

export const ToastsProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState(() => toastsService.list())

    useEffect(() => {
        const unsubscribe = toastsService.onChange(setToasts)
        return unsubscribe
    }, [])

    return (
        <ToastsContext.Provider value={toasts}>
            <ToastsMutationContext.Provider value={toastsMutations}>
                {children}
            </ToastsMutationContext.Provider>
        </ToastsContext.Provider>
    )
}

export const useToasts = (): readonly Toast[] => {
    const toasts = useContext(ToastsContext)
    if (toasts === undefined) {
        throw new Error('useToasts must be used within a ToastsProvider')
    }
    return toasts
}

export const useToastsMutations = (): ToastsMutations => {
    const mutations = useContext(ToastsMutationContext)
    if (mutations === undefined) {
        throw new Error('useToastsMutations must be used within a ToastsProvider')
    }
    return mutations
}
