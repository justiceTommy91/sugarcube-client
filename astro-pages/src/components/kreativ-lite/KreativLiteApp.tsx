import React, { lazy, Suspense } from 'react'
import { AppProviders } from '@providers/AppProviders'
import type { Translations } from '@lib/static-paths-utils'
import BouncingBallLoader from '@gatsby/components/uiElements/BouncingBallLoader'

interface KreativLiteAppProps {
    locale: string
    market: string
    translations: Translations
}

const KreativLiteViewer = lazy(() =>
    import('@astro-components/kreativ-lite/KreativLiteViewer').then((m) => ({ default: m.KreativLiteViewer })),
)

export const KreativLiteApp = ({ locale, market, translations }: KreativLiteAppProps) => (
    <AppProviders locale={locale} market={market} translations={translations}>
        <Suspense fallback={<BouncingBallLoader className="BouncingBallLoader__roomBuilderPage" />}>
            <KreativLiteViewer />
        </Suspense>
    </AppProviders>
)
