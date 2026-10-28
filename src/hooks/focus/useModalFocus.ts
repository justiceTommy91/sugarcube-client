import { useRef, useEffect } from 'react';

// Global stack to track nested modal focus
const modalFocusStack: HTMLElement[] = [];

/**
 * Hook for managing focus capture and restoration in modals
 * 
 * This hook automatically captures the currently focused element when a modal opens
 * and restores focus to that element when the modal closes, following WCAG 2.4.3 guidelines.
 * Supports nested modals by maintaining a focus stack.
 * 
 * @param isOpen - Whether the modal is currently open
 * @param skipAutoCapture - Skip automatic focus capture (useful when manual control is needed)
 * @returns Reference to the triggering element that was focused before modal opened
 */
export const useModalFocus = (isOpen: boolean, skipAutoCapture = false) => {
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const previousOpenState = useRef<boolean>(false);
  const hasAddedToStack = useRef<boolean>(false);

  useEffect(() => {
    // Modal is opening
    if (isOpen && !previousOpenState.current && !skipAutoCapture) {
      // Capture the currently focused element
      const activeElement = document.activeElement as HTMLElement;
      
      // Only capture if it's a focusable element (not body or null)
      if (activeElement && activeElement !== document.body) {
        triggerElementRef.current = activeElement;
        
        // Add to stack for nested modal support
        if (!hasAddedToStack.current) {
          modalFocusStack.push(activeElement);
          hasAddedToStack.current = true;
        }
      }
    }
    
    // Modal is closing
    if (!isOpen && previousOpenState.current && !skipAutoCapture) {
      // Remove from stack if we added to it
      if (hasAddedToStack.current) {
        modalFocusStack.pop();
        hasAddedToStack.current = false;
      }
      
      // Check if there's a parent modal (nested modal scenario)
      const parentModalExists = document.querySelector('[aria-modal="true"]');
      
      // Restore focus to the captured element
      if (triggerElementRef.current && !parentModalExists) {
        const elementToFocus = triggerElementRef.current;

        // Check if element is still in DOM and focusable
        if (document.contains(elementToFocus)) {
          // Small delay to ensure modal is fully closed
          setTimeout(() => {
            try {
              if (document.contains(elementToFocus)) {
                elementToFocus.focus({ preventScroll: true });
              }
            } catch (error) {
              // If focus fails, fallback to body
              document.body.focus();
            }
          }, 50);
        } else {
          // Fallback: try to restore to previous item in stack
          const previousFocus = modalFocusStack[modalFocusStack.length - 1];
          if (previousFocus && document.contains(previousFocus)) {
            setTimeout(() => {
              try {
                previousFocus.focus({ preventScroll: true });
              } catch (error) {
                document.body.focus();
              }
            }, 50);
          } else {
            // Final fallback: focus the body
            document.body.focus();
          }
        }
        
        // Clear the reference after setting up the focus restoration
        triggerElementRef.current = null;
      }
    }
    
    // Update previous state
    previousOpenState.current = isOpen;
  }, [isOpen, skipAutoCapture]);

  // Cleanup on unmount
  useEffect(() => () => {
    // Clean up stack if component unmounts while modal is open
    if (hasAddedToStack.current && triggerElementRef.current) {
      const index = modalFocusStack.indexOf(triggerElementRef.current);
      if (index > -1) {
        modalFocusStack.splice(index, 1);
      }
      hasAddedToStack.current = false;
    }
    triggerElementRef.current = null;
  }, []);

  return triggerElementRef;
};