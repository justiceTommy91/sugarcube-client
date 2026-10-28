/* eslint-disable consistent-return */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable i18next/no-literal-string */
import React from 'react'
import { useStore } from 'react-redux'

import * as compositionsSelectors from 'models/compositions/selectors'
import type { ProductData } from 'models/furniture'
import * as furnitureSelectors from 'models/furniture/selectors'

import * as tracker from 'utils/tracker'
import * as object from 'utils/object'
import { getProductTrackingInfo, ProductTrackingInfo } from 'models/tracking/utils'

type TrackingBoundaryContextValue = {
    path: string[]
}

const TrackingBoundaryContext = React.createContext<TrackingBoundaryContextValue | undefined>(undefined)

export type TrackingBoundaryProps = React.PropsWithChildren<{
    name: string
}>

/** @deprecated Use `withTrackingBoundary` instead. */
export const TrackingBoundary: React.FunctionComponent<TrackingBoundaryProps> = ({ name, children }) => {
    const parent = React.useContext(TrackingBoundaryContext)
    const context = React.useMemo(() => ({ path: parent ? [...parent.path, name] : [name] }), [parent])
    return <TrackingBoundaryContext.Provider value={context}>{children}</TrackingBoundaryContext.Provider>
}

/**
 * Construct a higher-order component (HOC) which provides a named tracking boundary to wrapped components.
 *
 * Note that this HOC factory is preferred over the `TrackingBoundary` component, since it less prone to misuse
 * where `useTracker` is called outside of the component and thus isn't properly consuming the tracking boundary.
 *
 * @example
 * ```tsx
 * const Sidepanel = withTrackingBoundary("Sidepanel")((props: SidepanelProps): React.ReactNode => {
 *     // Usages of `useTracker` will emit tracking events appened with the path "Sidepanel".
 *     const track = useTracker()
 *     return <div>...</div>
 * })
 * ```
 *
 * @param name Human-readonable name to append to all tracking events emitted with the component.
 */
export const withTrackingBoundary =
    (name: string) =>
        <P extends object>(Component: React.ComponentType<P>): React.FunctionComponent<P> => {
            const WrappedComponent = (props: P) => (
                <TrackingBoundary name={name}>
                    <Component {...props} />
                </TrackingBoundary>
            )
            WrappedComponent.displayName = `withTrackingBoundary(${Component.displayName || Component.name})`
            return WrappedComponent
        }

export type ActionType = 'click' | 'pen' | 'touch' | 'keypress' | 'unknown'

export type UserInteractionMetadata = {
    event: Event | React.SyntheticEvent
    elementName: string
}

export type MetadataHints = {
    userInteraction?: UserInteractionMetadata
    productId?: number
}

export type EventOptions = {
    hints?: MetadataHints
    attributes?: Record<Capitalize<string>, string | number | boolean | undefined | null>
}

const actionTypeFromEvent = (event: Event | React.SyntheticEvent): ActionType => {
    if ('nativeEvent' in event) {
        event = event.nativeEvent
    }

    // Many newer browsers pass in a PointerEvent to click event handlers with more info.
    if (event instanceof PointerEvent) {
        switch (event.pointerType) {
            case 'pen':
                return 'pen'
            case 'touch':
                return 'touch'
            case 'mouse':
                return 'click'
            // If pointerType is not defined, most likely it was a keyboard event.
            case '':
                return 'keypress'
            default: {
                return 'unknown'
            }
        }
    }

    // For backwards compatibility with older browsers, we can do some heuristics on MouseEvent
    // to determine what kind of input device was used to generate a click event.
    if (event instanceof MouseEvent) {
        if (event.screenX === 0 && event.screenY === 0) {
            return 'keypress'
        }
        return 'click'
    }

    if (event instanceof KeyboardEvent) {
        return 'keypress'
    }

    return 'unknown'
}

type Page = 'DecorateRoom' | 'Dashboard' | 'LearnMore' | 'SearchBrowse'

export type Tracker = {
    (eventName: `${Page}.${string}`, opts: EventOptions): Promise<void>
    /** @deprecated Use the call signature of `useTracker` insteead. */
    click: (opts: tracker.ClickOptions) => Promise<void>
}

export const useTracker = (): Tracker => {
    const path = React.useContext(TrackingBoundaryContext)?.path ?? []
    const store = useStore()
    const userInteractionTrackingInfo = ({ event, elementName }: UserInteractionMetadata) => {
        const ActionType = actionTypeFromEvent(event)
        const ActionTarget = `/${[...path, elementName].join('/')}`
        return {
            ActionType,
            ActionTarget,
        }
    }
    const compositionTrackingInfo = () =>
        compositionsSelectors.getSelectedCompositionTrackingRoomInfo(store.getState())
    const productTrackingInfo = (productId: number): ProductTrackingInfo | undefined => {
        const productData = furnitureSelectors.getFurnitureById(store.getState())[productId] as ProductData | null
        if (productData == null) {
            console.error(`unable to find product with id ${productId} in redux store`)
            return
        }
        return getProductTrackingInfo(productData)
    }

    const track: Tracker = (eventName, { hints, attributes }) => {
        attributes = {
            ...attributes,
            ...compositionTrackingInfo(),
        }

        if (hints?.userInteraction) {
            attributes = {
                ...attributes,
                ...userInteractionTrackingInfo(hints.userInteraction)
            }
        }

        if (hints?.productId) {
            attributes = {
                ...attributes,
                ...productTrackingInfo(hints.productId),
            }
        }

        attributes = object.omitNilValues(attributes)
        return tracker.track(eventName, attributes)
    }
    track.click = ({ target, ...opts }: tracker.ClickOptions) =>
        tracker.click({
            ...opts,
            target: `/${[...path, target].join('/')}`,
        })

    return track
}
