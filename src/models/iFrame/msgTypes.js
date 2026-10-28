export const MAGIC_WINDOW_LOADED = 'MAGIC_WINDOW_LOADED'
export const MAGIC_WINDOW_CLOSE = 'MAGIC_WINDOW_CLOSE'
export const MAGIC_WINDOW_GA_TRACKING = 'MAGIC_WINDOW_GA_TRACKING'
export const MAGIC_WINDOW_FULL_SCREEN = 'MAGIC_WINDOW_FULL_SCREEN'
export const MAGIC_WINDOW_MODAL_SCREEN = 'MAGIC_WINDOW_MODAL_SCREEN'
export const GET_TOKENS = 'GET_TOKENS'
export const GET_TOKENS_RESPONSE = 'GET_TOKENS_RESPONSE'
export const NAVIGATE_BACK = 'NAVIGATE_BACK'
export const SET_RESUME_PARAM = 'SET_RESUME_PARAM'

// User store location update/receive {{{
// Request for current store and zip
export const REQUEST_STORE_SELECTION = 'REQUEST_STORE_SELECTION'
// Open store picker
export const REQUEST_STORE_SELECTION_CHANGE = 'REQUEST_STORE_SELECTION_CHANGE'
// Open zip picker
export const REQUEST_POSTALCODE_PICKER = 'REQUEST_POSTALCODE_PICKER'
// Receive store and zip
export const STORE_SELECTION_UPDATED = 'STORE_SELECTION_UPDATED'
// Receive zip
export const STORE_SELECTION_CHANGE_ZIP_CODE = 'STORE_SELECTION_CHANGE_ZIP_CODE'
// Receive store
export const STORE_SELECTION_CHANGE_STORE_ID = 'STORE_SELECTION_CHANGE_STORE_ID'
// }}}

// Partner portal request/receive product list
export const REQUEST_PRODUCT_LIST = 'REQUEST_PRODUCT_LIST'
export const SEND_PRODUCT_LIST = 'SEND_PRODUCT_LIST'

// Used to reset session timeouts
export const USER_ACTIVITY = 'USER_ACTIVITY'

// Allow the parent to trigger a save to local storage
// for later use with the resume parameter
export const STASH_COMPOSITION = 'STASH_COMPOSITION'
