import * as types from 'models/actionTypes'
import { createAction } from '@reduxjs/toolkit'

export const requestStatus = createAction(types.REQUEST_STATUS)
