import axios from 'axios'
import { mergeGuestData } from 'services/guestMergeService'
import * as Sentry from '@sentry/react'
import {
    stashGuestToken,
    getStashedGuestToken,
    clearStashedGuestToken,
    stashGuestCompositionId,
    getStashedGuestCompositionId,
    clearStashedGuestCompositionId,
    stashMergeSceneId,
    getStashedMergeSceneId,
    clearStashedMergeSceneId,
} from 'utils/guestToken'

export enum MergeReturnResultType {
    Success = 'SUCCESS',
    PermanentFailure = 'PERMANENT_FAILURE',
    TransientFailure = 'TRANSIENT_FAILURE',
}

export type MergeReturnResult =
    | { type: MergeReturnResultType.Success; compositionId: string; sceneId: string }
    | { type: MergeReturnResultType.PermanentFailure; sceneId: string }
    | { type: MergeReturnResultType.TransientFailure }

// Backoffs between attempts. Total attempts = length + 1 (initial + one per entry).
const TRANSIENT_RETRY_BACKOFFS_MS = [500, 1500] as const

// Atomically stashes all three values needed for a later merge.
//
// Called only by saveSelectedComposition, only when: token type is 'guest',
// scene is a Kreativ Lite scan, and the backend save succeeded. This makes
// stash presence a reliable "guest save completed, user sent to login"
// signal — there is no other code path that writes them.
export function beginKreativLiteGuestSave(guestToken: string, compositionId: string, sceneId: string): void {
    stashGuestToken(guestToken)
    stashGuestCompositionId(compositionId)
    stashMergeSceneId(sceneId)
}

// True between a guest save and its eventual merge (success or permanent
// failure clears the stashes). Used to suppress flows that would otherwise
// step on the pending merge: RendererProvider's selectScene, the
// beforeunload "unsaved changes" warning, and requestLoginPage's
// CONTEXT_ROOM resume autosave.
export function hasPendingKreativLiteGuestSave(): boolean {
    return !!getStashedGuestToken() && !!getStashedGuestCompositionId() && !!getStashedMergeSceneId()
}

function clearStashes(): void {
    clearStashedGuestToken()
    clearStashedGuestCompositionId()
    clearStashedMergeSceneId()
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

// Single-attempt merge. Exposed for the failure-toast retry path, which
// shouldn't make a user-initiated click sit through internal backoffs.
export async function attemptKreativLiteMerge(): Promise<MergeReturnResult | null> {
    const guestToken = getStashedGuestToken()
    const compositionId = getStashedGuestCompositionId()
    const sceneId = getStashedMergeSceneId()

    if (!guestToken || !compositionId || !sceneId) {
        return null
    }

    try {
        await mergeGuestData(guestToken)
        clearStashes()
        return { type: MergeReturnResultType.Success, compositionId, sceneId }
    } catch (error) {
        Sentry.captureException(error)
        if (axios.isAxiosError(error)) {
            const status = error.response?.status
            // 4xx is poisoned state (dead guest JWT, structurally invalid call) —
            // retrying with the same stash will never succeed. Clear the stashes
            // so the page is no longer gated by hasPendingKreativLiteGuestSave().
            if (status !== undefined && status >= 400 && status < 500) {
                clearStashes()
                return { type: MergeReturnResultType.PermanentFailure, sceneId }
            }
        }
        // 5xx / network error / unknown — keep stashes for retry.
        return { type: MergeReturnResultType.TransientFailure }
    }
}

// Called by receiveIkeaTokensSaga on every auth handshake — page load,
// 5-minute reauth tick, tab visibility change (see RendererProvider). So
// stashes that survive one call retry frequently in the background.
//
// Retries the transient path with backoff so brief backend hiccups resolve
// before the caller notices. See MergeReturnResult for the return contract;
// null means no stashes were present.
//
// Safe to rely on stash presence alone (no URL param needed): stashes are
// only written on a successful guest save, and this only runs when
// hasAuthToken is true, so a user who navigates back without completing
// login never reaches this code.
//
// Deliberately async (not a generator) so this module stays usable outside
// redux/sagas — astro mobile is the concrete near-term case. End-to-end
// saga tests should mock this at the module boundary; internal state
// transitions are covered by the unit tests in this module.
export async function consumeKreativLiteMergeReturn(): Promise<MergeReturnResult | null> {
    // Sequential by design — each retry only fires if the previous attempt
    // came back transient, with backoff in between.
    const initial = await attemptKreativLiteMerge()
    return TRANSIENT_RETRY_BACKOFFS_MS.reduce<Promise<MergeReturnResult | null>>(
        (prev, backoffMs) =>
            prev.then(async (result) => {
                if (result === null || result.type !== MergeReturnResultType.TransientFailure) {
                    return result
                }
                await delay(backoffMs)
                return attemptKreativLiteMerge()
            }),
        Promise.resolve(initial),
    )
}
