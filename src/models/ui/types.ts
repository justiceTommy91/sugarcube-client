import { OVERLAY_PAX_IMPORT, OVERLAY_PAX_CUSTOMIZE } from 'components/configurableProducts/constants'

export type DesignSidepanelOverlay =
    | {
          overlay: 'product details'
          productId: number
      }
    | {
          overlay: 'furniture options'
          furnitureId: number
          productId: number
      }
    | {
          overlay: typeof OVERLAY_PAX_IMPORT
      }
    | {
          overlay: typeof OVERLAY_PAX_CUSTOMIZE
      }
