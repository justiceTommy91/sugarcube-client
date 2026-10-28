import { createSelector } from 'reselect'
import type { RootState } from 'store'

import { type JsonTemplate, type PlannerSessionStats } from '.'

export const getIsRoomBuilderEditor = (state: RootState) => state.planner.isRoomBuilderEditor
export const getTemplates = (state: RootState) => state.planner.templates
export const getIsLoadingTemplates = (state: RootState) => state.planner.isLoadingTemplates
export const getIsTemplateDataResolved = (state: RootState) => state.planner.templateDataResolved
export const getMaterials = (state: RootState) => state.planner.materials
export const getDoors = (state: RootState) => state.planner.doors
export const getWindows = (state: RootState) => state.planner.windows
export const getAssets = (state: RootState) => state.planner.assets
export const getIsLoadingAssets = (state: RootState) => state.planner.isLoadingAssets
export const getIsLoadingDoors = (state: RootState) => state.planner.isLoadingDoors
export const getIsLoadingWindows = (state: RootState) => state.planner.isLoadingWindows
export const getIsLoadingMaterials = (state: RootState) => state.planner.isLoadingMaterials
export const getSelectedTemplateUuid = (state: RootState) => state.planner.selectedTemplateUuid
export const getSelectedMaterialUuid = (state: RootState) => state.planner.selectedMaterialUuid
export const getSelectedColorIndex = (state: RootState) => state.planner.selectedColorIndex
export const getIsLoadingAllData = (state: RootState) => state.planner.isLoadingAllData

export const getSelectedTemplateRoomInfo = createSelector(
    [getTemplates, getSelectedTemplateUuid],
    (templates, selectedTemplateUuid) => {
        const templatesArray = Object.values(templates)
        if (!templatesArray?.length || (selectedTemplateUuid && !templates[selectedTemplateUuid])) {
            return null
        }
        // if no template selected, select roomInfo for the first template
        if (!selectedTemplateUuid) {
            const template: JsonTemplate = templatesArray[0]
            return {
                roomTemplate: template.data,
            }
        }
        // else return the roomInfo for selected template
        const template: JsonTemplate = templates[selectedTemplateUuid]
        return {
            roomTemplate: template.data,
        }
    },
)

export const getLightAssets = createSelector([getAssets], (assets) => {
    const assetsArray = Object.values(assets)
    return assetsArray.filter((asset) => asset.assetType === 'MODEL' && asset.semanticClass.includes('LIGHT'))
})

export const getAssetInfo = createSelector([getAssets, (state, assetUuid) => assetUuid], (assetsById, assetUuid) => {
    if (!assetUuid) {
        return null
    }
    return assetsById[assetUuid] || null
})

export const getSelectedChoices = createSelector(
    [getSelectedTemplateUuid, getSelectedMaterialUuid, getSelectedColorIndex],
    (selectedTemplateUuid, selectedMaterialUuid, selectedWallColorIndex) => ({
        TemplateUuid: selectedTemplateUuid,
        MaterialUuid: selectedMaterialUuid,
        ColorIndex: selectedWallColorIndex,
    }),
)

export const getSessionTracking = (state: RootState) => state.planner.sessionTracking
export const getSessionStats = createSelector(
    [getSessionTracking],
    (sessionTracking): PlannerSessionStats => ({
        WallSummary: {
            WallColor: {
                Changed: sessionTracking.wallColorChanged,
            },
            NumWallEdits: sessionTracking.numWallEdits,
            NumItemsMoved: sessionTracking.compositionItemsMovedIndirectly.length,
            NumItemsMovements: sessionTracking.numCompositionItemsMovementsIndirect,
            NumWallElementsMoved: sessionTracking.wallElementsMovedIndirectly.length,
            NumWallElementsMovements: sessionTracking.numWallElementItemMovementsIndirect,
        },
        FloorSummary: {
            Material: {
                Changed: sessionTracking.floorMaterialChanged,
            }
        },
        NodeSummary: {
            NumNodesAdded: sessionTracking.numNodesAdded,
            NumNodesDeleted: sessionTracking.numNodesDeleted,
            NumNodesMoved: sessionTracking.nodesMoved.length,
        },
        WallElementsSummary: {
            MumWindowsAdded: sessionTracking.numWindowsAdded,
            NumDoorsAdded: sessionTracking.numDoorsAdded,
            NumWindowsRemoved: sessionTracking.numWindowsDeleted,
            NumDoorsRemoved: sessionTracking.numDoorsdeleted,
            NumWindowsMoved: sessionTracking.wallElementsMovedByUser
                .filter(item => item.type === 'WINDOW').length,
            NumDoorsMoved: sessionTracking.wallElementsMovedByUser
                .filter(item => item.type === 'DOOR').length,
            NumWallElementsMovements: sessionTracking.numWallElementItemMovementsByUser,
        },
        ProductItemSummary: {
            NumItemsDeleted: sessionTracking.numCompositionItemsDeleted,
            NumItemsMoved: sessionTracking.compositionItemsMovedByUser.length,
            NumItemsMovements: sessionTracking.numCompositionItemsMovementsByUser,
        },
    }),
)