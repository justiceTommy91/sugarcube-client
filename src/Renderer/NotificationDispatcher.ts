/**
 * Interface NotificationDispatcher
 * A central location for tracking asynchronous Renderer notifications.
 */

import {
  DOWNLOAD_TYPE_ENVMAP,
  DOWNLOAD_TYPE_PRODUCT,
  DOWNLOAD_TYPE_SCENEDATA
} from 'Renderer/geomviewer/geom_constants'

// Notification payload for download errors.
export type DownloadType =
  typeof DOWNLOAD_TYPE_SCENEDATA | typeof DOWNLOAD_TYPE_PRODUCT | typeof DOWNLOAD_TYPE_ENVMAP
export type DownloadErrorInfo = {
  downloadType: DownloadType,
  url: string,
  numAttempts: number, // Number of download attempts before failing.
  assetKeyOrId: string, // e.g. "pano_0" for the background image or "25147" for a chair model.
};

export type FurnitureItemInfo = {
  furnitureItemId: string,
};

export type ArtItemInfo = {
 itemId: string,
};

export type NotificationInfo = {
  what: number, // One of the notification bits, e.g. NOTIFY_DOWNLOAD_ERROR.
  payload?: object | DownloadErrorInfo | FurnitureItemInfo | ArtItemInfo,
}

// Add an observer to a dispatcher to receive notifications.
export type NotificationObserver = (info: NotificationInfo) => void;

// Usage:
// GrandCentral is a NotificationDispatcher singleton shared with the renderer.
// const cd = getGrandCentral();
// cd.addObserver(NOTIFY_DOWNLOAD_ERROR, myObserver);
export interface NotificationDispatcher {
  addObserver: (filterBits: number, observer: NotificationObserver) => void;
  removeObserver: (observer: NotificationObserver) => void;
  enableLogging: (shouldEnable?: boolean) => void;
}
