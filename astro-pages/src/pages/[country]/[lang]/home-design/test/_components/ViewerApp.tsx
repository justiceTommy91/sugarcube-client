// Client-side entry point for viewer test page
import React from 'react'
import { AppProviders } from '@providers/AppProviders'

import type dashboard from '@locales/en/dashboard.json'
import type learnmore from '@locales/en/learnmore.json'
import type translation from '@locales/en/translation.json'
import type common from '@locales/en/common.json'
import type findMyFit from '@locales/en/find-my-fit.json'
import { ViewerTest } from './ViewerTest'

export interface Translations {
    learnmore: typeof learnmore
    common: typeof common
    dashboard: typeof dashboard
    translation: typeof translation
    'find-my-fit': typeof findMyFit
}

interface ViewerAppProps {
    locale: string
    market: string
    translations: Translations
}

export const ViewerApp = ({ locale, market, translations }: ViewerAppProps) => (
    <AppProviders locale={locale} market={market} translations={translations}>
        <ViewerTest />
    </AppProviders>
)
