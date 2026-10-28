import { Matrix3x3, Point3D } from "Renderer/geomviewer/geom_types"

// Pose is used to represent a point (pos) and an orientation in 3-space (rot).
// Very often, a Pose is used to represent a point on a plane, where rot is taken
// as the orthonormal basis of the plane.
export type Pose = {
    rot: Matrix3x3; // A rotation as an orthonormal base
    pos: Point3D;
    scale: number;
    planeIndex?: number;
}
