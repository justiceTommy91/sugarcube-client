export const isElementInViewport = (element: Element | null): boolean => {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
        return false
    }

    const rect = element.getBoundingClientRect()

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
}
