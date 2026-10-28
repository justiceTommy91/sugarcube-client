/**
 * Utilities for generating accessibility descriptions for the 3D scene viewer.
 */

import type { Composition, CompositionExport } from '../geomviewer/geom_types'

const MAX_PRODUCTS_IN_DESCRIPTION = 5

/**
 * Extracts unique product names from render items, limiting to the most relevant products.
 * Uses duck typing to accept any array of objects that might have a name property.
 * Deduplicates product names to avoid repetition (e.g., "Billy, Billy, Billy" -> "Billy")
 */
const extractProductNames = (renderItems: unknown[]): string[] => {
  const uniqueProducts = new Set<string>()
  
  for (const item of renderItems) {
    // Runtime type check: verify item is an object with a string name property
    if (
      item &&
      typeof item === 'object' && 
      'name' in item && 
      typeof (item as { name?: unknown }).name === 'string' &&
      (item as { name: string }).name.length > 0 && // Ensure name is not an empty string
      uniqueProducts.size < MAX_PRODUCTS_IN_DESCRIPTION
    ) {
      uniqueProducts.add((item as { name: string }).name)
    }
  }
  
  return Array.from(uniqueProducts)
}

/**
 * Generates a screen reader description for the 3D scene.
 * 
 * @param composition - The current composition with scene and render items (from models/compositions or geomviewer)
 * @param compositionState - The current composition state with render items (from GeomViewer export)
 * @param roomType - Optional room type (e.g., "LIVING_ROOM", "BEDROOM")
 * @param t - Translation function from i18next
 * @returns A concise description suitable for aria-label or screen reader announcement
 */
export const generateSceneDescription = (
  composition: { renderItems?: unknown[] } | Composition | null,
  compositionState: CompositionExport | null,
  roomType: string | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string => {
  if (!composition && !compositionState) {
    return t('aria.scene description empty')
  }

  // Prefer composition.renderItems (has proper product names) over compositionState.renderItems (has internal IDs)
  const productNames = composition?.renderItems 
    ? extractProductNames(composition.renderItems)
    : compositionState?.renderItems 
      ? extractProductNames(compositionState.renderItems)
      : []

  // Get room type name
  let roomTypeName: string
  if (roomType) {
    // Convert room type constant to translation key
    // e.g., "LIVING_ROOM" -> "aria.room types.living room"
    const roomTypeKey = roomType.toLowerCase().replace(/_/g, ' ')
    roomTypeName = t(`aria.room types.${roomTypeKey}`)
  } else {
    roomTypeName = t('aria.room types.generic')
  }

  // Build description: "3D scene of a [room type] with [products]"
  if (productNames.length > 0) {
    const productList = productNames.join(', ')
    return t('aria.scene description with products', { roomType: roomTypeName, products: productList })
  }

  // No products: "3D scene of a [room type]"
  return t('aria.scene description', { roomType: roomTypeName })
}
