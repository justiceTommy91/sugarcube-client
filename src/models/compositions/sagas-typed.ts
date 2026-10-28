import { takeEvery, call, put, select, all, take, fork, join } from 'redux-saga/effects'
import type { SagaIterator, Task } from 'redux-saga'
import * as Sentry from '@sentry/react'

import { getSmartaRecommendedMultiPlacement, getSmartaRecommendedSetPlacement } from 'services/compositions'
import { type ApiReturn } from 'utils/services'

import type { APIProduct, ProductData } from 'models/furniture'
import {
    CLICK_PLACE_MULTIPLE_RENDER_ITEMS,
    CLICK_PLACE_SET_RENDER_ITEMS,
    FAILED_RECEIVE_FURNITURE_BY_LOCALITEMNOS,
    RECEIVE_FURNITURE_BY_LOCALITEMNOS,
    FAILED_RECEIVE_FURNITURE_BY_SET_ID,
    RECEIVE_FURNITURE_BY_SET_ID,
    RECEIVE_USER,
    FAILED_RECEIVE_USER,
} from 'models/actionTypes'
import { debugConsoleLog } from 'models/admin/actions'
import { requestFurnitureByLocalItemNos, requestFurnitureBySetId } from 'models/furniture/actions'
import { getFurnitureById } from 'models/furniture/selectors'
import * as tracker from 'utils/tracker'
import { SmartaMultiPlacementTracker } from 'models/tracking/SmartaMultiPlacementTracker'
import { getStarterSetById } from 'models/starterSet/selectors'
import type { StarterSetPlacement } from 'models/starterSet/types'
import type { SmartaReturn } from 'services/compositions'
import {
    clickPlaceMultipleRenderItems,
    placeMultipleRenderItemsLoading,
    placeRenderItem,
    clickPlaceSetRenderItems,
    openComposition,
    transferGuestCompositionOwnership,
} from './actions'
import { getSmartaRecommendedPlacementData, getSmartaURL, getSmartaRuleset } from './selectors'
import { SmartaPlacedFurnitureBase, SmartaPlacedFurnitureSet } from '.'

/*
 * The padStart here is important because if you have uniqueIds of varying lengths
 * in a set of renderItems then you'll get collisions between uniqueIds and stackedPlanes.
 */
const nextUniqueId = (base: number) => (numericId: number | string) =>
    parseInt(`${base}${String(numericId).padStart(3, '0')}`, 10)

const isParentSurface = (parentId: string) => parentId === 'SURFACE'

export function* clickPlaceMultipleRenderItemsSaga({ payload }: ReturnType<typeof clickPlaceMultipleRenderItems>) {
    // TODO: Refactor to use product ids instead of local item numbers

    const { localItemNumbers, compositionId, ignoreCamera, trackingInfo } = payload

    const smartaURL: string | undefined = yield select(getSmartaURL)
    const smartaRuleset: string | undefined = yield select(getSmartaRuleset)

    // Initialize tracking
    const placementTracker = new SmartaMultiPlacementTracker()

    try {
        yield put(placeMultipleRenderItemsLoading(true))
        // TODO: Refactor this to only query missing product data {{{
        // const { data: productData }: { data: APIProduct[] } = yield call(getFurnitureByLocalItemNos, localItemNumbers)
        yield put(requestFurnitureByLocalItemNos(localItemNumbers))
        yield take([RECEIVE_FURNITURE_BY_LOCALITEMNOS, FAILED_RECEIVE_FURNITURE_BY_LOCALITEMNOS])
        // }}}

        const productsById: Record<number, ProductData | undefined> = yield select(getFurnitureById)
        const productData = Object.values(productsById)

        const validLocalItemNumbers = localItemNumbers.filter((lin) =>
            productData.some((pd) => pd?.localItemNumber === lin),
        )
        const invalidLocalItemNumbers = localItemNumbers.filter((lin) => !validLocalItemNumbers.includes(lin))

        // Track invalid local item numbers
        placementTracker.addInvalidLocalItemNumbers(invalidLocalItemNumbers)

        const smartaData: SmartaPlacedFurnitureBase = yield select(getSmartaRecommendedPlacementData)
        const { camera, ...rest } = smartaData.savedProperties
        const savedProperties = ignoreCamera ? rest : smartaData.savedProperties
        const smartaResponse: ApiReturn<typeof getSmartaRecommendedMultiPlacement> = yield call<
            typeof getSmartaRecommendedMultiPlacement
        >(getSmartaRecommendedMultiPlacement, {
            ...smartaData,
            ...{ savedProperties },
            localItemNumbersToPlace: validLocalItemNumbers.map((lin, index) => ({
                placementId: String(index),
                localItemNumber: lin,
            })),
            smartaURL,
            ruleset: smartaRuleset,
        })

        const { data } = smartaResponse.data

        const makeId = nextUniqueId(Date.now())

        yield all(
            data
                .map((datum) => {
                    const { placementId } = datum
                    if (!placementId) {
                        const reason = 'Returned item has no placementId'
                        placementTracker.addFailure('unknown', reason)
                        return put(
                            debugConsoleLog(
                                'smarta-multi',
                                JSON.stringify(
                                    {
                                        success: false,
                                        reason,
                                    },
                                    null,
                                    2,
                                ),
                            ),
                        )
                    }

                    const localItemNumber = validLocalItemNumbers[parseInt(placementId, 10)]
                    if (!localItemNumber) {
                        const reason = 'Could not find localItemNumber given the placementId'
                        placementTracker.addFailure(placementId, reason)
                        return put(
                            debugConsoleLog(
                                'smarta-multi',
                                JSON.stringify(
                                    {
                                        success: false,
                                        reason,
                                    },
                                    null,
                                    2,
                                ),
                            ),
                        )
                    }

                    const product = productData.find((pd) => pd?.localItemNumber === localItemNumber)
                    if (!product) {
                        const reason = 'Could not find local product data for this local item number'
                        placementTracker.addFailure(localItemNumber, reason)
                        return put(
                            debugConsoleLog(
                                'smarta-multi',
                                JSON.stringify(
                                    {
                                        success: false,
                                        reason,
                                    },
                                    null,
                                    2,
                                ),
                            ),
                        )
                    }

                    const { id, name, smartaClass, stacks, renderType, hidden, placeables, entities } = product

                    const commonLogData = {
                        name,
                        smartaClass,
                        entities,
                        productId: id,
                        localItemNumber,
                        placementId,
                    }

                    if ('placedFurniture' in datum) {
                        placementTracker.addSuccess()
                        const {
                            x,
                            y,
                            z,
                            heading,
                            headingI,
                            headingJ,
                            headingK,
                            parentAttachment,
                            parentId: parentIdInitial,
                            uniqueId,
                        } = datum.placedFurniture

                        // TODO: Replace this with real logic instead of looking at uniqueId length
                        const parentIsNotInSmartaResponse = parentIdInitial.length > 5

                        const parentId =
                            isParentSurface(parentIdInitial) || parentIsNotInSmartaResponse
                                ? parentIdInitial
                                : String(makeId(parentIdInitial))

                        const smartaPlacement = {
                            kind: `location3Legacy`,
                            location3: {
                                bindTo: parentAttachment,
                                localPos: { x, y, z },
                            },
                            rotation: [headingI, headingJ, headingK, heading],
                            parentId,
                        }

                        // If the item is stacked, supply the stackedPlane to the react state.
                        // If an item is neither on a surface or another furniture item, stackedPlane is undefined
                        // and the item will be placed on some viewer-defined default position as if no smarta was used.
                        const numParentId = parseInt(parentId, 10)
                        const isParentFurniture = !isParentSurface(parentId) && !Number.isNaN(numParentId)
                        const surfaceParent = isParentSurface(parentId) ? `${parentAttachment}` : undefined
                        const stackedPlane = isParentFurniture ? `${numParentId}${parentAttachment}` : surfaceParent

                        // If the item is snaprotable, supply the anchorCombinationIndex to the react state.
                        // @ts-expect-error Fix the type later to account for all furniture features
                        const anchorCombinationIndex = datum.placedFurniture.gfxAttributes?.anchorCombinationIndex

                        const settings = {
                            renderType,
                            heading: 0,
                            stacks,
                            hidden,
                            placeables,
                        }
                        const updatedTrackingInfo = {
                            ...trackingInfo,
                            isSmartaMultiPlaced: true,
                        }
                        return [
                            put(
                                debugConsoleLog(
                                    'smarta-multi',
                                    JSON.stringify(
                                        {
                                            success: true,
                                            ...commonLogData,
                                        },
                                        null,
                                        2,
                                    ),
                                ),
                            ),
                            put(
                                placeRenderItem(
                                    compositionId,
                                    id,
                                    null,
                                    null,
                                    {
                                        ...settings,
                                        ...(anchorCombinationIndex ? { anchorCombinationIndex } : {}),
                                        uniqueId: makeId(uniqueId),
                                        // @ts-expect-error Need to fix the action type
                                        stackedPlane,
                                    },
                                    updatedTrackingInfo,
                                    null,
                                    null,
                                    null,
                                    null,
                                    smartaPlacement,
                                ),
                            ),
                        ]
                    }
                    // Api sent error
                    const reason = datum.errorText || `Error code: ${datum.errorCode}`
                    placementTracker.addFailure(localItemNumber, reason)
                    return put(
                        debugConsoleLog(
                            'smarta-multi',
                            JSON.stringify(
                                {
                                    success: false,
                                    errorCode: datum.errorCode,
                                    errorText: datum.errorText,
                                    ...commonLogData,
                                    // debug: datum.debug,
                                },
                                null,
                                2,
                            ),
                        ),
                    )
                })
                .flat()
                .concat(
                    invalidLocalItemNumbers.length
                        ? [
                              put(
                                  debugConsoleLog(
                                      'smarta-multi',
                                      JSON.stringify(
                                          {
                                              'skipped local item numbers': invalidLocalItemNumbers,
                                          },
                                          null,
                                          2,
                                      ),
                                  ),
                              ),
                          ]
                        : [],
                ),
        )
        // Send tracking data
        yield call(tracker.track, 'SmartaMultiPlace', placementTracker.getTrackingData())
    } catch (error) {
        yield put(debugConsoleLog('smarta-multi', JSON.stringify(error, Object.getOwnPropertyNames(error), 2)))
        // Track exception as complete failure
        yield call(
            tracker.track,
            'SmartaMultiPlace',
            SmartaMultiPlacementTracker.getExceptionTrackingData(error, localItemNumbers),
        )
        yield put(placeMultipleRenderItemsLoading(false))
    } finally {
        yield put(placeMultipleRenderItemsLoading(false))
    }
}

export function* clickPlaceSetRenderItemsSaga({ payload }: ReturnType<typeof clickPlaceSetRenderItems>) {
    const { setId, compositionId, ignoreCamera, trackingInfo } = payload

    const smartaURL: string | undefined = yield select(getSmartaURL)
    const smartaRuleset: string | undefined = yield select(getSmartaRuleset)

    const placementTracker = new SmartaMultiPlacementTracker()

    try {
        // Check if we have pre-populated placement data from the API
        const starterSetData: ReturnType<typeof getStarterSetById> = yield select(getStarterSetById, setId)
        const hasPrePopulatedPlacements = starterSetData?.items?.some((item) => item.placement)

        type SetFetchResult = {
            type: string
            furniture?: ProductData[]
            localItemNumbers?: string[]
            setItems?: { uuid: string; product: APIProduct }[]
        }
        const setFetchTask: Task<SetFetchResult> = yield fork(function* waitForSetFetch(): Generator<
            unknown,
            SetFetchResult,
            SetFetchResult
        > {
            return yield take([RECEIVE_FURNITURE_BY_SET_ID, FAILED_RECEIVE_FURNITURE_BY_SET_ID])
        })

        let data: SmartaReturn[]

        if (hasPrePopulatedPlacements && starterSetData) {
            // Use pre-populated placements from the API response
            yield put(requestFurnitureBySetId(setId))
            data = starterSetData.items
                .filter((item): item is typeof item & { placement: StarterSetPlacement } => !!item.placement)
                .map((item) => {
                    const { placement } = item
                    // Add the extra fields that SmartaReturn expects
                    if (placement.error) {
                        return {
                            error: placement.error,
                            placementId: placement.placementId,
                            errorCode: placement.errorCode,
                            errorText: placement.errorText || '',
                            debug: {},
                        }
                    }
                    return {
                        error: placement.error,
                        placementId: placement.placementId,
                        placedFurniture: {
                            ...placement.placedFurniture,
                            furnitureId: 0, // Not used in placement logic
                            debug: {},
                        },
                    }
                })
        } else {
            // Fallback: Call Smarta API to get placements
            const smartaData: SmartaPlacedFurnitureBase = yield select(getSmartaRecommendedPlacementData)
            const { camera, ...rest } = smartaData.savedProperties
            const savedProperties = ignoreCamera ? rest : smartaData.savedProperties

            const [smartaResponse]: [ApiReturn<typeof getSmartaRecommendedSetPlacement>] = yield all([
                call(getSmartaRecommendedSetPlacement, {
                    ...smartaData,
                    ...{ savedProperties },
                    to_place: setId,
                    smartaURL,
                    ruleset: smartaRuleset,
                } as SmartaPlacedFurnitureSet),
                put(requestFurnitureBySetId(setId)),
            ])

            data = smartaResponse.data.data
        }

        const setFetchResult: SetFetchResult = yield join(setFetchTask)

        const setLocalItemNumbers = setFetchResult.localItemNumbers
        const productData = Object.values(setFetchResult?.furniture as Record<number, ProductData>)
        const setItems = setFetchResult.setItems || []

        const validLocalItemNumbers = setLocalItemNumbers?.filter((lin) =>
            productData.some((pd) => pd?.localItemNumber === lin),
        )
        const invalidLocalItemNumbers = setLocalItemNumbers?.filter((lin) => !validLocalItemNumbers?.includes(lin))

        placementTracker.addInvalidLocalItemNumbers(invalidLocalItemNumbers ?? [])

        const uuidToLocalItemNumber = new Map<string, string>(
            setItems.map((item) => [item.uuid, item.product?.localItemNumber || item.product.localItemNumber]),
        )

        const makeId = nextUniqueId(Date.now())

        yield all(
            data
                .map((datum) => {
                    const { placementId } = datum
                    if (!placementId) {
                        const reason = 'Returned item has no placementId'
                        placementTracker.addFailure('unknown', reason)
                        return put(
                            debugConsoleLog(
                                'smarta-set',
                                JSON.stringify(
                                    {
                                        success: false,
                                        reason,
                                    },
                                    null,
                                    2,
                                ),
                            ),
                        )
                    }

                    const localItemNumber = uuidToLocalItemNumber.get(placementId)
                    if (!localItemNumber) {
                        const reason = 'Could not find localItemNumber given the placementId'
                        placementTracker.addFailure(placementId, reason)
                        return put(
                            debugConsoleLog(
                                'smarta-set',
                                JSON.stringify(
                                    {
                                        success: false,
                                        reason,
                                    },
                                    null,
                                    2,
                                ),
                            ),
                        )
                    }

                    const product = productData.find((pd) => pd?.localItemNumber === localItemNumber)
                    if (!product) {
                        const reason = 'Could not find local product data for this local item number'
                        placementTracker.addFailure(localItemNumber, reason)
                        return put(
                            debugConsoleLog(
                                'smarta-set',
                                JSON.stringify(
                                    {
                                        success: false,
                                        reason,
                                    },
                                    null,
                                    2,
                                ),
                            ),
                        )
                    }

                    const { id, name, smartaClass, stacks, renderType, hidden, placeables, entities } = product

                    const commonLogData = {
                        name,
                        smartaClass,
                        entities,
                        productId: id,
                        localItemNumber,
                        placementId,
                    }

                    if ('placedFurniture' in datum) {
                        placementTracker.addSuccess()
                        const {
                            x,
                            y,
                            z,
                            heading,
                            headingI,
                            headingJ,
                            headingK,
                            parentAttachment,
                            parentId: parentIdInitial,
                            uniqueId,
                        } = datum.placedFurniture

                        // TODO: Replace this with real logic instead of looking at uniqueId length
                        const parentIsNotInSmartaResponse = parentIdInitial.length > 5

                        const parentId =
                            isParentSurface(parentIdInitial) || parentIsNotInSmartaResponse
                                ? parentIdInitial
                                : String(makeId(parentIdInitial))

                        const smartaPlacement = {
                            kind: `location3Legacy`,
                            location3: {
                                bindTo: parentAttachment,
                                localPos: { x, y, z },
                            },
                            rotation: [headingI, headingJ, headingK, heading],
                            parentId,
                        }

                        // If the item is stacked, supply the stackedPlane to the react state.
                        // If an item is neither on a surface or another furniture item, stackedPlane is undefined
                        // and the item will be placed on some viewer-defined default position as if no smarta was used.
                        const numParentId = parseInt(parentId, 10)
                        const isParentFurniture = !isParentSurface(parentId) && !Number.isNaN(numParentId)
                        const surfaceParent = isParentSurface(parentId) ? `${parentAttachment}` : undefined
                        const stackedPlane = isParentFurniture ? `${numParentId}${parentAttachment}` : surfaceParent

                        // If the item is snaprotable, supply the anchorCombinationIndex to the react state.
                        // @ts-expect-error Fix the type later to account for all furniture features
                        const anchorCombinationIndex = datum.placedFurniture.gfxAttributes?.anchorCombinationIndex

                        const settings = {
                            renderType,
                            heading: 0,
                            stacks,
                            hidden,
                            placeables,
                        }
                        const updatedTrackingInfo = {
                            ...trackingInfo,
                            isSmartaSetPlaced: true,
                        }
                        return [
                            put(
                                debugConsoleLog(
                                    'smarta-set',
                                    JSON.stringify(
                                        {
                                            success: true,
                                            ...commonLogData,
                                        },
                                        null,
                                        2,
                                    ),
                                ),
                            ),
                            put(
                                placeRenderItem(
                                    compositionId,
                                    id,
                                    null,
                                    null,
                                    {
                                        ...settings,
                                        ...(anchorCombinationIndex ? { anchorCombinationIndex } : {}),
                                        uniqueId: makeId(uniqueId),
                                        // @ts-expect-error Need to fix the action type
                                        stackedPlane,
                                    },
                                    updatedTrackingInfo,
                                    null,
                                    null,
                                    null,
                                    null,
                                    smartaPlacement,
                                ),
                            ),
                        ]
                    }
                    // Api sent error
                    const reason = datum.errorText || `Error code: ${datum.errorCode}`
                    placementTracker.addFailure(localItemNumber, reason)
                    return put(
                        debugConsoleLog(
                            'smarta-set',
                            JSON.stringify(
                                {
                                    success: false,
                                    errorCode: datum.errorCode,
                                    errorText: datum.errorText,
                                    ...commonLogData,
                                },
                                null,
                                2,
                            ),
                        ),
                    )
                })
                .flat()
                .concat(
                    invalidLocalItemNumbers?.length
                        ? [
                              put(
                                  debugConsoleLog(
                                      'smarta-set',
                                      JSON.stringify(
                                          {
                                              'skipped local item numbers': invalidLocalItemNumbers,
                                          },
                                          null,
                                          2,
                                      ),
                                  ),
                              ),
                          ]
                        : [],
                ),
        )
        // Send tracking data
        yield call(tracker.track, 'SmartaSetPlace', placementTracker.getTrackingData())
    } catch (error) {
        yield put(debugConsoleLog('smarta-set', JSON.stringify(error, Object.getOwnPropertyNames(error), 2)))
        // Track exception as complete failure
        yield call(
            tracker.track,
            'SmartaSetPlace',
            SmartaMultiPlacementTracker.getExceptionTrackingData(error, [setId]),
        )
    }
}

// Called after consumeKreativLiteMergeReturn returns a merged composition ID.
// Waits for authenticated user data, validates the wid, patches the
// composition's ownership, then opens it. Order matters — patching wid before
// open prevents saveSelectedComposition from reading the wrong wid and
// creating a duplicate composition.
//
// On invalid wid (user fetch failed or returned a deferred wid), logs to
// Sentry. Merge succeeded backend-side but local state is in a broken
// ownership state where the next save will create a duplicate. No user-
// visible recovery — Sentry-only is the agreed product behaviour.
export function* activateMergedComposition(compositionId: string): SagaIterator {
    const outcome: { userData?: { wid: number } } = yield take([RECEIVE_USER, FAILED_RECEIVE_USER])
    const authenticatedWid = outcome.userData?.wid
    if (authenticatedWid && authenticatedWid > 0) {
        yield put(transferGuestCompositionOwnership(compositionId, authenticatedWid))
        yield put(openComposition(compositionId))
    } else {
        Sentry.captureException(new Error('Guest merge: failed to patch composition wid after RECEIVE_USER'), {
            extra: { compositionId, authenticatedWid },
        } as Parameters<typeof Sentry.captureException>[1])
    }
}

function* watchClickPlaceMultipleRenderItems() {
    yield takeEvery(CLICK_PLACE_MULTIPLE_RENDER_ITEMS, clickPlaceMultipleRenderItemsSaga)
}

function* watchClickPlaceSetRenderItems() {
    yield takeEvery(CLICK_PLACE_SET_RENDER_ITEMS, clickPlaceSetRenderItemsSaga)
}

export const compositionSagas = [watchClickPlaceMultipleRenderItems(), watchClickPlaceSetRenderItems()]
