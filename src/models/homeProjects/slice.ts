import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface HomeProjectsState {
    projectId: string | null
}

export const initialState: HomeProjectsState = {
    projectId: null,
}

export const homeProjectsSlice = createSlice({
    name: 'homeProjects',
    initialState,
    reducers: {
        setHomeProjectId: (state, action: PayloadAction<string>) => {
            state.projectId = action.payload
        },
        clearHomeProjectId: (state) => {
            state.projectId = null
        },
    },
})

export default homeProjectsSlice.reducer
export const { setHomeProjectId, clearHomeProjectId } = homeProjectsSlice.actions
