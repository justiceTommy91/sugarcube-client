import React from 'react'
import { connect } from 'react-redux'
import { func } from 'prop-types'

import { previewSettingsType } from 'models/propTypes'

import { getPreviewSettings } from 'models/preview/selectors'
import { updatePreviewSettings } from 'models/preview/actions'

import DesignModeSelector from 'components/design/DesignModeSelector'

const DesignModeSelectorContainer = ({ settings, updateSettings }) => (
    <DesignModeSelector
        magicEraserMode={settings.onOffOptions.magicEraserMode}
        updateMagicEraserMode={(m) => {
            if (settings.onOffOptions.magicEraserMode !== m) {
                updateSettings({ magicEraserMode: m })
            }
        }}
    />
)

DesignModeSelectorContainer.propTypes = {
    settings: previewSettingsType.isRequired,
    updateSettings: func.isRequired,
}

const mapStateToProps = (state) => ({
    settings: getPreviewSettings(state),
})

const mapDispatchToProps = {
    updateSettings: updatePreviewSettings,
}

export default connect(mapStateToProps, mapDispatchToProps)(DesignModeSelectorContainer)
