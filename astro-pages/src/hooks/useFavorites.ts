import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'

import { isProdOrCte } from '@models/location/selectors'
import { isAuthenticated } from '@astro-services/index'
import { getFavoriteIds, addToFavorites, removeFromFavorites } from '@astro-services/favoritesService'
import { useTranslation } from 'react-i18next'
import { useUserContext } from '@providers/UserProvider'

import { useToast } from './useToast'

export const FAVORITES_QUERY_KEY = ['favorites']

interface ToggleFavoriteArgs {
    itemNo: string
    wasFavorite: boolean
}

export function useFavorites() {
    const { t } = useTranslation('find-my-fit')
    const { showToast } = useToast()
    const queryClient = useQueryClient()
    const { isLoading: isAuthLoading, isLoggedIn } = useUserContext()

    const { data: favoriteIds = [] } = useQuery({
        queryKey: FAVORITES_QUERY_KEY,
        queryFn: () => {
            if (!isProdOrCte() || !isAuthenticated()) {
                return Promise.resolve([])
            }
            return getFavoriteIds(isLoggedIn)
        },
        enabled: !isAuthLoading,
        staleTime: 5 * 60 * 1000,
    })

    const { mutate, isPending } = useMutation<void, Error, ToggleFavoriteArgs, { previousIds: string[] }>({
        mutationFn: ({ itemNo, wasFavorite }) => {
            if (!isProdOrCte()) {
                return Promise.resolve()
            }
            return wasFavorite ? removeFromFavorites(itemNo, isLoggedIn) : addToFavorites(itemNo, isLoggedIn)
        },
        onMutate: async ({ itemNo, wasFavorite }) => {
            await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY })
            const previousIds = queryClient.getQueryData<string[]>(FAVORITES_QUERY_KEY) ?? []
            const newIds = wasFavorite ? previousIds.filter((id) => id !== itemNo) : [...previousIds, itemNo]
            queryClient.setQueryData(FAVORITES_QUERY_KEY, newIds)
            return { previousIds }
        },
        onSuccess: (_, { wasFavorite }) => {
            if (isProdOrCte()) {
                showToast({
                    text: wasFavorite
                        ? t('find-my-fit.viewer.removedFromFavorites')
                        : t('find-my-fit.viewer.savedToFavorites'),
                })
            }
        },
        onError: (error, _, context) => {
            if (context?.previousIds !== undefined) {
                queryClient.setQueryData(FAVORITES_QUERY_KEY, context.previousIds)
            }
            showToast({ text: t('find-my-fit.toasts.unableToFavorite') })
            if (isProdOrCte()) {
                Sentry.captureException(error)
            }
        },
    })

    const isFavorite = (itemNo: string) => favoriteIds.includes(itemNo)

    const toggleFavorite = (itemNo: string) => {
        mutate({ itemNo, wasFavorite: favoriteIds.includes(itemNo) })
    }

    return { isFavorite, toggleFavorite, isPending }
}
