import { configureStore } from '@reduxjs/toolkit'

import thunkMiddleware from 'redux-thunk'
import { createLogger } from 'redux-logger'

import adminMiddleware from 'models/admin/middleware'
import compositionsMiddleware from 'models/compositions/middleware'
import throttleMiddleware from 'models/compositions/throttleMiddleware'
import locationMiddleware from 'models/location/middleware'
import ratingsMiddleware from 'models/ratings/middleware'
import trackingMiddleware from 'models/tracking/middleware'
import furnitureMiddleware from 'models/furniture/middleware'
import iFrameMiddleWare from 'models/iFrame/middleware'
import previewMiddleWare from 'models/preview/middleware'
import localStorageMiddleware from 'models/localStorage/middleware'
import rendererMiddleware from 'models/renderer/middleware'
import sessionStorageMiddleware from 'models/sessionStorage/middleware'

import createRootReducer from 'models/reducers'
import createSagaMiddleware from 'redux-saga'
import rootSaga from 'models/sagas'
import { isProd } from 'utils/environment'
import { injectStore } from 'services'

const reducer = createRootReducer()

export const createStore = (preloadedState?: RootState) => {
    const sagaMiddleware = createSagaMiddleware()

    const middleware = [
        throttleMiddleware,
        thunkMiddleware,
        previewMiddleWare,
        iFrameMiddleWare,
        localStorageMiddleware,
        sessionStorageMiddleware,
        furnitureMiddleware,
        compositionsMiddleware,
        rendererMiddleware,
        ratingsMiddleware,
        locationMiddleware,
        trackingMiddleware,
        adminMiddleware,
        sagaMiddleware,
    ]
    if (!isProd && process.env.NODE_ENV !== 'test') {
        middleware.push(createLogger())
    }

    const store = configureStore({
        preloadedState,
        reducer,
        middleware,
    })

    sagaMiddleware.run(rootSaga)

    injectStore(store)

    return store
}

export type Store = ReturnType<typeof createStore>

export type RootState = ReturnType<typeof reducer>

export type AppDispatch = Store['dispatch']
