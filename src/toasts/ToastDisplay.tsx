import React, { useCallback } from 'react'

import { Toast, ToastType } from 'services/toasts'

import AddedToBagToast from './AddedToBagToast'
import BeautifyRemainingToast from './BeautifyRemainingToast'
import BeautifyFailedToast from './BeautifyFailedToast'
import RotatePhoneToast from './RotatePhoneToast'
import DeletedToast from './DeletedToast'
import RenamedToast from './RenamedToast'
import ProductNotFoundToast from './ProductNotFoundToast'
import { useToasts, useToastsMutations } from './ToastsProvider'
import SaveCompositionResultToast from './SaveCompositionToast'
import SuggestionToast from './SuggestionToast'
import NavigatorShareFailedToast from './NavigatorShareFailedToast'
import HomeProjectLinkFailedToast from './HomeProjectLinkFailedToast'
import KreativLiteMergeFailedToast from './KreativLiteMergeFailedToast'
import PAXImportFailedToast from './PAXImportFailedToast'

const ToastDisplay = () => {
    const toasts = useToasts()
    const { hideToast } = useToastsMutations()

    const toastComp = useCallback((toast: Toast) => {
        const dismissToast = () => hideToast(toast.id)
        switch (toast.toastType) {
            case ToastType.ADDED_ITEM_TO_BAG:
                return (
                    <AddedToBagToast key={toast.id} name={toast.name} failed={toast.failed} onDismiss={dismissToast} />
                )
            case ToastType.ADDED_MULTIPLE_ITEMS_TO_BAG:
                return (
                    <AddedToBagToast
                        key={toast.id}
                        count={toast.count}
                        failed={toast.failed}
                        onDismiss={dismissToast}
                    />
                )
            case ToastType.ADDED_MULTIPLE_ITEMS_TO_BAG_AFTER_RETRY:
                return <AddedToBagToast key={toast.id} invalidItems={toast.invalidItems} onDismiss={dismissToast} />
            case ToastType.BEAUTIFY_REMAINING_COUNT:
                return <BeautifyRemainingToast key={toast.id} count={toast.count} onDismiss={dismissToast} />
            case ToastType.BEAUTIFY_FAILED:
                return <BeautifyFailedToast key={toast.id} message={toast.message} onDismiss={dismissToast} />
            case ToastType.ROTATE_PHONE:
                return <RotatePhoneToast key={toast.id} onDismiss={dismissToast} />
            case ToastType.COMPOSITIONS_DELETED:
                return (
                    <DeletedToast
                        key={toast.id}
                        deletedType={toast.deletedType}
                        sceneTypeLabel={toast.sceneTypeLabel}
                        onDismiss={dismissToast}
                    />
                )
            case ToastType.RENAME_COMPOSITION:
                return <RenamedToast key={toast.id} onDismiss={dismissToast} />
            case ToastType.RENAME_COMPOSITION_FAILED:
                return <RenamedToast key={toast.id} failed onDismiss={dismissToast} />
            case ToastType.PRODUCT_NOT_FOUND:
                return <ProductNotFoundToast key={toast.id} onDismiss={dismissToast} />
            case ToastType.SAVE_COMPOSITION_RESULT:
                return (
                    <SaveCompositionResultToast
                        key={toast.id}
                        onDismiss={dismissToast}
                        isCopy={toast.isCopy}
                        failed={toast.failed}
                        homeProjectId={toast.homeProjectId}
                    />
                )
            case ToastType.HOME_PROJECT_LINK_FAILED:
                return <HomeProjectLinkFailedToast key={toast.id} onDismiss={dismissToast} />
            case ToastType.SUGGESTION_TOAST:
                return (
                    <SuggestionToast
                        key={toast.id}
                        title={toast.title}
                        actionText={toast.actionText}
                        onAction={toast.onAction}
                        onDismiss={dismissToast}
                    />
                )
            case ToastType.NAVIGATOR_SHARE_FAILED:
                return <NavigatorShareFailedToast key={toast.id} onDismiss={dismissToast} />
            case ToastType.KREATIV_LITE_MERGE_FAILED:
                return <KreativLiteMergeFailedToast key={toast.id} canRetry={toast.canRetry} onDismiss={dismissToast} />
            case ToastType.PAX_IMPORT_FAILED:
                return <PAXImportFailedToast key={toast.id} onDismiss={dismissToast} />
            default:
                return null
        }
    }, [])

    return <>{toasts.map(toastComp)}</>
}

export default ToastDisplay
