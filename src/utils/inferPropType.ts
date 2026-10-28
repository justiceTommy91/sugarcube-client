import type { Validator, InferProps, Requireable } from 'prop-types'

type IsNullish<T> = undefined extends T ? true : null extends T ? true : false

type InferInnerPropType<T> = IsNullish<T> extends true
    ? InferInnerPropType<NonNullable<T>> | undefined | null
    : [T] extends [Array<infer V>]
    ? InferInnerPropType<V>[]
    : [T] extends [object]
    ? InferProps<{ [K in keyof T]-?: InferPropTypeImpl<T[K]> }>
    : T

type InferPropTypeImpl<T> = IsNullish<T> extends true
    ? Requireable<InferInnerPropType<NonNullable<T>>>
    : Validator<InferInnerPropType<T>>

/**
 * Given some type T, InferPropType will construct the type of prop type validator
 * required to validate an instance of T. This type should exactly match what the
 * prop-types validator builders produce, and thus can be used to ensure that a
 * prop type validator and it's associated type T align.
 *
 * Note that InferPropType is intended to be used for top-level validators only,
 * and thus will not enforce strict nullish checking.
 *
 * @example
 * import { shape, string, number } from 'prop-types'
 *
 * type Foo = {
 *   bar: string
 *   baz?: number
 * }
 * // Typechecks
 * const fooValidator: InferPropType<Foo> = shape({
 *   bar: string.isRequired,
 *   baz: number,
 * })
 * const missingRequiredFooValidator: InferPropType<Foo> = shape({
 *   bar: string,
 * //     ^ non-nullable properties must specify isRequired
 *   baz: number,
 * })
 * const missingPropFooValidator: InferPropType<Foo> = shape({
 * //    ^ missing required property "baz"
 *   bar: string.isRequired,
 * })
 */
export type InferPropType<T> = InferPropTypeImpl<T | undefined | null>

/**
 * Given some object type T, InferPropTypeShape will construct a shape type suitable as an
 * argument to the `import('prop-types').shape` validator builder.
 *
 * This is useful for cases where some shape is common to two different types/validators, so
 * you can spread in the shape as a sort of mixin.
 */
export type InferPropTypeShape<T extends object> = { [K in keyof T]-?: InferPropTypeImpl<T[K]> }
