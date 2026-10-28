/**
 * Downloader
 */

// RequestInfo encapsulate the info for a request to download data.
// maxNumTries: Try to download this many times before failing.
// startDownload: The async function to call to initiate the download.
//     - onSuccess: The function to call back with the downloaded data on success.
//     - onFailure: The function to call back when the download fails.
export interface RequestInfo {
    maxNumTries: number,
    startDownload: (
        onSuccess: (data: unknown) => void,
        onFailure: (err: Error) => void) => void,
    abortDownload?: () => void
}

// Internal record that the Downloader uses to keep track of each download.
type DownloadRecord = {
    request: RequestInfo,
    tryCount: number,
    onSuccess: (data: unknown) => void,
    onFailure: (err: Error) => void,
}

// Helper class to download data from URLs. Downloader keeps a queue of download
// requests and performs up to a given maximum of request simultaneously. It will
// also automatically retry each failed download up to a given number of retries.
export class Downloader {
    // Queue of pending download requests.
    private pendingRequests: Array<DownloadRecord>;

    // Number of downloads currently taking place.
    private numDownloadInFlight: number;

    // Wait at least this long before retrying a failed download.
    private msDelayBeforeRetry: number;

    // Maximum number of downloads that are allowed to take place simultaneously.
    private maxParallelDownloads: number;

    // Internal flag used to avoid calling throttle() recursively.
    private isThrottling = false;

    // Construct a Downloader.
    // maxParallelDownloads: the maximum number of download to perform simultaneously. Set to
    //     zero means no limit.
    // msDelayBeforeRetry: wait at least this many milliseconds before retrying a failed download.
    constructor(maxParallelDownloads: number, msDelayBeforeRetry: number) {
        this.pendingRequests = Array<DownloadRecord>();
        this.numDownloadInFlight = 0;
        this.msDelayBeforeRetry = msDelayBeforeRetry;
        this.maxParallelDownloads = maxParallelDownloads;
    }

    // Enqueue a request to download data. This function returns a promise that
    // resolves to DownloadDataType when the download is successful. On failure
    // the promise is rejected with the error passed to onFailure, as provided in
    // the request (see RequestInfo).
    addRequest<DownloadDataType>(
        request: RequestInfo): Promise<DownloadDataType> {

        return new Promise<DownloadDataType>((resolve, reject) => {
            const onSuccess = (data: unknown) => {
                resolve(data as DownloadDataType);
                this.throttle();
            }
            const onFailure = (err: Error) => {
                reject(err);
                this.throttle();
            }

            const record: DownloadRecord = {
                request,
                tryCount: 0,
                onSuccess,
                onFailure
            };
            this.pendingRequests.push(record);
            this.throttle();
        });
    }

    private throttle() {
        // Avoid calling throttle recursively.
        if (!this.isThrottling) {
            this.isThrottling = true;

            while ((this.maxParallelDownloads <= 0 ||
                this.numDownloadInFlight < this.maxParallelDownloads) &&
                this.pendingRequests.length > 0) {

                const downloadRec = this.pendingRequests.shift();
                if (downloadRec) {
                    const request = downloadRec.request;

                    const onError = (err: Error) => {
                        this.numDownloadInFlight -= 1;
                        downloadRec.tryCount += 1;
                        if (downloadRec.tryCount >= request.maxNumTries) {
                            downloadRec.onFailure(err);
                        } else {
                            this.retryAfterDelay(downloadRec);
                        }
                    }

                    const onSuccess = (data: unknown) => {
                        this.numDownloadInFlight -= 1;
                        downloadRec.onSuccess(data);
                    }

                    this.numDownloadInFlight += 1;
                    request.startDownload(onSuccess, onError);
                }
            }

            this.isThrottling = false;
        }
    }

    private retryAfterDelay(downloadRecord: DownloadRecord) {
        setTimeout(
            () => {
                this.pendingRequests.push(downloadRecord);
                this.throttle();
            },
            this.msDelayBeforeRetry);
    }
}
