import type { InputHandler } from "Renderer/inputhandler/InputHandler";
import type { GeomCamera } from "Renderer/multiview/geom_camera";
import type { GeomBaseScene } from "Renderer/rendering/GeomBaseScene";
import type { StartupWarden } from "Renderer/StartupWarden";
import type { ViewManager } from "Renderer/multiview/view_manager";
import type { CameraManager } from "Renderer/multiview/camera_manager";
import { GfxInterface } from "Renderer/renderingLibrary/gfxInterface";
import { DebugSettings } from "Renderer/geomviewer/geom_debug";
import { ViewerSettings } from "Renderer/geomviewer/geom_types";

import { MainModule as DecorateEngine } from "@geomagical/sugarcube-rendering-shared"
import type { ColorIdRenderer } from "Renderer/ColorIdRenderer";
import type { PinsManager } from "Renderer/PinsManager";
import { gvGetRenderLibrary } from 'Renderer/renderingLibrary/gfxGlobal';
import type { GeomViewerModel } from "./geom_viewer_model";
import type { GeomViewerContext } from "./geom_viewer_context";


/**
 * Convenience functions that provides access to viewer-wide objects that are
 * held by the geom-viewer context. Note that these functions are consistently
 * prefixed with 'gv', which you can think of as Global Value or Geom Viewer.
 * Note: The context bindings initialization is isolated in this file to avoid
 * circular dependencies.
 */

let geomViewerContext: GeomViewerContext | undefined;
export function gvInitContext(gvContext: GeomViewerContext) {
  geomViewerContext = gvContext;
}

export function gvClearContext() {
  geomViewerContext = undefined;
}

let decorateEngine: DecorateEngine | undefined;
export function gvInitDecorateEngine(module: DecorateEngine) {
  decorateEngine = module;
}

export function gvClearDecorateEngine() {
  decorateEngine = undefined;
}

export function gvDecorateEngine(): DecorateEngine {
  if (!decorateEngine) {
    throw new Error("decorateEngine is not initialized")
  }
  return decorateEngine;
}

// Return the current scene, if available.
export function gvCurrentScene(): GeomBaseScene | undefined {
  return geomViewerContext?.viewManager?.getCurrentViewScene();
}

export function gvRenderLibrary() : GfxInterface | undefined {
  return gvGetRenderLibrary()
}

// Return the camera currently in use if available.
export function gvCurrentCamera(): GeomCamera | undefined {
  return geomViewerContext?.viewManager?.getCurrentViewCamera();
}

// Return the viewer's geom model if available.
export function gvGeomModel(): GeomViewerModel | undefined {
  return geomViewerContext?.model;
}

// Return the viewer's input handler if available.
export function gvInputHandler(): InputHandler | undefined {
  return geomViewerContext?.inputHandler;
}

// Return the viewer's startup warden if available.
export function gvStartupWarden(): StartupWarden | undefined {
  return geomViewerContext?.startupWarden;
}

// Return the view manager if available.
export function gvViewManager(): ViewManager | undefined {
  return geomViewerContext?.viewManager;
}

// Return the camera manager if available.
export function gvCameraManager(): CameraManager | undefined {
  return geomViewerContext?.cameraManager;
}

export function gvColorIdRenderer(): ColorIdRenderer | undefined {
  return geomViewerContext?.colorIdRenderer;
}

export function gvPinsManager(): PinsManager | undefined {
  return geomViewerContext?.pinsManager;
}

// Return the current app settings if available.
export function gvCurrentSettings()
  : { debugSettings?: DebugSettings, viewerSettings?: ViewerSettings } | undefined {
    return geomViewerContext?.viewManager?.getCurrentSettings()
}
