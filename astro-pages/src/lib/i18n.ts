import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { ALLOWED_LOCALES } from '@models/location/constants'

import type dashboard from '@locales/en/dashboard.json'
import type learnmore from '@locales/en/learnmore.json'
import type translation from '@locales/en/translation.json'
import type common from '@locales/en/common.json'
import type findMyFit from '@locales/en/find-my-fit.json'

interface Translations {
    learnmore: typeof learnmore
    common: typeof common
    dashboard: typeof dashboard
    translation: typeof translation
    'find-my-fit': typeof findMyFit
}

// Initialize i18n singleton at module load time with empty resources
i18n.use(initReactI18next).init({
    resources: {},
    lng: 'en-US',
    fallbackLng: 'en-US',
    ns: ['learnmore', 'common', 'dashboard', 'translation', 'find-my-fit'],
    interpolation: {
        escapeValue: false,
    },
    react: {
        useSuspense: false,
    },
})

// Add translations to already-initialized i18n instance
export const initI18nWithTranslations = (locale: string, translations: Translations) => {
    // Add resource bundles for this locale
    i18n.addResourceBundle(locale, 'learnmore', translations.learnmore, true, true)
    i18n.addResourceBundle(locale, 'common', translations.common, true, true)
    i18n.addResourceBundle(locale, 'dashboard', translations.dashboard, true, true)
    i18n.addResourceBundle(locale, 'translation', translations.translation, true, true)
    i18n.addResourceBundle(locale, 'find-my-fit', translations['find-my-fit'], true, true)

    // Change to this locale
    i18n.changeLanguage(locale)

    return i18n
}

export default i18n
