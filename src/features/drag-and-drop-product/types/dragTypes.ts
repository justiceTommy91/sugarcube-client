import type { ProductData } from 'models/furniture'

// Standardized product data prop interface
export interface DragWrapperBaseProps {
  productData: ProductData
  enabled?: boolean
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

// Drag callbacks interface
export interface DragCallbacks {
  onDragStart?: (productData: ProductData) => void
  onDragEnd?: () => void
  onDrop?: (productData: ProductData, source: string) => void
}

// Seamless drag specific props
export interface SeamlessDragProps extends DragWrapperBaseProps, DragCallbacks {
  source?: string
  dragThreshold?: number
}


// Drop zone props
export interface DropZoneProps {
  children: React.ReactNode
  onDrop?: (productData: ProductData, source: string) => void
  acceptedTypes?: string[]
  showDropFeedback?: boolean
  className?: string
  dropMessage?: string
  style?: React.CSSProperties
}

// Drag transfer data (for drag/drop operations)
export interface DragTransferData {
  type: 'product'
  productData: ProductData
  source: string
}

// Drag gesture state
export interface DragGestureState {
  isDragging: boolean
  isPotentialDrag: boolean
  startPosition: { x: number; y: number } | null
  dragThreshold: number
}

// Drag preview configuration
export interface DragPreviewConfig {
  productData: ProductData
  sourceElement?: HTMLElement | null
  useExistingImage?: boolean
  position?: { x: number; y: number }
}

// Error boundary state
export interface DragErrorState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}


// Hook return types
export interface UseDragGestureReturn {
  isDragging: boolean
  isPotentialDrag: boolean
  startPosition: { x: number; y: number } | null
  handlePointerDown: (e: React.PointerEvent) => void
  resetState: () => void
  touchAction: string
}

export interface UseDragPreviewReturn {
  previewElement: HTMLElement | null
  showPreview: (config: DragPreviewConfig) => void
  hidePreview: () => void
  updatePreviewPosition: (x: number, y: number) => void
}


// Conditional wrapper props
export interface ConditionalDragWrapperProps {
  children: React.ReactNode
  productData: ProductData
  enabled: boolean
}

export interface ConditionalDropZoneWrapperProps {
  children: JSX.Element
  onDrop?: (productData: ProductData, source: string) => void
  dropMessage: string
}