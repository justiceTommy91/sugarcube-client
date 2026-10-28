import { rendererReady } from 'models/renderer/actions'
import { toggleSharePanelOpen } from 'models/ui/actions'
import { receiveFurniture } from 'models/furniture/actions'
import { addRoomToBag, addToBag } from 'features/shopping-bag/redux/actions'
import {
    deleteCompositionRenderItem,
    failedSaveComposition,
    openComposition,
    placeRenderItem,
    receiveCopyComposition,
    receiveRenameComposition,
    receiveSaveComposition,
    renderItemLoaded,
    requestSaveComposition,
    swapRenderItem,
    updateCompositionRenderItem,
} from './actions'

interface APIPlacedFurniture2D {
    furnitureId: number
    uniqueId: string
    x: number
    y: number
    heading: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gfxAttributes: Record<string, any>
}

interface APIPlacedFurniture3D extends APIPlacedFurniture2D {
    parentId: string
    parentAttachment: number | null
    z: number
    headingI: number
    headingJ: number
    headingK: number
    worldX?: number
    worldY: number
    worldZ: number
}

export type APIPlacedFurniture = APIPlacedFurniture2D | APIPlacedFurniture3D

export type ReceiveFurnitureAction = ReturnType<typeof receiveFurniture>
export type AddToBagAction = ReturnType<typeof addToBag>
export type AddRoomToBagAction = ReturnType<typeof addRoomToBag>
export type PlaceRenderAction = ReturnType<typeof placeRenderItem>
export type DeleteCompositionRenderItemAction = ReturnType<typeof deleteCompositionRenderItem>
export type SwapRenderItemAction = ReturnType<typeof swapRenderItem>
export type RenderItemLoadedAction = ReturnType<typeof renderItemLoaded>
export type UpdateCompositionRenderItemAction = ReturnType<typeof updateCompositionRenderItem>
export type RequestSaveCompositionAction = ReturnType<typeof requestSaveComposition>
export type FailedSaveCompositionAction = ReturnType<typeof failedSaveComposition>
type OpenCompositionActionBase = ReturnType<typeof openComposition>
export type OpenCompositionAction = OpenCompositionActionBase & {
    payload: OpenCompositionActionBase['payload'] & {
        isAlreadyOnDesignPage?: boolean
        preserveCurrentCompositionState?: boolean
    }
}
export type RendererReadyAction = ReturnType<typeof rendererReady>
export type SavedCompositionAction = ReturnType<
    typeof receiveCopyComposition | typeof receiveSaveComposition | typeof receiveRenameComposition
>
export type SharePanelToggleAction = ReturnType<typeof toggleSharePanelOpen>
