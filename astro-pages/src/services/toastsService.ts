export interface ToastOptions {
    text: string
    actionButtonText?: string
    onAction?: () => void
}

export type ToastId = string

export type Toast = ToastOptions & { id: ToastId }

export type OnToastsChangeCallback = (toasts: Toast[]) => void

export type Unsubscribe = () => void

let toasts: Toast[] = []
const onChangeCallbacks: OnToastsChangeCallback[] = []

const triggerOnChange = (): void => {
    onChangeCallbacks.forEach((cb) => {
        cb([...toasts])
    })
}

let idCounter = 0
const genId = (): ToastId => {
    idCounter += 1
    return idCounter.toString()
}

const toastsService = {
    list: (): Toast[] => [...toasts],

    showToast: (options: ToastOptions): ToastId => {
        const id = genId()
        toasts.push({ id, ...options })
        triggerOnChange()
        return id
    },

    hideToast: (id: ToastId): void => {
        const index = toasts.findIndex((t) => t.id === id)
        if (index >= 0) {
            toasts.splice(index, 1)
        }
        triggerOnChange()
    },

    clearAllToasts: (): void => {
        toasts = []
        triggerOnChange()
    },

    onChange: (callback: OnToastsChangeCallback): Unsubscribe => {
        onChangeCallbacks.push(callback)
        return () => {
            const index = onChangeCallbacks.indexOf(callback)
            if (index !== -1) {
                onChangeCallbacks.splice(index, 1)
            }
        }
    },
}

export default toastsService
