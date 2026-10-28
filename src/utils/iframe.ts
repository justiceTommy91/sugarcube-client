import { getIsIFrame } from 'models/location/selectors'

export const messageParent = (action: { type: string }) => {
    // console.debug(action)

    try {
        if (getIsIFrame()) {
            window.parent.postMessage(action, '*')
        }
    } catch (e) {
        // Nothing
    }
}
