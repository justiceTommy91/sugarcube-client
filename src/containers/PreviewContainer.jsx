/* eslint-disable i18next/no-literal-string */
/*
    This the composition preview Container.
    This is the drop target for ArtItems.
*/

import React, { Component } from 'react'
import { func, string, number, bool } from 'prop-types'
import { connect } from 'react-redux'
import { compositionType, debugSettingsType, previewSettingsType, dimensionsType } from 'models/propTypes'
import DeviceOrientation, { Orientation } from 'components/ScreenOrientation'
import classNames from 'classnames'

import { CONTEXT_DEFAULT } from 'constants/contexts'
import getMaxWindowSize from 'utils/getMaxWindowSize'

import {
    getHasErrorLoading,
    getSelectedComposition,
    getHoverRenderItemId,
    getIsDraggingRenderItem,
    getDraggingRenderItemId,
} from 'models/compositions/selectors'
import {
    getIsCurrentDragValid,
    getPreviewSettings,
    getIsMagicWindowLoading,
    getWallDataDimensions,
} from 'models/preview/selectors'
import { getDebugSettings } from 'models/admin/selectors'
import { getCanvasWidth } from 'models/location/selectors'
import {
    getShowMissingWallsModal,
    getOrientation,
    getShouldShowChangeView,
    getShouldShowColorPicker,
    getShouldShowDollhouseViews,
    getShouldShowMeasurementsPopover,
    getProductDimensionsEnabled,
    getRoomDimensionsEnabled,
    getDynamicMeasurementsEnabled,
} from 'models/ui/selectors'
// TODO move this to the renderer selector
import { getRenderer } from 'models/refStore/selectors'
import { selectCompositionRenderItem, updateCompositionSaveData } from 'models/compositions/actions'
import {
    newRenderer,
    destroyRenderer,
    webglContextLost,
    webglContextNotCreated,
    webglContextRestored,
} from 'models/renderer/actions'
import {
    showMissingWallsModal as showMissingWallsModalAction,
    setMobileOrientation as setMobileOrientationAction,
    showChangeView as showChangeViewAction,
    showColorPicker as showColorPickerAction,
    showDollhouseViews as showDollhouseViewsAction,
    showMeasurementsPopover as showMeasurementsPopoverAction,
} from 'models/ui/actions'
import Preview from 'components/preview'
import { withTranslation } from 'react-i18next'

import SugarcubeContext from 'apps/SugarcubeContext'
import {
    getHasRendered,
    getCanvasKey,
    getIsPlacementMode,
    getIsStackableDraggingMode,
    getIsDragDestinationValid,
    getIsCameraInOrbitMode,
    getIsCameraInOrbitModeMoving,
} from 'models/renderer/selectors'
import { ORIENTATION_LANDSCAPE, ORIENTATION_PORTRAIT } from 'models/ui/constants'
import { persistUserDataToLegacyUserData } from 'Renderer/geomviewer/legacy'
import { GeomViewer } from 'Renderer/geomviewer'
import { hasUsedEraser } from 'models/sessionStorage/actions'
import { allScenesAreStandard3D } from 'models/scenes/utils'

import { withPrefix } from 'gatsby'
import SSRIcon from '@ingka/ssr-icon'
import cross from '@ingka/ssr-icon/paths/cross'
import MultiViewToggle from 'components/MultiviewToggle'

const supportedOrientation = ORIENTATION_LANDSCAPE

class PreviewContainer extends Component {
    constructor(props) {
        super(props)
        this.onUpdateCompositionSaveData = this.onUpdateCompositionSaveData.bind(this)
        this.onOrientationChange = this.onOrientationChange.bind(this)
        this.onRootNodeResize = this.onRootNodeResize.bind(this)

        this.defaultBgColor = null
        this.resizeObserver = new ResizeObserver(this.onRootNodeResize)

        this.state = {
            canvasWidth: 0,
            canvasHeight: 0,
        }
    }

    componentDidMount() {
        if (!this.node) {
            return
        }
        this.resizeObserver.observe(this.node)
    }

    componentDidUpdate(prevProps, prevState) {
        const { composition } = this.props
        const renderer = getRenderer()

        // Did the prevProps have a scene?
        const hasPrevSceneRef = !!prevProps?.composition?.scene

        // If we had a scene, did the ref change?
        const hasNewSceneRef = hasPrevSceneRef && composition && prevProps.composition.scene !== composition.scene

        // If the ref changed, has the id changed?
        const hasNewScene = hasNewSceneRef && prevProps?.composition?.scene.sceneId !== composition.scene.sceneId

        // TODO: It's weird that we can have the first scene coming in while we have a renderer
        // Seems like it's because the child didUpdate gets triggered before this one.
        // This should all be refactored to be clearer

        // Reset if there's a renderer and the scene has changed
        // Scene changed meaning we went from oldScene --> newScene, not noScene --> scene
        if (renderer && hasNewScene) {
            this.props.destroyRenderer()
        }

        // wall dimensions are updated from the
        const { wallDimensions } = this.props
        const { isMobile } = this.context
        let { canvasWidth } = prevState
        const { wallDimensions: newDimensions } = prevProps
        if (
            canvasWidth === 0 ||
            wallDimensions.width !== newDimensions.width ||
            wallDimensions.height !== newDimensions.height
        ) {
            // for mobile, the canvas will be set up in the Renderer
            if (!isMobile) {
                canvasWidth = this.props.canvasWidth || canvasWidth || getMaxWindowSize()
                const canvasHeight =
                    wallDimensions.width > 0 ? canvasWidth * (wallDimensions.height / wallDimensions.width) : 0
                this.setState({
                    canvasWidth,
                    canvasHeight,
                })
            }
        }
    }

    componentWillUnmount() {
        this.resizeObserver.unobserve(this.node)
    }

    onRootNodeResize() {
        const { isMobile } = this.context
        if (isMobile) {
            return
        }
        const size = this.determineCanvasSize()
        this.setState({
            canvasWidth: size.width,
            canvasHeight: size.height,
        })
    }

    onOrientationChange(orientation) {
        const { setMobileOrientation } = this.props
        setMobileOrientation(orientation)
    }

    onUpdateCompositionSaveData(data) {
        const { composition, onUpdateCompositionSaveData } = this.props
        const viewerInfo = GeomViewer.bindings?.queryViewerInfo()

        const saveData = persistUserDataToLegacyUserData(data)

        if (composition) {
            const {
                savedProperties: { erasedSegments },
            } = composition
            const trackingInfo = {
                prevErasedSegments: erasedSegments || [],
                EraseableItems: viewerInfo?.erasableItems,
            }
            onUpdateCompositionSaveData(composition.id, saveData, trackingInfo)
        }
    }

    determineCanvasSize() {
        const { wallDimensions } = this.props
        const width = this.props.canvasWidth || this.node?.clientWidth || getMaxWindowSize()
        const height = wallDimensions.width > 0 ? width * (wallDimensions.height / wallDimensions.width) : 0
        return {
            width,
            height,
        }
    }

    render() {
        const {
            composition,
            customContext,
            hasError,
            debugSettings,
            previewSettings,
            settings,
            isPlacementMode,
            isStackableDraggingMode,
            t,
            isMagicWindowLoading,
            onCloseMagicWindow,
            hasRendered,
            wallDimensions,
            showMissingWallsModal,
            closeMissingWallsModal,
            onContextLost,
            maxHeight,
            onContextCreationError,
            onContextRestored,
            setShowDesignSummary,
            orientation,
            canvasKey,
            setHasUsedEraser,
            hoverRenderItemId,
            isDragging,
            showChangeView,
            shouldShowChangeView,
            showMultiView,
            isDragDestinationValid,
            isCameraInOrbitMode,
            isCameraInOrbitModeMoving,
            shouldShowColorPicker,
            showColorPicker,
            draggingRenderItemId,
            shouldShowDollhouseViews,
            showDollhouseViews,
            showMeasurementsPopover,
            shouldShowMeasurements,
            productDimensionsEnabled,
            roomDimensionsEnabled,
            dynamicMeasurementsEnabled,
        } = this.props

        const { canvasWidth, canvasHeight } = this.state

        const { isMobile, isUpptacka } = this.context

        let maxWidth = null
        const multiViewSpace = showMultiView && !isUpptacka ? 95 : 0
        const magicEraseSpace = composition?.canMagicErase && !isUpptacka ? 100 : 0
        const shouldCanvasFillSpace = allScenesAreStandard3D(this.props.composition?.scene)
        const useMaxHeight = isMobile ? window.innerHeight : maxHeight - (multiViewSpace + magicEraseSpace)
        if (!shouldCanvasFillSpace && useMaxHeight && wallDimensions.height > 0) {
            const aspect = wallDimensions.width / wallDimensions.height
            maxWidth = useMaxHeight * aspect
        }

        const correctOrientation = isMobile && orientation === supportedOrientation

        const clearSelection = () => {
            this.props.clearSelection()
            GeomViewer.bindings?.doAction('deselect-all')
        }

        // TODO: Violates encapsulation, is tightly coupled with MultiViewModal.tsx
        const hideModalsOnPreviewClick = () => {
            if (showMultiView && shouldShowChangeView) {
                showChangeView(false)
            }

            if (shouldShowColorPicker) {
                showColorPicker(false)
            }

            if (shouldShowDollhouseViews) {
                showDollhouseViews(false)
            }

            if (shouldShowMeasurements) {
                showMeasurementsPopover(false)
            }
        }

        const previewContent = (
            <div
                className={classNames('PreviewContainer', { mobile: isMobile, correctOrientation, showMultiView })}
                style={{ maxWidth }}
                ref={(node) => (this.node = node)}
            >
                <Preview
                    composition={composition}
                    customContext={customContext}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    maxHeight={maxHeight}
                    hasError={hasError}
                    debugSettings={debugSettings}
                    previewSettings={previewSettings}
                    clearSelection={clearSelection}
                    newRenderer={this.props.newRenderer}
                    destroyRenderer={this.props.destroyRenderer}
                    settings={settings}
                    isPlacementMode={isPlacementMode}
                    isStackableDraggingMode={isStackableDraggingMode}
                    onUpdateCompositionSaveData={this.onUpdateCompositionSaveData}
                    correctOrientation={correctOrientation}
                    hasRendered={hasRendered}
                    wallDimensions={wallDimensions}
                    showMissingWallsModal={showMissingWallsModal}
                    closeMissingWallsModal={closeMissingWallsModal}
                    onContextLost={onContextLost}
                    onContextCreationError={onContextCreationError}
                    onContextRestored={onContextRestored}
                    setShowDesignSummary={setShowDesignSummary}
                    canvasKey={canvasKey}
                    setHasUsedEraser={setHasUsedEraser}
                    hoverRenderItemId={hoverRenderItemId}
                    isDragging={isDragging}
                    isDragDestinationValid={isDragDestinationValid}
                    isCameraInOrbitMode={isCameraInOrbitMode}
                    isCameraInOrbitModeMoving={isCameraInOrbitModeMoving}
                    onClick={hideModalsOnPreviewClick}
                    draggingRenderItemId={draggingRenderItemId}
                    productDimensionsEnabled={productDimensionsEnabled}
                    roomDimensionsEnabled={roomDimensionsEnabled}
                    dynamicMeasurementsEnabled={dynamicMeasurementsEnabled}
                />
                {showMultiView && isUpptacka && <MultiViewToggle />}
            </div>
        )

        const result = isMobile ? (
            <DeviceOrientation lockOrientation={supportedOrientation} onOrientationChange={this.onOrientationChange}>
                <Orientation orientation={supportedOrientation}>
                    <div style={{ height: window.innerHeight }} className="ContainerBackground">
                        {previewContent}
                    </div>
                </Orientation>
                <Orientation orientation={ORIENTATION_PORTRAIT} alwaysRender={false}>
                    {!isMagicWindowLoading && (
                        <div className="RotatePrompt" ref={(node) => (this.node = node)}>
                            <div className="RotateBackground" />
                            <div className="RotateMessage">
                                <div className="RotateIcon">
                                    <img
                                        src={withPrefix('/images/graphics/phone_rotate.svg')}
                                        alt={t('design.alt.no user uploaded rooms')}
                                    />
                                </div>
                                <div>{t('mobile.rotate phone')}</div>
                            </div>
                            <div className="CloseBtnRoot">
                                <button className="CloseButton" onClick={onCloseMagicWindow}>
                                    <SSRIcon paths={cross} />
                                </button>
                            </div>
                        </div>
                    )}
                </Orientation>
            </DeviceOrientation>
        ) : (
            previewContent
        )

        return result
    }
}

PreviewContainer.contextType = SugarcubeContext
PreviewContainer.defaultProps = {
    composition: null,
    customContext: CONTEXT_DEFAULT,
    maxHeight: null,
    canvasWidth: null,
    onCloseMagicWindow: null,
    hoverRenderItemId: null,
}

PreviewContainer.propTypes = {
    composition: compositionType,
    customContext: string,
    maxHeight: number,
    hasError: bool.isRequired,
    debugSettings: debugSettingsType.isRequired,
    previewSettings: previewSettingsType.isRequired,

    clearSelection: func.isRequired,
    newRenderer: func.isRequired,
    destroyRenderer: func.isRequired,
    settings: previewSettingsType.isRequired,
    canvasWidth: number,
    isPlacementMode: bool.isRequired,
    isStackableDraggingMode: bool.isRequired,
    onUpdateCompositionSaveData: func.isRequired,
    t: func.isRequired,
    isMagicWindowLoading: bool.isRequired,
    onCloseMagicWindow: func,
    hasRendered: bool.isRequired,
    wallDimensions: dimensionsType.isRequired,
    showMissingWallsModal: bool.isRequired,
    closeMissingWallsModal: func.isRequired,
    onContextLost: func.isRequired,
    onContextCreationError: func.isRequired,
    onContextRestored: func.isRequired,
    setShowDesignSummary: func.isRequired,
    setMobileOrientation: func.isRequired,
    orientation: string.isRequired,
    canvasKey: string.isRequired,
    setHasUsedEraser: func.isRequired,
    hoverRenderItemId: number,
    isDragging: bool.isRequired,
    showChangeView: func.isRequired,
    shouldShowChangeView: bool.isRequired,
    showMultiView: bool.isRequired,
    isDragDestinationValid: bool.isRequired,
    isCameraInOrbitMode: bool.isRequired,
    isCameraInOrbitModeMoving: bool.isRequired,
    shouldShowColorPicker: bool.isRequired,
    showColorPicker: func.isRequired,
    draggingRenderItemId: number.isRequired,
    shouldShowDollhouseViews: bool.isRequired,
    showDollhouseViews: func.isRequired,
    showMeasurementsPopover: func.isRequired,
    shouldShowMeasurements: bool.isRequired,
    productDimensionsEnabled: bool.isRequired,
    roomDimensionsEnabled: bool.isRequired,
    dynamicMeasurementsEnabled: bool.isRequired,
}

const mapStateToProps = (state, props) => ({
    composition: props.composition || getSelectedComposition(state),
    hasError: getHasErrorLoading(state),
    isCurrentDragValid: getIsCurrentDragValid(state),
    debugSettings: getDebugSettings(state),
    previewSettings: getPreviewSettings(state),
    settings: getPreviewSettings(state),
    canvasWidth: getCanvasWidth(state),
    isPlacementMode: getIsPlacementMode(state),
    isStackableDraggingMode: getIsStackableDraggingMode(state),
    isMagicWindowLoading: getIsMagicWindowLoading(state),
    hasRendered: getHasRendered(state),
    wallDimensions: getWallDataDimensions(state),
    showMissingWallsModal: getShowMissingWallsModal(state),
    orientation: getOrientation(state),
    canvasKey: getCanvasKey(state),
    hoverRenderItemId: getHoverRenderItemId(state),
    isDragging: getIsDraggingRenderItem(state),
    shouldShowChangeView: getShouldShowChangeView(state),
    isDragDestinationValid: getIsDragDestinationValid(state),
    isCameraInOrbitMode: getIsCameraInOrbitMode(state),
    isCameraInOrbitModeMoving: getIsCameraInOrbitModeMoving(state),
    shouldShowColorPicker: getShouldShowColorPicker(state),
    draggingRenderItemId: getDraggingRenderItemId(state),
    shouldShowDollhouseViews: getShouldShowDollhouseViews(state),
    shouldShowMeasurements: getShouldShowMeasurementsPopover(state),
    productDimensionsEnabled: getProductDimensionsEnabled(state),
    roomDimensionsEnabled: getRoomDimensionsEnabled(state),
    dynamicMeasurementsEnabled: getDynamicMeasurementsEnabled(state),
})

const mapDispatchToProps = (dispatch) => ({
    clearSelection: () => dispatch(selectCompositionRenderItem(-1)),
    newRenderer: () => dispatch(newRenderer()),
    destroyRenderer: () => dispatch(destroyRenderer()),
    onUpdateCompositionSaveData: (...args) => dispatch(updateCompositionSaveData(...args)),
    closeMissingWallsModal: () => dispatch(showMissingWallsModalAction(false)),
    onContextLost: () => dispatch(webglContextLost()),
    onContextCreationError: () => dispatch(webglContextNotCreated()),
    onContextRestored: () => dispatch(webglContextRestored()),
    setMobileOrientation: (orientation) => dispatch(setMobileOrientationAction(orientation)),
    setHasUsedEraser: () => dispatch(hasUsedEraser()),
    showChangeView: (show) => dispatch(showChangeViewAction(show)),
    showColorPicker: (show) => dispatch(showColorPickerAction(show)),
    showDollhouseViews: (show) => dispatch(showDollhouseViewsAction(show)),
    showMeasurementsPopover: (show) => dispatch(showMeasurementsPopoverAction(show)),
})

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(PreviewContainer))
