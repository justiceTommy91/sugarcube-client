declare global {
    namespace ikea {
        interface PostalCodeService {
            get: () => Promise<ZipObject>
        }
    }
}

export {}
