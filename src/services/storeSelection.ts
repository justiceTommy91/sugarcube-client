const zipObjectToZipCode = (zipObject?: ikea.ZipObject) => {
    if (!zipObject) {
        return undefined
    }
    return zipObject.postalCode?.split(' ').join('')
}

const listenForStoreId = () =>
    new Promise((resolve) => {
        window.ikea?.pubsub?.subscribe('NAVIGATION/STORE_SET', (storeId) => {
            resolve(storeId)
        })
    })

const listenForZipcode = () =>
    new Promise((resolve) => {
        window.ikea?.pubsub?.subscribe('NAVIGATION/POSTALCODE_SET', (zipObject) => {
            resolve(zipObjectToZipCode(zipObject))
        })
    })

// Get current store selection from ikea.com
export const storeSelection = async () => {
    const storeId = await window.ikea?.store?.get()
    const zipObject = await window.ikea?.postalCode?.get()

    const zipcode = zipObjectToZipCode(zipObject)

    return { zipcode, storeId }
}

// Open ikea.com store selector sidepanel and wait for new value
export const selectStore = async () => {
    window.ikea?.pubsub?.publish('NAVIGATION/OPEN_STORE_PICKER')
    const nextStoreId = await listenForStoreId()

    return nextStoreId
}

// Open ikea.com zipcode selector sidepanel and wait for new value
export const selectZipcode = async () => {
    window.ikea?.pubsub?.publish('NAVIGATION/OPEN_POSTALCODE_PICKER')
    const nextZipcode = await listenForZipcode()

    return nextZipcode
}
