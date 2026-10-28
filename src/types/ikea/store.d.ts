declare global {
    namespace ikea {
        interface StoreService {
            get: () => Promise<string>
        }
    }
}

export {}
