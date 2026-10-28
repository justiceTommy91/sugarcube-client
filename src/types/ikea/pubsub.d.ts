declare global {
    namespace ikea {
        interface PubsubEventMap {
            'NAVIGATION/STORE_SET': string
            'NAVIGATION/POSTALCODE_SET': ikea.ZipObject
            'NAVIGATION/OPEN_STORE_PICKER': undefined
            'NAVIGATION/OPEN_POSTALCODE_PICKER': undefined
        }

        type PubsubEventsWithData = {
            [E in keyof PubsubEventMap]: PubsubEventMap[E] extends undefined ? never : PubsubEventMap[E]
        }
        type PubsubEventsWithoutData = {
            [E in keyof PubsubEventMap]: PubsubEventMap[E] extends undefined ? PubsubEventMap[E] : never
        }

        interface PubsubService {
            publish<E extends keyof PubsubEventsWithData>(event: E, data: PubsubEventMap[E]): void
            publish<E extends keyof PubsubEventsWithoutData>(event: E): void
            publish(event: string, data: unknown): void

            subscribe<E extends keyof PubsubEventsWithData>(event: E, callback: (data: PubsubEventMap[E]) => void): void
            subscribe<E extends keyof PubsubEventsWithoutData>(event: E, callback: () => void): void
            subscribe(event: string, callback: (data: unknown) => void): void
        }
    }
}

export {}
