import React from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { requestKreativLiteMergeRetry } from 'models/user/actions'
import ControlledToast from './ControlledToast'

export type KreativLiteMergeFailedToastProps = {
    canRetry: boolean
    onDismiss: () => void
}

const KreativLiteMergeFailedToast: React.FunctionComponent<KreativLiteMergeFailedToastProps> = ({
    canRetry,
    onDismiss,
}) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()

    if (!canRetry) {
        return (
            <ControlledToast
                className="KreativLiteMergeFailedToast"
                text={t('design.guest merge.something went wrong')}
                onDismiss={onDismiss}
            />
        )
    }

    // Dismiss immediately on retry — the saga activates the merged composition
    // on success (silent) or surfaces a fresh failure toast on failure.
    const handleRetry = () => {
        dispatch(requestKreativLiteMergeRetry())
        onDismiss()
    }

    return (
        <ControlledToast
            className="KreativLiteMergeFailedToast"
            text={t('design.guest merge.something went wrong please retry')}
            onDismiss={onDismiss}
            actionButtonText={t('design.guest merge.retry button')}
            actionClick={handleRetry}
            ariaLabel={t('design.guest merge.retry button')}
        />
    )
}

export default KreativLiteMergeFailedToast
