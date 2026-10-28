import { useStaticQuery, graphql } from 'gatsby'
import { CustomerLocation } from 'models/furniture'
import { getLocation } from 'models/furniture/selectors'
import { useAppSelector } from './useAppSelector'

const useIkeaStores = () => {
    const data = useStaticQuery<Queries.UseIkeaStoresHookQuery>(
        graphql`
            query UseIkeaStoresHook {
                allIkeaStore {
                    nodes {
                        storeId
                        displayName
                    }
                }
            }
        `,
    )
    // n.b. this reflects the return type from GraphQL auto-gen.
    const stores: Record<string, (typeof data.allIkeaStore.nodes)[0]> = {}
    data.allIkeaStore.nodes.forEach((store) => {
        stores[store.storeId] = store
    })
    return stores
}

export const useStoreLocation = (): CustomerLocation => {
    const location = useAppSelector(getLocation)
    const stores = useIkeaStores()
    const storeName = (location.storeId && stores[location.storeId]?.displayName) ?? ''

    return {
        ...location,
        storeName,
    }
}
