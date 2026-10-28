import React, { useMemo, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { I18nextProvider } from 'react-i18next'

import type dashboard from '@locales/en/dashboard.json'
import type learnmore from '@locales/en/learnmore.json'
import type translation from '@locales/en/translation.json'
import type common from '@locales/en/common.json'
import type findMyFit from '@locales/en/find-my-fit.json'
import ToastDisplay from '@astro-components/common/ToastDisplay'
import { initI18nWithTranslations } from '../lib/i18n'
import { SugarcubeProvider } from './SugarcubeContext'
import { UserProvider } from './UserProvider'
import { ToastsProvider } from './ToastsProvider'

interface Translations {
    learnmore: typeof learnmore
    common: typeof common
    dashboard: typeof dashboard
    translation: typeof translation
    'find-my-fit': typeof findMyFit
}

interface AppProvidersProps {
    locale?: string
    market?: string
    translations: Translations
    children?: ReactNode
}

const queryClient = new QueryClient()

export const AppProviders = ({ locale = 'en-US', market = 'us/en', translations, children }: AppProvidersProps) => {
    // Use props directly - Astro ensures consistency between SSR and hydration
    const i18nInstance = useMemo(() => initI18nWithTranslations(locale, translations), [locale, translations])

    return (
        <I18nextProvider i18n={i18nInstance}>
            <SugarcubeProvider locale={locale} market={market}>
                <QueryClientProvider client={queryClient}>
                    <ToastsProvider>
                        <UserProvider>{children}</UserProvider>
                        <ToastDisplay />
                    </ToastsProvider>
                    {/* Only show in local development */}
                    {import.meta.env.DEV && <ReactQueryDevtools />}
                </QueryClientProvider>
            </SugarcubeProvider>
        </I18nextProvider>
    )
}
