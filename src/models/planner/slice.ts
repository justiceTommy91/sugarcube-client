import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    TemplateState,
    MaterialsState,
    DoorsState,
    WindowsState,
    AssetState,
    JsonTemplateResolvedAssets,
    PlannerSessionTrackingState,
    SemanticType,
} from 'models/planner/index'

type PlannerState = {
    isRoomBuilderEditor: boolean
    templates: TemplateState
    isLoadingAllData: boolean
    templateDataResolved: boolean
    isLoadingTemplates: boolean
    selectedTemplateUuid: string | null
    materials: MaterialsState
    isLoadingMaterials: boolean
    selectedMaterialUuid: string | null
    doors: DoorsState
    isLoadingDoors: boolean
    windows: WindowsState
    isLoadingWindows: boolean
    selectedColorIndex: number
    isLoadingAssets: boolean
    assets: AssetState
    sessionTracking: PlannerSessionTrackingState
}

export const initialtrackingState: PlannerSessionTrackingState = {
    compositionItemsMovedByUser: [],
    compositionItemsMovedIndirectly: [],
    wallElementsMovedByUser: [],
    wallElementsMovedIndirectly: [],
    nodesMoved: [],
    numCompositionItemsMovementsByUser: 0,
    numWallElementItemMovementsByUser: 0,
    numCompositionItemsMovementsIndirect: 0,
    numWallElementItemMovementsIndirect: 0,
    wallColorChanged: false,
    numWallEdits: 0,
    floorMaterialChanged: false,
    numWindowsAdded: 0,
    numDoorsAdded: 0,
    numWindowsDeleted: 0,
    numDoorsdeleted: 0,
    numCompositionItemsDeleted: 0,
    numNodesAdded: 0,
    numNodesDeleted: 0,
}

export const initialState: PlannerState = {
    isRoomBuilderEditor: false,
    templates: {},
    templateDataResolved: false,
    isLoadingAllData: false,
    isLoadingTemplates: false,
    selectedTemplateUuid: null,
    materials: {},
    isLoadingMaterials: false,
    selectedMaterialUuid: null,
    doors: {},
    isLoadingDoors: false,
    windows: {},
    isLoadingWindows: false,
    selectedColorIndex: 0,
    isLoadingAssets: false,
    assets: {},
    sessionTracking: {
        ...initialtrackingState,
    },
}

export const plannerSlice = createSlice({
    name: 'planner',
    initialState,
    reducers: {
        setIsRoomBuilderEditor: (state, action: PayloadAction<boolean>) => {
            state.isRoomBuilderEditor = action.payload
        },
        clearSessionTracking: (state) => {
            state.sessionTracking = { ...initialtrackingState }
        },
        requestAllData: (state) => {
            state.isLoadingTemplates = true
            state.isLoadingMaterials = true
            state.isLoadingAssets = true
        },
        resolvedData: (state, action: PayloadAction<JsonTemplateResolvedAssets[]>) => {
            action.payload.forEach((templateAssets) => {
                const template = state.templates[templateAssets.templateUuid]
                if (template) {
                    template.data.assets = templateAssets.assets
                }
            })
            state.templateDataResolved = true
            state.isLoadingAllData = false
        },
        failedResolveData: (state) => {
            state.isLoadingAllData = false
        },
        receiveTemplates: (state, action: PayloadAction<TemplateState>) => {
            state.templates = action.payload
            state.isLoadingTemplates = false
        },
        failedReceiveTemplates: (state) => {
            state.isLoadingTemplates = false
        },
        setSelectedTemplateUuid: (state, action: PayloadAction<string>) => {
            state.selectedTemplateUuid = action.payload
            // Reset selections when a template is selected
            state.selectedColorIndex = 0
            state.selectedMaterialUuid = Object.values(state.materials)[0]?.uuid ?? null
        },
        resetSelectedTemplateToDefault: (state) => {
            // Pick the first template (rectangular) so re-entering Room Builder
            // starts from the default selection instead of the previous session's.
            const firstTemplate = Object.values(state.templates)[0]
            state.selectedTemplateUuid = firstTemplate?.uuid ?? null
        },
        receiveDoors: (state, action: PayloadAction<DoorsState>) => {
            state.doors = action.payload
            state.isLoadingDoors = false
        },
        failedReceiveDoors: (state) => {
            state.isLoadingDoors = false
        },
        receiveWindows: (state, action: PayloadAction<WindowsState>) => {
            state.windows = action.payload
            state.isLoadingWindows = false
        },
        failedReceiveWindows: (state) => {
            state.isLoadingWindows = false
        },
        receiveMaterials: (state, action: PayloadAction<MaterialsState>) => {
            state.materials = action.payload
            state.isLoadingMaterials = false
        },
        failedReceiveMaterials: (state) => {
            state.isLoadingMaterials = false
        },
        setSelectedMaterialUuid: (state, action: PayloadAction<string>) => {
            state.selectedMaterialUuid = action.payload
        },
        userSelectMaterialUuid: (state, action: PayloadAction<string>) => {
            state.sessionTracking.floorMaterialChanged = true
            plannerSlice.caseReducers.setSelectedMaterialUuid(state, action)
        },
        setSelectedColorIndex: (state, action: PayloadAction<number>) => {
            state.selectedColorIndex = action.payload
        },
        userSelectColorIndex: (state, action: PayloadAction<number>) => {
            state.sessionTracking.wallColorChanged = true
            plannerSlice.caseReducers.setSelectedColorIndex(state, action)
        },
        receiveAssets: (state, action: PayloadAction<AssetState>) => {
            state.assets = action.payload
            state.isLoadingAssets = false
        },
        failedReceiveAssets: (state) => {
            state.isLoadingAssets = false
        },
        wallEdited: (
            state,
            action: PayloadAction<{
                itemsMoved: string[]
                wallElementsMoved: string[]
            }>,
        ) => {
            const { itemsMoved, wallElementsMoved } = action.payload
            state.sessionTracking.numWallEdits += 1
            state.sessionTracking.numCompositionItemsMovementsIndirect += itemsMoved.length
            state.sessionTracking.numWallElementItemMovementsIndirect += wallElementsMoved.length

            const allMovedItems = state.sessionTracking.compositionItemsMovedIndirectly
            state.sessionTracking.compositionItemsMovedIndirectly = [
                ...allMovedItems,
                ...itemsMoved.filter((item) => !allMovedItems.includes(item)),
            ]

            const allMovedElements = state.sessionTracking.wallElementsMovedIndirectly
            state.sessionTracking.wallElementsMovedIndirectly = [
                ...allMovedElements,
                ...wallElementsMoved.filter((item) => !allMovedElements.includes(item)),
            ]
        },
        compositionItemMoved: (
            state,
            action: PayloadAction<{
                itemId: string
            }>,
        ) => {
            state.sessionTracking.numCompositionItemsMovementsByUser += 1
            const { itemId } = action.payload
            if (!state.sessionTracking.compositionItemsMovedByUser.includes(itemId)) {
                state.sessionTracking.compositionItemsMovedByUser.push(itemId)
            }
        },
        compositionItemDeleted: (state) => {
            state.sessionTracking.numCompositionItemsDeleted += 1
        },
        wallElementMoved: (
            state,
            action: PayloadAction<{
                elementId: string
                semanticType: SemanticType
            }>,
        ) => {
            const { elementId, semanticType } = action.payload
            state.sessionTracking.numWallElementItemMovementsByUser += 1
            if (!state.sessionTracking.wallElementsMovedByUser.find((i) => i.id === elementId)) {
                state.sessionTracking.wallElementsMovedByUser.push({
                    id: elementId,
                    type: semanticType,
                })
            }
        },
        wallElementAdded: (
            state,
            action: PayloadAction<{
                semanticType: SemanticType
            }>,
        ) => {
            const { semanticType } = action.payload
            switch (semanticType) {
                case 'DOOR':
                    state.sessionTracking.numDoorsAdded += 1
                    break
                case 'WINDOW':
                    state.sessionTracking.numWindowsAdded += 1
                    break
                default:
                    break
            }
        },
        wallElementDeleted: (
            state,
            action: PayloadAction<{
                semanticType: SemanticType
            }>,
        ) => {
            const { semanticType } = action.payload
            switch (semanticType) {
                case 'DOOR':
                    state.sessionTracking.numDoorsdeleted += 1
                    break
                case 'WINDOW':
                    state.sessionTracking.numWindowsDeleted += 1
                    break
                default:
                    break
            }
        },
        vertexMoved: (
            state,
            action: PayloadAction<{
                vertexId: string
            }>,
        ) => {
            const { vertexId } = action.payload
            if (!state.sessionTracking.nodesMoved.includes(vertexId)) {
                state.sessionTracking.nodesMoved.push(vertexId)
            }
        },
        vertexAdded: (state) => {
            state.sessionTracking.numNodesAdded += 1
        },
        vertexDeleted: (state) => {
            state.sessionTracking.numNodesDeleted += 1
        },
    },
})

export const {
    setIsRoomBuilderEditor,
    clearSessionTracking,
    requestAllData,
    resolvedData,
    failedResolveData,
    receiveTemplates,
    failedReceiveTemplates,
    setSelectedTemplateUuid,
    resetSelectedTemplateToDefault,
    receiveMaterials,
    failedReceiveMaterials,
    receiveDoors,
    failedReceiveDoors,
    receiveWindows,
    failedReceiveWindows,
    setSelectedMaterialUuid,
    userSelectMaterialUuid,
    setSelectedColorIndex,
    userSelectColorIndex,
    receiveAssets,
    failedReceiveAssets,
    wallEdited,
    compositionItemMoved,
    compositionItemDeleted,
    wallElementMoved,
    wallElementAdded,
    wallElementDeleted,
    vertexMoved,
    vertexAdded,
    vertexDeleted,
} = plannerSlice.actions
