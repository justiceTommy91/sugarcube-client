declare global {
    interface DocumentEventMap {
        ikeaExperimentReady: Event
    }

    namespace ikea {
        type ErrorCodes = {
            USER_DID_NOT_ACCEPT_COOKIE: number
            FAIL_FETCH_DATAFILE: number
            INVALID_DATAFILE: number
            OUT_OF_TIME: number
        }

        type Attributes = Record<string, string | number | boolean | null>

        interface Variation {
            id: string
            key: string
        }

        interface Experiment {
            id: string
            key: string
            variations: Variation[]
        }

        interface ExperimentServiceOptions {
            timeout?: number
        }

        interface ExperimentService {
            enums: {
                ERROR_CODES: ErrorCodes
            }
            init(
                optimizelySdkKey: string,
                options?: ExperimentServiceOptions,
                attributes?: Attributes,
            ): Promise<{ client: OptimizelyWrapper }>
        }
    }
}

export {}
