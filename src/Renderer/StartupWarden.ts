/* eslint-disable no-bitwise */

/**
 * Constants that represent various startup stages. Can be combined with a bitwise OR
 * and used to register callbacks which will be called when multiple stages are reached.
 */
export const PLANE_DATA_READY = 1
export const RENDER_DIMENSIONS_READY = 2
export const MASK_DATA_READY = 4
export const WALL_SNAP_READY = 8
export const ENVIRONMENT_MAP_READY = 16
export const BACKGROUND_SCENE_READY = 32
export const OCCLUSION_SCENE_READY = 64
export const FLOOR_PLACER_READY = 128
export const SCENE_BUILD_COMPLETE = 256
export const WASM_LOAD_COMPLETE = 512

/**
 * Startup stage descriptor used by external classes to mark a startup stage as completed.
*/
export type StartupStage =
  typeof PLANE_DATA_READY |
  typeof RENDER_DIMENSIONS_READY |
  typeof MASK_DATA_READY |
  typeof WALL_SNAP_READY |
  typeof ENVIRONMENT_MAP_READY |
  typeof BACKGROUND_SCENE_READY |
  typeof OCCLUSION_SCENE_READY |
  typeof FLOOR_PLACER_READY |
  typeof SCENE_BUILD_COMPLETE |
  typeof WASM_LOAD_COMPLETE

export type MilestoneCallback = (stages: number) => void

/**
 * StartupWarden class listens for important startup stages completion, and keeps track
 * of already completed stages. Clients can register a callback to be informed
 * about combinations of stages being completed.
*/
export class StartupWarden {
  /**
   * All registered callbacks grouped by the stages they're listening to.
   */
  private callbacks: Map<number, MilestoneCallback[]> = new Map()

  /**
   * A bitwise mask of all startup stages completed by the moment.
   */
  private completedStages = 0

  /**
   * This is a temporary workaround to allow accessing StartupWarden instance without causing
   * circular dependencies when accessing it via geom_app.
   */
  private static currentInstance: StartupWarden

  constructor() {
    StartupWarden.currentInstance = this
  }

  static getCurrentInstance() {
    return StartupWarden.currentInstance
  }

  /**
   * Clear all the callbacks and completedStages.
   */
  reset() {
    this.callbacks = new Map()
    this.completedStages = 0
  }

  /**
   * Called by a class which completes a certain startup stage to mark it as done.
   * May result in one or more callback calls, depending on StartupWarden's internal logic.
  */
  markStartupStage(stage: StartupStage) {
    if (this.isStageCompleted(stage)) {
      return
    }
    this.callbacks.forEach((candidateCallbacks, listeningStages) => {
      if (this.shouldCallBack(listeningStages, stage)) {
        candidateCallbacks.forEach(cb => cb(listeningStages))
      }
    })
    this.completedStages |= stage
  }

  /**
   * Register a callback to be called when the specified startup stages is completed.
   * The callback can be called right away if all stages are already completed, and in general,
   * will be called at most once.
   * It will be called with the same stages bit mask it was registered with.
   * @param stages {number} .a bitwise combination of one or more {StartupStage} constants.
  */
  registerCallback(stages: number, callback: MilestoneCallback) {
    let callbacks = this.callbacks.get(stages)
    if (!callbacks) {
      callbacks = []
      this.callbacks.set(stages, callbacks)
    }
    callbacks.push(callback)

    const stagesAlreadyCompleted = stages === (this.completedStages & stages)
    if (stagesAlreadyCompleted) {
      callback(stages)
    }
  }

  /**
   * Unregister a callback previously registered with {registerCallback}
  */
  unregisterCallback(stages: number, callback: MilestoneCallback) {
    const callbacks = this.callbacks.get(stages)
    if (!callbacks) {
      return
    }
    const idx = callbacks.indexOf(callback)
    if (idx !== -1) {
      callbacks.splice(idx, 1)
      if (callbacks.length === 0) {
        this.callbacks.delete(stages)
      }
    }
  }

  private isStageCompleted(stage: StartupStage) {
    return !!(this.completedStages & stage)
  }

  private shouldCallBack(listeningStages: number, newCompletedStage: StartupStage) {
    const alreadyCalled = listeningStages === (this.completedStages & listeningStages)
    const shouldBeCalled = listeningStages === (listeningStages & (this.completedStages | newCompletedStage))
    return shouldBeCalled && !alreadyCalled
  }
}
