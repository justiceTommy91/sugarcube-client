// Primary: Patrick Rutkowski (patrick@geomagical.com)

import { AND } from 'utils/logic'

export function isVectorValid(x?: number | null, y?: number | null, z: number | null = 0) {
    return AND && Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)
}
