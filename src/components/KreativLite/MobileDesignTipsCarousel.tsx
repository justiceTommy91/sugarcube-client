import React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'
import type { TranslationKeys } from 'types/i18next'
import { useEmblaProgressBar } from 'hooks/useEmblaProgressBar'
import './MobileDesignTipsCarousel.scss'

const SLIDE_COUNT = 4

export const MobileDesignTipsCarousel: React.FC = () => {
    const { t } = useTranslation()

    const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start' })
    const { scrollProgress, thumbWidth, progressTrackRef, handleProgressMouseDown, handleProgressTouchStart } =
        useEmblaProgressBar(emblaApi, SLIDE_COUNT)

    return (
        <div className="MobileDesignTipsCarousel">
            <div className="MobileDesignTipsCarousel__header">
                <h2 className="MobileDesignTipsCarousel__heading">{t('design.kreativLite.tips mobile.heading')}</h2>
                <p className="MobileDesignTipsCarousel__subheading">{t('design.kreativLite.tips mobile.subheading')}</p>
            </div>

            <div className="MobileDesignTipsCarousel__viewport" ref={emblaRef}>
                <div className="MobileDesignTipsCarousel__container">
                    {Array.from({ length: SLIDE_COUNT }, (_, i) => i + 1).map((n) => (
                        <div key={n} className="MobileDesignTipsCarousel__slide">
                            <img
                                src={withPrefix(`/images/kreativLite/mobile/tip${n}.jpg`)}
                                alt=""
                                className="MobileDesignTipsCarousel__image"
                                draggable={false}
                            />
                            <h3 className="MobileDesignTipsCarousel__slide-title">
                                {t(`design.kreativLite.tips mobile.slide${n}.title` as TranslationKeys)}
                            </h3>
                            <p className="MobileDesignTipsCarousel__slide-description">
                                {t(`design.kreativLite.tips mobile.slide${n}.description` as TranslationKeys)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div
                className="MobileDesignTipsCarousel__progress-track"
                ref={progressTrackRef}
                onMouseDown={handleProgressMouseDown}
                onTouchStart={handleProgressTouchStart}
            >
                <div
                    className="MobileDesignTipsCarousel__progress-thumb"
                    style={{
                        left: `${scrollProgress}%`,
                        width: `${thumbWidth}%`,
                    }}
                />
            </div>
        </div>
    )
}

export default MobileDesignTipsCarousel
