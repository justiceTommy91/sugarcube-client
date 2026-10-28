import axios from 'axios'

let token = null
export const isAuthenticated = () => Boolean(token)

export const authenticate = (authToken) => {
    token = authToken
}

const configs = {
    favs: {
        url: process.env.GATSBY_SPIDERPIGS_FAVS_API,
        id: process.env.GATSBY_SPIDERPIGS_CLIENT_ID_FAVS,
    },
}

const spiderpigsQuery = async (config, query, variables = {}) => {
    const resp = await axios({
        method: 'POST',
        url: config.url,
        headers: {
            Accept: 'application/json',
            'Content-type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Client-Id': config.id,
        },
        data: {
            query,
            variables,
        },
    })

    if (resp.errors) {
        return Promise.reject(resp.errors)
    }
    return resp.data
}

export const getFavs = () =>
    spiderpigsQuery(
        configs.favs,
        `
            query {
                minimalLists {
                    listId
                    name
                    isSelected
                    items {
                        itemNo
                    }
                }
            }
        `,
    ).then(({ data }) =>
        data.minimalLists.map((l) => ({
            listId: l.listId,
            name: l.name,
            isSelected: l.isSelected,
            items: l.items.map((it) => it.itemNo),
        })),
    )

export const getDefaultFavs = () =>
    getFavs().then((lists) => {
        if (lists.length === 0) {
            return []
        }

        for (let i = 0; i < lists.length; i += 1) {
            if (lists[i].isSelected) {
                return lists[i].items
            }
        }
        return lists[0].items
    })

// Create a new named list. Select=true means it will become the new default list.
export const createFavs = (name, select = true) =>
    spiderpigsQuery(
        configs.favs,
        `
            mutation($name: String!, $select: Boolean!) {
                createList(name: $name, setSelected: $select) {
                    listId
                }
            }
        `,
        {
            name,
            select,
        },
    ).then((data) => data.createList.listId)

// Add items to a favorites list. If listId is null, add to the selected (default) list.
// If there is no default list currently, this will create it and return the listId.
export const addToFavs = (items, listId = null) =>
    spiderpigsQuery(
        configs.favs,
        `
            mutation($listId: ID, $items: [AddItemInput!]!) {
                addItems(listId: $listId, items: $items) {
                    listId
                }
            }
        `,
        {
            listId,
            items: items.map((item) => ({
                itemNo: item,
                quantity: 1,
            })),
        },
    ).then(({ data }) => data.addItems.listId)

// Remove items from the favorites list. If listId is null, remove from the selected (default) list.
export const removeFromFavs = (itemNos, listId = null) =>
    spiderpigsQuery(
        configs.favs,
        `
            mutation($listId: ID, $itemNos: [ID!]!) {
                removeItems(listId: $listId, itemNos: $itemNos) {
                    listId
                }
            }
        `,
        {
            listId,
            itemNos,
        },
    ).then(({ data }) => data.removeItems.listId)
