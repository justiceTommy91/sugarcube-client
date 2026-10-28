import { getDesignLabUrl } from 'models/location/selectors'

export const getH22ShareUrl = (uuid: string) => {
    const h22ShareLocation = 'h22-share/'

    return `${getDesignLabUrl()}${h22ShareLocation}#${uuid}`
}
