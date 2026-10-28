import { STORED_COMPOSITION_LABEL, STORED_SCENE_LABEL } from 'models/localStorage/constants'

export const getHasLocalStoredComposition = (): boolean => {
    try {
        return !!window.localStorage.getItem(STORED_COMPOSITION_LABEL)
    } catch (error) {
        return false
    }
}

export const getHasLocalStoredScene = (): boolean => {
    try {
        return !!window.localStorage.getItem(STORED_SCENE_LABEL)
    } catch (error) {
        return false
    }
}
