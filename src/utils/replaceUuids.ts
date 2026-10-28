/* eslint-disable no-restricted-syntax */

const mapUuidToLocale = (
    uuid: string,
    locale: string,
    uuidMap?: Record<string, Record<string, string>>,
    defaultLocale?: string,
) => {
    if (locale === defaultLocale) {
        return uuid
    }

    return uuidMap?.[uuid]?.[locale] ?? uuid
}

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/* This function replaces all UUIDs in the object with the corresponding UUID in the given locale */
/* So we can have composition and scene ids in the correct locale */
export const deepReplaceUuids = <T>(
    obj: T,
    locale: string,
    uuidMap?: Record<string, Record<string, string>>,
    defaultLocale?: string,
): T => {
    if (locale === defaultLocale || !uuidMap) return obj

    const jsonString = JSON.stringify(obj)
    const replaced = jsonString.replace(
        UUID_REGEX,
        (uuid) => mapUuidToLocale(uuid, locale, uuidMap, defaultLocale) ?? uuid,
    )
    return JSON.parse(replaced) as T
}
