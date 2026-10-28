import React, { useRef } from 'react'
import * as Sentry from '@sentry/react'
import { withPrefix } from 'gatsby'
import { AppProviders } from '@providers/AppProviders'
import ErrorMessage from '@astro-components/common/ErrorMessage'
import { trackError, visit } from '@utils/tracker'
import { useTranslation } from 'react-i18next'
import { MP_FIND_MY_FIT_LANDING_SECTION_VIEWED } from '@lib/tracking/constants'
import { useReferrer } from '@astro-hooks/useReferrer'
import { determineReferrerContext } from '@models/referrer/utils'
import { formatReferrerContextForTracking } from '@components/dashboard/contextualCard/utils'
import { useStatus } from '@astro-hooks/useStatus'
import type { Translations } from '@lib/static-paths-utils'
import FeatureSection from './FeatureSection'
import './FeaturesSection.scss'

type SectionId = 'storage_intro' | 'set_area' | 'compare' | 'save'

interface FeaturesSectionInnerProps {
    locale: string
    market: string
}

interface FeaturesSectionProps {
    locale: string
    market: string
    translations: Translations
}

const FeaturesSectionInner = ({ locale, market }: FeaturesSectionInnerProps) => {
    const { hasOutage } = useStatus(locale)
    const { t } = useTranslation('find-my-fit')
    const { queryTerm, categoryId } = useReferrer()
    const context = determineReferrerContext(null, categoryId, queryTerm, null)
    const referrerContext = formatReferrerContextForTracking(context)
    const referrerContextRef = useRef(referrerContext)
    const observedSections = useRef(new Set<SectionId>())
    if (hasOutage) return null

    referrerContextRef.current = referrerContext

    const featureSections: { id: SectionId; imageSrc: string; title: string }[] = [
        {
            id: 'set_area',
            imageSrc: withPrefix('/images/graphics/findMyFit/storageAOI.jpg', market),
            title: t('find-my-fit.landing.features.setArea.title'),
        },
        {
            id: 'compare',
            imageSrc: withPrefix('/images/graphics/findMyFit/swipe.jpg', market),
            title: t('find-my-fit.landing.features.compare.title'),
        },
        {
            id: 'save',
            imageSrc: withPrefix('/images/graphics/findMyFit/saveFavorites.jpg', market),
            title: t('find-my-fit.landing.features.save.title'),
        },
    ]

    return (
        <section className="FeaturesSection" data-section="storage_intro">
            <div className="FeaturesSection__intro">
                <h2 className="FeaturesSection__title">{t('find-my-fit.landing.features.intro.title')}</h2>
            </div>

            <div className="FeaturesSection__grid">
                {featureSections.map(({ id, imageSrc, title }) => (
                    <FeatureSection
                        key={id}
                        imageSrc={imageSrc}
                        title={title}
                        sectionId={id}
                        sectionRef={(el) => {
                            if (!el || observedSections.current.has(id)) return
                            observedSections.current.add(id)
                            const observer = new IntersectionObserver(
                                ([entry]) => {
                                    if (entry.isIntersecting) {
                                        visit(MP_FIND_MY_FIT_LANDING_SECTION_VIEWED, {
                                            Section: id,
                                            ReferrerContext: referrerContextRef.current,
                                        })
                                        observer.disconnect()
                                    }
                                },
                                { threshold: 0.5 },
                            )
                            observer.observe(el)
                        }}
                    />
                ))}
            </div>
        </section>
    )
}

const FeaturesSection = ({ locale, market, translations }: FeaturesSectionProps) => (
    <Sentry.ErrorBoundary fallback={<ErrorMessage />} onError={trackError}>
        <AppProviders locale={locale} market={market} translations={translations}>
            <FeaturesSectionInner locale={locale} market={market} />
        </AppProviders>
    </Sentry.ErrorBoundary>
)

export default FeaturesSection
