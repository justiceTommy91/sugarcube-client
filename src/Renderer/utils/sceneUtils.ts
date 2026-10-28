import { PlaneType } from 'Renderer/geomviewer/geom_types'

// Expects the list of plane orientations.
// Returns the the furthest floor plane from the origin (lowest floor).
export function getFloorPlane(planes: Array<PlaneType>): PlaneType {
    // Returns the ground floor plane
    const allFloors = planes.filter(p => p.class === "floor")
    return allFloors.sort((p1, p2) => p2.d - p1.d)[0]
}