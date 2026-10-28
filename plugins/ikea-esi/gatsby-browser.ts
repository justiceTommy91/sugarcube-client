import type { GatsbyBrowser } from 'gatsby'

export const onRouteUpdate: GatsbyBrowser['onRouteUpdate'] = ({ location }) => {
    const { body } = window.document

    const path = location.pathname
    const matchesRoom = path.includes('room') && !path.includes('-room')
    const matches = matchesRoom || path.includes('chooseRoom') || path.includes('searchBrowse') || path.includes('kreativ-lite-upload')

    // Hide header footer for /room, /chooseRoom, /searchBrowse, and /kreativ-lite-upload pages.
    // Show header footer for pages with -room like /living-room and other pages.
    if (matches) {
        // Also set in gatsby-ssr
        body.className = 'hideHeaderFooter'
    } else {
        body.className = ''
    }
}
