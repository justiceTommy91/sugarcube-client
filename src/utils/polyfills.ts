import 'core-js/modules/es.object.from-entries'
import 'core-js/modules/es.array.flat'
import 'core-js/modules/es.array.flat-map'
import 'core-js/proposals/promise-with-resolvers'
import 'core-js/modules/es.array.to-sorted'
import 'focus-visible'
import ResizeObserver from 'resize-observer-polyfill'

global.ResizeObserver = ResizeObserver

declare global {
    interface PromiseWithResolvers<T> {
        promise: Promise<T>
        resolve: (value: T | PromiseLike<T>) => void
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (err: any) => void
    }

    interface PromiseConstructor {
        withResolvers: <T>() => PromiseWithResolvers<T>
    }
}
