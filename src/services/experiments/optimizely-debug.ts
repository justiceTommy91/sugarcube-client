/* eslint-disable no-console */
import { getIsOptimizelyDebug } from 'models/location/selectors'

export type DecisionRecord = {
    type: 'experiment' | 'flag'
    key: string
    result: string | boolean
    timestamp: Date
    userAttributes?: Record<string, string | number | null>
    inAudience: boolean
}

const DEBUG_STORAGE_KEY = 'optimizely_debug_decisions'

let decisions: DecisionRecord[] = []

const getOptimizelyUserId = (): string | null => {
    if (typeof document === 'undefined') return null

    try {
        // Parse cookies similar to how the SDK does it
        const cookies = Object.fromEntries(
            document.cookie.split('; ').map((v) => v.split(/=(.*)/s).map(decodeURIComponent)),
        )

        return cookies.ikexp_id || null
    } catch (error) {
        console.warn('Failed to read ikexp_id cookie:', error)
        return null
    }
}

const loadFromStorage = (): DecisionRecord[] => {
    if (typeof sessionStorage === 'undefined') {
        return []
    }

    try {
        const stored = sessionStorage.getItem(DEBUG_STORAGE_KEY)
        if (!stored) return []

        return JSON.parse(stored).map((d: Omit<DecisionRecord, 'timestamp'> & { timestamp: string }) => ({
            ...d,
            timestamp: new Date(d.timestamp),
        }))
    } catch (error) {
        console.warn('Failed to load Optimizely debug decisions from storage:', error)
        // Clear corrupted data from storage
        try {
            sessionStorage.removeItem(DEBUG_STORAGE_KEY)
        } catch {
            // Silently fail if we can't clear
        }
        return []
    }
}

const saveToStorage = (decisionsToSave: DecisionRecord[]): void => {
    if (typeof sessionStorage === 'undefined') {
        return
    }

    try {
        sessionStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(decisionsToSave))
    } catch (error) {
        console.warn('Failed to save Optimizely debug decisions to storage:', error)
    }
}

const addDecision = (newDecision: DecisionRecord): void => {
    // Remove existing decision for this key and type
    decisions = decisions.filter((d) => !(d.type === newDecision.type && d.key === newDecision.key))

    // Add new decision
    decisions = [...decisions, newDecision]
    saveToStorage(decisions)
}

export const recordExperimentDecision = (
    experimentKey: string,
    variationKey: string | null,
    userAttributes?: Record<string, string | number | null>,
): void => {
    if (!getIsOptimizelyDebug()) return

    const inAudience = variationKey !== null && variationKey !== 'off'

    addDecision({
        type: 'experiment',
        key: experimentKey,
        result: variationKey || '(not in audience)',
        timestamp: new Date(),
        userAttributes,
        inAudience,
    })
}

export const recordFlagDecision = (
    flagKey: string,
    enabled: boolean,
    userAttributes?: Record<string, string | number | null>,
): void => {
    if (!getIsOptimizelyDebug()) return

    addDecision({
        type: 'flag',
        key: flagKey,
        result: enabled,
        timestamp: new Date(),
        userAttributes,
        inAudience: true, // Flags don't have audience exclusion in the same way
    })
}

export const displayDebugSummary = (): void => {
    if (!getIsOptimizelyDebug()) {
        console.log('Optimizely debug mode is not active. Add ?optimizely_debug to the URL to enable.')
        return
    }

    const experiments = decisions.filter((d) => d.type === 'experiment')
    const flags = decisions.filter((d) => d.type === 'flag')

    console.group('🔬 Optimizely Debug Mode Active')
    console.log('=====================================')

    // Show Optimizely User ID (ikexp_id)
    const optimizelyUserId = getOptimizelyUserId()
    console.log(`User ID (ikexp_id): ${optimizelyUserId || 'not set'}`)

    const latestDecision = decisions[decisions.length - 1]
    if (latestDecision?.userAttributes) {
        const userType = latestDecision.userAttributes.userType || 'unknown'
        const url = latestDecision.userAttributes.url || window.location.href
        console.log(`User Type: ${userType}`)
        console.log(`URL: ${url}`)
        console.log(`Session: ${new Date().toLocaleString()}`)
        console.log('')
    } else {
        // Show basic info even if no decisions yet
        console.log(`URL: ${window.location.href}`)
        console.log(`Session: ${new Date().toLocaleString()}`)
        console.log('')
    }

    if (experiments.length > 0) {
        console.log(`📊 EXPERIMENTS (${experiments.length}):`)
        experiments.forEach((exp) => {
            const icon = exp.inAudience ? '✅' : '⚪'
            console.log(`  ${icon} ${exp.key} → ${exp.result}`)
        })
        console.log('')
    }

    if (flags.length > 0) {
        console.log(`🚩 FLAGS (${flags.length}):`)
        flags.forEach((flag) => {
            const icon = flag.result ? '✅' : '❌'
            const status = flag.result ? 'enabled' : 'disabled'
            console.log(`  ${icon} ${flag.key} → ${status}`)
        })
        console.log('')
    }

    if (experiments.length === 0 && flags.length === 0) {
        console.log('No experiments or flags have been evaluated yet.')
        console.log('Navigate around the application to see decisions appear here.')
        console.log('')
    }

    console.log('=====================================')
    console.log('Use window.showOptimizelyDecisions() to refresh this view')
    console.groupEnd()
}

export const clearDebugDecisions = (): void => {
    decisions = []
    if (typeof sessionStorage === 'undefined') {
        return
    }
    try {
        sessionStorage.removeItem(DEBUG_STORAGE_KEY)
    } catch (error) {
        console.warn('Failed to clear Optimizely debug decisions from storage:', error)
    }
}

export const getDebugDecisions = (): DecisionRecord[] => [...decisions]

const initializeDebugState = (): void => {
    // Only do anything if debug mode is active
    if (!getIsOptimizelyDebug()) {
        return
    }

    // Load historical decisions from storage
    decisions = loadFromStorage()

    // Make displaySummary available globally
    if (typeof window !== 'undefined') {
        ;(window as Window & typeof globalThis & { showOptimizelyDecisions: () => void }).showOptimizelyDecisions =
            displayDebugSummary

        // Auto-display summary when debug mode is first detected
        // Delay to ensure DOM is ready and not interfere with initialization
        setTimeout(() => {
            console.log('🔬 Optimizely Debug Mode detected! Decisions will be recorded and displayed here.')
            console.log('Use window.showOptimizelyDecisions() anytime to see the current summary.')
        }, 1000)
    }
}

// Initialize on module load
initializeDebugState()
