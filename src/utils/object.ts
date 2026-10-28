/* eslint-disable no-param-reassign */
// Takes an array and key function
// Returns an object of arrays grouped by the result of the key function
// run on each element
export const groupBy = <T>(items: T[], fn: (item: T) => string): Record<string, T[] | undefined> =>
    items.reduce((result, item) => {
        const key = fn(item)

        if (key in result) {
            result[key].push(item)
        } else {
            // eslint-disable-next-line no-param-reassign
            result[key] = [item]
        }
        return result
    }, Object.create(null))

export type OmitNilValues<T extends object> = {
    [K in keyof T]: T[K] extends undefined | null ? never : T[K]
}

export const omitNilValues = <T extends object>(obj: T): OmitNilValues<T> =>
    Object.entries(obj).reduce((result, [key, value]) => {
        if (value != null) {
            result[key as keyof T] = value
        }
        return result
    }, {} as OmitNilValues<T>)

// Like keyof, but for object values
export type ValueOf<T> = T extends readonly (infer U)[]
    ? U
    : T extends Record<string | number | symbol, infer U>
    ? U
    : never

/** Helper type to recursively apply the {@link Partial} type to the values of an object. */
export type DeepPartial<T> = T extends Array<infer U> ? Array<U> | undefined : { [K in keyof T]?: DeepPartial<T[K]> }

/**
 * Safely checks if an object has a specific property as its own property (not inherited).
 * This is the preferred way to check for object properties to avoid potential issues
 * with objects that don't inherit from Object.prototype.
 *
 * @param obj - The object to check
 * @param prop - The property name to check for
 * @returns true if the object has the property as its own property, false otherwise
 *
 * @example
 * ```ts
 * const obj = { foo: 'bar' }
 * hasProp(obj, 'foo') // true
 * hasProp(obj, 'toString') // false (inherited)
 * ```
 */
export const hasProp = (obj: object, prop: string | number | symbol): boolean =>
    Object.prototype.hasOwnProperty.call(obj, prop)
