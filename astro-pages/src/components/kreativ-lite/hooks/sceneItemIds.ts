// Single monotonic counter for all scene item IDs — shared by useAddFurnitureToScene
// and useCombinablePlacer to prevent ID collisions between parents and combinable children.
let counter = Math.floor(Date.now() / 2)

export const nextSceneItemId = (): string => {
    counter += 1
    return String(counter)
}
