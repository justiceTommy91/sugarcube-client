/**
 * Image upload and processing constants
 */

// Image resize constraints
export const MAX_IMAGE_PIXELS = 1080 * 2160
export const MAX_IMAGE_SIZE_BYTES = 30 * 1024 * 1024 // 30MB
export const MAX_IMAGE_SIZE_MB = 30

// Upload polling configuration
export const UPLOAD_POLL_INITIAL_DELAY = 1000 // 1 second
export const UPLOAD_POLL_MAX_DELAY = 5000 // 5 seconds (with ±10% jitter: 4.5-5.5s actual)
export const UPLOAD_POLL_MAX_ATTEMPTS = 60 // ~5 minutes

// Scene processing polling configuration
export const SCENE_POLL_INITIAL_DELAY = 2000 // 2 seconds
export const SCENE_POLL_MAX_DELAY = 5000 // 5 seconds (with ±10% jitter: 4.5-5.5s actual)
export const SCENE_POLL_MAX_ATTEMPTS = 180 // ~15 minutes

// Progress update interval
export const PROGRESS_UPDATE_INTERVAL = 1000 // 1 second

// Supported image formats
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const
export const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] as const

// Image quality settings
export const JPEG_COMPRESSION_QUALITY = 1.0 // Maximum quality --> for now we will just resize without recompressing, as long as it's below the max size
export const RESIZE_QUALITY = 'high' as const

export const KREATIV_LITE_ASSETS = {
    uploadModalHero: '/images/kreativLite/uploadModalHero.jpg',
    tipOne: '/images/kreativLite/tipOne.png',
    tipTwo: '/images/kreativLite/tipTwo.png',
    tipThree: '/images/kreativLite/tipThree.png',
    roomOneBefore: '/images/kreativLite/roomOneBefore.jpg',
    roomOneAfter: '/images/kreativLite/roomOneAfter.jpg',
    roomTwoBefore: '/images/kreativLite/roomTwoBefore.jpg',
    roomTwoAfter: '/images/kreativLite/roomTwoAfter.jpg',
    roomThreeBefore: '/images/kreativLite/roomThreeBefore.jpg',
    roomThreeAfter: '/images/kreativLite/roomThreeAfter.jpg',
    featuredFirst: '/images/kreativLite/featuredFirst.jpg',
    featuredSecond: '/images/kreativLite/featuredSecond.jpg',
    featuredThird: '/images/kreativLite/featuredThird.jpg',
} as const
