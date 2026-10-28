import fetchWrapper from './index'

type GqlResponse<T> = {
    data?: T
    errors?: Array<{ message: string }>
}

type MinimalListsData = {
    minimalLists: Array<{
        listId: string
        isSelected: boolean
        items: Array<{ itemNo: string }>
    }>
}

type AddItemsData = {
    addItems: { listId: string }
}

type RemoveItemsData = {
    removeItems: { listId: string }
}

const gqlFetch = <T>(query: string, variables?: Record<string, unknown>, allowGuest = true): Promise<T> =>
    fetchWrapper<GqlResponse<T>>(
        '',
        {
            method: 'POST',
            credentials: 'omit',
            headers: {
                'X-Client-Id': process.env.GATSBY_SPIDERPIGS_CLIENT_ID_FAVS ?? '',
            },
            body: JSON.stringify({ query, variables }),
        },
        {
            baseUrl: process.env.GATSBY_SPIDERPIGS_FAVS_API,
            allowGuest,
        },
    ).then((resp) => {
        if (resp.errors?.length) {
            throw new Error(resp.errors[0].message)
        }
        if (!resp.data) {
            throw new Error('No data in Spiderpigs response')
        }
        return resp.data
    })

export const getFavoriteIds = (isLoggedIn: boolean): Promise<string[]> =>
    gqlFetch<MinimalListsData>(
        `
        query {
            minimalLists {
                listId
                isSelected
                items {
                    itemNo
                }
            }
        }
    `,
        undefined,
        !isLoggedIn,
    ).then(({ minimalLists }) => {
        if (minimalLists.length === 0) return []
        const selected = minimalLists.find((l) => l.isSelected)
        return (selected ?? minimalLists[0]).items.map((it) => it.itemNo)
    })

export const addToFavorites = (itemNo: string, isLoggedIn: boolean): Promise<void> =>
    gqlFetch<AddItemsData>(
        `
        mutation($items: [AddItemInput!]!) {
            addItems(items: $items) {
                listId
            }
        }
    `,
        {
            items: [{ itemNo, quantity: 1 }],
        },
        !isLoggedIn,
    ).then(() => undefined)

export const removeFromFavorites = (itemNo: string, isLoggedIn: boolean): Promise<void> =>
    gqlFetch<RemoveItemsData>(
        `
        mutation($itemNos: [ID!]!) {
            removeItems(itemNos: $itemNos) {
                listId
            }
        }
    `,
        {
            itemNos: [itemNo],
        },
        !isLoggedIn,
    ).then(() => undefined)
