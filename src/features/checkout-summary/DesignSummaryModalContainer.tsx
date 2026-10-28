import React, { useEffect } from 'react'
import DesignSummaryModalMobile from 'features/checkout-summary/DesignSummaryModalMobile'
import DesignSummaryModal from 'features/checkout-summary/DesignSummaryModal'
import { func } from 'prop-types'

import { requestFavorites as requestFavoritesAction } from 'models/favorites/actions'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { toggleSharePanelOpen, toggleExpertCheckPanelOpen } from 'models/ui/actions'
import { saveCompositionBeforeSharing as saveCompositionBeforeSharingAction } from 'models/compositions/actions'
import {
    TRACK_LOCATION_DESIGN_SUMMARY,
    TRACK_LOCATION_SHARE_PANEL,
    TRACK_LOCATION_EXPERT_CHECK,
} from 'models/tracking/constants'
import { useAppDispatch, useAppSelector } from 'hooks'
import { getIsLoggedIn } from 'models/user/selectors'
import { CompositionSaveTrackingInfo } from 'models/compositions'

const DesignSummaryModalContainer = ({
    openExitPopup,
    exitDesignSummary,
    closeModal,
}: {
    exitDesignSummary: () => void
    openExitPopup: () => void
    closeModal: () => void
}) => {
    const dispatch = useAppDispatch()
    useEffect(() => {
        dispatch(requestFavoritesAction())
    }, [])
    const { isMobile } = useSugarcubeContext()
    const isLoggedIn = useAppSelector(getIsLoggedIn)

    return isMobile ? (
        <DesignSummaryModalMobile
            openExitPopup={openExitPopup}
            exitDesignSummary={exitDesignSummary}
            closeModal={closeModal}
        />
    ) : (
        <DesignSummaryModal
            onShareClick={() => {
                // The SavedFrom field here is SharePanel since the save is happening when the share button is clicked
                const saveBeforeSharingTrackingInfo: CompositionSaveTrackingInfo = {
                    SavedFrom: TRACK_LOCATION_SHARE_PANEL,
                }
                dispatch(saveCompositionBeforeSharingAction(saveBeforeSharingTrackingInfo))

                const shareTrackingInfo = {
                    SharedFrom: TRACK_LOCATION_DESIGN_SUMMARY,
                }
                dispatch(toggleSharePanelOpen(shareTrackingInfo))
            }}
            onExpertCheckClick={() => {
                if (isLoggedIn) {
                    dispatch(
                        saveCompositionBeforeSharingAction({
                            SavedFrom: TRACK_LOCATION_EXPERT_CHECK,
                        }),
                    )
                }
                dispatch(toggleExpertCheckPanelOpen())
            }}
            closeModal={closeModal}
        />
    )
}

DesignSummaryModalContainer.propTypes = {
    openExitPopup: func.isRequired,
    exitDesignSummary: func.isRequired,
    closeModal: func.isRequired,
}

export default DesignSummaryModalContainer
