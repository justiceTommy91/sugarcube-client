import fetch from 'services'
import { type JsonTemplate, RoomAssetSlotsDescription } from 'models/planner/index'

export const getMaterials = () => fetch<RoomAssetSlotsDescription>(`/roomassetslot/roomBuilderFloorMaterials/`)
export const getDoors = () => fetch<RoomAssetSlotsDescription>(`/roomassetslot/roomBuilderDoors/`)
export const getWindows = () => fetch<RoomAssetSlotsDescription>(`/roomassetslot/roomBuilderWindows/`)

export const getRoomTemplates = () =>
    fetch<JsonTemplate[]>('/roomtemplate/', {
        params: {
            data_type: `json`,
        },
    })

export const getRoomAssets = () => fetch('/roomassets/')