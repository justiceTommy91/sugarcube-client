import { readFileSync } from 'fs'
import { join } from 'path'
import { ALLOWED_LOCALES } from '@models/location/constants'

// Import types from the en locale to use as type references
import type dashboard from '@locales/en/dashboard.json'
import type learnmore from '@locales/en/learnmore.json'
import type translation from '@locales/en/translation.json'
import type common from '@locales/en/common.json'
import type findMyFit from '@locales/en/find-my-fit.json'

/**
 * Type-safe translations object that includes all common translation namespaces
 */
export interface Translations {
    learnmore: typeof learnmore
    common: typeof common
    dashboard: typeof dashboard
    translation: typeof translation
    'find-my-fit': typeof findMyFit
}

/**
 * Partial translations that allows subsets of the full Translations interface
 */
export type PartialTranslations = Partial<Translations>

/**
 * Props passed to Astro pages with locale and translations
 */
export interface LocalePageProps {
    locale: string
    translations: PartialTranslations
}

/**
 * Loads translation files for a given locale from the locales directory
 * @param locale The locale code (e.g., 'en-US')
 * @param translationFiles Array of translation file names to load (without .json extension)
 * @returns Object with translations keyed by file name
 */
function loadTranslations(locale: string, translationFiles: string[]): PartialTranslations {
    const localesPath = join(process.cwd(), '..', 'locales', locale)
    const translations: PartialTranslations = {}

    for (const fileName of translationFiles) {
        try {
            const filePath = join(localesPath, `${fileName}.json`)
            const key = fileName as keyof Translations
            translations[key] = JSON.parse(readFileSync(filePath, 'utf-8'))
        } catch (error) {
            console.warn(`Warning: Could not load ${fileName}.json for locale ${locale}`)
        }
    }

    return translations
}

/**
 * Generates static paths for all locales with their translations
 * @param translationFiles Array of translation file names to load (defaults to common set)
 * @returns Array of static path objects with params and props
 */
export function generateLocaleStaticPaths(
    translationFiles: string[] = ['learnmore', 'common', 'dashboard', 'translation', 'find-my-fit'],
) {
    return ALLOWED_LOCALES.filter((locale) => locale.includes('-')).map((locale) => {
        // Convert locale format (en-US) to URL format (us/en)
        const [lang, country] = locale.split('-')

        // Load translations at build time
        const translations = loadTranslations(locale, translationFiles)

        return {
            params: {
                country: country.toLowerCase(),
                lang: lang.toLowerCase(),
            },
            props: { locale, translations } as LocalePageProps,
        }
    })
}
