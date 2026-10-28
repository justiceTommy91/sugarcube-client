import {
    PlacementBeginMode, 
    PlacementStoppageMode, 
    SuccessfulPlacementStoppageMode 
} from "./types";

// A rect which caches inverse width and height for
// performance reasons.
export interface CachedBoundingRect {
  left: number, 
  top: number,
  invWidth: number,
  invHeight: number
}

/**
 * Transforms client mouse event locations to relative xy 
 * using target's bounding rect.
 */
export function clientToRelCoords(
    event: MouseEvent,
    boundingClientRect: CachedBoundingRect,
    scale: [number, number] = [1.0, 1.0]): [number, number] {
  const { clientX, clientY } = event;
  const { left, top, invHeight, invWidth } = boundingClientRect;

  const eventX = clientX - left;
  const eventY = clientY - top;

  return [eventX * invWidth * scale[0], eventY * invHeight * scale[1]];
}

export function getRelXY(event: MouseEvent, scale: [number, number] = [1.0, 1.0]) {
  const target = event.currentTarget as Element;
  const rect = target.getBoundingClientRect();
  const boundingClientRect = {
    left: rect.left,
    top: rect.top,
    invWidth: 1.0 / rect.width,
    invHeight: 1.0 / rect.height
  };

  return clientToRelCoords(event, boundingClientRect, scale);
}

// Checks that we are within the PlacementStoppageMode cases of interest and provides the corresponding type assertion.
export function isSuccessfulStopMode(stoppageMode: PlacementStoppageMode): 
    stoppageMode is SuccessfulPlacementStoppageMode {
    return stoppageMode === PlacementStoppageMode.SuccessfulPlacementSurface ||
        stoppageMode === PlacementStoppageMode.SuccessfulPlacementUI
}

// Placement mode may begin in different modes enumerated in PlacementBeginMode.
// Placement may end due to different actions enumerated in PlacementStoppageMode.
// This class handles the state of these two. When placement mode ends values are used and state is reset to default.
export class PlacementModeStatus {
    private stoppage_mode: PlacementStoppageMode = PlacementStoppageMode.None;
    private begin_mode: PlacementBeginMode = PlacementBeginMode.Add;
  
    get isCancelling() {
      return this.stoppage_mode === PlacementStoppageMode.UserCancelled;
    }
  
    get stoppageMode() {
      return this.stoppage_mode;
    }

    get beginMode() {
        return this.begin_mode 
    }

    setCancellingMode() {
      this.stoppage_mode = PlacementStoppageMode.UserCancelled;
    }
  
    setSuccessfulPlacement(successfulPlacementStoppageMode: SuccessfulPlacementStoppageMode) {
      this.stoppage_mode = successfulPlacementStoppageMode;
    }

    setBeginMode(begin_mode: PlacementBeginMode) {
        this.begin_mode = begin_mode
    }

    // Gets the placement current status. For telemetry purposes. We only track the successful placement cases.
    // Succesful placement means that item got succesfully placed.
    // Value is undefined otherwise. Which means the placement status is not succesful e.g user cancels placement.
    getSuccessfulPlacementModeStatus() {
        if (isSuccessfulStopMode(this.stoppageMode))
            return {
                placementStoppageReason: this.stoppageMode,
                placementBeginMode: this.beginMode
            }
        
        return  undefined
    }
  
    reset() {
      this.stoppage_mode = PlacementStoppageMode.None;
      this.begin_mode = PlacementBeginMode.Add;
    }
}
