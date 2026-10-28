import { useEffect, useCallback } from 'react'
import { connect } from 'react-redux'
import { bool, func, arrayOf, string } from 'prop-types'

import { debugSettingsType } from 'models/propTypes'

import { GeomViewer } from 'Renderer/geomviewer'

import { getDebugSettings } from 'models/admin/selectors'
import { getIsAdmin, getCanBeAdmin, getCanEnableDebugFeatures, getAreDebugFeaturesEnabled } from 'models/user/selectors'
import { getSubCatalogs } from 'models/furniture/selectors'
import {
    updateDebugSettings,
    takeScreenshot,
    toggleDebugFeatures as toggleDebugFeaturesAction,
} from 'models/admin/actions'
import { updateFurnitureFilter as updateFurnitureFilterAction } from 'models/furniture/actions'

/**
 * @param {Element} element
 * @returns {boolean}
 */
const hasTextInput = (element) => {
    if (!(element instanceof HTMLElement)) {
        return false
    }

    if ('value' in element) {
        return true
    }

    if (element.isContentEditable) {
        return true
    }

    return false
}

const DebugHotkeysContainer = ({
    debugSettings,
    update,
    screenshot,
    isAdmin,
    canEnableDebugFeatures,
    areDebugFeaturesEnabled,
    canBeAdmin,
    toggleDebugFeatures,
    subCatalogs,
    updateFurnitureFilter,
}) => {
    const handleKeydown = useCallback(
        (event) => {
            // console.debug(event.keyCode)

            const updateSubCatalog = (index) => {
                event.stopPropagation()
                event.preventDefault()

                if (index <= 0) {
                    updateFurnitureFilter({ subCatalog: '*' })
                }
                if (subCatalogs && subCatalogs[index - 1]) {
                    updateFurnitureFilter({ subCatalog: subCatalogs[index - 1] })
                }
            }
            const viewerInfo = GeomViewer.bindings?.queryViewerInfo()
            const isCameraInFreeMode = viewerInfo?.cameraState?.mode === 'free'

            if (areDebugFeaturesEnabled && !isCameraInFreeMode && !hasTextInput(event.target)) {
                switch (event.keyCode) {
                    case 68:
                        // char d
                        update({ showShadowMap: !debugSettings.showShadowMap })
                        break
                    case 70:
                        // char f
                        update({ geometryViz: !debugSettings.geometryViz })
                        break
                    case 71:
                        // char g
                        update({ linesViz: !debugSettings.linesViz })
                        break
                    case 72:
                        // char h
                        update({ highlightPlanes: !debugSettings.highlightPlanes })
                        break
                    case 76:
                        // char l
                        update({ disableLightingEffects: !debugSettings.disableLightingEffects })
                        break
                    case 77:
                        // char m
                        update({ showMemoryStats: !debugSettings.showMemoryStats })
                        break
                    case 78:
                        // char n
                        update({ nsViz: !debugSettings.nsViz })
                        break
                    case 79:
                        // char o
                        update({ disablePins: !debugSettings.disablePins })
                        break
                    case 80:
                        // char p
                        update({ showProductAdminData: !debugSettings.showProductAdminData })
                        break
                    case 82:
                        // char r
                        update({ canEditArtSize: !debugSettings.canEditArtSize })
                        break
                    case 83:
                        // char s
                        screenshot()
                        break
                    case 87:
                        // char w
                        update({ enableWalls: !debugSettings.enableWalls })
                        break
                    case 90:
                        // char z
                        update({ ssViz: !debugSettings.ssViz })
                        break
                    case 192:
                        // char ` (grave or tilde)
                        update({ showDebugConsole: !debugSettings.showDebugConsole })
                        break
                    default:
                        break
                }
            }
            if (canEnableDebugFeatures || canBeAdmin) {
                if (event.metaKey || event.ctrlKey) {
                    switch (event.key) {
                        case '0':
                            updateSubCatalog(0)
                            break
                        case '1':
                            updateSubCatalog(1)
                            break
                        case '2':
                            updateSubCatalog(2)
                            break
                        case '3':
                            updateSubCatalog(3)
                            break
                        case '4':
                            updateSubCatalog(4)
                            break
                        case '5':
                            updateSubCatalog(5)
                            break
                        default:
                            break
                    }
                }
            }
            if (canEnableDebugFeatures || canBeAdmin) {
                switch (event.keyCode) {
                    case 74:
                        if (event.metaKey || event.ctrlKey) {
                            // ctrl + j
                            event.stopPropagation()
                            event.preventDefault()
                            toggleDebugFeatures()
                        }
                        break
                    default:
                        break
                }
            }
        },
        [debugSettings, update, isAdmin, canEnableDebugFeatures, areDebugFeaturesEnabled, canBeAdmin, subCatalogs],
    )

    useEffect(() => {
        window.addEventListener('keydown', handleKeydown)
        return () => window.removeEventListener('keydown', handleKeydown)
    }, [handleKeydown])

    return null
}

DebugHotkeysContainer.defaultProps = {
    subCatalogs: null,
}

DebugHotkeysContainer.propTypes = {
    update: func.isRequired,
    debugSettings: debugSettingsType.isRequired,
    screenshot: func.isRequired,
    isAdmin: bool.isRequired,
    canEnableDebugFeatures: bool.isRequired,
    areDebugFeaturesEnabled: bool.isRequired,
    canBeAdmin: bool.isRequired,
    toggleDebugFeatures: func.isRequired,
    subCatalogs: arrayOf(string),
    updateFurnitureFilter: func.isRequired,
}

const mapStateToProps = (state) => ({
    debugSettings: getDebugSettings(state),
    isAdmin: getIsAdmin(state),
    canEnableDebugFeatures: getCanEnableDebugFeatures(state),
    areDebugFeaturesEnabled: getAreDebugFeaturesEnabled(state),
    canBeAdmin: getCanBeAdmin(state),
    subCatalogs: getSubCatalogs(state),
})

const mapDispatchToProps = {
    update: updateDebugSettings,
    screenshot: takeScreenshot,
    toggleDebugFeatures: toggleDebugFeaturesAction,
    updateFurnitureFilter: updateFurnitureFilterAction,
}

export default connect(mapStateToProps, mapDispatchToProps)(DebugHotkeysContainer)
