import React, { useState } from 'react'

import { Link } from 'gatsby'

import { buildRoomUrlWithParamsAndHash } from 'models/compositions/utils'
import Pill, { IconPill } from '@ingka/pill'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import { useTranslation } from 'react-i18next'
import { Showroom } from 'models/showrooms'

interface BrowseCardProps {
    className?: string
    room: Showroom
    onOpenRoom?: (sceneUuid: string, compositionUuid: string) => void
    disabled?: boolean
    loading?: boolean
}

export const CompositionCard = (props: BrowseCardProps) => {
    const { className, room, onOpenRoom, disabled, loading } = props

    const [collapsePill, setCollapsePill] = useState(false)
    const { t } = useTranslation()

    const openRoom = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault()
        if (!disabled) {
            onOpenRoom?.(room.scene, room.composition)
        }
    }

    return (
        <Link
            to={buildRoomUrlWithParamsAndHash({ compositionId: room.composition, sceneId: room.scene })}
            onClick={(e) => openRoom(e)}
            key={room.composition}
            className={className}
            onMouseEnter={() => setCollapsePill(true)}
            onMouseLeave={() => setCollapsePill(false)}
            style={{ backgroundImage: !loading ? `url('${room.thumbnail}')` : undefined }}
        >
            {!disabled &&
                !loading &&
                (collapsePill ? (
                    <IconPill
                        ssrIcon={arrowRight}
                        className="cardPill"
                        size="small"
                        ariaLabel={t('searchBrowse.try in this room')}
                    />
                ) : (
                    <Pill
                        label={t('searchBrowse.try in this room')}
                        trailingIcon={arrowRight}
                        className="cardPill"
                        size="small"
                    />
                ))}
        </Link>
    )
}
