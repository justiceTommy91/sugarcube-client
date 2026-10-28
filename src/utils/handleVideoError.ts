import * as Sentry from '@sentry/react'

// media error codes we consider "noise"
const IGNORE_MEDIA_CODES = new Set([1, 4])
const IGNORE_PLAY_ERRORS = new Set(['AbortError', 'NotAllowedError'])

export interface VideoErrorContext {
    section: string
    slideIndex?: number
}

export const handleVideoError = (videoEl: HTMLVideoElement | null, context: VideoErrorContext, isStalled = false) => {
    if (!videoEl) return

    if (isStalled) return

    const code = videoEl.error?.code
    if (code != null && IGNORE_MEDIA_CODES.has(code)) return

    Sentry.withScope((scope) => {
        scope.setTag('section', context.section)
        if (context.slideIndex != null) {
            scope.setTag('slideIndex', String(context.slideIndex))
        }
        scope.setFingerprint([`${context.section}.VideoError`])
        scope.setExtra('mediaErrorCode', code ?? 'unknown')
        Sentry.captureException(new Error(`${context.section}.VideoError`))
    })

    // retry just once to avoid errors persisting
    videoEl.pause()
    videoEl.load()
    videoEl.currentTime = 0 // eslint-disable-line no-param-reassign
    videoEl.play().catch((err) => {
        if (!IGNORE_PLAY_ERRORS.has(err.name)) {
            Sentry.captureException(err)
        }
    })
}
