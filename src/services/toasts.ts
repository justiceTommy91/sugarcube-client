import { Action } from 'redux'

export enum ToastType {
    ADDED_ITEM_TO_BAG = 'ADDED_ITEM_TO_BAG',
    ADDED_MULTIPLE_ITEMS_TO_BAG = 'ADDED_MULTIPLE_ITEMS_TO_BAG',
    ADDED_MULTIPLE_ITEMS_TO_BAG_AFTER_RETRY = 'ADDED_MULTIPLE_ITEMS_TO_BAG_AFTER_RETRY',
    BEAUTIFY_REMAINING_COUNT = 'BEAUTIFY_REMAINING_COUNT',
    BEAUTIFY_FAILED = 'BEAUTIFY_FAILED',
    ROTATE_PHONE = 'ROTATE_PHONE',
    COMPOSITIONS_DELETED = 'COMPOSITIONS_DELETED',
    PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
    RENAME_COMPOSITION = 'RENAME_COMPOSITION',
    RENAME_COMPOSITION_FAILED = 'RENAME_COMPOSITION_FAILED',
    SAVE_COMPOSITION_RESULT = 'SAVE_COMPOSITION_RESULT',
    HOME_PROJECT_LINK_FAILED = 'HOME_PROJECT_LINK_FAILED',
    SUGGESTION_TOAST = 'SUGGESTION_TOAST',
    FAILED_TO_FETCH_STARTER_SETS = 'FAILED_TO_FETCH_STARTER_SETS',
    NAVIGATOR_SHARE_FAILED = 'NAVIGATOR_SHARE_FAILED',
    KREATIV_LITE_MERGE_FAILED = 'KREATIV_LITE_MERGE_FAILED',
    PAX_IMPORT_FAILED = 'PAX_IMPORT_FAILED',
}

export enum DeletedType {
    SCENE_WITH_COMPOSITIONS = 'SCENE_WITH_COMPOSITIONS',
    SCENE_WITH_NO_COMPOSITIONS = 'SCENE_WITH_NO_COMPOSITIONS',
    SINGLE_COMPOSITION = 'SINGLE_COMPOSITION',
    MULTIPLE_COMPOSITIONS = 'MULTPLE_COMPOSITIONS',
    SCENE_WITH_SINGLE_COMPOSITION = 'SCENE_WITH_SINGLE_COMPOSITION',
}

export enum SceneTypeLabel {
    ROOM = 'ROOM',
    SCAN = 'SCAN',
    IMAGE = 'IMAGE',
}

export type ToastData =
    | {
          toastType: ToastType.ADDED_ITEM_TO_BAG
          name: string
          failed?: true
      }
    | {
          toastType: ToastType.ADDED_MULTIPLE_ITEMS_TO_BAG
          count: number
          failed?: true
      }
    | {
          toastType: ToastType.ADDED_MULTIPLE_ITEMS_TO_BAG_AFTER_RETRY
          invalidItems: string[]
      }
    | {
          toastType: ToastType.BEAUTIFY_REMAINING_COUNT
          count: number
      }
    | {
          toastType: ToastType.BEAUTIFY_FAILED
          /** i18n key (e.g. design.beautify error …) or plain API message */
          message: string
      }
    | {
          toastType: ToastType.ROTATE_PHONE
      }
    | {
          toastType: ToastType.COMPOSITIONS_DELETED
          deletedType: DeletedType
          sceneTypeLabel?: SceneTypeLabel
      }
    | {
          toastType: ToastType.PRODUCT_NOT_FOUND
      }
    | {
          toastType: ToastType.RENAME_COMPOSITION
      }
    | {
          toastType: ToastType.RENAME_COMPOSITION_FAILED
      }
    | {
          toastType: ToastType.SAVE_COMPOSITION_RESULT
          isCopy: boolean
          failed: boolean
          homeProjectId?: string
      }
    | {
          toastType: ToastType.HOME_PROJECT_LINK_FAILED
      }
    | {
          toastType: ToastType.SUGGESTION_TOAST
          title: string
          actionText: string
          onAction: () => void | Action
      }
    | {
          toastType: ToastType.FAILED_TO_FETCH_STARTER_SETS
          title: string
      }
    | {
          toastType: ToastType.NAVIGATOR_SHARE_FAILED
      }
    | {
          toastType: ToastType.KREATIV_LITE_MERGE_FAILED
          canRetry: boolean
      }
    | {
          toastType: ToastType.PAX_IMPORT_FAILED
      }

export type ToastId = string

export type Toast = ToastData & { id: ToastId }

let toasts: Toast[] = []

export type OnToastsChangeCallback = (toasts: Toast[]) => void

export type Unsubscribe = () => void

const onChangeCallbacks: OnToastsChangeCallback[] = []

const triggerOnChange = (): void => {
    onChangeCallbacks.forEach((cb) => {
        // Ensure that callbacks get a brand-new array so we don't have issues with
        // referential equality or callbacks modifying the toasts.
        cb([...toasts])
    })
}

let id = 0
const genId = (): string => {
    id += 1
    return id.toString()
}

export default {
    // Ensure that we return a shallow copy of toasts so callers can't modify it.
    list: (): Toast[] => [...toasts],
    showToast: (toast: ToastData): ToastId => {
        const toastId = genId()
        toasts.push({
            id: toastId,
            ...toast,
        })
        triggerOnChange()
        return toastId
    },
    hideToast: (toastId: string): void => {
        const index = toasts.findIndex((t) => t.id === toastId)
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
            if (index === -1) {
                return
            }
            onChangeCallbacks.splice(index, 1)
        }
    },
}
