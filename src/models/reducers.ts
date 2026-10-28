/* eslint-disable import/no-named-as-default */
import { combineReducers } from 'redux'

import admin from 'models/admin/reducers'
import { slice as bagSlice } from 'features/shopping-bag/redux/slice'
import { reducer as compositionsReducer } from 'models/compositions/reducers'
import { slice as favoritesSlice } from 'models/favorites/slice'
import furniture from 'models/furniture/reducers'
import { kioskSlice } from 'models/kiosk/slice'
import preview from 'models/preview/reducers'
import { slice as ratingsSlice } from 'models/ratings/slice'
import renderer from 'models/renderer/reducers'
import scenes from 'models/scenes/reducers'
import { slice as showroomsSlice } from 'models/showrooms/slice'
import { slice as experimentsSlice } from 'models/experiments/slice'
import { supportSlice } from 'models/support/slice'
import tracking from 'models/tracking/reducers'
import ui from 'models/ui/reducers'
import user from 'models/user/reducers'
import variants from 'models/variants/reducers'
import { plannerSlice } from 'models/planner/slice'
import { wallColorSlice } from 'models/wallColor/slice'
import { upptackaSlice } from 'models/upptacka/slice'
import { dragDropSlice } from 'features/drag-and-drop-product/redux/slice'
import { referrerSlice } from 'models/referrer/slice'
import homeProjectsReducer from 'models/homeProjects/slice'
import { roomTypesReducer } from 'models/roomTypes/reducers'
import { starterSetReducer } from 'models/starterSet/reducers'
import { beautifierSlice } from 'models/beautifier/slice'
import { paxDesignsReducer } from 'models/paxDesigns/reducers'

export default () =>
    combineReducers({
        admin,
        bag: bagSlice.reducer,
        compositions: compositionsReducer,
        favorites: favoritesSlice.reducer,
        furniture,
        kiosk: kioskSlice.reducer,
        preview,
        ratings: ratingsSlice.reducer,
        renderer,
        scenes,
        showrooms: showroomsSlice.reducer,
        support: supportSlice.reducer,
        tracking,
        ui,
        user,
        variants,
        experiments: experimentsSlice.reducer,
        planner: plannerSlice.reducer,
        wallColor: wallColorSlice.reducer,
        upptacka: upptackaSlice.reducer,
        dragDrop: dragDropSlice.reducer,
        referrer: referrerSlice.reducer,
        homeProjects: homeProjectsReducer,
        roomTypes: roomTypesReducer,
        starterSet: starterSetReducer,
        beautifier: beautifierSlice.reducer,
        paxDesigns: paxDesignsReducer,
    })
