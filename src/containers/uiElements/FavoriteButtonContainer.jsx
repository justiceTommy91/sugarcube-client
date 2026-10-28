import React, { useCallback } from 'react'
import { connect } from 'react-redux'
import { arrayOf, func, string } from 'prop-types'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

import { getIds, getFavoritesToModify } from 'models/favorites/selectors'

import {
    toggleFavorite as toggleFavoriteAction,
    toggleFavorites as toggleFavoritesAction,
} from 'models/favorites/actions'

import FavoriteButton from 'components/uiElements/FavoriteButton'

const FavoriteButtonContainer = ({
    favorites,
    toggleFavorite,
    localItemNumber,
    location,
    localItemNumbers,
    toggleFavorites,
    favoritesToModify,
    productLabel,
}) => {
    const { isKiosk } = useSugarcubeContext()
    const hasFavorites = !!(favorites && favorites.length)
    const singleFavoriteSelected = hasFavorites && localItemNumber && favorites.includes(localItemNumber)
    const multipleFavoritesSelected =
        hasFavorites &&
        localItemNumbers &&
        localItemNumbers.length &&
        localItemNumbers.every((val) => favorites.includes(val))

    const isSingleFavorite = !!localItemNumber
    const selected = isSingleFavorite ? singleFavoriteSelected : multipleFavoritesSelected
    const hasLocalItemNumber = !!localItemNumber || !!localItemNumbers

    const toggleSingle = useCallback(() => {
        const isFavorite = !selected
        const trackingInfo = {}
        if (isFavorite) {
            trackingInfo.AddedFrom = location
        } else {
            trackingInfo.RemovedFrom = location
        }
        toggleFavorite(localItemNumber, isFavorite, trackingInfo)
    }, [toggleFavorite, localItemNumber, selected])

    const toggleAll = useCallback(() => {
        const isFavorite = !selected

        if (favoritesToModify && favoritesToModify.length) {
            toggleFavorites(favoritesToModify, isFavorite, { AddedFrom: 'FavouriteAllBtn' })
        }
    }, [toggleFavorites, localItemNumbers, selected, favoritesToModify])

    if (isKiosk || (!favorites && !hasLocalItemNumber)) {
        return null
    }

    return (
        <FavoriteButton
            selected={selected}
            onClick={isSingleFavorite ? toggleSingle : toggleAll}
            productLabel={productLabel}
        />
    )
}

FavoriteButtonContainer.defaultProps = {
    favorites: null,
    localItemNumber: null,
    localItemNumbers: null,
    favoritesToModify: null,
    productLabel: null,
}

FavoriteButtonContainer.propTypes = {
    favorites: arrayOf(string),
    toggleFavorite: func.isRequired,
    toggleFavorites: func.isRequired,
    localItemNumber: string,
    localItemNumbers: arrayOf(string),
    location: string.isRequired,

    favoritesToModify: arrayOf(string),
    productLabel: string,
}

const mapStateToProps = (state) => ({
    favorites: getIds(state),
    favoritesToModify: getFavoritesToModify(state),
})

const mapDispatchToProps = {
    toggleFavorite: toggleFavoriteAction,
    toggleFavorites: toggleFavoritesAction,
}

export default connect(mapStateToProps, mapDispatchToProps)(FavoriteButtonContainer)
