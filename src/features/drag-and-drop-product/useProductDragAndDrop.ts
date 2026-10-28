import { useFlags } from 'hooks'

export const useProductDragAndDrop = (): boolean => {
    const { flags } = useFlags()
    return flags.ProductItemDragAndDrop || false
}
