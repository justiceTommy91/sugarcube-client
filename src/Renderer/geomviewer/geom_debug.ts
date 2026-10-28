import { AutoExposureMeasurementMethod, ToneMapType } from "./geom_constants";

/**
 * Debug settings usually, but not always, correspond to options in the developer panel.
 */
export type DebugSettings = {
    analyticLightsContribution: boolean;
    aoMapIntensity: number;
    canEditArtSize: boolean;
    ctxLossFrequencyWindow: number;
    defaultToFloor: boolean;
    depthViz: boolean;
    directionalLightIntensities: number[];
    enableWalls: boolean;
    disable3DCompositionSave: boolean;
    environmentIntensity: number;
    environmentRotation: number;
    environmentViz: boolean;
    environmentVizEquirect: boolean;
    environmentVizBackground: boolean;
    frontSideShadows: boolean;
    /**
     * Disables pins (debug settings)
     */
    disablePins: boolean;
    highlightPlanes: boolean;
    imitateLowPerformance: boolean;
    selectionOutlineThickness: number,
    lightsViz: boolean;
    linesViz: boolean;
    geometryViz: boolean;
    normalsViz: boolean;
    nsViz: boolean;
    pointLightIntensities: number[];
    spotLightIntensities: number[];
    areaLightIntensities: number[];
    showMemoryStats: boolean;
    showDebugConsole: boolean;
    showProductAdminData: boolean;
    ssViz: boolean;
    toneMappingExposureCompensation: number;
    toneMappingType: number;
    toneMapCurve: ToneMapType;
    autoExposure: boolean;
    autoExposureLogCanvas: boolean;
    autoExposureTarget: number;
    autoExposureMeasurementMethod: AutoExposureMeasurementMethod;
    trackedMemoryType: number;
    useAlternateEnvMap: boolean;
    disableFloorDirectSpecular: boolean;
    useFloorContactShadows: boolean;
    useRoomBuilderEnvMap: boolean;
    keepLocallyGeneratedLights: boolean;
    useTAAforScreenshots: boolean;
    useFilmicLUT: boolean;
    disableParallaxMapping: boolean;
    saturationDampIntensity: number;
    disableLightingEffects: boolean;
    showShadowMap: boolean;
    interItemShadows: boolean;
    blockerSearchRadiusMultiplier: number;
    pcfFilterRadiusMultiplier: number;
    poissonKernelSize: number;
    sunLightIntensity: number;
    sunLightDeltaX: number;
    sunLightDeltaY: number;
    sunLightDeltaZ: number;
    skyLightIntensity: number;
    wallFurnitureShadowIntensity: number;
    disableDollhouseShadows: boolean;
    discardSecondaryViews?: boolean;
    animateViewChange?: boolean;
    forceFXAA?: boolean;
    placeableHintAlwaysVisible?: boolean;
    placeableHintPlaneGap?: number;
    placeableHintFurnitureGap?: number;
    enablePositioningHelper?: boolean;
    enableSamplingVisualizer?: boolean;
    enableObjectInspector?: boolean;
    posHelperOnFloor?: boolean;
    posHelperOnWall?: boolean;
    posHelperOnWallFloorEdge?: boolean;
    posHelperSizeX?: number;
    posHelperSizeY?: number;
    posHelperSizeZ?: number;
    stackablesOnFloor?: boolean
    stackablesMinInteractibleDepth?: number
    showColorIdOutput?: boolean
    showPinsManagerOutput?: boolean
    pinsCandidateRadiusTolerance?: number
    pinsMinAcceptableRadius?: number
    pinsColorIdInflation: number
    pinsColorIdInflationMultiplier: number
    blockingItemsRaycastCheck?: boolean
    blockingItemsRaycastDistance?: number
    blockingItemsWallFacingCheck?: boolean
    blockingItemsWallFacingCheckInDollhouse?: boolean
    enableXRay?: boolean
    enableFocus?: boolean
    vAOlightIntensity: number
    vAOdarkIntesity: number
    vAOcontrast: number
    vAOdirectDiffuse: boolean
    vAOindirectDiffuse: boolean
    vAOdirectSpecular: boolean
    vAOindirectSpecular: boolean
    orbitCameraMinElevation?: number
    orbitCameraMaxElevation?: number
    orbitCameraMouseWheelDolly?: boolean
    enableGTAO?: boolean
    gtaoRadius?: number
    gtaoIntensity?: number
    showFPSCounter?: boolean
    disableSceneOcclusion?: boolean
}

