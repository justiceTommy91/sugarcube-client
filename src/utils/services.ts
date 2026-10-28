
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Allow any in helper type
export type ApiReturn<T extends (...args: any[]) => any> = UnwrapPromise<ReturnType<T>>
