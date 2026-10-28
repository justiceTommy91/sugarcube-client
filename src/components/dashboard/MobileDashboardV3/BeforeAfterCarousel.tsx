import React, { useCallback, useEffect, useState } from 'react'
import classNames from 'classnames'
import useEmblaCarousel from 'embla-carousel-react'
import { withPrefix } from 'gatsby'
import { Trans, useTranslation } from 'react-i18next'

import { IconPill } from '@ingka/pill'
import chevronLeft from '@ingka/ssr-icon/paths/chevron-left'
import chevronRight from '@ingka/ssr-icon/paths/chevron-right'
import Tag from '@ingka/tag'

import './BeforeAfterCarousel.scss'

const SLIDE_COUNT = 6

interface BeforeAfterCarouselProps {
    className?: string
    slideCount?: number
}

export const BeforeAfterCarousel: React.FC<BeforeAfterCarouselProps> = ({ className, slideCount = SLIDE_COUNT }) => {
    const { t } = useTranslation()
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        containScroll: 'trimSnaps',
    })

    const [selectedIndex, setSelectedIndex] = useState(0)

    const onSelect = useCallback(() => {
        if (!emblaApi) return
        setSelectedIndex(emblaApi.selectedSnap())
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return undefined

        onSelect()
        emblaApi.on('select', onSelect)

        return () => {
            emblaApi.off('select', onSelect)
        }
    }, [emblaApi, onSelect])

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.goToPrev()
    }, [emblaApi])

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.goToNext()
    }, [emblaApi])

    return (
        <div className={classNames('BeforeAfterCarousel', className)}>
            <h5 className="BeforeAfterCarousel__heading">
                <Trans i18nKey="design.kreativLite.beforeAfter.heading 2">
                    Real home.
                    <br />
                    Real ideas.
                </Trans>
            </h5>
            <p className="BeforeAfterCarousel__description">{t('design.kreativLite.beforeAfter.description')}</p>
            <div className="BeforeAfterCarousel__viewport" ref={emblaRef}>
                <div className="BeforeAfterCarousel__container">
                    {Array.from({ length: slideCount }, (_, i) => i + 1).map((n) => (
                        <div key={n} className="BeforeAfterCarousel__slide">
                            <div className="BeforeAfterCarousel__image-container">
                                <div className="BeforeAfterCarousel__frame BeforeAfterCarousel__frame--before">
                                    <img
                                        src={withPrefix(`/images/kreativLite/mobile/image${n}Before.jpg`)}
                                        alt={t('design.kreativLite.beforeAfter.before image description')}
                                        className="BeforeAfterCarousel__image"
                                    />
                                    <Tag
                                        label="Before"
                                        className="BeforeAfterCarousel__tag"
                                        role="presentation"
                                        tabIndex={-1}
                                    />
                                </div>
                                <div className="BeforeAfterCarousel__frame BeforeAfterCarousel__frame--after">
                                    <img
                                        src={withPrefix(`/images/kreativLite/mobile/image${n}After.jpg`)}
                                        alt={t('design.kreativLite.beforeAfter.after image description')}
                                        className="BeforeAfterCarousel__image"
                                    />
                                    <Tag
                                        label="After"
                                        className="BeforeAfterCarousel__tag"
                                        role="presentation"
                                        tabIndex={-1}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="BeforeAfterCarousel__controls">
                <IconPill
                    className="BeforeAfterCarousel__button BeforeAfterCarousel__button--prev"
                    ssrIcon={chevronLeft}
                    onClick={scrollPrev}
                    disabled={selectedIndex === 0}
                    ariaLabel={t('aria.previous')}
                    size="small"
                />
                <IconPill
                    className="BeforeAfterCarousel__button BeforeAfterCarousel__button--next"
                    ssrIcon={chevronRight}
                    onClick={scrollNext}
                    disabled={selectedIndex === slideCount - 1}
                    ariaLabel={t('aria.next')}
                    size="small"
                />
            </div>
        </div>
    )
}
