import { ToneMapType } from 'Renderer/geomviewer/geom_constants'

export type PreviewSettings = {
    canvasWidth: number
    isSyntheticScene: boolean
    isRoomBuilderScene: boolean
    is3dMeshScene: boolean
    maxTextureSize: number
    canMagicErase: boolean
    hasTexturedWalls: boolean
    toneMapType: ToneMapType
    exposureCompensation: number
    onOffOptions: {
        collectFrameMetric: boolean
        disableOutline: boolean
        magicEraserMode: boolean
        showItemLoaders: boolean
        showOcclusions: boolean
        showShadows: boolean
        usePBR: boolean
        wallCollisions: boolean
        enableDebugControls: boolean
        useAutoExposure: boolean
    }
    featureFlags: {
        useWallColorAntialias: boolean
        webOwnRoomWallColor: boolean
        helaWallColor: boolean
        cameraOrbitMode: boolean
    }
    mobileFeatures: {
        noAA: boolean
        noWallColor: boolean
        sequentialLoading: boolean
        enableFXAA: boolean
    }
    // Provisional flag to tell the veiwer we need to apply specific transformations on composition load.
    needs3DCompLoadPatch?: boolean
}

export type Viewport = {
    id: string
    name: string
    thumbnailUrl?: string
}
