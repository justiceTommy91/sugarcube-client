import { useQuery } from '@tanstack/react-query'
import { authenticate } from '@astro-services/index'
import { getIkeaTokens, getUser, isValidAuthToken, type UserInfo } from '@astro-services/userService'
import { isIkeaOrigin } from '@lib/url-utils'

const FIVE_MINUTES = 5 * 60 * 1000
const TEN_SECONDS = 10 * 1000

// Local SSR-safe alternative to utils/async withTimeout — that version uses
// window.setTimeout (browser-only) to satisfy TypeScript's number return type
// when @types/node is present. This one uses plain setTimeout, safe in Node.js.
class TimeoutError extends Error {
    constructor(ms: number) {
        super(`timeout of ${ms}ms exceeded`)
    }
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    let timer: ReturnType<typeof setTimeout>
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new TimeoutError(ms)), ms)
        }),
    ]).finally(() => clearTimeout(timer))
}

// Refreshes the IKEA auth token.
// Returns true when a valid auth token is present (logged-in user).
// Returns false when only a guest token (anonymous user — skip /account call).
// Wraps getTokens() in a 10s timeout: the callback is known to hang indefinitely
// for some users (WEBFS-547), and a blind refetchInterval is the safest workaround.
const refreshTokens = async (): Promise<boolean> => {
    const tokens = await withTimeout(getIkeaTokens(), TEN_SECONDS)
    if (tokens.auth && isValidAuthToken(tokens.auth)) {
        authenticate(tokens.auth.value, 'auth')
        return true
    }
    if (tokens.guest && isValidAuthToken(tokens.guest)) {
        authenticate(tokens.guest.value, 'guest')
    }
    return false
}

// CTE/prod: window.ikea is synchronously available from IKEA header/footer scripts.
// Token is refreshed every 5 minutes (blind interval — resilient to getTokens() hangs).
// User data is fetched once per session only when an auth token is present.
// Guest tokens (hasAuth === false) represent anonymous users — no /account call needed.
// retry: 3 / retryDelay: 2s — after an OAuth login redirect, getTokens() can error
// immediately because the IKEA auth module is still exchanging the code. Short retries
// give it time to settle without blocking the user for long.
const useIkeaUser = (enabled: boolean) => {
    const { data: hasAuth, isLoading: isTokenLoading } = useQuery<boolean>({
        queryKey: ['ikea-tokens'],
        queryFn: refreshTokens,
        enabled,
        refetchInterval: FIVE_MINUTES,
        retry: 3,
        retryDelay: 2000,
    })

    const { data: user, isLoading: isUserLoading } = useQuery<UserInfo>({
        queryKey: ['ikea-user'],
        queryFn: getUser,
        enabled: enabled && hasAuth === true,
        staleTime: Infinity,

        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    })

    return {
        user: user ?? null,
        isLoading: isTokenLoading || isUserLoading,
        isLoggedIn: user?.isLoggedIn ?? false,
    }
}

// Local/CF: Calls /users/account/ once with credentials: 'include'.
// Returns isLoggedIn: true if the user has a valid Django session from the
// internal /login page. No retries — one call is sufficient.
// Wraps getUser() in a 10s timeout: the CTE proxy can hang on local dev when
// the backend is slow, which would keep isLoading true indefinitely.
const useGeoUser = (enabled: boolean) => {
    const { data: user, isLoading } = useQuery<UserInfo>({
        queryKey: ['geo-user'],
        queryFn: () => withTimeout(getUser(), TEN_SECONDS),
        enabled,
        staleTime: Infinity,
        retry: false,
    })

    return {
        user: user ?? null,
        isLoading,
        isLoggedIn: user?.isLoggedIn ?? false,
    }
}

export const useUser = () => {
    const isIkeaEnv = isIkeaOrigin()
    const ikeaUser = useIkeaUser(isIkeaEnv)
    const geoUser = useGeoUser(!isIkeaEnv)
    return isIkeaEnv ? ikeaUser : geoUser
}
