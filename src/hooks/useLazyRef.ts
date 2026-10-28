import * as React from 'react'

// eslint-disable-next-line i18next/no-literal-string
const uninitialized = Symbol('uninitialized')

export const useLazyRef = <T>(init: () => T): React.MutableRefObject<T> => {
    const ref = React.useRef<T | typeof uninitialized>(uninitialized)
    if (ref.current === uninitialized) {
        ref.current = init()
    }
    return ref as React.MutableRefObject<T>
}
