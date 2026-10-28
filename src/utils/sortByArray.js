// item to find the index of, list to find the index in
const findIndex = (item, list) => {
    if (!item) {
        return -1
    }
    if (typeof item === 'string') {
        return list.indexOf(item)
    }
    if (Array.isArray(item)) {
        let index = -1
        item.forEach((k) => {
            const i = list.indexOf(k)

            // Find the index that's closest to the top of the list
            if (i >= 0 && (index === -1 || i < index)) {
                index = i
            }
        })
        return index
    }
    return -1
}

const compare = (a, b, sortDefinition) => {
    let accessor
    let order = null

    if (typeof sortDefinition === 'function') {
        accessor = sortDefinition
    } else {
        accessor = sortDefinition[0]
        order = sortDefinition[1]
    }

    if (order) {
        const indexA = findIndex(accessor(a), order)
        const indexB = findIndex(accessor(b), order)

        // Preserve order if both missing in order array or the same
        if (indexA === indexB) {
            return 0
        }
        // Sink "unordered" items
        if (indexA < 0) {
            return 1
        }
        if (indexB < 0) {
            return -1
        }
        // Sort found items
        return indexA - indexB
    }

    const itemA = accessor(a)
    const itemB = accessor(b)
    return (itemA || '').localeCompare(itemB || '')
}

// List: the list to sort
// Sort definitions:
//      Array:
//          Accessor: a function that returns the key(s) to sort by (string or array of keys)
//              This is because the furniture categories weren't ordered by priority so we
//              need to find the highest priority one in the list of keys
//          Order: a list which defines the target order
//      Function:
//          Accessor: a function that returns the key to sort by (string only)
// Future: could add support for sorting alphabetically with key arrays
export default (list, ...sortDefinitions) => {
    if (!list) {
        return null
    }
    if (!list.length) {
        return list
    }

    const sorted = [...list]

    sorted.sort((a, b) => {
        let comparison = 0

        // For each search definition
        for (let i = 0; i < sortDefinitions.length; i += 1) {
            comparison = compare(a, b, sortDefinitions[i])
            // If we can compare using the current definition, return the comparison
            if (comparison !== 0) {
                return comparison
            }
            // Otherwise continue and comparison using the next definition
        }
        return comparison
    })

    return sorted
}
