/* eslint-disable no-plusplus */
/**
 * FloorPlacer
 * Finds where to insert new furniture items on the floor.
 */
import * as Sentry from '@sentry/react'
import { createDropLocationsWorker } from 'Renderer/workers/WorkerAdapters';
import { Point2 } from 'Renderer/geometry/Point2'
import { Rect2 } from 'Renderer/geometry/Rect2';
import { SENTRY_BREADCRUMB_CATEGORY } from 'Renderer/constants'
import {
    buildFloorBoundingRect,
    buildFloorBoundingRectWithSampler,
    findFloorDropLocations,
    findFloorDropLocationsWithPlaneData,
} from './utils/pixArrayUtils';
import { PixelData, PixelDataRecord } from "./assets/AssetManager";
import { PixArray } from './utils/PixArray';
import type { GeomBaseScene } from './rendering/GeomBaseScene';
import { Location3 } from './geomviewer/geom_types';
import { SceneSampler } from './rendering/SceneSampler';
import { InitialPosInfo } from './positioning/positioning_types';
import { getRenderItem3D } from './rendering/scene_utils';

// Data passed to and from DropLocationsFinder web worker. (See workers/WorkerAdapters.js).
type DropLocationsWorkerData = {
    pixBuffer: Uint8Array | Uint8ClampedArray,
    pixWidth: number,
    pixHeight: number,
    flipY: boolean,
}

type DropLocationsWorkerResult = {
    pixBuffer: Uint8Array,
    result: number,
    reason: string,
    floorRect?: Rect2,
    locations?: Point2[],
}

export class FloorPlacer {
    // The alpha channel in the occlusion map holds the floor mask.
    private occlusionMap?: PixelData;

    // Whether the occlusion map is flipped vertically.
    private flipY = false;

    // Width of the background panorama (not the occlusion map).
    private width = 0;

    // Height of the background panorama (not the occlusion map).
    private height = 0;

    // To cast rays into the scene for furniture detection.
    private sampler: SceneSampler

    // Bounding rect around floor pixels in occlusion map.
    private floorBoundingRect?: Rect2;

    // List of floor locations, in relative screen coordinates, where it's ok to drop
    // new furniture items.
    private candidateDropLocations?: Point2[];

    // Web worker DropLocationsFinder.
    private worker?: Worker;

    // Caller supplied callback. FloorPlacer calls this function to release the occlusion
    // map pixel data when the web worker is done. (See function updateOcclusionMap.)
    private onReleasePixelData?: (pixels: Uint8Array) => void;

    // Promise used to notify when FloorPlacer is done with the occlusion map pixel data.
    private occlusionMapReleased?: Promise<boolean>;

    // eslint-disable-next-line @typescript-eslint/ban-types
    constructor( sampler: SceneSampler ) {
        this.height = 0;
        this.width = 0;
        this.sampler = sampler;

        this.configureWithOcclusionMap = this.configureWithOcclusionMap.bind(this);
        this.genDropLocationsWithPlaneData = this.genDropLocationsWithPlaneData.bind(this);
    }

    // set Dimensions for the scene
    setDimensions(height: number, width: number) {
        this.height = height
        this.width = width
    }

    async configureWithOcclusionMap(pixelDataRecord: PixelDataRecord) {
        this.width = pixelDataRecord.pixels?.width || 1;
        this.height = pixelDataRecord.pixels?.height || 1;

        return new Promise((resolve) => {
            const dataToReturn = pixelDataRecord;
            const updateCallback = (pixels: Uint8Array) => {
                if (dataToReturn.pixels !== null) {
                    dataToReturn.pixels.data = pixels;
                }
            }
            if (pixelDataRecord.pixels !== null) {
                this.updateOcclusionMap(pixelDataRecord.pixels, updateCallback);
            }
            this.checkOcclusionMapReleased().then(resolve);
        });    
    }

    // Call this function if you need the occlusion-map pixel data after calling function
    // updateOcclusionMap (below). It returns a promise that is never rejected. Instead,
    // it is one of three states:
    // 1. Pending if FloorPlacer the web worker is using the pixel data.
    // 2. Resolved to true if FloorPlacer has released the pixel data.
    // 3. Resolved to false if FloorPlacer has not taken ownership of the pixel data.
    checkOcclusionMapReleased(): Promise<boolean> {
        if (this.occlusionMapReleased) {
            return this.occlusionMapReleased;
        }

        return Promise.resolve(false);
    }

    private updateOcclusionMap(occlusionMap: PixelData, onReleasePixelData: (pixels: Uint8Array) => void) {
        this.onReleasePixelData = onReleasePixelData;
        this.occlusionMapReleased = undefined;

        // Avoid doing extra work if there is not changes to the parameters.
        if (this.occlusionMap === occlusionMap) {
            return;
        }

        this.occlusionMap = occlusionMap;

        if (this.occlusionMap) {
            // Try the build a list of drop locations asynchronously, with a web worker.
            // If that fails we'll use inline code instead.
            let buildingWithWorker = false;
            if (window.Worker) {
                buildingWithWorker = this.buildDropLocationsWithWebWorker();
            } else {
                Sentry.captureException({
                    cause: `WebWorker not available`,
                    breadcrumbs: [{
                        type: `info`,
                        category: SENTRY_BREADCRUMB_CATEGORY,
                        data: {
                            issuer: `FloorPlacer`,
                        },
                    }],
                });
            }

            if (!buildingWithWorker) {
                this.buildCandidateDropLocationList();
            }
        }
    }

    // Returns an initialPosInfo object with 3D location and the legacy 2D position by sampling the floor polygon
    // from the provided screen point.
    private samplePointOnFloor( Point: Point2, sampler: SceneSampler, offset = { x: 0, y: 0} ) : InitialPosInfo | null {
        const sampleResult = sampler.sampleRelativePoint(Point)
        if (!sampleResult || sampleResult.plane.class !== 'floor') {
            return null
        }
        const position3D: Location3 = {
            bindTo: String(sampleResult.plane.id),
            localPos: { ...sampleResult.position },
        }
        const result : InitialPosInfo = {
            pos2D: [Point.x * this.width + offset.x, Point.y * this.height + offset.y],
            pos3D: position3D,
        }
        return result
    }

    genDropLocationsWithPlaneData() {
        this.floorBoundingRect = buildFloorBoundingRectWithSampler(100, this.sampler)
        this.candidateDropLocations = findFloorDropLocationsWithPlaneData(this.floorBoundingRect, this.sampler)
    }

    // Return a [x, y] location at which a new furniture item should be inserted.
    // Location [x, y] is expressed in pano pixel coordinates.
    findNewFurniturePosition( scene: GeomBaseScene ): InitialPosInfo | null  {

        const sampler = scene.getSceneSampler()

        if (this.candidateDropLocations) {
            return this.findNewFurniturePositionWithBbox(sampler);
        }

        const q = FloorPlacer.getLastDitchDropLocation();

        return this.samplePointOnFloor(q, sampler);
    }

    getRoomDefaultFloorPos() {
      if (!(this.candidateDropLocations && this.candidateDropLocations.length > 0)) {
        return undefined
      }
      return this.candidateDropLocations[0]
    }

    // When all else fails, use this drop location. It's at the bottom-center of the screen.
    private static getLastDitchDropLocation(): Point2 {
        return new Point2(0.5, 0.90);
    }

    // Look for a good place to insert a new furniture item using ray-casting into existing
    // furniture items.
    private findNewFurniturePositionWithBbox( sampler: SceneSampler ): InitialPosInfo | null {
        if (!this.candidateDropLocations) {
            return null;
        }

        // Check each of the candidate location by ray-casting into the bbox of existing
        // furniture items. If a ray has no intersection, it's a good place for the new item.
        const len = this.candidateDropLocations.length
        for (let i = 0; i < len; i += 1) {
            const relLoc = this.candidateDropLocations[i]
            if (!this.checkRayCastToBoundingBoxes(relLoc)) {
                const sampleResult = this.samplePointOnFloor(relLoc, sampler)
                if (sampleResult) {
                    return sampleResult
                }
            }
        }

        if (len > 0) {
            // It seems there's no good, unobstructed place to insert the new furniture. Use the
            // first candidate location from the list, but wiggle it a bit to offset overlapping
            // furniture items.
            const offset = {
                x: Math.floor(50 * Math.random() - 25),
                y: Math.floor(50 * Math.random() - 25)
            }
            const sampleResult = this.samplePointOnFloor(this.candidateDropLocations[0], sampler, offset)
            if (sampleResult) {
                return sampleResult
            }
        }

        // It looks like we fail to even find a candidate drop location.
        const defaultDropLoc = FloorPlacer.getLastDitchDropLocation();
        return this.samplePointOnFloor(defaultDropLoc, sampler);
    }

    // Ray cast through the given relative screen loc and returns whether the ray intersects
    // any existing furniture item.
    private checkRayCastToBoundingBoxes(screenLoc: Point2): boolean {
        const isBlockingPlacing = (itemId: string) => {
            const item = getRenderItem3D(itemId)
            return item?.shouldBlockFloorPlacing() ?? false
        }
        const loc = new Point2(0, 0)
        const hit = this.sampler.getObjectIdAtPointUsingBbox( loc.set(screenLoc.x, screenLoc.y),
            false, isBlockingPlacing)
        return hit !== null
    }

    // Build and return a bounding rect for the floor pixels within the occlusion map.
    private buildFloorBoundingRect(): Rect2 | undefined {
        if (this.occlusionMap) {
            const pix = PixArray.createPixmapFromRgbaData(this.occlusionMap.data,
                this.occlusionMap.width, this.occlusionMap.height, this.flipY);
            return buildFloorBoundingRect(pix);
        }

        return undefined;
    }

    // Build a list of candidate furniture drop locations.
    private buildCandidateDropLocationList() {
        this.floorBoundingRect = this.buildFloorBoundingRect();
        if (this.occlusionMap && this.floorBoundingRect) {
            const pixArray = PixArray.createPixmapFromRgbaData(this.occlusionMap.data,
                this.occlusionMap.width, this.occlusionMap.height, this.flipY);
            this.candidateDropLocations = findFloorDropLocations(this.floorBoundingRect, pixArray);
        }
    }

    // Helper function to process the web-worker result.
    private processWebWorkerResult(data: DropLocationsWorkerResult) {
        if (data.result === 0) {
            // Fallback to building drop locations without web worker.
            this.buildCandidateDropLocationList();

            const reason = data.reason || `unknown`;
            Sentry.captureException({
                cause: `WebWorker failed`,
                breadcrumbs: [{
                    type: `info`,
                    category: SENTRY_BREADCRUMB_CATEGORY,
                    message: `Reason: ${reason}`,
                    data: {
                        issuer: `DropLocationFinder via FloorPlacer`,
                    },
                }],
            })
        } else {
            this.candidateDropLocations = data.locations;
            this.floorBoundingRect = data.floorRect;
        }

        // Release the occlusion-map pixel data.
        if (this.onReleasePixelData) {
            this.onReleasePixelData(data.pixBuffer);
        }
    }

    // Build a list of candidate furniture drop location using a web worker.
    // Returns whether the webworker is successfully created and launched.
    private buildDropLocationsWithWebWorker(): boolean {
        if (this.occlusionMap && !this.worker) {
            try {
                this.worker = createDropLocationsWorker();
            } catch (error) {
                // Catch and report a failure to create the worker.
                Sentry.captureException({
                    cause: error,
                    breadcrumbs: [{
                        type: `info`,
                        category: SENTRY_BREADCRUMB_CATEGORY,
                        data: {
                            message: `WebWorker not available`,
                            issuer: `FloorPlacer`,
                        },
                    }],
                });

                return false;
            }

            this.occlusionMapReleased = new Promise(resolve => {
                if (this.worker && this.occlusionMap) {
                    this.worker.onmessage = (e: MessageEvent) => {
                        const outData = e.data as DropLocationsWorkerResult;
                        if (outData) {
                            this.processWebWorkerResult(outData);

                            resolve(true);

                            // Web worker is no longer needed.
                            this.worker = undefined;
                        }
                    };

                    const workerData: DropLocationsWorkerData = {
                        pixBuffer: this.occlusionMap.data,
                        pixWidth: this.occlusionMap.width,
                        pixHeight: this.occlusionMap.height,
                        flipY: this.flipY,
                    };
                    this.worker.postMessage(workerData, [this.occlusionMap.data.buffer]);
                } else {
                    resolve(false);
                }
            });
        }

        return true;
    }
}
