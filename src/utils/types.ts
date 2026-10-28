// This is also shared between smokeTests and GfxTests, need to share it somehow.
// Also this needto be shared with the graphcis renderer code.

import { GlContextInfo } from "Renderer/geomviewer/geom_types";
import { SceneItemUpdateNotification } from "Renderer/geomviewer/geom_notifications";

/**
 * Constants and types shared by the test code on the browser side as well
 * as the jest/node side.
 */
// import { GlContextInfo, SceneItemUpdateNotification } from "Renderer/geomviewer";

// The name of the function that is used for the test callback.
// On the test side, TestHelper registers the callback function.
// On the test-API side, various viewer events will invoke that function
// if it is available (see attemptTestCallback).
export const TEST_CALLBACK_NAME = 'testCallback';

// A reason to invoke the test callback.
export const TEST_CALLBACK_REASON_VIEWER_STATE = 'viewer-state';
export const TEST_CALLBACK_REASON_VIEWER_ERROR = 'viewer-error';
export const TEST_CALLBACK_REASON_SCENE_ITEM_UPDATE = 'scene-item-update';

// Various viewer-state event names that can invoke the test callback,
export const VIEWER_STATE_NAME_FIRST_RENDER = 'on-first-render';
export const VIEWER_STATE_NAME_VIEWER_READY = 'on-viewer-ready';
export const VIEWER_STATE_NAME_WALL_DATA_READY = 'on-wall-ready';
export const VIEWER_STATE_NAME_DRAW_IDLE = 'on-draw-idle';
export const VIEWER_STATE_NAME_PLACEMENT_MODE_START = 'on-placement-mode-started';
export const VIEWER_STATE_NAME_VIEW_CHANGE_END = 'on-view-change-end';
export const VIEWER_STATE_NAME_ORBIT_CHANGE_END = 'on-orbit-change-end';

// Information passed back to tests for scene-item-update notifications.
export type SceneItemUpdateInfo = {
  itemId?: string,
  stateInfo?: SceneItemUpdateNotification['payload']['stateInfo'],
  itemData?: { [key: string]: unknown },
}

// The packet of data that is passed to the test-callback function. The exact
// content varies for each reason.
export type TestCallbackData = {
  reason: string;

  // For viewer-state callbacks:
  stateName?: string;
  glContextInfo?: GlContextInfo; // with on-viewer-ready state only.
  wallSize?: { width: number, height: number }; // With on-wall-ready only.

  // For viewer-error:
  error?: string,
  initFailureInfo?: { [key: string]: unknown },

  // For scene-item updates:
  sceneItemUpdate?: SceneItemUpdateInfo,
}
