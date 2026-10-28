import { all } from 'redux-saga/effects'
import { compositionsSagas } from 'models/compositions/sagas'
import { compositionSagas as compositionSagasTyped } from 'models/compositions/sagas-typed'
import { scenesSagas } from 'models/scenes/sagas'
import { favoritesSagas } from 'models/favorites/sagas'
import { furnitureSagas } from 'models/furniture/sagas'
import { locationSagas } from 'models/location/sagas'
import { supportSagas } from 'models/support/sagas'
import { trackingSagas } from 'models/tracking/sagas'
import { uiSagas } from 'models/ui/sagas'
import { userSagas } from 'models/user/sagas'
import { previewSagas } from 'models/preview/sagas'
import { plannerSagas } from 'models/planner/sagas'
import { iFrameSagas } from 'models/iFrame/sagas'
import { bagSagas } from 'features/shopping-bag/redux/sagas'
import { roomTypesSagas } from 'models/roomTypes/sagas'
import { starterSetSagas } from 'models/starterSet/sagas'
import { beautifierSagas } from 'models/beautifier/sagas'
import { paxDesignsSagas } from 'models/paxDesigns/sagas'

function* rootSaga() {
    yield all([
        ...userSagas,
        ...furnitureSagas,
        ...locationSagas,
        ...trackingSagas,
        ...compositionsSagas,
        ...compositionSagasTyped,
        ...bagSagas,
        ...favoritesSagas,
        ...supportSagas,
        ...scenesSagas,
        ...uiSagas,
        ...previewSagas,
        ...plannerSagas,
        ...iFrameSagas,
        ...roomTypesSagas,
        ...starterSetSagas,
        ...beautifierSagas,
        ...paxDesignsSagas,
    ])
}

export default rootSaga
