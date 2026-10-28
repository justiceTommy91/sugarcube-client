import { NAVIGATION, DESIGN, BROWSE, HEADER, NEXT_CATEGORY, PRODUCT_FILTER } from './constants'

const skipToElement = (skipTo: string) => {
    const skipLinkElement = document.getElementById(skipTo)
    if (skipLinkElement) {
        skipLinkElement.focus()
    }
}

const skipToLinkCallback = (skipTo: string) => {
    const skipLinkId = `skipLinkId-${skipTo}`
    skipToElement(skipLinkId)
}

interface SkipLinkInfo {
    skipToText: string | null
    iconCode: string | null
    onClick?: () => void
}

const getSkipLinkInfo = (
    skipLink: string,
    skipContext: string,
    categoryKey: string,
    t: (key: string) => string,
): SkipLinkInfo => {
    switch (skipLink) {
        case NAVIGATION: {
            let iconCode = `arrowRight`
            if (skipContext === DESIGN) {
                iconCode = `arrowUp`
            }
            return {
                skipToText: t('accessibility.skip to navigation'),
                iconCode,
                onClick: () => skipToLinkCallback(NAVIGATION),
            }
        }
        case DESIGN: {
            let iconCode = `arrowDownForwards`
            if (skipContext === BROWSE) {
                iconCode = `arrowRight`
            }
            if (skipContext === NAVIGATION) {
                iconCode = `arrowDown`
            }
            return {
                skipToText: t('accessibility.skip to design'),
                iconCode,
                onClick: () => skipToLinkCallback(DESIGN),
            }
        }
        case HEADER: {
            let iconCode = `arrowUp`
            if (skipContext === DESIGN) {
                iconCode = `arrowUpBackwards`
            }
            if (skipContext === NAVIGATION) {
                iconCode = `arrowLeft`
            }
            return {
                skipToText: t('accessibility.skip to header'),
                iconCode,
                onClick: () => skipToLinkCallback(HEADER),
            }
        }

        case BROWSE: {
            let iconCode = `arrowLeft`
            if (skipContext === HEADER) {
                iconCode = `arrowDown`
            }
            return {
                skipToText: t('accessibility.skip to browse'),
                iconCode,
                onClick: () => skipToLinkCallback(BROWSE),
            }
        }

        case NEXT_CATEGORY: {
            let iconCode = `arrowLeft`
            if (skipContext === PRODUCT_FILTER) {
                iconCode = `arrowDownBackwards`
            }

            return {
                skipToText: t('accessibility.skip to next category'),
                iconCode,
                onClick: () => skipToElement(categoryKey),
            }
        }

        default: {
            return {
                skipToText: null,
                iconCode: null,
            }
        }
    }
}

export default getSkipLinkInfo
