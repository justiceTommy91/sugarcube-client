import { validate as validateUuid } from 'uuid'

export const stringIsUuidOrNumber = (a: string | undefined): boolean =>
    !!a && (validateUuid(a) || !Number.isNaN(Number(a)))

export const stringIncludesCaseInsensitive = (key: string, testString: string | string[]) => {
    if (Array.isArray(testString)) {
        return testString.some((substring) => substring.toLowerCase().includes(key.toLowerCase()))
    }
    if (typeof testString === 'string') {
        return testString.toLowerCase().includes(key.toLowerCase())
    }
    return false
}

/**
 * Splits a string by comma, space, newline, or any combination of these delimiters
 */
export const splitByCommonDelimiters = (str: string): string[] => str.split(/[,\s\n]+/).filter(Boolean)

// https://blog.beraliv.dev/2021-11-29-split
export type Split<S extends string, Separator extends string> = S extends `${infer Word}${Separator}${infer Rest}`
    ? [Word, ...Split<Rest, Separator>]
    : S extends ''
    ? Separator extends ''
        ? []
        : [S]
    : string extends S
    ? S[]
    : [S]

export type LocaleToRegion<T extends string> = T extends `${infer Lang}-${infer Country}`
    ? `${Lowercase<Country>}/${Lang}`
    : never

export const capitalize = (s: string): Capitalize<string> => s.charAt(0).toUpperCase() + s.slice(1) as Capitalize<string>
