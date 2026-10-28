import type { GatsbyNode } from 'gatsby'

import { cacheEsiFragments } from './get-fragments'
import { esiEnabled } from './utils'

// Fetch the ESI fragements and cache them if needed.
export const createPages: GatsbyNode[`createPages`] = async () => {
    // Offline mode has no upstream to fetch fragments from.
    if (process.env.OFFLINE === 'true') {
        return
    }
    if (esiEnabled()) {
        return
    }
    await cacheEsiFragments()
}
