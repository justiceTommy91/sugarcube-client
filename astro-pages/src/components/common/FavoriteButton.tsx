import React from 'react'
import Button from '@ingka/button'
import heartIcon from '@ingka/ssr-icon/paths/heart'
import heartFilledIcon from '@ingka/ssr-icon/paths/heart-filled'

import { useTranslation } from 'react-i18next'
import { useFavorites } from '@astro-hooks/useFavorites'

interface FavoriteButtonProps {
    localItemNumber: string
    onToggle?: (isFavorited: boolean) => void
}

const FavoriteButton = ({ localItemNumber, onToggle }: FavoriteButtonProps) => {
    const { t } = useTranslation('find-my-fit')
    const pendingItemRef = React.useRef<string | null>(null)
    const { isFavorite, toggleFavorite, isPending } = useFavorites()
    const favorited = isFavorite(localItemNumber)
    const isThisItemPending = isPending && pendingItemRef.current === localItemNumber

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        pendingItemRef.current = localItemNumber
        toggleFavorite(localItemNumber)
        onToggle?.(!favorited)
    }

    return (
        <Button
            type="tertiary"
            size="small"
            iconOnly
            ssrIcon={favorited ? heartFilledIcon : heartIcon}
            aria-label={t(favorited ? 'find-my-fit.viewer.removeFavorite' : 'find-my-fit.viewer.saveFavorite')}
            loading={isThisItemPending}
            onClick={handleClick}
        />
    )
}

export default FavoriteButton
