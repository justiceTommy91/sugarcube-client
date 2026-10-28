import { COMPOSITION_ID_PARAM } from '../constants'

/**
 * Adds or replaces the `compositionId` query parameter in the current URL
 * without pushing a new browser history entry.
 */
export function updateUrlWithCompositionId(compositionId: string): void {
    const url = new URL(window.location.href)
    url.searchParams.set(COMPOSITION_ID_PARAM, compositionId)
    window.history.replaceState(null, '', url.toString())
}
