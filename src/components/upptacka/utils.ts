import type { RenderItemComplete } from 'models/compositions'
import type { ShoppingListState, UpptackaShoppingListItem } from './UpptackaSummaryPanel'

export const createShoppingListMap = (items: UpptackaShoppingListItem[]): Map<string, boolean> =>
    items.reduce((map, item) => {
        map.set(item.uniqueId.toString(), item.isAddedToShoppingList)
        return map
    }, new Map<string, boolean>())

export const setShoppingListItems = (
    originalList: ShoppingListState,
    newList: RenderItemComplete[],
): ShoppingListState => {
    const originalListMap = createShoppingListMap(originalList)
    return newList.map((item) => {
        const isAddedToShoppingList = originalListMap.get(item.uniqueId.toString()) ?? true
        return { ...item, isAddedToShoppingList }
    })
}

export const toggleItemInList = (shoppingList: ShoppingListState, index: number) =>
    shoppingList.map((item, idx) =>
        idx === index ? { ...item, isAddedToShoppingList: !item.isAddedToShoppingList } : item,
    )
export const deselectAllItemsInList = (shoppingList: ShoppingListState) =>
    shoppingList.map((item) => ({ ...item, isAddedToShoppingList: false }))

export const selectAllItemsInList = (shoppingList: ShoppingListState) =>
    shoppingList.map((item) => ({ ...item, isAddedToShoppingList: true }))

export const sortShoppingList = (shoppingList: ShoppingListState): ShoppingListState =>
    shoppingList.slice().sort((a, b) => a.localItemNumber.localeCompare(b.localItemNumber))

export const getAllItemsAreSelected = (shoppingList: ShoppingListState): boolean =>
    shoppingList.every((item) => item.isAddedToShoppingList)

export const getShoppingListTotal = (shoppingList: ShoppingListState): number =>
    shoppingList
        .filter((item) => item.isAddedToShoppingList)
        .reduce((accumulator, currentItem) => accumulator + currentItem.priceNumeral, 0)

export const getConcatenatedLocalItemNumbers = (shoppingList: ShoppingListState): string =>
    shoppingList
        .filter((item) => item.isAddedToShoppingList)
        .map((item) => item.localItemNumber)
        .join(',')
