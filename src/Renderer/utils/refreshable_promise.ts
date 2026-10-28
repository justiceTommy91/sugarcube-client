
class RefreshablePromise<T> {
    private promise: Promise<T>
    private resolve!: (v: T) => void
    private reject!: (e: unknown) => void

    constructor() {
        this.promise = this.reset()
    }

    reset() {
        this.promise = new Promise<T>((res, rej) => {
            this.resolve = res
            this.reject = rej
        })

        return this.promise
    }

    ready(): Promise<T> {
        return this.promise
    }

    commit(v: T): void {
        this.resolve(v)
    }

    fail(e: unknown): void {
        this.reject(e)
    }
}

export default RefreshablePromise