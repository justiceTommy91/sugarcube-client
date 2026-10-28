import FurnitureItem3D from "Renderer/model/FurnitureItem3D";
import { RenderItem3D } from "Renderer/model/RenderItem3D";

export type FurnitureOrientationInterface = Pick<FurnitureItem3D,
'setOrientation' |
'getOrientation' |
'toNextSnapRotation'
>;

// Defines a subset of RenderItem interface containing only the methods
// necessary for input handling, allowing decorators to avoid implementing
// the entire interface. Also, this helps type check any changes against their
// interfaces.
// Also adds some necessary FurnitureItem only interface as optionals.
export type InteractiveItem = Pick<RenderItem3D,
  'onDragStart' |
  'onDragFinish' |
  'dragTargetToScreenPoint' |
  'getDragReferencePointOnScreen' |
  'setVisible'
> & {
  onHover: () => void
  onHoverEnd: () => void
  onSelect: () => void
  onSelectEnd: () => void
  supportsOrientation: boolean
} & Partial<FurnitureOrientationInterface>

/**
 * InputState changes how InputHandler
 * interprets the pointer & keyboard events.
 */
export enum InputState {
  Idle,
  Hovering,
  Dragging,

  // Placing is when user starts adding a stackable item where InputHandler
  // needs to monitor surfaces under pointer & show/hide/move ghost item.
  Placing,

  // MagicEraser state where users can hover to highlight & click to toggle
  // segments.
  MagicEraser,

  // Do nothing state that is useful for testing & migration.
  Noop
}

// The different actions that may produce the placement mode stop.
export enum PlacementStoppageMode {
    // When user presses ESC key action.
    UserCancelled = "UserCancelled",
    // When item is placed though a UI button click action.
    SuccessfulPlacementUI = "SuccessfulPlacementUI",
    // When item is placed though a scene surface click action.
    SuccessfulPlacementSurface = "SuccessfulPlacementSurfaceClick",
    // Default initialization value.
    None = "None"
  }
  
// The different modes in which the application can be whe placement mode starts.
export enum PlacementBeginMode {
    // When item is added as a brand new item to the scene.
    Add = "Add",
    // When item was already in the scene and is being removed.
    Move = "Move"
}

// The succesful stoppage modes are the ones we are interested in for telemetry purposes. Other that these 
// are used to handle internal state within InputHandler class. 
export type SuccessfulPlacementStoppageMode = PlacementStoppageMode.SuccessfulPlacementSurface | 
    PlacementStoppageMode.SuccessfulPlacementUI

