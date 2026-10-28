// Adds "all" to a union of readonly strings
export type Filterable<A extends Readonly<string>> = A | 'all'

export const includes = <A extends B, B>(collection: ReadonlyArray<A>, element: B): element is A =>
    collection.includes(element as A)

export const toPairs = <T>(collection: T[]) => {
    const pairs: ([T] | [T, T])[] = []

    for (let i = 0; i < collection.length; i += 2) {
        if (i === collection.length - 1) {
            // Last item gets added on its own
            pairs.push([collection[i]])
        } else {
            // Not last item, grab the next item to make a pair
            pairs.push([collection[i], collection[i + 1]])
        }
    }
    return pairs
}

// Intersection items are the ones that belong to both sets.
export const intersection = <T>(a: T[], b: T[]) => a.filter((i) => b.includes(i))

// Returns true if arrays contain the same contents
export const hasSameContents = <T>(a: T[], b: T[]) => {
    if (a === b) {
        return true
    }
    if (a.length !== b.length) {
        return false
    }
    return a.every((i) => b.includes(i))
}
