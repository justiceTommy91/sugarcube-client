/**
 * GrandCentral
 * Singleton for dispatching and receiving app-wise notifications.
 */

import { NOTIFY_DOWNLOAD_ERROR } from 'Renderer/geomviewer/geom_constants'
import { getE2ETestingEnv } from 'utils/environment';
import { attachViewerObservers } from 'utils/testApiUtils';
import * as disp from './NotificationDispatcher'

// TODO(georges): Rather than making GrandCentral a singleton, there should be a Viewer/Renderer
// class that owns the centralized notification dispatcher. That will happen when the Renderer
// is refactored.

export class GrandCentral implements disp.NotificationDispatcher {
    static singleton?: GrandCentral;

    private observers: {
        filter: number, // Notifications the observer is interested in.
        observer: disp.NotificationObserver,
    }[];

    private loggingEnabled = false

    // Return the GrandCentral singleton, creating it if necessary.
    static getDispatcher(): GrandCentral {
        if (!GrandCentral.singleton) {
            GrandCentral.singleton = new GrandCentral();
        }
        return GrandCentral.singleton;
    }

    private constructor() {
        this.observers = [];

        if (getE2ETestingEnv()) {
            attachViewerObservers(this)
        }
    }

    // Helper function to dispatch a download-error notification.
    dispatchDownloadError(
        downloadType: disp.DownloadType, url: string, numAttempts: number, assetKeyOrId: string) {
        if (this.observers.length > 0) {
            const errorInfo: disp.NotificationInfo = {
                what: NOTIFY_DOWNLOAD_ERROR,
                payload: { downloadType, url, numAttempts, assetKeyOrId } as disp.DownloadErrorInfo,
            }
            this.dispatchNotification(errorInfo);
        }
    }

    // Dispatch a notification to observers that are interested in <what>.
    dispatchNotification(notification: disp.NotificationInfo) {
        if (this.loggingEnabled) {
            GrandCentral.logNotification(notification)
        }

        for (let i = 0; i < this.observers.length; i += 1) {
            // eslint-disable-next-line no-bitwise
            if (this.observers[i].filter & notification.what) {
                this.observers[i].observer(notification);
            }
        }
    }

    addObserver(filter: number, observer: disp.NotificationObserver) {
        // eslint-disable-next-line  eqeqeq
        if (!this.observers.find(o => observer == o.observer)) {
            this.observers.push({ filter, observer });
        }
    }

    removeObserver(observer: disp.NotificationObserver) {
        // eslint-disable-next-line  eqeqeq
        const i = this.observers.findIndex(o => o.observer == observer);
        if (i !== -1) {
            this.observers.splice(i, 1);
        }
    }

    enableLogging(shouldEnable = true) {
        this.loggingEnabled = shouldEnable
    }

    static logNotification (notification: disp.NotificationInfo) {
        /* eslint-disable no-console */
        console.group(`viewer %cid: ${notification.what}`, `color: #ddd;`)
        if (notification.payload) {
            Object.entries(notification.payload).forEach((kv) => console.log(`${kv[0]}:`, kv[1]))
        }
        console.groupEnd()
    }
}

// API function to get the central dispatcher singleton.
export function getGrandCentral(): disp.NotificationDispatcher {
    return GrandCentral.getDispatcher();
}
