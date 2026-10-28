import { DebugSettings } from 'Renderer/geomviewer'
import { Composition } from 'models/compositions'
import { PreviewSettings } from 'models/preview'
import { TFunction } from 'i18next'
import { PreviewVC } from './PreviewVC'

export type Dimensions = {
    width: number
    height: number
}

export type PreviewProps = {
    composition?: Composition
    customContext: string
    canvasWidth: number
    canvasHeight: number
    maxHeight: number
    hasError: boolean
    debugSettings: DebugSettings
    previewSettings: PreviewSettings
    clearSelection: () => void
    newRenderer: () => void
    destroyRenderer: () => void
    settings: PreviewSettings
    t: TFunction
    onUpdateCompositionSaveData: () => void
    hasRendered: boolean
    correctOrientation?: boolean
    wallDimensions: Dimensions
    showMissingWallsModal: boolean
    closeMissingWallsModal: () => void
    onContextLost: () => void
    onContextCreationError: () => void
    onContextRestored: () => void
    setShowDesignSummary: () => void
    canvasKey: string
    isPlacementMode: boolean
    isStackableDraggingMode: boolean
    hoverRenderItemId: number | null
    isDragging: boolean
    isDragDestinationValid: boolean
    isCameraInOrbitMode: boolean
    isCameraInOrbitModeMoving: boolean
    onClick: () => void
    draggingRenderItemId: number
    productDimensionsEnabled: boolean
    roomDimensionsEnabled: boolean
    dynamicMeasurementsEnabled: boolean
}

export default PreviewVC
export { PreviewVC }
