/**
 * Generic page visit tracking for Astro pages.
 * Reads page name and GA action from data attributes set on <body> by BaseLayout.
 */

import { visit, trackGoogleAnalytics } from '@utils/tracker'
import { GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'

if (typeof window !== 'undefined') {
    const { pageName, gaAction } = document.body.dataset
    if (pageName) {
        visit(pageName)
        if (gaAction) {
            trackGoogleAnalytics(GA_CATEGORY_DYH_SUGARCUBE, gaAction, '')
        }
    }
}
