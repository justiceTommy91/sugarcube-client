/**
 * Provide helper types and functions for the browser-side testing infrastructure.
 */
import {
  NOTIFY_SCENE_ITEM_UPDATE,
  NOTIFY_VIEWER_ERROR,
  NOTIFY_VIEWER_STATE_UPDATE,
} from 'Renderer/geomviewer/geom_constants'
import {
  NotificationDispatcher,
  NotificationInfo,
  SceneItemUpdateNotification,
  ViewerErrorNotification,
  ViewerStateUpdateNotification,
} from 'Renderer/geomviewer/geom_notifications'
import {
  TestCallbackData,
  TEST_CALLBACK_NAME,
  TEST_CALLBACK_REASON_SCENE_ITEM_UPDATE,
  TEST_CALLBACK_REASON_VIEWER_ERROR,
  TEST_CALLBACK_REASON_VIEWER_STATE,
  VIEWER_STATE_NAME_DRAW_IDLE,
  VIEWER_STATE_NAME_FIRST_RENDER,
  VIEWER_STATE_NAME_VIEWER_READY,
  VIEWER_STATE_NAME_WALL_DATA_READY,
  VIEWER_STATE_NAME_PLACEMENT_MODE_START,
  VIEWER_STATE_NAME_VIEW_CHANGE_END,
  VIEWER_STATE_NAME_ORBIT_CHANGE_END,
} from './types'

// A test-callback is a function that is optionally attached to the window by the test.
// If the test-callback function is available, invoke it with the data in <value>.
function attemptTestCallback(value: TestCallbackData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cb = (window as { [key: string]: any })[TEST_CALLBACK_NAME];
  if (cb) {
    cb(value);
  }
}

// This observer is registered with GrandCentral to receive viewer-state
// notifications. It simply invokes the test-callback function with the
// viewer-state data.
const viewerStateObserver = (info: NotificationInfo) => {
  const state = info as ViewerStateUpdateNotification;
  switch (state.payload.stateInfo) {
    case 'FirstRender':
      attemptTestCallback({
        reason: TEST_CALLBACK_REASON_VIEWER_STATE,
        stateName: VIEWER_STATE_NAME_FIRST_RENDER,
      });
      break;
    case 'ViewerReady':
      attemptTestCallback({
        reason: TEST_CALLBACK_REASON_VIEWER_STATE,
        stateName: VIEWER_STATE_NAME_VIEWER_READY,
        glContextInfo: state.payload.viewerReadyContextInfo,
      });
      break;
    case 'WallDataReady':
      attemptTestCallback({
        reason: TEST_CALLBACK_REASON_VIEWER_STATE,
        stateName: VIEWER_STATE_NAME_WALL_DATA_READY,
        wallSize: state.payload.wallDataInfo,
      });
      break;
    case 'DrawIdle':
      attemptTestCallback({
        reason: TEST_CALLBACK_REASON_VIEWER_STATE,
        stateName: VIEWER_STATE_NAME_DRAW_IDLE,
      });
      break;
    case 'PlacementModeStarted':
      attemptTestCallback({
        reason: TEST_CALLBACK_REASON_VIEWER_STATE,
        stateName: VIEWER_STATE_NAME_PLACEMENT_MODE_START,
      });
      break;
    case 'ViewChangeEnd':
      if (state.payload.source === 'ViewManager') {
        attemptTestCallback({
          reason: TEST_CALLBACK_REASON_VIEWER_STATE,
          stateName: VIEWER_STATE_NAME_VIEW_CHANGE_END,
        });
      } else if (state.payload.source === 'OrbitMode') {
        attemptTestCallback({
          reason: TEST_CALLBACK_REASON_VIEWER_STATE,
          stateName: VIEWER_STATE_NAME_ORBIT_CHANGE_END,
        });
      }
      break;
    default:
      // eslint-disable-next-line no-console
      console.error('Not implemented');
  }
}

// An observer for viewer-errors notifications that forward the notification
// info to the test callback.
const viewerErrorObserver = (info: NotificationInfo) => {
  const viewerError = info as ViewerErrorNotification;
  const payload = viewerError.payload
  attemptTestCallback({
    reason: TEST_CALLBACK_REASON_VIEWER_ERROR,
    error: viewerError.payload.error as string,
    // eslint-disable-next-line @typescript-eslint/dot-notation
    initFailureInfo: ('initializationFailureInfo' in payload ? payload['initializationFailureInfo'] : undefined) || {},
  });
}

// An observer for scene-item-updates notifications that forwards the notification
// info to the test callback.
const sceneItemUpdateObserver = (info: NotificationInfo) => {
  const itemUpdate = info as SceneItemUpdateNotification;
  attemptTestCallback({
    reason: TEST_CALLBACK_REASON_SCENE_ITEM_UPDATE,
    sceneItemUpdate: {
      itemId: itemUpdate.payload.itemId,
      stateInfo: itemUpdate.payload.stateInfo,
      // eslint-disable-next-line @typescript-eslint/dot-notation
      itemData: 'itemData' in itemUpdate.payload ? itemUpdate.payload['itemData'] : undefined,
    }
  })
}


export function attachViewerObservers(dispatcher: NotificationDispatcher) {
  dispatcher.addObserver(NOTIFY_VIEWER_STATE_UPDATE, viewerStateObserver);
  dispatcher.addObserver(NOTIFY_VIEWER_ERROR, viewerErrorObserver);
  dispatcher.addObserver(NOTIFY_SCENE_ITEM_UPDATE, sceneItemUpdateObserver);
}

export function removeViewerObservers(dispatcher: NotificationDispatcher) {
  dispatcher.removeObserver(viewerStateObserver);
  dispatcher.removeObserver(viewerErrorObserver);
  dispatcher.removeObserver(sceneItemUpdateObserver);
}

