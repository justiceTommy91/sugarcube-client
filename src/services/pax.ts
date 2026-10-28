import fetch from 'services'
import type { AxiosPromise } from 'axios'
import type { PAXDesign } from 'models/paxDesigns/types'

// TODO(WEBFS-1046): replace with real REX API endpoint and response shape once available
export const fetchPAXDesigns = (): AxiosPromise<{ results: PAXDesign[] }> =>
    fetch<{ results: PAXDesign[] }>('/pax/designs/')
