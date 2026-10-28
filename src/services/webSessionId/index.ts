import * as Sentry from '@sentry/react'
import { v7 as uuidv7 } from 'uuid'
import { WebSessionState } from './types'

export const WEB_SESSION_ID = 'WebSessionId'

let sessionState: WebSessionState = {
    sessionId: '',
    initialized: false,
}

const generateSessionId = (): string => uuidv7()

const retrieveSessionId = (): string | null => {
    try {
        return sessionStorage.getItem(WEB_SESSION_ID) || null
    } catch (error) {
        Sentry.captureException(error)
        return null
    }
}

const storeSessionId = (sessionId: string): void => {
    try {
        sessionStorage.setItem(WEB_SESSION_ID, sessionId)
    } catch (error) {
        Sentry.captureException(error)
    }
}

const updateSessionState = (updater: (prevState: WebSessionState) => WebSessionState): void => {
    sessionState = updater(sessionState)
    storeSessionId(sessionState.sessionId)
}

export const webSessionService = {
    get sessionId(): string {
        let { sessionId } = sessionState
        if (!sessionId) {
            sessionId = retrieveSessionId() || generateSessionId()
            updateSessionState(() => ({
                sessionId,
                initialized: true,
            }))
        }

        return sessionId
    },

    resetSession: (): void => {
        const newSessionId = generateSessionId()
        updateSessionState(() => ({
            sessionId: newSessionId,
            initialized: true,
        }))
    },
}
