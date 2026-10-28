/**
 * Client-side initialization script for experiments service.
 * This should be added to Astro pages that need experiments functionality.
 *
 * This file is a side-effect import that auto-initializes on page load.
 * It imports the shared experiments service from src/services/experiments.
 *
 * Keeping initialization separate allows:
 *   1. Importing experimentsService without triggering initialization (for tests, SSR)
 *   2. Using the service programmatically with manual initialization timing
 *   3. Auto-initialization for pages via: import '../../lib/experiments/init'
 */

import { experimentsService } from 'services/experiments'

// Initialize on page load
if (typeof window !== 'undefined') {
    // Initialize experiments service when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            experimentsService.initialize().catch((error) => {
                console.error('Failed to initialize experiments:', error)
            })
        })
    } else {
        experimentsService.initialize().catch((error) => {
            console.error('Failed to initialize experiments:', error)
        })
    }
}
