
export function findAllCameras(group: THREE.Group, ret: unknown[]) {
  group.traverse((object) => {
    const cameraIndex = object.userData?.geomagicalCamera
    if(cameraIndex !== undefined) {
      ret[cameraIndex] = object
    }
  })
}
