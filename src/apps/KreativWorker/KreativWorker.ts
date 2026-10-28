const Worker = globalThis.Worker

const cloneEvent = <E extends keyof WorkerEventMap>(event: WorkerEventMap[E]): WorkerEventMap[keyof WorkerEventMap] => {
    if (event instanceof ErrorEvent) {
        return new ErrorEvent(event.type, {
            bubbles: event.bubbles,
            cancelable: event.cancelable,
            colno: event.colno,
            composed: event.composed,
            error: event.error,
            filename: event.filename,
            lineno: event.lineno,
            message: event.message,
        })
    }
    return new MessageEvent(event.type, {
        cancelable: event.cancelable,
        bubbles: event.bubbles,
        composed: event.composed,
        lastEventId: event.lastEventId,
        origin: event.origin,
        source: event.source,
        data: event.data,
        // NOTE: the WHATWG spec requires that MessageEvent.prototype.props always be an array, however due to various browser spec violations
        //       (see https://github.com/whatwg/html/issues/1882) it is safest to assume that ports may be undefined/nullable.
        ports: event.ports ? [...event.ports] : [],
    })
}

const startWorker = async (aURL: URL, options?: WorkerOptions): Promise<Worker> => {
    // If the URL is already a data URL representing a blob, our work is already done!
    if (aURL.protocol === 'blob:') {
        return new Worker(aURL, options)
    }
    const response = await fetch(aURL)
    const data = await response.blob()
    const dataUrl = URL.createObjectURL(data)
    let worker
    try {
        worker = new Worker(dataUrl, options)
    } finally {
        URL.revokeObjectURL(dataUrl)
    }
    return worker
}

export class KreativWorker extends EventTarget implements Worker {
    #worker?: Worker

    #error?: ErrorEvent

    #terminated = false

    constructor(aURL: string | URL, options?: WorkerOptions) {
        super()
        // NOTE: according to https://html.spec.whatwg.org/multipage/workers.html#dom-worker-dev
        //       the Worker constructor can throw a "SyntaxError" DOMException if the url passed cannot be parsed. So to
        //       be spec-compliant we'll do that here by normalizing aURL param to a URL instance.
        try {
            // eslint-disable-next-line no-param-reassign
            aURL = new URL(aURL)
        } catch {
            const message = `'${aURL}' is not a valid URL`
            // eslint-disable-next-line i18next/no-literal-string
            throw new DOMException(`Failed to construct Worker: ${message}.`, 'SyntaxError')
        }
        // NOTE: from testing in chrome it appears that the Worker constructor can also throw if the URL violates the
        //       same-origin policy, so we'll do some basic checks here to emulate that behavior, though notably this
        //       behavior is not specified in https://html.spec.whatwg.org/multipage/workers.html#dom-worker-dev.
        if (aURL.origin !== window.origin) {
            const message = `Script at '${aURL}' cannot be accessed from origin '${window.origin}'`
            throw new DOMException(
                `Failed to construct Worker: ${message}.`,
                // eslint-disable-next-line i18next/no-literal-string
                'SecurityError',
            )
        }
        startWorker(aURL, options)
            .catch((error) => {
                // eslint-disable-next-line no-console
                console.warn(`failed to start worker w/ blob: URL, falling back to Worker constructor: ${error}`)
                return new Worker(aURL, options)
            })
            .then((worker) => {
                // If the worker has been terminated before it has had a chance to start, immediately terminate it
                // and forego any additional initialization.
                if (this.#terminated) {
                    worker.terminate()
                    return
                }

                worker.addEventListener('error', this.#forwardEvent)
                worker.addEventListener('message', this.#forwardEvent)
                worker.addEventListener('messageerror', this.#forwardEvent)

                this.#worker = worker

                this.#scheduleProcessMessage()
            })
            .catch((error) => {
                // eslint-disable-next-line i18next/no-literal-string
                this.#error = new ErrorEvent('error', { error })
            })
    }

    // NOTE: we have to ensure that `this` is bound to this method, otherwise event listeners will capture `this`
    //       from the handler (e.g. the worker instance).
    #forwardEvent = <E extends keyof WorkerEventMap>(event: WorkerEventMap[E]): void => {
        const clonedEvent = cloneEvent(event)
        event.preventDefault()
        event.stopPropagation()
        this.dispatchEvent(clonedEvent)
    }

    #messageQueue: Array<[unknown, Transferable[] | (StructuredSerializeOptions | undefined)]> = []

    #queueMessage(message: unknown, options: Transferable[] | (StructuredSerializeOptions | undefined)): void {
        this.#messageQueue.push([message, options])
        this.#scheduleProcessMessage()
    }

    #scheduleProcessMessage(): void {
        // Stagger message posting so that only a single message is posted per event tick to avoid
        // overloading the MessagePort, which can lead to the Worker missing messages.
        setTimeout(() => {
            // If the worker instance hasn't been initialized yet or was terminated, cancel processing.
            if (!this.#worker) {
                return
            }

            const queuedMessage = this.#messageQueue.shift()
            if (!queuedMessage) {
                return
            }

            const [message, options] = queuedMessage
            // FIXME: typescript typings for postMessage mean that we have to check if options is an array,
            //        not sure why...
            if (Array.isArray(options)) {
                this.#worker.postMessage(message, options)
                return
            }
            this.#worker.postMessage(message, options)

            // If there are additional messages queued, schedule processing for the next tick.
            if (this.#messageQueue.length > 0) {
                this.#scheduleProcessMessage()
            }
        }, 0)
    }

    addEventListener<K extends keyof WorkerEventMap>(
        type: K,
        listener: (this: Worker, ev: WorkerEventMap[K]) => unknown,
        options?: boolean | AddEventListenerOptions,
    ): void
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void {
        // If an error was generated piror to worker initialization (e.g. during worker code fetching)
        // then we immediately trigger the listener and forego registering it as a callback since
        // no other error events can possibly be dispatched after that point.
        if (type === 'error' && this.#error) {
            if (typeof listener === 'function') {
                listener(this.#error)
            } else {
                listener.handleEvent(this.#error)
            }
            return
        }
        super.addEventListener(type, listener, options)
    }

    postMessage(message: unknown, options: Transferable[] | (StructuredSerializeOptions | undefined)): void {
        this.#queueMessage(message, options)
    }

    terminate(): void {
        this.#terminated = true

        if (this.#worker != null) {
            this.#worker.terminate()
            this.#worker.removeEventListener('error', this.#forwardEvent)
            this.#worker.removeEventListener('message', this.#forwardEvent)
            this.#worker.removeEventListener('messageerror', this.#forwardEvent)
        }
    }

    set onmessage(callback: ((this: Worker, ev: MessageEvent<unknown>) => unknown) | null) {
        if (callback == null) {
            return
        }
        this.addEventListener('message', callback)
    }

    set onerror(callback: (this: AbstractWorker, ev: ErrorEvent) => unknown) {
        this.addEventListener('error', callback)
    }

    set onmessageerror(callback: (this: Worker, ev: MessageEvent<unknown>) => unknown) {
        this.addEventListener('messageerror', callback)
    }
}
