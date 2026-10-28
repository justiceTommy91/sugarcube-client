import fetch from 'services'
import { getCombinables } from './mockdata'
import { DEFAULT_GEOMETRY_TYPE } from './constants'

const PAGE_LIMIT = 48

const additionalParams = {
    // Disables combinablesDefaultProducts being included in furniture
    // objects and only includes the aggragate in the top level response.
    combinables_default_products_noinline: true,
}

export const getFurniture = (
    { region, subCatalog, category, limit = PAGE_LIMIT, subCategory, roomType, stackEnabled, sortOrder },
    { storeId, zipcode },
    page,
    isDuvetV2Enabled
) =>
    fetch('/furniture/', {
        params: {
            region,
            sub_catalogs: subCatalog,
            category_id: category,
            sub_category_id: subCategory,
            room_type: roomType,
            stacks: stackEnabled ? undefined : false,
            limit,
            offset: (page - 1) * limit,
            geometry_type: `${DEFAULT_GEOMETRY_TYPE}`,
            store: storeId,
            zip: zipcode,
            sort: sortOrder,
            material_mode: isDuvetV2Enabled,
            ...additionalParams,
        },
    })

export const getFurnitureBySearch = (
    { query, region, stackEnabled, inStockStore, availableOnline, sortOrder, ...params },
    { zipcode, storeId },
    moreToken,
    isDuvetV2Enabled = false
) =>
    fetch('/furniture/search/', {
        params: {
            q: query,
            region,
            store: storeId,
            zip: zipcode,
            'f-available-in-store': inStockStore,
            online_sellable: availableOnline,
            needMore: 'True',
            moreToken,
            stacks: stackEnabled ? undefined : false,
            geometry_type: `${DEFAULT_GEOMETRY_TYPE}`,
            sort: sortOrder,
            material_mode: isDuvetV2Enabled,
            ...params,
            ...additionalParams,
        },
    })

export const getFurnitureBySearchCategory = (
    { region, stackEnabled, inStockStore, availableOnline, sortOrder, categoryIds, size, start, end, ...params },
    { zipcode, storeId },
    isDuvetV2Enabled = false
) =>
    fetch('/furniture/search-category/', {
        params: {
            category: categoryIds,
            region,
            store: storeId,
            zip: zipcode,
            'f-available-in-store': inStockStore,
            online_sellable: availableOnline,
            size,
            start,
            end,
            stacks: stackEnabled ? undefined : false,
            geometry_type: `${DEFAULT_GEOMETRY_TYPE}`,
            sort: sortOrder,
            material_mode: isDuvetV2Enabled,
            ...params,
            ...additionalParams,
        },
    })

export const getFurnitureByIds = (ids, { zipcode, storeId }, isDuvetV2Enabled = false) =>
    fetch('/furniture/', {
        params: {
            id__in: ids.join(','),
            geometry_type: `${DEFAULT_GEOMETRY_TYPE}`,
            zip: zipcode,
            store: storeId,
            global_product_qa: 'good,combinable',
            // offset & limit needed to get combinable default producs
            offset: 0,
            limit: PAGE_LIMIT,
            material_mode: isDuvetV2Enabled,
            ...additionalParams,
        },
    })

export const getFurnitureByLocalItemNos = (localItemNos, isDuvetV2Enabled = false) =>
    fetch('/furniture/', {
        params: {
            local_item_number: localItemNos.join(','),
            geometry_type: `${DEFAULT_GEOMETRY_TYPE}`,
            material_mode: isDuvetV2Enabled,
            ...additionalParams,
        },
    })

export const getFurnitureBySetId = (setId) => fetch(`/sets/${setId}/`)

export const getFurnitureCategories = (region, stackEnabled, isDuvetV2Enabled = false) =>
    fetch('/furniture/categories/', {
        params: {
            region,
            stack: stackEnabled ? undefined : false,
            geometry_type: `${DEFAULT_GEOMETRY_TYPE}`,
            material_mode: isDuvetV2Enabled,
            ...additionalParams,
        },
    })

/* Backend API behavior:
with NO geometry_type parameter in the API call the client obtains type compatible matches, like so:
1.- If product is geometry_types:['3d'] : returned swappable items geometry_types are exactly the same with this product. 
This is geometry_types:['3d']
2.- If product is geometry_types:['wall_placeable'] : returned  swappable geometry_types are exactly the same with this product. 
This is geometry_types:['wall_placeable']
3.- If product is geometry_types:['3d','wall_placeable'] : returned  swappable geometry_types are ANY of the ones from the array.
This is geometry_types:['3d']  OR geometry_types:['wall_placeable']  OR geometry_types:['3d','wall_placeable']
*/
export const getFurnitureSwappables = (id, { zipcode, storeId }, limit, offset, isDuvetV2Enabled = false) =>
    fetch(`/furniture/${id}/swappables/`, {
        params: {
            exclude_variants: true,
            zip: zipcode,
            store: storeId,
            // Hardcoded; client doesn't support pages, but platform requires it
            offset,
            limit,
            material_mode: isDuvetV2Enabled,
            ...additionalParams,
        },
    })

export const getCombinableFurnitureSwappables = (size, category, { zipcode, storeId }, limit, isDuvetV2Enabled = false) => {
    const plugsInto = JSON.stringify({ size, category })
    const plugsIntoQuery = plugsInto !== '{}' ? `&plugs_into=${plugsInto}` : ''

    return fetch(`/furniture/?geometry_type=3d,2d_wall,wall_placeable${plugsIntoQuery}`, {
        params: {
            exclude_variants: true,
            zip: zipcode,
            store: storeId,
            // Hardcoded; client doesn't support pages, but platform requires it
            offset: 0,
            limit,
            material_mode: isDuvetV2Enabled && category !== 'accent_pillow',
            ...additionalParams,
        },
    })
}

export const getFurnitureGoesWith = (id, { zipcode, storeId }, isDuvetV2Enabled = false) =>
    fetch(`/furniture/${id}/recommendations/`, {
        params: {
            exclude_variants: true,
            zip: zipcode,
            store: storeId,
            // Hardcoded; client doesn't support pages, but platform requires it
            offset: 0,
            limit: PAGE_LIMIT,
            material_mode: isDuvetV2Enabled,
            ...additionalParams,
        },
    })

// in the future suggested combinables should be fetched form the backend similarly to swappables,
// but for now, we're still using separate temporary data for them,
// therefore passing all known client side combinables here, and selecting suitable ones on the client side.
export const getFurnitureCombinables = (slotCategory, size, variant, combinables) => {
    //    fetch(`/furniture/${id}/combinables/`, {
    //        params: {
    //        slotCategory,
    //        size,
    //        },
    //    })
    const data = getCombinables(slotCategory, size, variant, combinables)
    return {
        data,
    }
}

export const getTempFurnitureCompinables = async () => {
    const result = await fetch(`/sdb_temp/3/`)
    const { data } = result.data
    const ret = []
    Object.entries(data).forEach(([, combinables]) => {
        Object.entries(combinables).forEach(([, furniture]) => {
            ret.push(furniture)
        })
    })
    ret.sort((item1, item2) => item1.id - item2.id)
    return ret
}

/* Backend API behavior:
with NO geometry_type parameter in the API call the client obtains type compatible matches, like so:
1.- If product is geometry_types:['3d'] : returned variant items geometry_types are exactly the same with this product. 
This is geometry_types:['3d']
2.- If product is geometry_types:['wall_placeable'] : returned variant geometry_types are exactly the same with this product. 
This is geometry_types:['wall_placeable']
3.- If product is geometry_types:['3d','wall_placeable'] : returned variant geometry_types are ANY of the ones from the array.
This is geometry_types:['3d']  OR geometry_types:['wall_placeable']  OR geometry_types:['3d','wall_placeable']
*/
export const getFurnitureVariants = (id, { zipcode, storeId }, isDuvetV2Enabled = false) =>
    fetch(`/furniture/${id}/variants/`, {
        params: {
            zip: zipcode,
            store: storeId,
            material_mode: isDuvetV2Enabled,
            ...additionalParams,
        },
    })

// https://api.cte.home-design.ikea.com/us/en/ideas/sugarcube/api/furniture/719295/variants/?plugs_into={"size": "us_queen","category": "duvet_set_duvet"}
export const getCombinablesVariants = (id, size, category, isDuvetV2Enabled = false) => {
    const plugsInto = JSON.stringify({ size, category })
    return fetch(`/furniture/${id}/variants/`, {
        params: {
            material_mode: isDuvetV2Enabled,
            ...additionalParams,
            ...(plugsInto !== '{}' && { plugs_into: plugsInto }),
        },
    })
}

export const getSmartRecommendations = ({ roomType, items }) =>
    fetch('/adv_recommendations/', {
        method: 'POST',
        data: {
            room_type: roomType,
            nbr_of_items: 3,
            current_items: items,
        },
    })
