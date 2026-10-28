export interface DebugSettings {
    linesViz: boolean
    geometryViz: boolean
    lightsViz: boolean
    depthViz: boolean
    imitateLowPerformance: boolean
    ssViz: boolean
    nsViz: boolean
    environmentViz: boolean
    environmentVizEquirect: boolean
    environmentVizBackground: boolean
    highlightPlanes: boolean
    defaultToFloor: boolean
    useFloorContactShadows: boolean
    disableFloorDirectSpecular: boolean
    useAlternateEnvMap: boolean
    useRoomBuilderEnvMap: boolean
    keepLocallyGeneratedLights: boolean
    frontSideShadows: boolean
    enableWalls: boolean
    disable3DCompositionSave: boolean
    showMemoryStats: boolean
    trackedMemoryType: number
    showDebugConsole: boolean
    showProductAdminData: boolean
    ctxLossFrequencyWindow: number
    disablePins: boolean
    stackablesMinInteractibleDepth: number
    enableObjectInspector?: boolean
}

export type DebugMessage = {
    tag: string
    message: string
    id: number
    timestamp: number
}
