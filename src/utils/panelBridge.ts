/**
 * Panel Bridge Utility
 *
 * Bridges imperative code (like toast callbacks) with React Context-based sidepanel v2.
 *
 * **Why this exists:**
 * - Toast service is imperative but sidepanel v2 uses React Context
 * - React hooks only work inside components, not in toast callbacks
 * - Provides controlled imperative access to declarative React state
 *
 * @example
 * ```typescript
 * // React component registers actions
 * useEffect(() => {
 *   panelBridge.register({ openEditPanel: () => setActiveTab('EDIT') })
 * }, [])
 *
 * // Toast callback calls registered action
 * onAction: () => panelBridge.openEditPanel()
 * ```
 */

type PanelActions = {
    openEditPanel?: () => void
}

/** Global registry for panel actions - intentionally mutable for imperative access */
const panelActions: PanelActions = {}

export const panelBridge = {
    register: (actions: PanelActions): void => {
        Object.assign(panelActions, actions)
    },

    unregister: (actionNames: (keyof PanelActions)[]): void => {
        actionNames.forEach((name) => {
            delete panelActions[name]
        })
    },

    openEditPanel: (): void => {
        if (panelActions.openEditPanel) {
            panelActions.openEditPanel()
        } else {
            // eslint-disable-next-line no-console
            console.warn(
                'panelBridge.openEditPanel called but no handler registered. ' +
                    'Ensure DesignSidepanelContext is mounted and has registered the openEditPanel action.',
            )
        }
    },
}
