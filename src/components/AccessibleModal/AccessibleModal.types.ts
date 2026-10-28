import { ReactNode } from 'react'

/**
 * Props for the AccessibleModal component
 *
 * This component provides accessible modal behavior with proper focus management,
 * ARIA attributes, and keyboard navigation support according to WCAG guidelines.
 */
export interface AccessibleModalProps {
    /** Whether the modal is currently open */
    isOpen: boolean

    /** Function to call when the modal should be closed */
    onClose: () => void

    /** Content to render inside the modal */
    children: ReactNode

    /**
     * Specific element to restore focus to when modal closes
     * If not provided, will use automatically captured triggering element
     */
    restoreFocusTo?: HTMLElement | null

    /**
     * CSS selector for element that should receive focus when modal opens
     * The element will be focused after the modal's opening animation completes
     * Example: "#carousel__my-carousel" or ".my-focusable-element"
     */
    initialFocusSelector?: string

    /** Additional CSS class for modal styling */
    className?: string

    /**
     * Whether the modal can be closed with Escape key
     * @default true
     */
    escapable?: boolean

    /**
     * ARIA label for the modal
     * Used when there's no visible modal title
     */
    ariaLabel?: string

    /**
     * ID of element that describes the modal content
     * Used for aria-describedby
     */
    ariaDescribedBy?: string

    /**
     * Whether to wrap content in a div with ARIA attributes
     * Set to false when using Theatre, Prompt, or Sheets components from @ingka/modal
     * @default true
     */
    wrapContent?: boolean
}

/**
 * Default props for AccessibleModal component
 */
export const defaultAccessibleModalProps: Partial<AccessibleModalProps> = {
    escapable: true,
    wrapContent: true,
}
