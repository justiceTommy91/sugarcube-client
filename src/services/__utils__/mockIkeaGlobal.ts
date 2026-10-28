export const reset = (): void => {
    // Reset function kept for compatibility
}

type PartiallyMocked<T, MockedProps extends keyof T> = Omit<T, MockedProps> & jest.Mocked<Pick<T, MockedProps>>

type MockedExperimentApi = PartiallyMocked<ikea.ExperimentsApi, 'init'>
type MockedOptimizelyWrapper = PartiallyMocked<ikea.ExperimentsClient, 'track' | 'decide'>
type MockedCookieConsentApi = ikea.CookieConsentService

export type IkeaMock = {
    experiment: MockedExperimentApi
    exptSDK: MockedExperimentApi // Same as experiment for compatibility
    cookieConsent: MockedCookieConsentApi
    mockClient: MockedOptimizelyWrapper
}

class IkeaMockImpl implements IkeaMock {
    #experiment: Readonly<MockedExperimentApi>

    #mockClient: Readonly<MockedOptimizelyWrapper>

    #cookieConsent: Readonly<MockedCookieConsentApi>

    public constructor() {
        this.#mockClient = {
            track: jest.fn(),
            decide: jest.fn().mockImplementation((key: string) => ({
                success: false,
                error: new Error(`No decision found for key: ${key}`),
            })),
            close: jest.fn().mockResolvedValue({ success: true }),
        }

        const initMock = jest.fn().mockResolvedValue({
            client: this.#mockClient,
        })

        this.#experiment = {
            init: initMock,
        }

        this.#cookieConsent = {
            hasConsent: () => true,
        }
    }

    get experiment() {
        return this.#experiment
    }

    get exptSDK() {
        return this.#experiment
    }

    get cookieConsent() {
        return this.#cookieConsent
    }

    get mockClient() {
        return this.#mockClient
    }
}

Object.defineProperty(globalThis, 'ikea', { configurable: true, writable: true, value: undefined })
const globalProp = jest.replaceProperty(globalThis, 'ikea', undefined)

export type LoadOptions = {
    after?: number
    /**
     * If true, simulates an opt-in cookie consent market where consent has NOT been given.
     * The SDK will be loaded but cookieConsent.hasConsent() will return false.
     */
    withoutConsent?: boolean
}

let loadHandle: ReturnType<typeof globalThis.setTimeout>

export function load({ after = 0, withoutConsent = false }: LoadOptions = {}): IkeaMock {
    const ikea = new IkeaMockImpl()

    // Override consent behavior if withoutConsent is true
    if (withoutConsent) {
        // Replace the cookieConsent with one that returns false (configurable for later changes)
        Object.defineProperty(ikea, 'cookieConsent', {
            get: () => ({
                hasConsent: () => false,
            }),
            configurable: true,
        })
    }

    const init = () => {
        globalProp.replaceValue(ikea)
        document.dispatchEvent(new Event('ikeaExperimentReady'))
        if (!withoutConsent) {
            document.dispatchEvent(
                new CustomEvent('ikeaCookieConsent', { detail: { 1: true, 2: true, 3: true, 4: true } }),
            )
        }
    }
    if (after > 0) {
        loadHandle = globalThis.setTimeout(init, after)
    } else {
        init()
    }
    return ikea
}

/**
 * Simulate the user giving consent after the SDK has loaded.
 * This updates the mock's hasConsent() to return true and triggers the ikeaCookieConsent event.
 * @param ikea - The mock instance to update. If provided, updates the cookieConsent property.
 */
export function grantConsent(ikea?: IkeaMock): void {
    // Update the mock's consent status if provided
    if (ikea) {
        Object.defineProperty(ikea, 'cookieConsent', {
            get: () => ({
                hasConsent: () => true,
            }),
            configurable: true,
        })
    }
    document.dispatchEvent(new CustomEvent('ikeaCookieConsent', { detail: { 1: true, 2: true, 3: true, 4: true } }))
}

export const unload = () => {
    // Ensure that we clear any timeouts when we clean up to avoid polluting other tests
    globalThis.clearTimeout(loadHandle)
    globalProp.restore()

    // Finally reset the state of the mock implementation just to be sure that no dangling references
    // with previous test state hang around.
    reset()
}
