/**
 * Utility functions for pix-array objects.
 */
import { Point2 } from 'Renderer/geometry/Point2';
import { Rect2 } from 'Renderer/geometry/Rect2';
import { SceneSampler } from 'Renderer/rendering/SceneSampler';
import { PixArray } from './PixArray'

// Return a bounding rectangle for all the floor pixels in the given occlusion map.
export function buildFloorBoundingRect(occlusionPixmap: PixArray): Rect2 {
    const boundingRect = new Rect2();

    // Expand bounding rect by coordinates (x, y) of every floor pixel.
    const accumulateOp = (x: number, y: number /* , _byteIndex: number */) => {
        boundingRect.expand({ x, y });
    }

    // Filter for floor pixel, i.e. a pixel whose alpha < 128.
    const isFloorPix = (pixIndex: number) => (occlusionPixmap.pixels[pixIndex + 3] < 128);

    occlusionPixmap.apply(accumulateOp, isFloorPix);
    return boundingRect;
}

// numsteps are how closely we will sample the pixels between the relative coordinate system (0 - 1)
// the larger the numSteps, the more pixels will be sampled, more precision will be available
// and more droppable locations will be allocated.
// For now we have kept it to 100 in order sample till 2 decimal of precision.

export function buildFloorBoundingRectWithSampler(numSteps: number, sampler: SceneSampler ) {
    const boundRect = new Rect2()

    for (let j = 0; j <= numSteps; j += 1) {
        for (let i = 0; i <= numSteps; i += 1) {
            const x = i / numSteps;
            const y = j / numSteps;
            if(sampler.sampleFloor(new Point2(x, y))) {
                boundRect.expand({x, y})
            }
        }
    }
    return boundRect
}

// Helper function to findFloorDropLocations below. Build a grid of points along a line segment of
// length <len>, with the following constraints:
// - We want a point in the middle of the segment.
// - There should be a margin without point at each end.
// - The grid points should be spaced by <delta>.
// - The ideal margin and delta are given below but can be reduced to fit the grid.
// Returns 2 values:
//   numPoints: the number of grid points that the line segment can accommodate.
//   delta: the actual distance between each grid points.
function genLinearGrid(len: number): [numPoints: number, delta: number] {

    const IDEAL_MARGIN = 100;
    const IDEAL_DELTA = 100;

    let margin = IDEAL_MARGIN;
    let delta = IDEAL_DELTA;

    // Helper: given len, margin and delta, how many points can we fit.
    function calcNumPoints(sgmLen: number, marginSize: number, deltaSize: number): number {
        // Use half len since we want a grid point in the middle of the segment.
        const halfLen = Math.floor(0.5 * sgmLen);
        if (halfLen < marginSize + deltaSize) {
            return 1;
        }

        const numIntervals = Math.floor((halfLen - marginSize - deltaSize) / delta);
        return 2 * (numIntervals + 1) + 1;
    }

    // Let's try to fit a least 5 points, reducing the gap (delta) between points down to
    // 50 if necessary.
    let numPoints = calcNumPoints(len, margin, delta);
    while (numPoints < 5 && delta >= 75) {
        delta -= 25;
        numPoints = calcNumPoints(len, margin, delta);
    }

    // If we still can't fit 5 points, lets try reducing the margin.
    while (numPoints < 5 && margin > 25) {
        margin -= 25;
        numPoints = calcNumPoints(len, margin, delta);
    }
    if (numPoints < 5)
        delta = (numPoints > 1) ? (len - 2 * margin) / (numPoints - 1) : 0;

    return [numPoints, delta];
}

// Given an occlusion map and a bounding rect for the floor pixels within this occlusion map,
// return a list of candidate (x, y) locations where furniture items can be dropped.
// The (x, y) coordinates within that list are expressed in range [0, 1] relative to the
// dimensions of the occlusion map.
export function findFloorDropLocations(
    floorArea: Rect2, occlusionMap: PixArray): Point2[] {

    const locArray: Point2[] = [];

    const midX = Math.floor(floorArea.midX);
    const midY = Math.floor(floorArea.midY);

    // To scale output to range [0, 1]. Multiplying by a scale values is a lot cheaper
    // than diving by the width or height repeatedly.
    const scaleX = 1.0 / occlusionMap.width;
    const scaleY = 1.0 / occlusionMap.height;

    const [numGridX, deltaX] = genLinearGrid(floorArea.width);
    const [numGridY, deltaY] = genLinearGrid(floorArea.height);

    // Sample the occlusion map, within the bounds of floor area, using the grids parameters
    // generated above. Each sample that is a confirmed floor pixel is added to the list
    // of candidate drop locations. The sampling starts in the middle of the area and jumps
    // back-and-forth about the mid-lines, going ever further.
    const isFloorPixel = (rgbaPixel: number[]) => (rgbaPixel[3] < 128);
    const pixel = [0, 0, 0, 0];
    let gridY = midY;
    for (let j = 0; j < numGridY; j += 1) {
        let gridX = midX;
        for (let i = 0; i < numGridX; i += 1) {
            occlusionMap.readPixelAtXY(gridX, gridY, pixel);
            if (isFloorPixel(pixel)) {
                locArray.push(new Point2(gridX * scaleX, gridY * scaleY));
            }

            gridX = midX - (gridX - midX)
            if (gridX >= midX) {
                gridX += deltaX;
            }
        }

        gridY = midY - (gridY - midY)
        if (gridY >= midY) {
            gridY += deltaY;
        }
    }

    return locArray;
}

// This function accomplishes the same as findFloorDropLocations (see above), but with a few
// tweaks meant for when we have plane data available. The genLinearGrid function does not assume that we
// are passing in the parameters in relativeScreen coordinates as a result it will always result a single placeable
// point on the scnee. This is why we scale the rectboundingbox's width and height to be able to generate correct grid.
// We then simply scale down the delta offset. 

export function findFloorDropLocationsWithPlaneData (floorArea: Rect2, sampler: SceneSampler) {

    const midX = floorArea.midX
    const midY = floorArea.midY
    const locArray: Point2[] = [];

    const [numGridX, deltaX] = genLinearGrid(floorArea.width * 1000);
    const [numGridY, deltaY] = genLinearGrid(floorArea.height * 1000);

    // add in a few more placeable positions since the grid lacks a few.
    const numGridXScaled = numGridX + 10
        
    let gridY = midY;
    for (let j = 0; j < numGridY; j += 1) {
        let gridX = midX;
        for (let i = 0; i < numGridXScaled; i += 1) {
            const p2 = new Point2(gridX, gridY)
            if (sampler.sampleFloor(p2)) {
                locArray.push(p2);
            }
    
            gridX = midX - (gridX - midX)
            if (gridX >= midX) {
                gridX += deltaX / 1500;
            }
        }
    
        gridY = midY - (gridY - midY)
        if (gridY >= midY) {
            gridY += deltaY / 1500;
        }
    }
    return locArray
}
