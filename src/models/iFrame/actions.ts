import * as types from 'models/actionTypes'
import { NAVIGATE_BACK, SET_RESUME_PARAM } from 'models/iFrame/msgTypes'

interface Message {
    type: string
}

export const sendIframeMsgToParent = (message: Message) => ({
    type: types.NEW_IFRAME_MESSAGE,
    message,
})

export const navigateBack = () => ({
    type: NAVIGATE_BACK,
})

export const setResumeParam = () => ({
    type: SET_RESUME_PARAM,
})

export const requestProductList = () => ({
    type: types.REQUEST_PRODUCT_LIST,
})
