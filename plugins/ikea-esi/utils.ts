import path from 'path'

// Gatsby really doesn't like us using fs and exec functions but I insist it's okay. Really.
// We are backing up and resetting the global tracking data used to detect the usage.
export const thisIsSafeIPinkyPromise = (fn, ...args) => {
    const beforeUnsafeBuiltinUsage = global.unsafeBuiltinUsage?.slice()
    const val = fn(...args)
    global.unsafeBuiltinUsage?.splice(0, global.unsafeBuiltinUsage?.length, ...beforeUnsafeBuiltinUsage)
    return val
}

export const FRAGMENTS_PATH = path.resolve(__dirname, '../fragments')

export const esiEnabled = () => (process ? process.env.GATSBY_LOCAL_ESI !== 'true' : true)

export const getEsiHeaderFooterPath = (path = '') => {
    const host = process.env.GATSBY_IKEA_BASE_URL
    const market = process.env.GATSBY_IKEA_MARKET || 'us/en'

    return `${host}/${market}/header-footer/${path}`
}

export const getEsiProductPath = (path = '') => {
    const host = process.env.GATSBY_IKEA_BASE_URL
    const market = process.env.GATSBY_IKEA_MARKET || 'us/en'

    return `${host}/${market}/products/${path}`
}

