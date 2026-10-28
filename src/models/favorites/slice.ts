import { createSlice } from '@reduxjs/toolkit'
import { receiveFavorites, toggleFavorite, toggleFavorites } from './actions'

type FavoritesState = {
    ids: string[] | null
}

const initialState: FavoritesState = {
    ids: null,
}

export const slice = createSlice({
    name: 'favorites',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(receiveFavorites, (state, action) => {
                state.ids = action.payload
            })
            .addCase(toggleFavorite, (state, action) => {
                const { isFavorite, localItemNumber } = action.payload
                if (isFavorite) {
                    const prevFavs = state.ids ? [...state.ids] : []
                    state.ids = [...new Set([...prevFavs, localItemNumber])]
                } else if (state.ids) {
                    state.ids = state.ids.filter((f: string) => f !== localItemNumber)
                }
            })
            .addCase(toggleFavorites, (state, action) => {
                const { isFavorite, itemsToFavorite } = action.payload
                if (isFavorite) {
                    const prevFavs = state.ids ? [...state.ids] : []
                    state.ids = [...new Set([...prevFavs, ...itemsToFavorite])]
                } else if (state.ids) {
                    state.ids = state.ids.filter((f) => !itemsToFavorite.includes(f))
                }
            })
    },
})
