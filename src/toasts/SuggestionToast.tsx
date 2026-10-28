import React from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'

import { useAppSelector } from 'hooks'
import { getDesignSidepanelOpen } from 'models/ui/selectors'
import { openDesignSidepanel } from 'models/ui/actions'
import ControlledToast from './ControlledToast'

require('./SuggestionToast.scss')

type SuggestionToastProps = {
    title?: string
    actionText?: string
    onDismiss: () => void
    onAction: () => void
}

const SuggestionToast: React.FunctionComponent<SuggestionToastProps> = ({ title, actionText, onDismiss, onAction }) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const isSidePanelOpen = useAppSelector(getDesignSidepanelOpen)

    /**
     * Migration Note: This component was updated specifically for Design Sidepanel v2 compatibility:
     *
     * BACKGROUND:
     * - Design Sidepanel v2 was rebuilt to use only React Context (no Redux)
     * - This required updating how toasts interact with the sidepanel's internal state
     *
     * BEFORE (Legacy Redux Pattern):
     * - onAction callbacks returned Redux actions (Action | void)
     * - Actions were dispatched to Redux store for sidepanel tab switching
     * - All sidepanel state management was centralized in Redux
     *
     * AFTER (Current Hybrid Pattern):
     * - onAction callbacks are simple void functions that call panelBridge internally
     * - Still uses Redux for opening/closing sidepanel (legacy system)
     * - Uses panelBridge for panel tab switching (sidepanel v2 React Context)
     *
     * FUTURE (TBD):
     * - We plan to migrate away from Redux eventually, but approach is undecided
     * - Could use another state library, pure React Context, or different architecture
     * - Toast system itself may be redesigned as part of broader Redux migration
     */
    const onActionClick = () => {
        if (!isSidePanelOpen) {
            // Note: Still using Redux for sidepanel open/close state
            // This remains Redux-based while sidepanel v2 internals use React Context
            dispatch(openDesignSidepanel())
        }

        // Execute the onAction callback - now always a simple function call
        // The callback internally handles panelBridge calls (e.g., panelBridge.openEditPanel())
        onAction()
    }

    return (
        <ControlledToast
            className="SuggestionToast"
            text={title ?? t('design.bed frames are always displayed')}
            actionButtonText={actionText ?? t('design.list')}
            ariaLabel={actionText ?? t('design.list')}
            onDismiss={onDismiss}
            actionClick={onActionClick}
        />
    )
}

export default SuggestionToast
