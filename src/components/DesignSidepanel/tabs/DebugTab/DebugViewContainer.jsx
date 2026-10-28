import React from 'react'
import { connect } from 'react-redux'
import { func, arrayOf, string, number } from 'prop-types'
import { debugSettingsType, compositionType, filterType, previewSettingsType } from 'models/propTypes'

import {
    updateDebugSettings,
    takeScreenshot,
    loseWebglContext,
    startSwapTestSaga,
    startLoadTestSaga,
    toggleDebugFeatures as toggleDebugFeaturesAction,
} from 'models/admin/actions'
import { updateSceneManifest } from 'models/scenes/actions'
import { getPreviewSettings } from 'models/preview/selectors'
import { getDebugSettings } from 'models/admin/selectors'
import { getSelectedComposition } from 'models/compositions/selectors'
import { getSubCatalogs, getFilter } from 'models/furniture/selectors'
import { updateFurnitureFilter as updateFurnitureFilterAction } from 'models/furniture/actions'
import { destroyRenderer as destroyRendererAction } from 'models/renderer/actions'
import { getUserId } from 'models/user/selectors'
import { getIsNewComposition } from 'models/compositions/helpers'

import Debug from './Debug'

const DebugViewContainer = ({
    debugSettings,
    previewSettings,
    update,
    composition,
    screenshot,
    loseContext,
    toggleDebugFeatures,
    updateManifest,
    subCatalogs,
    furnitureFilter,
    updateFurnitureFilter,
    startSwapTest,
    startLoadTest,
    destroyRenderer,
    userId,
}) => {
    const onManifestUpdate = (...args) => {
        updateManifest(...args)
        destroyRenderer()
    }

    // KLUDGE: fix for race condition where the composition isn't loaded at the time that the debug panel is mounted.
    if (!composition) {
        return null
    }

    if (!previewSettings.onOffOptions.enableDebugControls) {
        return null
    }

    const isNewComposition = getIsNewComposition(composition.id, composition.wid, userId)

    return (
        <Debug
            debugSettings={debugSettings}
            previewSettings={previewSettings}
            updateDebugSettings={update}
            composition={composition}
            isNewComposition={isNewComposition}
            takeScreenshot={screenshot}
            loseWebglContext={loseContext}
            toggleDebugFeatures={toggleDebugFeatures}
            updateManifest={onManifestUpdate}
            subCatalogs={subCatalogs}
            furnitureFilter={furnitureFilter}
            updateFurnitureFilter={updateFurnitureFilter}
            startSwapTest={startSwapTest}
            startLoadTest={startLoadTest}
        />
    )
}

DebugViewContainer.defaultProps = {
    composition: null,
    subCatalogs: null,
}

DebugViewContainer.propTypes = {
    debugSettings: debugSettingsType.isRequired,
    previewSettings: previewSettingsType.isRequired,
    update: func.isRequired,
    composition: compositionType,
    screenshot: func.isRequired,
    loseContext: func.isRequired,
    toggleDebugFeatures: func.isRequired,
    updateManifest: func.isRequired,
    subCatalogs: arrayOf(string),
    furnitureFilter: filterType.isRequired,
    updateFurnitureFilter: func.isRequired,
    startSwapTest: func.isRequired,
    startLoadTest: func.isRequired,
    destroyRenderer: func.isRequired,
    userId: number.isRequired,
}

const mapStateToProps = (state) => ({
    debugSettings: getDebugSettings(state),
    previewSettings: getPreviewSettings(state),
    composition: getSelectedComposition(state),
    subCatalogs: getSubCatalogs(state),
    furnitureFilter: getFilter(state),
    userId: getUserId(state),
})

const mapDispatchToProps = (dispatch) => ({
    update: (ds) => dispatch(updateDebugSettings(ds)),
    screenshot: () => dispatch(takeScreenshot()),
    loseContext: () => dispatch(loseWebglContext()),
    toggleDebugFeatures: () => dispatch(toggleDebugFeaturesAction()),
    updateManifest: (...args) => dispatch(updateSceneManifest(...args)),
    updateFurnitureFilter: (...args) => dispatch(updateFurnitureFilterAction(...args)),
    startSwapTest: (...args) => dispatch(startSwapTestSaga(...args)),
    startLoadTest: (...args) => dispatch(startLoadTestSaga(...args)),
    destroyRenderer: () => dispatch(destroyRendererAction()),
})

export default connect(mapStateToProps, mapDispatchToProps)(DebugViewContainer)
