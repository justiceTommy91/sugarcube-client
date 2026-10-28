import type { Middleware } from 'redux'
import * as Sentry from '@sentry/react'

import type { RootState } from 'store'
import { debug } from 'utils/tracker'

import { SMARTA_STATUS_FAILED, SMARTA_STATUS_SUCCESS } from 'constants/stateTypes'
import { clickPlaceRenderItem, placeRenderItem } from './actions'

const MIN_TIME_GAP = 200 // milliseconds
const COUNT_LIMIT = 7

type ThrottleState = {
    lastTime: number
    lastId: number
    count: number
}

const throttleState: ThrottleState = {
    lastTime: 0,
    lastId: 0,
    count: 0,
}

const throttleMiddleware: Middleware<null, RootState> = () => (next) => (action) => {
    if (placeRenderItem.match(action) || clickPlaceRenderItem.match(action)) {
        const {
            payload: { id, settings },
        } = action

        // Startup
        let triggered = false
        let throttle = false

        const now = Date.now()
        const timeSinceLast = now - throttleState.lastTime

        const isTooFast = timeSinceLast <= MIN_TIME_GAP
        const isSameItem = id === throttleState.lastId
        const isRealItem = !settings.hidden
        const isSmartaPlacement = settings.smartaPlacementState === SMARTA_STATUS_FAILED 
            || settings.smartaPlacementState === SMARTA_STATUS_SUCCESS

        // Test
        if (isTooFast && isSameItem && isRealItem) {
            // Update state if placing too quickly
            throttleState.count += 1
            triggered = true
        } else if (isRealItem) {
            // Otherwise reset the state
            throttleState.count = 0
        } // Don't count or reset on hidden items

        // Prevent placement
        if (throttleState.count >= COUNT_LIMIT 
            // Never throttle smarta placement updates.
            && !isSmartaPlacement) {
            throttle = true
        }

        // Local debug logging
        // console.debug({...throttleState, timeSinceLast, triggered, throttle})

        // Cleanup
        throttleState.lastTime = now
        throttleState.lastId = id

        // Debug tracking
        if (triggered) {
            debug('PlaceItemThrottling', {
                // d = debug, PIT = PlaceItemThrottling
                d_PIT_timeSinceLast: timeSinceLast,
                d_PIT_count: throttleState.count,
                d_PIT_throttled: throttle,
                d_PIT_minGapSetting: MIN_TIME_GAP,
                d_PIT_countLimitSetting: COUNT_LIMIT,
                d_PIT_isClickPlace: clickPlaceRenderItem.match(action),
            })
        }

        // Finish
        if (throttle) {
            // To capture a stacktrace
            Sentry.captureException(new Error('Place item throttled'))
            return undefined
        }
    }

    return next(action)
}

export default throttleMiddleware
