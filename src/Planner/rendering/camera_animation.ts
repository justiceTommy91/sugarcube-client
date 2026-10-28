import * as THREE from 'three'
import type { Camera } from 'Planner/rendering/camera'
import { CameraView } from 'Planner/room'
import { ORBIT_CAMERA_ANIMATION_DURATION } from 'Planner/planner_constants'

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export type AnimationDoneCallback = () => void

export class CameraAnimation {
  private camera: Camera
  private animationMixer: THREE.AnimationMixer
  private clipAction: THREE.AnimationAction | null = null
  private elapsed = 0
  private readonly duration = ORBIT_CAMERA_ANIMATION_DURATION
  private lastAnimateTime = -1
  private animationFrameHandle: number | null = null
  private clipWasRunning = false
  private animmationEndCallback: AnimationDoneCallback | null = null

  constructor(camera: Camera) {
    this.camera = camera
    this.animationMixer = new THREE.AnimationMixer(this.camera.getRenderCamera())
    this.animate = this.animate.bind(this)
    this.animate(0.0)
  }

  public shutDown() {
    if (this.animationFrameHandle) {
      cancelAnimationFrame(this.animationFrameHandle)
    }
    this.animationMixer.stopAllAction()
    if (this.clipAction) {
      this.animationMixer.uncacheAction(this.clipAction.getClip())
    }
    this.animationMixer.uncacheRoot(this.camera.getRenderCamera())
  }

  public animateTo(view: CameraView, lookAtFrom: THREE.Vector3 | undefined, lookAtTo: THREE.Vector3 | undefined,
    animmationEndCallback?: AnimationDoneCallback) {
    const prevAction = this.clipAction

    const tracks = this.createTracks(view, lookAtFrom, lookAtTo)
    const clip = new THREE.AnimationClip(`PathCameraController`, -1, tracks)
    this.clipAction = this.animationMixer.clipAction(clip)
    this.clipAction.clampWhenFinished = true
    this.clipAction.setLoop(THREE.LoopOnce, -1).play()
    if (animmationEndCallback) {
      this.animmationEndCallback = animmationEndCallback
    }
    this.elapsed = 0

    if (prevAction) {
      prevAction.stop()
    }
  }

  public isRunning() {
    return this.clipAction?.isRunning() || false
  }

  private createTracks(toView: CameraView, lookAtFrom: THREE.Vector3 | undefined, lookAtTo: THREE.Vector3 | undefined) {
    const threeCamera = this.camera.getRenderCamera()

    const fromPos = [threeCamera.position.x, threeCamera.position.y, threeCamera.position.z]
    const toPos = [toView.position.x, toView.position.y, toView.position.z]
    const positionTrack = new THREE.VectorKeyframeTrack(`.position`, [0, this.duration],
      [...fromPos, ...toPos], THREE.InterpolateSmooth)

    const cameraWorldUpX = threeCamera.matrixWorld.elements[4]
    const cameraWorldUpY = threeCamera.matrixWorld.elements[5]
    const cameraWorldUpZ = threeCamera.matrixWorld.elements[6]
    const fromUp = [cameraWorldUpX, cameraWorldUpY, cameraWorldUpZ]
    const toUp = [toView.up.x, toView.up.y, toView.up.z]
    const upTrack = new THREE.VectorKeyframeTrack(`.up`, [0, this.duration],
      [...fromUp, ...toUp], THREE.InterpolateSmooth)

    const tracks = [positionTrack, upTrack]
    if (lookAtFrom && lookAtTo) {
      const lookAtFromArr = [lookAtFrom.x, lookAtFrom.y, lookAtFrom.z]
      const lookAtToArr = [lookAtTo.x, lookAtTo.y, lookAtTo.z]
      const lookAtTrack = new THREE.VectorKeyframeTrack(`.lookAtTarget`, [0, this.duration],
        [...lookAtFromArr, ...lookAtToArr], THREE.InterpolateSmooth)
      tracks.push(lookAtTrack)
    } else {
      const fromQuaternion = [threeCamera.quaternion.x, threeCamera.quaternion.y, threeCamera.quaternion.z,
        threeCamera.quaternion.w]
      const toQuaternion = [toView.quaternion.x, toView.quaternion.y, toView.quaternion.z, toView.quaternion.w]
      const quaternionTrack = new THREE.VectorKeyframeTrack(`.quaternion`, [0, this.duration],
        [...fromQuaternion, ...toQuaternion], THREE.InterpolateSmooth)
      tracks.push(quaternionTrack)
    }
    const fovTrack = new THREE.NumberKeyframeTrack(`.fov`, [0, this.duration],
      [threeCamera.fov, toView.fov], THREE.InterpolateSmooth)
    tracks.push(fovTrack)

    return tracks
  }

  private animate(timeMs: number) {
    this.animationFrameHandle = requestAnimationFrame(this.animate)

    if (this.lastAnimateTime < 0) {
      this.lastAnimateTime = timeMs
    }
    const dtSeconds = (timeMs - this.lastAnimateTime) * 0.001
    this.lastAnimateTime = timeMs

    if (!this.clipAction?.isRunning()) {
      if (this.clipWasRunning) {
        if (this.animmationEndCallback) {
          this.animmationEndCallback()
        }
        this.clipWasRunning = false
      }
      return
    }

    this.clipWasRunning = true
    const easeFunc = easeOutCubic
    const t1 = easeFunc(this.elapsed / this.duration) * this.duration
    this.elapsed += dtSeconds
    const t2 = easeFunc(this.elapsed / this.duration) * this.duration
    const dtWithEasing = Math.max(t2 - t1, 0.001)

    this.animationMixer.update(dtWithEasing)
    this.camera.syncPathAnimationFrame()
  }
}