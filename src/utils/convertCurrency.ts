import { DEFAULT_LOCALE, AllowedLocaleType, CurrencyTypes } from 'models/location/constants'
import { getLocale } from 'models/location/selectors'

// Default locale value: 'en'
// Check supported locales here: /src/models/location/constants: ALLOWED_LOCALES
// TODO Locale: Add any new locales here
const localeCurrency: CurrencyTypes = {
    en: 'USD',
    'en-US': 'USD',
    'en-GB': 'GBP',
    'en-IE': 'EUR',
    'nl-NL': 'EUR',
    'en-NL': 'EUR',
    'en-CA': 'CAD',
    'fr-CA': 'CAD',
    'en-ES': 'EUR',
    'es-ES': 'EUR',
    'eu-ES': 'EUR',
    'gl-ES': 'EUR',
    'ca-ES': 'EUR',
    'de-DE': 'EUR',
    'fr-FR': 'EUR',
    'sv-SE': 'SEK',
    'en-JP': 'JPY',
    'ja-JP': 'JPY',
    'en-KR': 'KRW',
    'ko-KR': 'KRW',
    'pl-PL': 'PLN',
    'en-CH': 'CHF',
    'fr-CH': 'CHF',
    'de-CH': 'CHF',
    'it-CH': 'CHF',
    'en-AT': 'EUR',
    'de-AT': 'EUR',
    'it-IT': 'EUR',
    'en-AU': 'AUD',
    'en-SE': 'SEK',
    'en-BE': 'EUR',
    'fr-BE': 'EUR',
    'nl-BE': 'EUR',
    'da-DK': 'DKK',
    'fi-FI': 'EUR',
    'no-NO': 'NOK',
    'en-NO': 'NOK',
    'en-PT': 'EUR',
    'pt-PT': 'EUR',
    'cs-CZ': 'CZK',
    'en-CZ': 'CZK',
    'hu-HU': 'HUF',
    'sk-SK': 'EUR',
    'ro-RO': 'RON',
    'hr-HR': 'EUR',
    'sl-SI': 'EUR',
    'sr-RS': 'RSD',
    'en-FI': 'EUR',
    'en-IN': 'INR',
    'es-US': 'USD',
    'en-DE': 'EUR',
    'en-FR': 'EUR',
    'en-NZ': 'NZD',
    'sv-FI': 'EUR',
}

// Attempting to use GATSBY_LOCALE as a fallback before defaulting to DEFAULT_LOCALE when no locale is provided
const getEffectiveLocale = (locale?: AllowedLocaleType): { currency: string; locale: AllowedLocaleType } => {
    const gatsbyLocale = getLocale()

    if (locale && locale in localeCurrency) {
        return { currency: localeCurrency[locale], locale }
    }

    if (gatsbyLocale && gatsbyLocale in localeCurrency) {
        return {
            currency: localeCurrency[gatsbyLocale as AllowedLocaleType],
            locale: gatsbyLocale as AllowedLocaleType,
        }
    }

    return { currency: localeCurrency[DEFAULT_LOCALE], locale: DEFAULT_LOCALE }
}

export const localizedCurrency = (locale?: AllowedLocaleType): string => {
    const { currency } = getEffectiveLocale(locale)
    return currency
}

export const hasCustomFormat = (locale: string) => ['da-DK', 'no-NO', 'sv-SE', 'ro-RO', 'en-IN'].includes(locale)

const parseCustomCurrency = (locale: string, originalValue?: string): string => {
    switch (locale) {
        case 'da-DK':
            return '.-' // Danish Krone (DKK)
        case 'sv-SE':
            return ':-' // Swedish Krona (SEK)
        case 'en-NO':
        case 'no-NO':
            return ',-' // Norwegian Krone (NOK)
        case 'ro-RO':
            return ' lei' // Romanian lei (RON)
        case 'en-IN':
            return 'Rs.' // Indian Rupee (INR)
        default:
            return originalValue || localizedCurrency(locale as AllowedLocaleType)
    }
}

const parseCustomDecimal = (locale: string, originalValue?: string): string => {
    switch (locale) {
        case 'da-DK':
        case 'no-NO':
            return '.'
        case 'sv-SE':
            return ' '
        default:
            return originalValue ?? ''
    }
}

const getPriceToFormat = (
    effectiveLocale: { currency: string; locale: string },
    options: Omit<Intl.NumberFormatOptions, 'style' | 'currency'> = {},
) => {
    if (hasCustomFormat(effectiveLocale.locale)) {
        return Intl.NumberFormat(effectiveLocale.locale, {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
        })
    }

    return Intl.NumberFormat(effectiveLocale.locale, {
        style: 'currency',
        currency: effectiveLocale.currency,
        currencyDisplay: 'symbol',
        ...options,
    })
}

// price: float of type: xxxx.xx
// locale: string like 'en-US'
// return: string of type $x,xxx.xx or €x.xxx,xx
export const getLocalizedCurrencyString = (price: number, locale?: AllowedLocaleType) => {
    const effectiveLocale = getEffectiveLocale(locale)

    if (hasCustomFormat(effectiveLocale.locale)) {
        const formattedPrice = getPriceToFormat(effectiveLocale)
            ?.format(price)
            ?.replace(/\s+/g, parseCustomDecimal(effectiveLocale.locale))
        return formattedPrice + parseCustomCurrency(effectiveLocale.locale)
    }

    return getPriceToFormat(effectiveLocale).format(price)
}

const localizedCurrencyPosition = (locale: string): 'before' | 'after' => {
    switch (locale) {
        case 'en':
        case 'de-AT':
        case 'de-CH':
        case 'en-AT':
        case 'en-AU':
        case 'en-CA':
        case 'en-CH':
        case 'en-CZ':
        case 'en-FI':
        case 'en-GB':
        case 'en-IE':
        case 'en-JP':
        case 'en-KR':
        case 'en-NL':
        case 'en-US':
        case 'es-US':
        case 'en-IN':
        case 'en-NZ':
        case 'fr-CH':
        case 'it-CH':
        case 'it-IT':
        case 'ja-JP':
        case 'ko-KR':
        case 'nl-BE':
        case 'nl-NL':
        case 'sk-SK': {
            return 'before'
        }
        default: {
            return 'after'
        }
    }
}

const localizedCurrencyScriptType = (locale: string): CurrencyScriptType => {
    switch (locale) {
        case 'en-IN':
        case 'en-DE':
        case 'de-DE': {
            return 'subscript'
        }
        default: {
            return 'superscript'
        }
    }
}

type CurrencyScriptType = 'superscript' | 'subscript'
export type CurrencyParts = {
    integer: string
    decimal: string
    fraction: string
    currency: string
    currencyPosition: 'before' | 'after'
    currencyScriptType: CurrencyScriptType
}

export const formatCurrency = (
    amount: number,
    options: Omit<Intl.NumberFormatOptions, 'style' | 'currency'> = {},
    // localeParams is defined for unit tests
    localeParam?: AllowedLocaleType,
): CurrencyParts => {
    const locale = localeParam ?? (getLocale() as AllowedLocaleType)
    const effectiveLocale = getEffectiveLocale(locale)
    const currencyFormatter = getPriceToFormat(effectiveLocale, options)
    const parts: CurrencyParts = {
        integer: '',
        decimal: '',
        fraction: '',
        currency: '',
        currencyPosition: localizedCurrencyPosition(effectiveLocale.locale),
        currencyScriptType: localizedCurrencyScriptType(effectiveLocale.locale),
    }

    currencyFormatter.formatToParts(amount).forEach((part) => {
        switch (part.type) {
            case 'integer': {
                parts.integer += part.value
                break
            }
            case 'group': {
                parts.integer += part.value
                break
            }
            case 'decimal': {
                parts.decimal = part.value
                break
            }
            case 'fraction': {
                parts.fraction = part.value
                break
            }
            case 'currency': {
                parts.currency = part.value
                break
            }
            default: {
                break
            }
        }
    })

    if (hasCustomFormat(effectiveLocale.locale)) {
        parts.currency = parseCustomCurrency(effectiveLocale.locale, parts.currency)
        parts.decimal = parseCustomDecimal(effectiveLocale.locale, parts.decimal)
        parts.integer = parts.integer.replace(/\s+/g, parts.decimal)
    }

    return parts
}

export const currencyPartsToString = (parts: CurrencyParts): string =>
    parts.currencyPosition === 'before'
        ? `${parts.currency}${parts.integer}${parts.decimal}${parts.fraction}`
        : `${parts.integer}${parts.decimal}${parts.fraction}${parts.currency}`
