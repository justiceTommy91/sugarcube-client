import * as types from 'models/actionTypes'
import { setIsMagicWindowLoading, setInitialLoading, updatePreviewSettings } from 'models/preview/actions'
import { getIsMagicWindowLoading, getPreviewSettings } from 'models/preview/selectors'
import { getSelectedCompositionId, getSelectedCompositionIsLoading } from 'models/compositions/selectors'
import { getFurnitureIsLoading } from 'models/furniture/selectors'
import { getTooManyContextLosses } from 'models/renderer/selectors'
import { incrementCompositionCtxLossCount } from 'models/sessionStorage/actions'
import { selectCompositionRenderItem, updateRenderItemsHeadingFrom2dTo3d } from 'models/compositions/actions'
import { destroyRenderer } from 'models/renderer/actions'
import { GeomViewer } from 'Renderer/geomviewer'

const previewMiddleware = (store) => (next) => (action) => {
    const result = next(action)
    const state = store.getState()
    switch (action.type) {
        case types.RENDERER_READY:
        case types.FIRST_RENDER:
        case types.RECEIVE_FURNITURE:
        case types.RENDER_ITEM_LOADED: {
            const isCompositionLoading = getSelectedCompositionIsLoading(state)
            const isMagicWindowLoading = getIsMagicWindowLoading(state)
            const isFurnitureLoading = getFurnitureIsLoading(state)
            if (isMagicWindowLoading && !isCompositionLoading && !isFurnitureLoading) {
                store.dispatch(setIsMagicWindowLoading(false))
            }
            break
        }
        case types.NEW_RENDERER: {
            const selectedCompositionId = getSelectedCompositionId(state)
            store.dispatch(setInitialLoading(true, selectedCompositionId))
            break
        }
        case types.DESTROY_RENDERER: {
            if (getPreviewSettings(state).onOffOptions.magicEraserMode) {
                store.dispatch(updatePreviewSettings({ magicEraserMode: false }))
            }
            GeomViewer.bindings?.shutdownViewer()
            break
        }
        case types.WEBGL_CONTEXT_LOST: {
            if (getTooManyContextLosses(state)) {
                break
            }
            // The <heading> in the react state is the orientation respect to an horizontal plane, such as the floor or a stackable surface.
            // However, the quaternion's w get saved with the same <heading> name. This means <heading> is treated as the quaternion <w> on composition load.
            // This dispatch adjusts the heading value in the state so that it meets the 3d data format. This means overwrites it with the quaternion's w.
            // Ideally provisional until the 3d save data format gets fixed (heading property renamed).
            store.dispatch(updateRenderItemsHeadingFrom2dTo3d())
            const reloadBehavior = () => {
                store.dispatch(incrementCompositionCtxLossCount())
                store.dispatch(destroyRenderer())
                store.dispatch(selectCompositionRenderItem(-1)) // deselect items forcing renderer re-initialization
            }
            if (document.visibilityState === 'hidden') {
                document.addEventListener('visibilitychange', reloadBehavior, { once: true })
            } else {
                reloadBehavior()
            }
            break
        }
        default:
            break
    }
    return result
}

export default previewMiddleware
