import * as React from 'react'

import { Provider } from 'react-redux'
import { type Store, createStore } from 'store'

import { setUpIFrameListener, setupBrowserNavigationListener } from 'apps/helpers'
import { setUpGrandCentralObservers } from 'apps/setUpGrandCentral'
import {
    getResume,
    getSubCatalog,
    getOnboardingEnabled,
    getShowroomFilter,
    getShowroomFurnishingFilter,
    getUrlParams,
    getUrlProductId,
    getUrlContext,
    getSearchQuery,
    getCategoryId,
    getSubCategoryId,
    getLanguageCode,
} from 'models/location/selectors'
import { PARAM_HOME_PROJECT_ID } from 'models/location/constants'
import { setHomeProjectId } from 'models/homeProjects/slice'
import { HOME_PROJECT_ID_STORAGE_KEY, REFERRER_STORAGE_KEY } from 'models/sessionStorage/constants'
import { requestStatus } from 'models/support/actions'
import { slice as experimentsSlice } from 'models/experiments/slice'
import { requestIkeaTokens } from 'models/tokens/actions'
import {
    loadCompositionFromLocalStorage,
    loadSceneFromLocalStorage,
    loadUIStateFromLocalStorage,
} from 'models/localStorage/actions'
import { getHasSeenOnboarding } from 'models/ui/selectors'
import { getE2ETestingEnv } from 'utils/environment'
import isMobile from 'utils/isMobile'
import { filterFurnishingType, filterShowrooms } from 'models/showrooms/actions'

import { requestStoreSelection, updateFurnitureFilter, requestPlaceProduct } from 'models/furniture/actions'
import { openDesignSidepanel, showOnboarding } from 'models/ui/actions'
import { initGeomViewerLib, GeomViewer } from 'Renderer/geomviewer'
import { useAppSelector } from 'hooks'
import { getHasOutage, getMessagesByLanguage } from 'models/support/selectors'
import ErrorMessage from 'components/ErrorMessage'
import { FlagsManager } from 'components/admin/FlagsManager'
import { useLazyRef } from 'hooks/useLazyRef'
import { FILTER_SOURCE_URL_PARAM } from 'models/tracking/constants'
import { experimentsService } from 'services/experiments'
import ToastDisplay from 'toasts/ToastDisplay'
import { withPrefix } from 'gatsby'
import { loadReferrerFromStorage, setReferrerUrl } from 'models/referrer/slice'
import { getIsProductContext } from 'models/referrer/selector'
import { selectInitialRoomRoute } from './initialRoomRoute'

const SECONDS = 1_000
const MINUTES = 60 * SECONDS

let reauthInterval: number | undefined

let store: Store

const initStore = (): Store => {
    if (store) {
        return store
    }

    store = createStore()

    if (typeof window === 'undefined') {
        return store
    }

    experimentsService.synchronize((state) => {
        store.dispatch(experimentsSlice.actions.resolve(state))
    })

    // Composition early loading
    // setUpCompositionPreFetch(store)

    // Start the renderer/viewer
    initGeomViewerLib()

    // Request GPU Stats
    // We copy benchmark jsons from detect-gpu library to benchmarks folder,
    // using webpack copy plugin.
    GeomViewer.bindings?.requestGPUStats(withPrefix('benchmarks'))

    // Iframe postmessaging
    setUpIFrameListener(store)
    setUpGrandCentralObservers(store)

    // Outage UI
    store.dispatch(requestStatus()) // Get backend status

    // User authentication, data
    // When the token comes back the
    // middleware will trigger a user fetch
    const reauthenticate = () => {
        store.dispatch(requestIkeaTokens())
    }
    reauthenticate()

    // Keep trying to reauthorize the current user session on a recurring schedule.
    if (reauthInterval == null) {
        reauthInterval = window?.setInterval(() => {
            reauthenticate()
        }, 5 * MINUTES)
    }

    document?.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            reauthenticate()
        }
    })

    // Stock availability
    // Get store info (zip/storeid)
    store.dispatch(requestStoreSelection())
    // For testing
    // window.setTimeout(() => {
    //     store.dispatch(updateLocation({ zipcode: '94536', storeId: 347 }))
    //     // store.dispatch(updateLocation({ storeId: 165 }))
    //     // store.dispatch(updateLocation({ zipcode: '94536' }))
    // }, 2000)

    // Favorites
    // TODO Check if covered by user auth flow
    // store.dispatch(requestFavorites())

    // UI defaults for desktop
    if (!isMobile()) {
        store.dispatch(openDesignSidepanel())
    }

    // Store document referrer info into session storage and redux
    try {
        if (window.sessionStorage) {
            const currentReferrerUrl = document.referrer
            // test cases
            // const currentReferrerUrl = `https://www.ikea.com/us/en/?q=sofa`
            // const currentReferrerUrl = ''
            // const currentReferrerUrl = `https://www.ikea.com/us/en/cat/sofas-sectionals-fu003/`
            const storedReferrerUrl = window.sessionStorage.getItem(REFERRER_STORAGE_KEY)

            // prioritize current referrer over stored referrer
            if (currentReferrerUrl) {
                // setReferrerUrl handles context validation internally
                store.dispatch(setReferrerUrl(currentReferrerUrl))
            } else if (storedReferrerUrl) {
                // No current referrer, but load previous context
                store.dispatch(loadReferrerFromStorage())
            }
            // else if no current or stored referred, redux has initial state of null values
        }
    } catch (error) {
        // ignore error
    }

    // Home Projects entry context: capture projectId from URL and store for save flow
    try {
        if (window.sessionStorage) {
            const urlProjectId = getUrlParams()[PARAM_HOME_PROJECT_ID]?.toString()?.trim()
            if (urlProjectId) {
                window.sessionStorage.setItem(HOME_PROJECT_ID_STORAGE_KEY, urlProjectId)
                store.dispatch(setHomeProjectId(urlProjectId))
            } else {
                const storedProjectId = window.sessionStorage.getItem(HOME_PROJECT_ID_STORAGE_KEY)
                if (storedProjectId) {
                    store.dispatch(setHomeProjectId(storedProjectId))
                }
            }
        }
    } catch (error) {
        // ignore error
    }

    selectInitialRoomRoute(store)

    // Resume decoration
    if (getResume()) {
        // This must come after selectScene()
        // so that the renderItems aren't cleared out
        // after loading from local
        store.dispatch(loadCompositionFromLocalStorage())
    }
    // Always load the scene (for refreshing a room builder scene)
    store.dispatch(loadSceneFromLocalStorage())

    // Load saved UI state
    store.dispatch(loadUIStateFromLocalStorage())
    const state = store.getState()
    const { isPipIntegration, isSearchBrowseIntegration, isLivingRoomIntegration } = getUrlContext()
    if (
        getOnboardingEnabled() &&
        !getHasSeenOnboarding(state) &&
        !isMobile() &&
        !getE2ETestingEnv() &&
        !isPipIntegration &&
        !isSearchBrowseIntegration &&
        !isLivingRoomIntegration
    ) {
        store.dispatch(showOnboarding())
    }

    // Subcatalog, this will trigger a furniture request
    const subCatalog = getSubCatalog()
    if (subCatalog) {
        store.dispatch(updateFurnitureFilter({ subCatalog }))
    }

    // Query, this will trigger a furniture request
    const query = getSearchQuery()

    // CategoryId, this will trigger a furniture request
    const categoryId = getCategoryId()

    // SubCategoryId, this will trigger a furniture request
    const subCategoryId = getSubCategoryId()

    if (query) {
        store.dispatch(updateFurnitureFilter({ query }))
    } else if (categoryId) {
        const trackingInfo = {
            categoryId: categoryId?.toString(),
            filterSource: FILTER_SOURCE_URL_PARAM,
        }
        store.dispatch(updateFurnitureFilter({ category: categoryId }, trackingInfo))
    } else if (subCategoryId) {
        const trackingInfo = {
            subCategoryId: subCategoryId.toString(),
            filterSource: FILTER_SOURCE_URL_PARAM,
        }
        store.dispatch(updateFurnitureFilter({ subCategory: subCategoryId }, trackingInfo))
    }

    const isProductContext = getIsProductContext(state)

    // Dashboard page may have a `roomType` url param to filter the showrooms by room type
    const showroomFilter = getShowroomFilter()
    if (showroomFilter) {
        store.dispatch(filterShowrooms(showroomFilter))
    }

    // Choose room context: get product to be placed and put it in the store
    if (isPipIntegration || isSearchBrowseIntegration || isLivingRoomIntegration || isProductContext) {
        const placeProductId = getUrlProductId()

        if (placeProductId) {
            store.dispatch(requestPlaceProduct(placeProductId))
        }
    }

    // Dashboard page may have a `furnishingType` url param to filter the showrooms by room type
    const furnishingTypeFilter = getShowroomFurnishingFilter()
    if (furnishingTypeFilter) {
        store.dispatch(filterFurnishingType(furnishingTypeFilter))
    }

    // Due to the current intermediate transitional state between 2D and 3D, the un-saved
    // composition state needs to be reset to the last correct state upon navigating into
    // a composition using the browser navigation controls.
    // TODO: This won't be needed when the state is fully transitioned into 3D.
    setupBrowserNavigationListener(store)

    return store
}

const StatusProvider: React.FunctionComponent<React.PropsWithChildren> = ({ children }) => {
    const hasOutage = useAppSelector(getHasOutage)
    const messagesByLanguage = useAppSelector(getMessagesByLanguage)
    if (hasOutage) {
        const lang = getLanguageCode()
        const message = messagesByLanguage[lang] ?? null
        return <ErrorMessage message={message} />
    }
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>
}

export type RenderProviderProps = {
    children: React.ReactNode
    store?: Store
}

const RenderProvider: React.FunctionComponent<RenderProviderProps> = ({ children, store: store_ }) => {
    const storeRef = useLazyRef(() => store_ ?? initStore())

    return (
        <Provider store={storeRef.current}>
            {/* ToastDisplay inside RenderedProvider because we need redux store to dispatch SidePanel mode. */}
            <ToastDisplay />
            {/* FlagsManager inside RenderedProvider because we need access to the store for getAreDebugFeaturesEnabled. Ideally we can move it to the root-provider instead */}
            <FlagsManager />
            <StatusProvider>{children}</StatusProvider>
        </Provider>
    )
}
export default RenderProvider
