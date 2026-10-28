/**
 * DropLocationsFinder
 * Web-worker code to  derive candidate insertion locations for new furniture items.
 */
import { PixArray } from 'Renderer/utils/PixArray'
import { buildFloorBoundingRect, findFloorDropLocations } from 'Renderer/utils/pixArrayUtils'

/* eslint-disable no-restricted-globals */

// DropLocationsFinder
// Web worker that takes an occlusion as a transferable Uint8Array and builds an array of
// (x, y) floor locations where new furniture items can be placed.
//
// Input data = {
//   pixBuffer: Uint8Array, // array of RGBA occlusion-map data, transferred in
//   pixWidth: number,      // Width of occlusion map in pixels
//   pixHeight: number,     // Height of occlusion map in pixels
//   flipY: boolean,        // Whether the occlusion map is flipped vertically
// }
//
// Output data = {
//   pixBuffer: Uint8Array,                 // Occlusion-map data transferred back to UI thread
//   result: number,                        // 0 on failure, 1 on success
//   reason: string,                        // Info about the failure.
//   floorRect?: Rect2,                     // Bounding rect of floor pixels in occlusion map.
//   locations?: Point2[] // Array of Point2 locations coordinates.
// }

self.onmessage = (e) => {
    const data = e.data;
    const pixWidth = data.pixWidth || 0;
    const pixHeight = data.pixHeight || 0;
    const pixBuffer = data.pixBuffer;
    const flipY = data.flipY || false;

    if (pixWidth > 0 && pixHeight > 0 && pixBuffer) {
        const pixmap = PixArray.createPixmapFromRgbaData(pixBuffer, pixWidth, pixHeight, flipY);
        const floorRect = buildFloorBoundingRect(pixmap);
        const pixArray = PixArray.createPixmapFromRgbaData(pixBuffer, pixWidth, pixHeight, flipY);
        const dropLocations = findFloorDropLocations(floorRect, pixArray);

        self.postMessage(
            {
                result: 1,
                floorRect,
                locations: dropLocations,
                pixBuffer,
            }, [pixBuffer.buffer]);
    } else {
        // Return an error. Note that we still send the pixel buffer back to the UI thread.
        self.postMessage(
            {
                result: 0,
                reason: 'bad input data',
                pixBuffer
            }, [pixBuffer.buffer]);
    }
}

