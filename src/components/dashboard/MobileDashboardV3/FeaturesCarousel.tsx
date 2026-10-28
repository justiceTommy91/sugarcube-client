import React from 'react'
import classNames from 'classnames'
import useEmblaCarousel from 'embla-carousel-react'
import { withPrefix } from 'gatsby'
import { useTranslation, Trans } from 'react-i18next'

import type { TranslationKeys } from 'types/i18next'
import { useEmblaProgressBar } from 'hooks/useEmblaProgressBar'

require('./FeaturesCarousel.scss')

const SLIDES = [
    {
        id: 'featuredFirst',
        imageUrl: '/images/kreativLite/featuredFirst.jpg',
        captionKey: 'design.kreativLite.features.card one caption',
    },
    {
        id: 'featuredSecond',
        imageUrl: '/images/kreativLite/featuredSecond.jpg',
        captionKey: 'design.kreativLite.features.card two caption',
    },
    {
        id: 'featuredThird',
        imageUrl: '/images/kreativLite/featuredThird.jpg',
        captionKey: 'design.kreativLite.features.card three caption',
    },
]

interface FeaturesCarouselProps {
    className?: string
}

export const FeaturesCarousel: React.FC<FeaturesCarouselProps> = ({ className }) => {
    const { t } = useTranslation()

    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
    })

    const { scrollProgress, thumbWidth, progressTrackRef, handleProgressMouseDown, handleProgressTouchStart } =
        useEmblaProgressBar(emblaApi, SLIDES.length)

    return (
        <div className={classNames('FeaturesCarousel', className)}>
            <h5 className="FeaturesCarousel__heading">
                <Trans i18nKey="design.kreativLite.features.heading split">
                    True to scale.
                    <br />
                    True to you.
                </Trans>
            </h5>

            <p className="FeaturesCarousel__description">{t('design.kreativLite.features.description')}</p>

            <div className="FeaturesCarousel__viewport" ref={emblaRef}>
                <div className="FeaturesCarousel__container">
                    {SLIDES.map((slide) => (
                        <div key={slide.id} className="FeaturesCarousel__slide">
                            <img
                                src={withPrefix(slide.imageUrl)}
                                alt=""
                                className="FeaturesCarousel__image"
                                draggable={false}
                            />
                            <p className="FeaturesCarousel__caption">{t(slide.captionKey as TranslationKeys)}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div
                className="FeaturesCarousel__progress-track"
                ref={progressTrackRef}
                onMouseDown={handleProgressMouseDown}
                onTouchStart={handleProgressTouchStart}
            >
                <div
                    className="FeaturesCarousel__progress-thumb"
                    style={{
                        left: `${scrollProgress}%`,
                        width: `${thumbWidth}%`,
                    }}
                />
            </div>
        </div>
    )
}
