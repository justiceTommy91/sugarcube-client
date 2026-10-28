import * as THREE from 'three'

import type { Room, CameraView } from 'Planner/room'
import { computeLocalBoundingBox } from 'Planner/room_geometry'
import { CAMERA_VIEW_SIDE_1, CAMERA_VIEW_SIDE_2, CAMERA_VIEW_SIDE_3, CAMERA_VIEW_SIDE_4,
  CAMERA_VIEW_DOLLHOUSE_1, CAMERA_VIEW_DOLLHOUSE_2, CAMERA_VIEW_TOPDOWN } from 'Planner/api_constants'
import { CameraViewName } from './api_types'

// Values from labtech-roomplan/blob/main/app/view_sampling.py:
export const topDownIntrinsics = {
  fx: 5000,
  fy: 5000,
  px: 1410,
  py: 940,
}

export const sideViewIntrinsics = {
  fx: 2500,
  fy: 2500,
  px: 1410,
  py: 940,
}

const SIDE_VIEWS = [CAMERA_VIEW_SIDE_1, CAMERA_VIEW_SIDE_2, CAMERA_VIEW_SIDE_3, CAMERA_VIEW_SIDE_4]
export const cameraIntrinsicsForViewName = (viewName: CameraViewName) => {
  if (SIDE_VIEWS.includes(viewName)) {
    return sideViewIntrinsics
  }
  return topDownIntrinsics
}

const projectsOutOfScreen = (cameraView: CameraView, mesh: THREE.Mesh): boolean => {
  const tempCamera = new THREE.PerspectiveCamera()
  tempCamera.position.copy(cameraView.position)
  tempCamera.quaternion.copy(cameraView.quaternion)
  tempCamera.up.copy(cameraView.up)
  tempCamera.fov = cameraView.fov
  tempCamera.updateProjectionMatrix()
  tempCamera.updateMatrixWorld()

  const posAttribute = mesh.geometry?.getAttribute('position')
  if (!posAttribute) {
    return true
  }
  const positionVect = new THREE.Vector3()
  for (let i = 0; i < posAttribute.count; i += 1) {
    positionVect.fromBufferAttribute(posAttribute, i)
      .applyMatrix4(mesh.matrixWorld)
      .project(tempCamera)
    const outOfScreen = positionVect.x > 1 || positionVect.x < -1 || positionVect.y > 1 || positionVect.y < -1
    if (outOfScreen) {
      return true
    }
  }
  return false
}

const generateSideViews = (room: Room): CameraView[] => {
  const floor = room.getRoomMesh()?.getFloorMesh()
  if (!floor) {
    return []
  }
  const localBbox = computeLocalBoundingBox(floor)
  const localCenter =  localBbox.getCenter(new THREE.Vector3())
  const worldCenter =  floor.localToWorld(localCenter.clone())

  // Values from labtech-roomplan/blob/main/app/view_sampling.py:
  const sideViewHeight = 1.45
  const minDistFromOppositeSide = 5.0

  const sideViewLookAtPosition = new THREE.Vector3().addVectors(worldCenter,
    new THREE.Vector3(0.0, sideViewHeight, 0.0))
  const up = new THREE.Vector3(0.0, 1.0, 0.0)

  // Each side view positioned on the corresponding edge of bounding box. In case if opposite side of the box is
  // closer than minDistFromOppositeSide, position is offset to be equal minDistFromOppositeSide.
  const min = localBbox.min.clone()
  const max = localBbox.max.clone()

  min.x = Math.min(min.x, localCenter.x - minDistFromOppositeSide)
  min.y = Math.min(min.y, localCenter.y - minDistFromOppositeSide)
  max.x = Math.max(max.x, localCenter.x + minDistFromOppositeSide)
  max.y = Math.max(max.y, localCenter.y + minDistFromOppositeSide)

  const localPositions = [
    new THREE.Vector3(min.x, localCenter.y, sideViewHeight),
    new THREE.Vector3(localCenter.x, min.y, sideViewHeight),
    new THREE.Vector3(max.x, localCenter.y, sideViewHeight),
    new THREE.Vector3(localCenter.x, max.y, sideViewHeight),
  ]

  const ret: CameraView[] = []
  const names: CameraViewName[] = [CAMERA_VIEW_SIDE_1, CAMERA_VIEW_SIDE_2, CAMERA_VIEW_SIDE_3, CAMERA_VIEW_SIDE_4]
  names.forEach((name, idx) => {
    const worldPosition = floor.localToWorld(localPositions[idx].clone())
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(worldPosition, sideViewLookAtPosition, up))
    ret.push({
      name,
      position: worldPosition,
      quaternion,
      up,
      fov: THREE.MathUtils.radToDeg(2 * Math.atan(sideViewIntrinsics.py / sideViewIntrinsics.fy)), // 40.0,
    })
  })
  return ret
}

const generateTopDownView = (room: Room): CameraView[] => {
  const ceiling = room.getRoomMesh()?.getCeilingMesh()
  if (!ceiling) {
    return []
  }
  const localBbox = computeLocalBoundingBox(ceiling)
  const localCenter =  localBbox.getCenter(new THREE.Vector3())
  const worldCenter =  ceiling.localToWorld(localCenter.clone())
  const boxSize = localBbox.getSize(new THREE.Vector3())

  // Values from labtech-roomplan/blob/main/app/view_sampling.py:
  const topDownFov = THREE.MathUtils.radToDeg(2 * Math.atan(topDownIntrinsics.py / topDownIntrinsics.fy))

  const paddingPercent = 0.1
  const halfMaxSize = 0.5 * Math.max(boxSize.x, boxSize.y)
  const cameraHeight = halfMaxSize * (1.0 + paddingPercent) / Math.tan(0.5 * THREE.MathUtils.degToRad(topDownFov))

  const topDownPosition = worldCenter.clone().add(new THREE.Vector3(0.0, cameraHeight, 0.0))
  const floorLocalX = new THREE.Vector3()
  const floorLocalY = new THREE.Vector3()
  const floorLocalZ = new THREE.Vector3()
  ceiling.matrix.extractBasis(floorLocalX, floorLocalY, floorLocalZ)
  const up = boxSize.x > boxSize.y ? floorLocalY : floorLocalX
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(topDownPosition, worldCenter, up))

  return [{
    name: CAMERA_VIEW_TOPDOWN,
    position: topDownPosition,
    quaternion,
    up,
    fov: topDownFov,
  }]
}

const generateDollHouseViews = (room: Room): CameraView[] => {
  const floor = room.getRoomMesh()?.getFloorMesh()
  const ceiling = room.getRoomMesh()?.getCeilingMesh()
  if (!floor || !ceiling) {
    return []
  }
  const localBbox = computeLocalBoundingBox(floor)
  const localCenter =  localBbox.getCenter(new THREE.Vector3())
  const worldCenter =  floor.localToWorld(localCenter.clone())

  // Values from labtech-roomplan/blob/main/app/view_sampling.py:
  const lookAtHeight = 1.5
  const maxDist = 40.0
  const elevationAngleRads = 0.67
  const distanceStep = 0.2
  const topDownFov = THREE.MathUtils.radToDeg(2 * Math.atan(topDownIntrinsics.py / topDownIntrinsics.fy))

  const lookAtCenter = worldCenter.clone().add(new THREE.Vector3(0.0, lookAtHeight, 0.0))

  const up = new THREE.Vector3(0.0, 1.0, 0.0)
  const cameraViewForDistance = (distance: number, signX = 1, signY = 1,
    viewName: CameraViewName = CAMERA_VIEW_DOLLHOUSE_1): CameraView => {
    const worldPosition = lookAtCenter.clone()
      .add(new THREE.Vector3(signX * Math.cos(elevationAngleRads), Math.sin(elevationAngleRads),
        signY * Math.cos(elevationAngleRads)).multiplyScalar(distance))
    const rotation = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(worldPosition, lookAtCenter, up))
    return {
      name: viewName,
      position: worldPosition,
      quaternion: rotation,
      up,
      fov: topDownFov,
    }
  }

  let bestDistance = maxDist
  for (let currDist = maxDist; currDist >= lookAtHeight; currDist -= distanceStep) {
    const view1 = cameraViewForDistance(currDist, 1, 1)
    if (projectsOutOfScreen(view1, floor) || projectsOutOfScreen(view1, ceiling)) {
      break
    }
    const view2 = cameraViewForDistance(currDist, -1, -1)
    if (projectsOutOfScreen(view2, floor) || projectsOutOfScreen(view2, ceiling)) {
      break
    }
    bestDistance = currDist
  }
  return [
    cameraViewForDistance(bestDistance, 1, 1, CAMERA_VIEW_DOLLHOUSE_1),
    cameraViewForDistance(bestDistance, -1, -1, CAMERA_VIEW_DOLLHOUSE_2),
  ]
}

export const generateCameraViews = (room: Room): CameraView[] => {
  const floor = room.getRoomMesh()?.getFloorMesh()
  const ceiling = room.getRoomMesh()?.getCeilingMesh()
  if (!floor || !ceiling) {
    return []
  }

  return [
    ...generateSideViews(room),
    ...generateTopDownView(room),
    ...generateDollHouseViews(room),
  ]
}