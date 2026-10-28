declare global {
    namespace ikea {
        interface AuthToken {
            expirationTime: number
            value: string
        }

        interface AuthTokensContainer {
            auth?: AuthToken
            guest?: AuthToken
        }

        interface AuthenticationService {
            getTokens(callback: (error: unknown, tokens: AuthTokensContainer) => void): void
        }
    }
}

export {}
