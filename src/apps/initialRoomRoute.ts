import { getRouteCompositionIds, getUrlParams } from 'models/location/selectors'
import { NEW_COMPOSITION_ID } from 'models/compositions/constants'
import { selectComposition } from 'models/compositions/actions'
import { selectScene } from 'models/scenes/actions'
import { resolveKreativLiteGuestReturn } from 'models/user/actions'
import { hasPendingKreativLiteGuestSave } from 'utils/kreativLiteGuestMerge'
import { stringIsUuidOrNumber } from 'utils/string'
import { isDesignPage } from 'utils/tracker'
import type { Store } from 'store'

const getInitialSceneId = (): string | null => {
    const { sceneId } = getRouteCompositionIds()
    const querySceneId = getUrlParams().sceneId?.toString()
    return sceneId || (querySceneId && stringIsUuidOrNumber(querySceneId) ? querySceneId : null)
}

export const selectInitialRoomRoute = (store: Store): void => {
    if (!isDesignPage()) {
        return
    }

    const { compositionId } = getRouteCompositionIds()
    const sceneId = getInitialSceneId()

    if (compositionId && compositionId !== NEW_COMPOSITION_ID) {
        store.dispatch(selectComposition(compositionId))
    } else if (sceneId) {
        store.dispatch(hasPendingKreativLiteGuestSave() ? resolveKreativLiteGuestReturn(sceneId) : selectScene(sceneId))
    }
}
