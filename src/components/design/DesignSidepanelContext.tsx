import React from 'react'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import * as uiSelectors from 'models/ui/selectors'
import * as uiActions from 'models/ui/actions'
import * as variantsActions from 'models/variants/actions'
import * as variantsSelectors from 'models/variants/selectors'
import type { DesignSidepanelOverlay } from 'models/ui/types'
import { ValueOf } from 'utils/object'
import { panelBridge } from 'utils/panelBridge'

const OPEN_EDIT_PANEL_ACTION = 'openEditPanel'

export const DesignSidepanelView = {
    ADD: 'ADD',
    EDIT: 'EDIT',
    FAVORITES: 'FAVORITES',
    RATINGS: 'RATINGS',
    DEBUG: 'DEBUG',
} as const
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type DesignSidepanelView = ValueOf<typeof DesignSidepanelView>
export const DESIGN_SIDEPANEL_VIEW = Object.values(DesignSidepanelView)

export const RelatedProductType = {
    SWAP: 'SWAP',
    GOES_WELL_WITH: 'GOES_WELL_WITH',
} as const
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type RelatedProductType = ValueOf<typeof RelatedProductType>
export const RELATED_PRODUCT_TYPES = Object.values(RelatedProductType)

export type ImageGalleryModalState = {
    isOpen: boolean
    images: string[]
    initialIndex: number
    productDescription: string
} | null

type DesignSidepanelState = {
    sidepanelViewDisplayed: DesignSidepanelView
    relatedProductsDisplayed: RelatedProductType
    allFiltersModalOpen: boolean
    imageGalleryModal: ImageGalleryModalState
}

const DesignSidepanelContext = React.createContext<
    | {
          state: DesignSidepanelState
          setState: React.Dispatch<React.SetStateAction<DesignSidepanelState>>
      }
    | undefined
>(undefined)

export const DesignSidepanelContextProvider = ({ children }: React.PropsWithChildren): React.ReactElement => {
    const [state, setState] = React.useState<DesignSidepanelState>({
        sidepanelViewDisplayed: DesignSidepanelView.ADD,
        relatedProductsDisplayed: RelatedProductType.SWAP,
        allFiltersModalOpen: false,
        imageGalleryModal: null,
    })
    return (
        <DesignSidepanelContext.Provider value={React.useMemo(() => ({ state, setState }), [state])}>
            {children}
        </DesignSidepanelContext.Provider>
    )
}

type SidepanelMode = 'pinned' | 'expanded' | 'collapsed'

export type UseDesignSidebarContextResult = DesignSidepanelState & {
    sidepanelMode: SidepanelMode
    isSidepanelExpanded: boolean
    isSidepanelPinned: boolean
    isSidepanelCollapsed: boolean
    pinSidepanel: () => void
    unpinSidepanel: () => void
    expandSidepanel: () => void
    collapseSidepanel: () => void

    displaySidepanelView(view: DesignSidepanelView): void

    displayRelatedProducts(relatedType: RelatedProductType): void

    visibleOverlay: DesignSidepanelOverlay | null
    /**
     * Focus on a product and present it's details to the user.
     *
     * @param productId Id of the product to focus
     */
    viewProductDetailsOverlay: (productId: number) => void
    /**
     * Dismiss any currently focused overlay.
     */
    dismissOverlay: () => void
    /**
     * Open the PAX import panel (Add saved design flow).
     */
    openPAXImportPanel: () => void
    /**
     * Open the PAX customize panel (Create new flow).
     */
    openPAXCustomizePanel: () => void

    // FIXME: we should use a stable key for the variant category instead of an index.
    focusedProductVariantCategoryIndex: number | null

    /**
     * Focus a product variant category in the sidepanel to allow users to puruse the variants within that category.
     *
     * @param variantCategoryIndex Index of a product variant category to focus in the sidepanel.
     */
    focusProductVariantCategory: (
        // FIXME: we should use a stable key for the variant category instead of an index.
        variantCategoryIndex: number,
    ) => void

    /**
     * Blur the currently focused product variant category.
     */
    blurProductVariantCategory: () => void

    /**
     * Related products displayed, if any.
     */
    relatedProductsDisplayed: RelatedProductType

    /**
     * Display related products for the currently selected furniture.
     *
     * @param relatedType Type of related products to display.
     */
    displayRelatedProducts: (relatedType: RelatedProductType) => void

    allFiltersModalOpen: boolean

    openAllFiltersModal: () => void

    closeAllFiltersModal: () => void

    imageGalleryModal: ImageGalleryModalState

    openImageGalleryModal: (params: { images: string[]; initialIndex: number; productDescription: string }) => void

    closeImageGalleryModal: () => void
}

export const useDesignSidebarContext = (): UseDesignSidebarContextResult => {
    const ctx = React.useContext(DesignSidepanelContext)
    if (!ctx) {
        throw new Error(`missing required DesignSidepanelContext`)
    }
    const sidepanelMode: SidepanelMode = useAppSelector((state) => {
        if (uiSelectors.getDesignSidepanelPinned(state)) {
            return `pinned`
        }

        return uiSelectors.getDesignSidepanelOpen(state) ? `expanded` : `collapsed`
    })

    const visibleOverlay = useAppSelector(uiSelectors.getDesignSidepanelVisibleOverlay)
    const focusedProductVariantCategoryIndex = useAppSelector(variantsSelectors.getSelectedVariant) as number

    // KLUDGE: ensure that we reset related products when the overlay changes tab.
    // Only reset to SWAP if the overlay is being dismissed (null) or if it's a new overlay
    React.useEffect(() => {
        if (visibleOverlay === null) {
            ctx.setState((prevState) => ({
                ...prevState,
                relatedProductsDisplayed: RelatedProductType.SWAP,
            }))
        }
    }, [visibleOverlay])

    const dispatch = useAppDispatch()

    const contextValue = React.useMemo(
        () => ({
            ...ctx.state,

            sidepanelMode,
            isSidepanelExpanded: sidepanelMode === 'expanded' || sidepanelMode === 'pinned',
            isSidepanelCollapsed: sidepanelMode === 'collapsed',
            isSidepanelPinned: sidepanelMode === 'pinned',
            pinSidepanel: () => dispatch(uiActions.pinDesignSidepanel()),
            unpinSidepanel: () => dispatch(uiActions.unpinDesignSidepanel()),
            expandSidepanel: () => {
                // No-op when sidepanel is pinned to simplify the API a bit (no need for client code to do this check).
                if (sidepanelMode === 'pinned') {
                    return
                }
                dispatch(uiActions.openDesignSidepanel())
            },
            collapseSidepanel: () => {
                // No-op when sidepanel is pinned to simplify the API a bit (no need for client code to do this check).
                if (sidepanelMode === 'pinned') {
                    return
                }
                // Keep the sidepanel open while an overlay (e.g. product details) is visible.
                // Setting `inert` on tab panels when an overlay opens can forcibly remove focus, but this is not the case for the design sidepanel.
                if (visibleOverlay != null) {
                    return
                }
                dispatch(uiActions.closeDesignSidepanel())
            },
            focusedProductVariantCategoryIndex,
            focusProductVariantCategory: (categoryId: number) => {
                dispatch(variantsActions.setVariantSelected(categoryId))
            },
            blurProductVariantCategory: () => {
                dispatch(variantsActions.setVariantSelected(null))
            },

            visibleOverlay,
            viewProductDetailsOverlay: (productId: number) => {
                dispatch(uiActions.viewProductDetails(productId))
            },
            dismissOverlay: () => {
                dispatch(uiActions.dismissDesignSidepanelOverlay())
            },
            openPAXImportPanel: () => {
                dispatch(uiActions.openPAXImportPanel())
            },
            openPAXCustomizePanel: () => {
                dispatch(uiActions.openPAXCustomizePanel())
            },

            displaySidepanelView(sidepanelView: DesignSidepanelView) {
                ctx.setState((prevState) => ({
                    ...prevState,
                    sidepanelViewDisplayed: sidepanelView,
                }))
            },

            displayRelatedProducts(relatedType: RelatedProductType) {
                ctx.setState((prevState) => ({
                    ...prevState,
                    relatedProductsDisplayed: relatedType,
                }))
            },

            openAllFiltersModal: () => {
                ctx.setState((prevState) => ({
                    ...prevState,
                    allFiltersModalOpen: true,
                }))
            },

            closeAllFiltersModal: () => {
                ctx.setState((prevState) => ({
                    ...prevState,
                    allFiltersModalOpen: false,
                }))
            },

            openImageGalleryModal: (params: { images: string[]; initialIndex: number; productDescription: string }) => {
                ctx.setState((prevState) => ({
                    ...prevState,
                    imageGalleryModal: { isOpen: true, ...params },
                }))
            },

            closeImageGalleryModal: () => {
                ctx.setState((prevState) => ({
                    ...prevState,
                    imageGalleryModal: null,
                }))
            },
        }),
        [ctx, sidepanelMode, focusedProductVariantCategoryIndex, visibleOverlay],
    )

    /**
     * Register panel bridge actions to allow imperative code (like toast callbacks)
     * to interact with the DesignSidePanel. This is necessary because toast callbacks
     * execute outside React's component lifecycle and cannot use hooks/context.
     */
    React.useEffect(() => {
        panelBridge.register({
            [OPEN_EDIT_PANEL_ACTION]: () => contextValue.displaySidepanelView(DesignSidepanelView.EDIT),
        })

        return () => {
            panelBridge.unregister([OPEN_EDIT_PANEL_ACTION])
        }
    }, [contextValue])

    return contextValue
}
