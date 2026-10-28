import React from 'react'
import { connect } from 'react-redux'
import { func, bool } from 'prop-types'

import { toggleSharePanelOpen } from 'models/ui/actions'
import { getSharePanelOpen, getShowDesignSummary } from 'models/ui/selectors'
import {
    getSelectedComposition,
    getIsSaving,
    getHasSaveError,
    getIsSavingSharing,
    getHasSavingShareError,
    getSelectedCompositionTrackingRoomInfo,
} from 'models/compositions/selectors'
import {
    saveCompositionBeforeSharing as saveCompositionBeforeSharingAction,
    requestSaveCompositionSharing as requestSaveCompositionSharingAction,
} from 'models/compositions/actions'
import SharePanel from 'components/design/SharePanel'
import { compositionType, trackingRoomInfoType } from 'models/propTypes'

const SharePanelContainer = ({
    close,
    isOpen,
    composition,
    isSaving,
    hasSaveError,
    isSavingSharing,
    hasSavingShareError,
    saveSharingPermissions,
    saveCompositionBeforeSharing,
    isDesignSummaryVisible,
    roomInfo,
}) => {
    if (!isOpen) {
        return null
    }
    return (
        <SharePanel
            close={close}
            composition={composition}
            isSaving={isSaving}
            hasSaveError={hasSaveError}
            isSavingSharing={isSavingSharing}
            hasSavingShareError={hasSavingShareError}
            saveSharingPermissions={saveSharingPermissions}
            saveCompositionBeforeSharing={saveCompositionBeforeSharing}
            isDesignSummaryVisible={isDesignSummaryVisible}
            roomInfo={roomInfo}
        />
    )
}

SharePanelContainer.defaultProps = {
    composition: null,
    roomInfo: null,
}

SharePanelContainer.propTypes = {
    close: func.isRequired,
    isOpen: bool.isRequired,
    composition: compositionType,
    isSaving: bool.isRequired,
    hasSaveError: bool.isRequired,
    isSavingSharing: bool.isRequired,
    hasSavingShareError: bool.isRequired,
    saveSharingPermissions: func.isRequired,
    saveCompositionBeforeSharing: func.isRequired,
    isDesignSummaryVisible: bool.isRequired,
    roomInfo: trackingRoomInfoType,
}

const mapStateToProps = (state) => ({
    isOpen: getSharePanelOpen(state),
    composition: getSelectedComposition(state),
    isSaving: getIsSaving(state),
    hasSaveError: getHasSaveError(state),
    isSavingSharing: getIsSavingSharing(state),
    hasSavingShareError: getHasSavingShareError(state),
    isDesignSummaryVisible: getShowDesignSummary(state),
    roomInfo: getSelectedCompositionTrackingRoomInfo(state),
})

const mapDispatchToProps = {
    close: toggleSharePanelOpen,
    saveSharingPermissions: requestSaveCompositionSharingAction,
    saveCompositionBeforeSharing: saveCompositionBeforeSharingAction,
}

export default connect(mapStateToProps, mapDispatchToProps)(SharePanelContainer)
