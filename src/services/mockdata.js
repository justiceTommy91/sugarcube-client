// eslint-disable-next-line import/prefer-default-export

export const getCombinables = (slotCategory, size, variant, allCombinables) =>
    allCombinables
        .filter(
            (child) =>
                child.metadata.combinables.selfMeta.category === slotCategory &&
                child.metadata.combinables.selfMeta.size === size &&
                (child.metadata.combinables.selfMeta.variant === undefined ||
                    child.metadata.combinables.selfMeta.variant === variant),
        )
        .sort((item1, item2) => {
            // place items with specified variant in front of the list
            const variant1 = item1.metadata.combinables.selfMeta.variant !== undefined ? 0 : 1
            const variant2 = item2.metadata.combinables.selfMeta.variant !== undefined ? 0 : 1
            return variant1 - variant2
        })
