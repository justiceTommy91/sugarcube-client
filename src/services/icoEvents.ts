import { AxiosPromise } from 'axios'
import fetch from 'services'
import { isCookieConsentSet } from 'utils/tracker'

// plannerDrawing means Kreativ
export const EVENT_PRODUCT_ADDED = 'plannerDrawing-itemAdded'
export const EVENT_PRODUCT_REMOVED = 'plannerDrawing-itemRemoved'
export const EVENT_COMPOSITION_OPENED = 'plannerDrawing-opened'
const EVENT_PLATFORM = 'WEB'

type EventInteractionType = typeof EVENT_PRODUCT_ADDED | typeof EVENT_PRODUCT_REMOVED | typeof EVENT_COMPOSITION_OPENED
type IcoEventType = {
    interactionType: EventInteractionType
    composition: string
    localItemNumbers: string[]
    scene?: string
}

export const publishIcoEvent = ({
    interactionType,
    composition,
    localItemNumbers,
    scene,
}: IcoEventType): AxiosPromise<void> | void => {
    // Only track ico events if cookie consent is given
    if (isCookieConsentSet()) {
        fetch('/publish_ico_event/', {
            method: 'POST',
            data: {
                interaction_type: interactionType,
                composition,
                items: localItemNumbers,
                platform: EVENT_PLATFORM,
                scene,
            },
        })
    }
}
