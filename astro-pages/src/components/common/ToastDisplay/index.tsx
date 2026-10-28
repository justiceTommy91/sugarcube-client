import React from 'react'

import ControlledToast from '@gatsby/toasts/ControlledToast'
import { useToasts, useToastsMutations } from '@providers/ToastsProvider'

const ToastDisplay = () => {
    const toasts = useToasts()
    const { hideToast } = useToastsMutations()

    return (
        <>
            {toasts.map((toast) => (
                <ControlledToast
                    key={toast.id}
                    text={toast.text}
                    actionButtonText={toast.actionButtonText}
                    actionClick={toast.onAction}
                    ariaLabel={toast.actionButtonText}
                    onDismiss={() => hideToast(toast.id)}
                />
            ))}
        </>
    )
}

export default ToastDisplay
