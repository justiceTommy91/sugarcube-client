export type Result<T> =
    | {
          status: 'success'
          result: T
          error: null
      }
    | {
          status: 'error'
          result: null
          error: Error
      }
