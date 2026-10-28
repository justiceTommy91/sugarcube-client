import React, { lazy, Suspense } from 'react'
import { AppProviders } from '@providers/AppProviders'
import { StatusProvider } from '@providers/StatusProvider'

import type { Translations } from '@lib/static-paths-utils'
import BouncingBallLoader from '@gatsby/components/uiElements/BouncingBallLoader'
// Imported here (not in FindMyFitViewer.tsx) so styles are bundled with the eager entry point
// and available before the lazy FindMyFitViewer chunk loads and ResizeObserver fires.
import './FindMyFitViewer.scss'

interface FindMyFitViewerAppProps {
    locale: string
    market: string
    translations: Translations
}

// Wrapper avoids the defaultProps deprecation warning from the legacy component.
const Loader = () => <BouncingBallLoader />

// Lazy-loaded to code-split Three.js and ViewerContext from the eager entry point.
const FindMyFitViewer = lazy(() =>
    import('@astro-components/find-my-fit/FindMyFitViewer').then((m) => ({ default: m.FindMyFitViewer })),
)

export const FindMyFitViewerApp = ({ locale, market, translations }: FindMyFitViewerAppProps) => (
    <AppProviders locale={locale} market={market} translations={translations}>
        <StatusProvider>
            <Suspense fallback={<Loader />}>
                <FindMyFitViewer />
            </Suspense>
        </StatusProvider>
    </AppProviders>
)
