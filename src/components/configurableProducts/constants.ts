export type ProductFamily = 'PAX'

export const OVERLAY_PAX_IMPORT = 'pax import' as const
export const OVERLAY_PAX_CUSTOMIZE = 'pax customize' as const

/** Maps search query strings (uppercased) to their ProductFamily. Add new families here as they are integrated. */
export const CONFIGURABLE_PRODUCT_FAMILIES: Record<string, ProductFamily> = {
    PAX: 'PAX',
    BESTA: 'PAX',
    WARDROBE: 'PAX',
}

/** SubCategory IDs that should surface the PAX configurable product banner. */
export const PAX_SUBCATEGORY_IDS = new Set(['st001', '19053'])

export const getPAXPlannerUrl = (locale: string) =>
    `https://www.ikea.com/addon-app/storageone/pax/web/latest/${locale}/#/planner`
