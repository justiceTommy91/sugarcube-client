import rootProvider from './root-provider'

export const wrapRootElement = rootProvider

export const onClientEntry = () => {
    if (process.env.GATSBY_DISABLE_ERROR_OVERLAY === 'true') {
        // Hide gatsby-fast-refresh overlay and force body overflow with CSS
        // The overlay's lock-body.js sets overflow:hidden when errors occur, and this can
        // persist even after the overlay is removed or when navigating between pages, leaving
        // the page unscrollable.
        const style = document.createElement('style')
        style.innerHTML = `
            gatsby-fast-refresh {
                display: none !important;
            }
            body {
                overflow: auto !important;
            }
        `
        document.head.appendChild(style)
    }
}
