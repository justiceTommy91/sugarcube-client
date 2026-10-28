import qs from 'qs'

export const isClient = typeof window !== 'undefined'

export const isProd = process.env.GATSBY_ENV_IS_PRODUCTION !== 'false'

export const getTestingEnv = () => {
    const { testing: isTestingEnvironment } = qs.parse(isClient ? window.location.search : '', {
        ignoreQueryPrefix: true,
    })

    let geoAppTestingFromLocalStorage

    try {
        geoAppTestingFromLocalStorage = localStorage.getItem('geoAppTesting')

        if (isTestingEnvironment && !geoAppTestingFromLocalStorage) {
            localStorage.setItem('geoAppTesting', true)
        }
    } catch (e) {
        geoAppTestingFromLocalStorage = false
    }

    return !!isTestingEnvironment || geoAppTestingFromLocalStorage
}

export const getE2ETestingEnv = () => {
    const { e2etest } = qs.parse(isClient ? window.location.search : '', { ignoreQueryPrefix: true })
    let geoAppIsE2ETest
    try {
        geoAppIsE2ETest =
            sessionStorage.getItem('geoAppE2ETestEnvironment') || window.process.env.geoAppE2ETestEnvironment
        if (e2etest && !geoAppIsE2ETest) {
            localStorage.setItem('geoAppE2ETestEnvironment')
        }
    } catch (e) {
        geoAppIsE2ETest = false
    }
    return !!e2etest || geoAppIsE2ETest
}
export const getMaxTextureSize = () => {
    const { maxTextureSize } = qs.parse(isClient ? window.location.search : '', { ignoreQueryPrefix: true })
    return parseInt(maxTextureSize, 10) || 0
}

export const getMemoryTrackingEnv = () => {
    const { memoryTrackingEnv } = qs.parse(isClient ? window.location.search : '', { ignoreQueryPrefix: true })
    return memoryTrackingEnv
}

const ENV_MODE = process.env.GATSBY_ENV_MODE

export default ENV_MODE
