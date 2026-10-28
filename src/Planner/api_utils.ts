import * as THREE from 'three'

import type { PlannerViewer } from 'Planner/planner_viewer'

export const projectLine = (line: { p1: THREE.Vector3, p2: THREE.Vector3 }, viewer: PlannerViewer) => {
    const p1 = viewer.projectWorldPosition(line.p1)
    const p2 = viewer.projectWorldPosition(line.p2)
    return {
      p1: { x: p1?.x ?? 0.0, y: p1?.y ?? 0.0 },
      p2: { x: p2?.x ?? 0.0, y: p2?.y ?? 0.0 },
    }
}