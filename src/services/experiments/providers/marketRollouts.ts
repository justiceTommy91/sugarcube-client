import { getIsMorpheusMarket } from 'models/location/selectors'
import { ExperimentsProvider } from '../types'

export const marketRolloutsProvider: ExperimentsProvider = {
    name: 'market rollouts',

    decide: async () => ({
        flags: {
            ...(getIsMorpheusMarket() ? { Morpheus: true } : {})
        },
        variations: {},
    })
}
