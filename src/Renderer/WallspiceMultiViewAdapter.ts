import WallspiceWebgl from "Renderer/WallspiceWebgl";
import type { Point2D, Point3D, PlaneType, Matrix3x3 } from './geomviewer';
import type { CameraIntrinsics } from './multiview/camera_types';
import { gvPositioningConext } from "./positioning/positioning_context";

function transformPlane(plane: PlaneType, mtx: number[]): PlaneType {
    // Computes dot product between a row vector and a column of a matrix
    const dot = (rowVector: number[], colMatrix: number[], offset = 0) =>
        rowVector[0] * colMatrix[offset] + rowVector[1] * colMatrix[offset + 4] + rowVector[2] * colMatrix[offset + 8];


    const normalVector = plane.rot[2];
    const planePoint: Point3D = [
        -plane.d * normalVector[0],
        -plane.d * normalVector[1],
        -plane.d * normalVector[2]
    ];

    const transformedPlanePoint = [
        dot(planePoint, mtx) + mtx[12],
        dot(planePoint, mtx, 1) + mtx[13],
        dot(planePoint, mtx, 2) + mtx[14]
    ];

    // Multiply mtx (column-major, 4x4) with plane.rot (row-major, 3x3).
    const transformedRotation = plane.rot.map(row =>
        row.map((_, columnIndex) =>
            row.reduce((sum, value, rowIndex) =>
                sum + value * mtx[rowIndex * 4 + columnIndex], 0)
        )
    ) as Matrix3x3;

    const transformedNormalX = dot(normalVector, mtx);
    const transformedNormalY = dot(normalVector, mtx, 1);
    const transformedNormalZ = dot(normalVector, mtx, 2);

    const transformedDistance = -(transformedNormalX * transformedPlanePoint[0] +
        transformedNormalY * transformedPlanePoint[1] + transformedNormalZ * transformedPlanePoint[2]);

    return {
        ...plane,
        d: transformedDistance,
        rot: transformedRotation
    };
}

function multiplyMat4Point3(mtx: number[], p3: Point3D): Point3D {
    return [
        p3[0] * mtx[0] + p3[1] * mtx[4] + p3[2] * mtx[8] + mtx[12],
        p3[0] * mtx[1] + p3[1] * mtx[5] + p3[2] * mtx[9] + mtx[13],
        p3[0] * mtx[2] + p3[1] * mtx[6] + p3[2] * mtx[10] + mtx[14]
    ];
}

function cameraIntrinsicsToArray(intrinsics: CameraIntrinsics | undefined): number[] {
    return [
        intrinsics?.focalLengthX || 0,
        intrinsics?.focalLengthY || 0,
        intrinsics?.principalPointX || 0,
        intrinsics?.principalPointY || 0
    ];
}

// A multiview-aware WallspiceWebgl adapter that overrides functions that
// assume current view matrix is identity.
export default class WallspiceMultiViewAdapter extends WallspiceWebgl {
    // Overrides screenToPlaneWorld to transform input to current view space,
    // and result to world space.
    static screenToPlaneWorld(screenPos: Point2D, plane: PlaneType, intrinsics: number[]): Point3D {
        const camera = gvPositioningConext()?.getCamera();
        const threeCamera = camera?.getThreeCamera();
        if (threeCamera) {
            const currentIntrinsics = cameraIntrinsicsToArray(camera?.getIntrinsics());
            const planeInViewSpace = transformPlane(plane, threeCamera.matrixWorldInverse.elements);
            const resultInViewSpace = super.screenToPlaneWorld(screenPos, planeInViewSpace, currentIntrinsics);

            return multiplyMat4Point3(threeCamera.matrixWorld.elements, resultInViewSpace as Point3D);
        }

        return super.screenToPlaneWorld(screenPos, plane, intrinsics) as Point3D;
    }

    // Overrides proj to transform input position (p3) to current view space first and
    // returns screen space position.
    static proj(p3: Point3D, fx: number, fy: number, cx: number, cy: number): Point2D {
        const camera = gvPositioningConext()?.getCamera();
        const threeCamera = camera?.getThreeCamera();
        if (threeCamera) {
            const intrinsics = cameraIntrinsicsToArray(camera?.getIntrinsics());
            const p3View = multiplyMat4Point3(threeCamera.matrixWorldInverse.elements, p3);
            return super.proj(p3View, ...intrinsics) as Point2D;
        }
        return super.proj(p3, fx, fy, cx, cy) as Point2D;
    }

    // Transforms the given point p in view space to screen space
    static viewToScreen(p: Point3D, fx: number, fy: number, cx: number, cy: number): Point2D {
        const camera = gvPositioningConext()?.getCamera();
        const threeCamera = camera?.getThreeCamera();
        if (threeCamera) {
            const intrinsics = cameraIntrinsicsToArray(camera?.getIntrinsics());
            return super.proj(p, ...intrinsics) as Point2D;
        }
        return super.proj(p, fx, fy, cx, cy) as Point2D;
    }

    // Transforms the given Points3D to the current view space
    static worldToView(p: Point3D) {
        let result: Point3D = p;
        const camera = gvPositioningConext()?.getCamera();
        const threeCamera = camera?.getThreeCamera();
        if (threeCamera) {
            result = multiplyMat4Point3(threeCamera.matrixWorldInverse.elements, p);
        }
        return result;
    }

    // Clips the given polygon against a plane just in front of the focal spot.
    // The polygon is assumed to be in view space.
    static preProjectionClip(polygon: Point3D[]): Point3D[] {
        const nearPlaneZ = -0.00000001; // Very small value to avoid division by zero while projecting
        const clippedPolygon: Point3D[] = [];

        for (let i = 0; i < polygon.length; i += 1) {
            const v0 = polygon[i];
            const v1 = polygon[(i + 1) % polygon.length];

            // Check if vertices are beyond the near plane
            const v0BeyondNear = nearPlaneZ >= v0[2]
            const v1BeyondNear = nearPlaneZ >= v1[2]

            if (v0BeyondNear) {
                // If v0 is beyond the near plane, add it to the clipped polygon
                clippedPolygon.push(v0);
            }

            if (v0BeyondNear !== v1BeyondNear) {
                // Edge crosses the near plane, calculate the intersection
                // Insert a point at the intersection with the near plane
                const t = (nearPlaneZ - v0[2]) / (v1[2] - v0[2]);
                const intersection: Point3D = [
                    v0[0] + t * (v1[0] - v0[0]),
                    v0[1] + t * (v1[1] - v0[1]),
                    nearPlaneZ
                ];
                clippedPolygon.push(intersection);
            }
        }
        return clippedPolygon;
    }
}
