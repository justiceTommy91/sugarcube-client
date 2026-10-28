import React, { createContext, useContext, useState } from 'react'

import { getIsIFrame, getPartnerId, getStoreId, getUrlContext } from 'models/location/selectors'
import isMobileCheck, { isTouchOnlyDevice } from 'utils/isMobile'

export type SugarcubeContextState = {
    isMagicWindow: boolean
    isMobile: boolean
    isTouchDevice: boolean
    hideDashboard: boolean
    isKiosk: boolean
    isUpptacka: boolean
    isInIframe: boolean
    isPipIntegration: boolean
    hideIkeaLogo: boolean
    hideFavorites: boolean
    hideMyList: boolean
    isSearchBrowseIntegration: boolean
    showLocaleKeys: boolean
    isLivingRoomIntegration: boolean
    isRoomPlannerIntegration: boolean
    roomPlannerSlug: string | null
    storeId: string
}

const partnerContextSettings: Record<string, Partial<SugarcubeContextState>> = {
    rx001: {
        hideIkeaLogo: true,
        hideFavorites: true,
        hideMyList: true,
        hideDashboard: true,
    },
}

const defaultState: SugarcubeContextState = {
    isMagicWindow: false,
    isMobile: false,
    isTouchDevice: false,
    hideDashboard: false,
    isKiosk: false,
    isUpptacka: false,
    isInIframe: false,
    isPipIntegration: false,
    hideIkeaLogo: false,
    hideFavorites: false,
    hideMyList: false,
    isSearchBrowseIntegration: false,
    showLocaleKeys: false,
    isLivingRoomIntegration: false,
    isRoomPlannerIntegration: false,
    roomPlannerSlug: null,
    storeId: '',
}

const SugarcubeContext = createContext<SugarcubeContextState>(defaultState)
export default SugarcubeContext

export const SugarcubeContextProvider: React.FunctionComponent<React.PropsWithChildren> = ({ children }) => {
    const [context] = useState(() => {
        const urlContext = getUrlContext()
        const isInIframe = getIsIFrame()
        const partnerId = getPartnerId()
        const storeId = getStoreId()
        const contextForPartnerFeatures = partnerContextSettings[partnerId]
        return {
            ...defaultState,
            ...urlContext,
            isMobile: isMobileCheck(),
            isTouchDevice: isTouchOnlyDevice(),
            isInIframe,
            storeId,
            ...contextForPartnerFeatures,
        }
    })

    return <SugarcubeContext.Provider value={context}>{children}</SugarcubeContext.Provider>
}

export const useSugarcubeContext = (): SugarcubeContextState => useContext(SugarcubeContext)
