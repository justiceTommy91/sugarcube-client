import fs from 'fs'
import path from 'path'

import axios, { AxiosResponse } from 'axios'
import axiosRetry from 'axios-retry'

import type { GatsbyNode, NodeInput } from 'gatsby'

export const sourceNodes: GatsbyNode[`sourceNodes`] = async ({ actions, createNodeId, createContentDigest }) => {
    const { createNode } = actions

    const market = process.env.GATSBY_IKEA_MARKET || 'us/en'
    let stores: any[]

    if (process.env.OFFLINE === 'true') {
        // Gatsby compiles plugin .ts files into .cache/compiled/, so __dirname no
        // longer resolves to the source plugin directory at runtime. Anchor the
        // fixture lookup to the project root instead.
        const fixturePath = path.resolve(
            process.cwd(),
            'plugins/gatsby-source-ikea-stores/offline-fixture.json',
        )
        stores = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
    } else {
        // A few retries in case of transient network errors so it doesn't fail builds as often.
        const client = axios.create()
        axiosRetry(client, { retries: 3 })

        let resp: AxiosResponse
        try {
            resp = await client.get(`https://www.ikea.com/${market}/meta-data/informera/stores-detailed.json`)
        } catch (cause) {
            throw new Error(`Unable to load stores data for ${market} (is https://www.ikea.com/${market}/meta-data/informera/stores-detailed.json available?): ${cause}`)
        }
        stores = resp.data
    }

    for (const store of stores) {
        const id = store.id
        // `id` is a reserved field name in Gatsby so rename this to avoid the collision.
        store.storeId = id
        delete store.id
        const node = {
            ...store,
            id: createNodeId(`ikea-store-${id}`),
            internal: {
                type: `IkeaStore`,
                contentDigest: createContentDigest(store),
            },
        } satisfies NodeInput
        createNode(node)
    }
}

export const createSchemaCustomization: GatsbyNode[`createSchemaCustomization`] = ({ actions }) => {
    const { createTypes } = actions

    createTypes(`
      type IkeaStore implements Node {
        storeId: String!
        name: String!
        lat: String!
        lng: String!
        address: IkeaStoreAddress!
        buClassification: IkeaStoreClassification!
        displayName: String!
        hours: IkeaStoreHoursTypes!
        storePageUrl: String!
        placeId: String!
        extras: JSON
        displayNameAlternate: String!
      }

      type IkeaStoreAddress {
        street: String!
        zipCode: String!
        city: String!
        timezone: String!
        stateProvinceCode: String!
        displayAddress: String!
      }

      type IkeaStoreClassification {
        code: String!
        name: String!
      }

      type IkeaStoreHoursTypes {
        normal: [IkeaStoreHours!]!
        closed: [IkeaStoreHours!]!
        exceptions: [IkeaStoreHours!]
        restaurant: [IkeaStoreHours!]
        bistro: [IkeaStoreHours!]
        swedishFoodMarket: [IkeaStoreHours!]
        smaland: [IkeaStoreHours!]
        cafe: [IkeaStoreHours!]
        clickncollect: [IkeaStoreHours!]
      }

      type IkeaStoreHours {
        day: String!
        open: String!
        close: String!
        reason: String
      }
    `)
}