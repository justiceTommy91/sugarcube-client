// Drag and Drop Constants
export const DRAG_CONSTANTS = {
  // Gesture detection thresholds
  DEFAULT_DRAG_THRESHOLD: 5,
  LONG_PRESS_DURATION: 500,
  HAPTIC_FEEDBACK_DURATION: 30,
  
  // Drag preview positioning
  PREVIEW_OFFSET_X: 50,
  PREVIEW_OFFSET_Y: 50,
  PREVIEW_WIDTH: 120,
  PREVIEW_HEIGHT: 120,
  PREVIEW_IMAGE_WIDTH: 100,
  PREVIEW_IMAGE_HEIGHT: 80,
  PREVIEW_ICON_SIZE: 80,
  PREVIEW_BORDER_RADIUS: 8,
  PREVIEW_IMAGE_BORDER_RADIUS: 4,
  
  // Z-index values
  PREVIEW_Z_INDEX: 9999,
  OVERLAY_Z_INDEX: 1000,
  
  // Animation durations
  PREVIEW_CLEANUP_DELAY: 100,
  DROP_ZONE_ANIMATION_DURATION: 1500,
  DROP_MESSAGE_ANIMATION_DURATION: 300,
  
  // CSS classes
  CSS_CLASSES: {
    SEAMLESS_DRAG_ENABLED: 'seamless-drag-enabled',
    SEAMLESS_DRAG_ACTIVATED: 'seamless-drag-activated',
    SEAMLESS_DRAG_DRAGGING: 'seamless-drag-dragging',
    DRAG_OVER: 'drag-over',
    DROP_ZONE_OVERLAY: 'drop-zone-overlay',
    DROP_ZONE_MESSAGE: 'drop-zone-message',
  },
  
  // Touch action values
  TOUCH_ACTION: {
    PAN_Y: 'pan-y',
    NONE: 'none',
  },
  
  // Cursor styles
  CURSORS: {
    DEFAULT: 'default',
    GRABBING: 'grabbing',
    GRAB: 'grab',
  },
  
  // Event types
  EVENTS: {
    TOUCH_DROP: 'touch-drop',
    POINTER_MOVE: 'pointermove',
    POINTER_UP: 'pointerup',
    POINTER_CANCEL: 'pointercancel',
  },
  
  // Data transfer types
  DATA_TRANSFER_TYPE: 'application/json',
  
  // Error messages (for logging/debugging only)
  ERROR_MESSAGES: {
    NO_DRAG_DATA: 'No drag data found',
    INVALID_PRODUCT_DATA: 'Invalid product data in drag operation',
    DRAG_TYPE_NOT_ACCEPTED: 'Drag type not accepted',
    DRAG_PREVIEW_CREATION_FAILED: 'Failed to create drag preview',
  },
} as const

