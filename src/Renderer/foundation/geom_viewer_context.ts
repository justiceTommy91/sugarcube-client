import type { InputHandler } from 'Renderer/inputhandler/InputHandler'
import type { GeomViewerModel } from 'Renderer/foundation/geom_viewer_model'
import type { ViewManager } from 'Renderer/multiview/view_manager';
import type { CameraManager } from 'Renderer/multiview/camera_manager'
import type { StartupWarden } from 'Renderer/StartupWarden';
import type { PinsManager } from 'Renderer/PinsManager';
import type { ColorIdRenderer } from 'Renderer/ColorIdRenderer';

// *** Important ***
// GeomViewerContext is used/imported into many other files. To mitigate the risk
// of creating circular-import references, import only types into this file.

/**
 * The GeomViewerContext is a POD class that holds information and objects that are
 * shared throughout the Viewer.
 */
export class GeomViewerContext {
  // Holds or provides access to view-independent items that make up the scene.
  private mModel?: GeomViewerModel;

  // Handles mouse, touch and keyboard inputs and related input states.
  private mInputHandler?: InputHandler;

  private mColorIdRenderer?: ColorIdRenderer;
  private mPinsManager?: PinsManager;

  constructor(
    // Startup warden is used to synchronize the viewer's initialization sequence.
    readonly startupWarden: StartupWarden,
    // View manager holds camera and related data for each view.
    readonly viewManager: ViewManager,
    // Camera manager handles cameras transitions and controls.
    readonly cameraManager: CameraManager,
  ) { }

  setModel(model: GeomViewerModel) {
    this.mModel = model;
  }

  setInputHandler(inputHandler: InputHandler) {
    this.mInputHandler = inputHandler;
  }

  setColorIdRenderer(colorIdRenderer: ColorIdRenderer) {
    this.mColorIdRenderer = colorIdRenderer;
  }

  setPinsManager(pinsManager: PinsManager) {
    this.mPinsManager = pinsManager;
  }

  get model(): GeomViewerModel | undefined {
    return this.mModel;
  }

  get inputHandler(): InputHandler | undefined {
    return this.mInputHandler;
  }

  get colorIdRenderer(): ColorIdRenderer | undefined {
    return this.mColorIdRenderer;
  }

  get pinsManager(): PinsManager | undefined {
    return this.mPinsManager;
  }
}
