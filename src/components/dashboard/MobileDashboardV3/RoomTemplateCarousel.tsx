import React, { useCallback } from 'react'
import classNames from 'classnames'
import useEmblaCarousel from 'embla-carousel-react'
import { Link } from 'gatsby'
import { useTranslation } from 'react-i18next'

import Badge from '@ingka/badge'

import { useAppDispatch } from 'hooks'
import { useEmblaProgressBar } from 'hooks/useEmblaProgressBar'
import { openComposition } from 'models/compositions/actions'
import { buildRoomUrlWithParamsAndHash } from 'models/compositions/utils'
import { LOCALES_USING_IMPERIAL_SYSTEM } from 'models/location/constants'
import { getSubCatalog, getRegion } from 'models/location/selectors'
import type { Showroom } from 'models/showrooms'

require('./RoomTemplateCarousel.scss')

interface RoomTemplateCarouselProps {
    showrooms: Showroom[]
    className?: string
}

export const RoomTemplateCarousel: React.FC<RoomTemplateCarouselProps> = ({ showrooms, className }) => {
    const { t } = useTranslation(['translation', 'dashboard'])
    const dispatch = useAppDispatch()
    const locale = getRegion()
    const paramSubcatalog = getSubCatalog()

    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
    })

    const { scrollProgress, thumbWidth, progressTrackRef, handleProgressMouseDown, handleProgressTouchStart } =
        useEmblaProgressBar(emblaApi, showrooms.length)

    const formatRoomSize = useCallback(
        (size: number | null): string => {
            if (!size) return ''

            if (LOCALES_USING_IMPERIAL_SYSTEM.includes(locale)) {
                return `${Math.floor(size * 10.764)} ${t('dashboard:dashboard.square feet abbreviated')}`
            }
            return `${size} ${t('dashboard:dashboard.square meters abbreviated')}`
        },
        [locale, t],
    )

    return (
        <div className={classNames('RoomTemplateCarousel', className)}>
            <h5 className="RoomTemplateCarousel__heading">
                {t('translation:design.kreativLite.start with a room template')}
            </h5>
            <div className="RoomTemplateCarousel__viewport" ref={emblaRef}>
                <div className="RoomTemplateCarousel__container">
                    {showrooms.map((showroom) => (
                        <div key={showroom.id} className="RoomTemplateCarousel__slide">
                            <Link
                                to={buildRoomUrlWithParamsAndHash({
                                    compositionId: showroom.composition,
                                    sceneId: showroom.scene,
                                    subCatalog: showroom.subCatalog ?? paramSubcatalog,
                                })}
                                onClick={(e) => {
                                    e.preventDefault()
                                    dispatch(
                                        openComposition(showroom.composition, undefined, {
                                            sceneId: showroom.scene,
                                            subCatalog: showroom.subCatalog ?? paramSubcatalog,
                                        }),
                                    )
                                }}
                                className="RoomTemplateCarousel__thumbnail"
                            >
                                <img
                                    src={showroom.thumbnail || showroom.images[0]}
                                    alt={showroom.name}
                                    className="RoomTemplateCarousel__image"
                                    draggable={false}
                                />
                                {showroom.roomSize && (
                                    <div className="RoomTemplateCarousel__badge">
                                        <Badge label={formatRoomSize(showroom.roomSize)} colour="grey" size="small" />
                                    </div>
                                )}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            <div
                className="RoomTemplateCarousel__progress-track"
                ref={progressTrackRef}
                onMouseDown={handleProgressMouseDown}
                onTouchStart={handleProgressTouchStart}
            >
                <div
                    className="RoomTemplateCarousel__progress-thumb"
                    style={{
                        left: `${scrollProgress}%`,
                        width: `${thumbWidth}%`,
                    }}
                />
            </div>
        </div>
    )
}
