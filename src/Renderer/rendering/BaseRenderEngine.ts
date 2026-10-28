import * as THREE from 'three'
import * as Sentry from '@sentry/react'

import { EffectComposer, Pass } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js'

import CustomRenderPass from 'Renderer/CustomRenderPass'
import CustomOutlinePass from 'Renderer/CustomOutlinePass'
import CustomTAARenderPass from 'Renderer/CustomTAARenderPass'

import WallspiceWebgl from 'Renderer/WallspiceWebgl'
import TextureHelper from 'Renderer/TextureHelper'
import GlMemoryRecorder from 'Renderer/GlMemoryRecorder'
import TimeMetric from 'utils/timeMetric'
import Stats from 'stats.js'

import { RenderEngine } from 'Renderer/rendering/RenderEngine'
import {
  ThumbnailGenerationResult,
  AntialiasingType,
  InitializationFailureCallback,
  OnFirstRenderCallback,
  RenderCallback,
  DelayedRenderCallback,
  isMeshStandardMaterial,
  isShaderMaterial,
} from 'Renderer/rendering/rendering_types'
import { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'
import { GpuMemoryStats } from 'Renderer/geomviewer/geom_stats'
import { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import { GlContextInfo, ViewerSettings, LowPerformanceEventInfo } from 'Renderer/geomviewer/geom_types'
import {
  NOTIFY_VIEWER_STATE_UPDATE,
  NOTIFY_LOW_PERFORMANCE,
  AutoExposureMeasurementMethod
} from 'Renderer/geomviewer/geom_constants'

import {
  SENTRY_BREADCRUMB_CATEGORY,
  AA_TAA,
  AA_FXAA,
  GL_ERR_CODES,
  EDGE_VISIBLE_COLOR,
  EDGE_SELECTED_COLOR,
  EDGE_HIDDEN_COLOR,
  BAKED_RUG_SHADOWS_LAYER,
  LOW_PERFORMANCE_FRAME_TIME_UPPER_THRESHOLD,
  LOW_PERFORMANCE_FRAME_TIME_LOWER_THRESHOLD
} from 'Renderer/constants'
import getMaxWindowSize from 'utils/getMaxWindowSize'
import isMobile from 'utils/isMobile'
import { getE2ETestingEnv, isProd } from 'utils/environment'

import { GrandCentral } from 'Renderer/GrandCentral'
import { ShadowBaker } from 'Renderer/ShadowBaker'
import { GeomCamera } from 'Renderer/multiview/geom_camera'

import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import { CustomGTAOPass } from 'Renderer/ao/CustomGTAOPass'
import LitShadowMaterial from 'Renderer/LitShadowMaterial'
import { gvViewManager } from 'Renderer/foundation/geom_app'
import { CameraView } from 'Renderer/multiview/camera_types'
import { OffscreenRenderer } from './OffscreenRenderer'
import { isFurnitureItem3D } from './scene_utils'
import { AutoExposure } from './AutoExposure'

function isCustomTAAPass(pass: Pass | null): pass is CustomTAARenderPass {
  return pass instanceof CustomTAARenderPass
}

// Helper function to dispatch a idle-daw-loop notification.
const dispatchIdleDrawLoopNotification = () => {
  GrandCentral.getDispatcher().dispatchNotification(
      {
          what: NOTIFY_VIEWER_STATE_UPDATE,
          payload: {
              stateInfo: `DrawIdle`
          }
      });
}

const dispatchLowPerformanceNotification = (info: LowPerformanceEventInfo) => {
  GrandCentral.getDispatcher().dispatchNotification(
      {
          what: NOTIFY_LOW_PERFORMANCE,
          payload: info
      });
}

export abstract class BaseRenderEngine<T extends GeomBaseScene> implements RenderEngine<T> {
  protected scene: T | null = null

  protected canvas: HTMLCanvasElement
  protected threeRenderer: THREE.WebGLRenderer | null = null
  protected offscreenRenderer: OffscreenRenderer | null = null
  protected glMemoryRecorder: GlMemoryRecorder
  protected width = 0
  protected height = 0

  protected stats: Stats | null = null

  // There's a lot of legacy code that expect a three-js camera to always be available.
  // To this end we have the standby camera. Once the actual camera is initialized, it
  // provides the three-js camera used everywhere else in the code.
  private camera = new GeomCamera()
  protected standbyCamera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera()

  private prevMedianFrameTime = 0.0

  protected isDirty = false
  private wasDirty = false
  protected hasRendered = false
  private animationFrameId: number | null = null
  protected settings: ViewerSettings
  protected debugSettings: DebugSettings
  private onInitializationFailure: InitializationFailureCallback
  // This callback will be called from render frame function until it returns true, signalling that the
  // client code was ready and did handle the first render event.
  private onFirstRenderCallback: OnFirstRenderCallback
  private frameMetric: TimeMetric | null = null

  protected composer: EffectComposer | null = null
  protected renderPass: CustomRenderPass | null = null
  
  protected hoveredOutlinePass: CustomOutlinePass | null = null
  protected selectedOutlinePass: CustomOutlinePass | null = null

  protected antiAliasPass: ShaderPass | CustomTAARenderPass | null = null
  protected aaType: AntialiasingType | null = null
  protected showOutlines = true
  protected taaCheckHasFailed = false
  protected aoPass: CustomGTAOPass | null = null

  // One time render callbacks are automatically removed after invoking.
  private oneTimeRenderCallbacks: RenderCallback[] = []
  // Scheduled render callbacks work like one time callbacks, but are invoked after specified number of frames.
  private scheduledRenderCallbacks: DelayedRenderCallback[] = []
  // OnRenderHooks are called on each rendered frame.
  private beforeRenderHooks: RenderCallback[] = []
  private afterRenderHooks: RenderCallback[] = []
  private onIdleRenderHooks: RenderCallback[] = []

  private sendNotificationOnDrawIdle = false

  protected contactShadowCamera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, -50, 50)
  protected floorContactShadowItemsBoundingBox: THREE.Box3 = new THREE.Box3()
  protected contactShadowTexRenderTarget = new THREE.WebGLRenderTarget(1024, 1024)
  protected floorContactShadowTempBbox: THREE.Box3 = new THREE.Box3()

  protected normalsVizApplied = false
  protected environmentRotationApplied = false
  protected backgroundEnvRotationApplied = false
  protected environmentIntensityApplied = false
  protected aoMapIntensityApplied = false
  protected toneMappingApplied = false
  protected useFilmicLUTApplied = false
  protected enableContactShadowsApplied = false
  protected disableParallaxMappingApplied = false
  protected showFPSCounterApplied = false
  protected autoExposureStabilized = true

  private autoExposure = new AutoExposure()
  private exposureCanvas = document.createElement('canvas')
  private autoExposureStabilizationFrames = 0
  private autoExposureStabilizedValue = 1.0

  constructor(
    canvas: HTMLCanvasElement,
    settings: ViewerSettings,
    debugSettings: DebugSettings,
    onInitializationFailure: InitializationFailureCallback,
    onFirstRenderCallback: OnFirstRenderCallback,
    ) {
    this.canvas = canvas
    this.settings = settings
    this.debugSettings = debugSettings
    this.onInitializationFailure = onInitializationFailure
    this.onFirstRenderCallback = onFirstRenderCallback
    this.animate = this.animate.bind(this)
    this.threeRenderer = WallspiceWebgl.createRenderer(canvas, this.settings.mobileFeatures,
      this.settings.onOffOptions.usePBR)
    if (!this.threeRenderer) {
      this.onInitializationFailure({
        description: `Failed to initialize WebGl context.`,
        notEnoughWGlResources: true
      })
    } else { 
      this.offscreenRenderer = new OffscreenRenderer(this.threeRenderer, 200, 150)
    }

    this.handleCompilationErrors()
    this.glMemoryRecorder = new GlMemoryRecorder(this.threeRenderer?.getContext())
    this.glMemoryRecorder.start()
    this.initContactShadows()
    this.initFPSCounter()
  }

  isValid() {
    return !!this.threeRenderer
  }

  getThreeRenderer() {
    return this.threeRenderer
  }

  getCamera() {
    // If the camera is initialized and ready to provide a three-js camera, return that.
    // Otherwise return the standby camera.
    let cam: THREE.PerspectiveCamera | undefined = this.camera.getThreeCamera()
    if (!cam) {
      cam = this.standbyCamera
    }
    return cam
  }

  getStandbyCamera() {
    return this.standbyCamera
  }

  getHasRendered() {
    return this.hasRendered
  }

  getContactShadowTexRenderTarget() {
    return this.contactShadowTexRenderTarget
  }

  getContactShadowCamera() {
    return this.contactShadowCamera
  }

  initSize(width: number, height: number) {
    this.width = width
    this.height = height

    this.initCanvasSize()
    this.initPostprocessing()

    this.setDirty()
    this.startRenderLoop()
  }

  getScreenSize() {
    if (!this.threeRenderer) {
      return new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight)
    }
    const screenSize = this.threeRenderer.getSize(new THREE.Vector2())
    screenSize.multiplyScalar(this.threeRenderer.getPixelRatio())
    return screenSize
  }

  // Assign a new geom camera to the render engine. The new camera will be used
  // for all subsequent drawing passes.
  setGeomCamera(cam: GeomCamera) {
    this.camera = cam;

    const threeCam = cam?.getThreeCamera();
    if (threeCam) {
      if (this.hoveredOutlinePass) {
        this.hoveredOutlinePass.setCamera(threeCam);
      }
      if (this.selectedOutlinePass) {
        this.selectedOutlinePass.setCamera(threeCam);
      }

      if (this.antiAliasPass && this.antiAliasPass instanceof CustomTAARenderPass) {
        this.antiAliasPass.setCamera(threeCam);
      }
      if (this.aoPass) {
        this.aoPass.camera = threeCam;
      }
    }

    this.setDirty()
  }

  onCanvasResize() {
    this.initCanvasSize()

    // Update composer size to match current renderer size.
    const rendererSize = new THREE.Vector2()
    this.threeRenderer?.getSize(rendererSize)

    // Effect composer will use pixelRatio internally to compute effective size.
    this.composer?.setSize(rendererSize.x, rendererSize.y)

    if (this.aaType === AA_FXAA && this.antiAliasPass instanceof ShaderPass) {
      this.antiAliasPass.uniforms.resolution.value.set(1 / this.canvas.width, 1 / this.canvas.height)
    }

    this.setDirty()
  }

  private initContactShadows() {
    this.contactShadowCamera.rotation.set(-Math.PI / 2, 0, 0)
    this.contactShadowCamera.position.set(0, 10, 0)
    this.contactShadowCamera.layers.set(BAKED_RUG_SHADOWS_LAYER)
    // Approximate contact shadow map until first render.
    WallspiceWebgl.fitContactShadowMap(this.contactShadowCamera, this.floorContactShadowItemsBoundingBox)

    this.contactShadowTexRenderTarget.texture.generateMipmaps = false
    this.contactShadowTexRenderTarget.texture.flipY = false
  }

  abstract takeRoomScreenshot(
    onSuccess: (result: ThumbnailGenerationResult) => void,
    onError: (error: Error) => void,
  ): void

  abstract setScene(scene: T): void

  abstract getScene(): T | null

  setFrameMetric(metric: TimeMetric) {
    this.frameMetric = metric
  }

  startRenderLoop() {
    if (this.animationFrameId !== null) {
      return
    }
    this.animationFrameId = requestAnimationFrame(this.animate)
  }

  stopRenderLoop() {
    if (this.animationFrameId === null) {
      return
    }
    cancelAnimationFrame(this.animationFrameId)
    this.animationFrameId = null
  }

  setDirty() {
    this.isDirty = true
    if(this.aaType === AA_TAA) {
      const taaPass = this.antiAliasPass as CustomTAARenderPass
      taaPass.accumulate = false
    }
  }

  updateMaterials() {
    this.forAllMaterials(m => {
      const curve = this.debugSettings.toneMapCurve
      m.setToneMapType(curve)
    })
  }

  protected onFrameRenderSuccess() {
    this.scene?.setIsDirty(false)
    this.isDirty = false
    if (this.aaType === AA_TAA) {
      const taaPass = this.antiAliasPass as CustomTAARenderPass
      taaPass.accumulate = true
    }
  }

  cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.composer?.renderTarget1.dispose()
    this.composer?.renderTarget2.dispose()

    this.composer?.dispose()

    this.hoveredOutlinePass?.dispose()
    this.selectedOutlinePass?.dispose()

    if (isCustomTAAPass(this.antiAliasPass)) {
      this.antiAliasPass.dispose()
    }
    if (this.renderPass) {
        this.renderPass.renderFunc = null
    }
    ShadowBaker.dispose()
    if (this.glMemoryRecorder) {
      this.glMemoryRecorder.stop()
    }

    if (this.offscreenRenderer) {
      this.offscreenRenderer.cleanup()
    }

    if (this.threeRenderer) {
      this.threeRenderer.dispose()
      this.threeRenderer = null
    }
  }

  enableOutline(enable: boolean) {
    const { disableOutline } = this.settings.onOffOptions
    const onoff = disableOutline ? false : enable

    this.showOutlines = onoff

    if (this.hoveredOutlinePass && this.selectedOutlinePass) {
        switch (this.aaType) {
            case AA_FXAA: {
                this.hoveredOutlinePass.enabled = onoff
                this.selectedOutlinePass.enabled = onoff
                break
            }
            case AA_TAA: {
                // With TAA, outlinePass is rendered "manullay" if showOutlines is true
                // and internal .enabled is always false
                this.hoveredOutlinePass.enabled = false
                this.selectedOutlinePass.enabled = false
                break
            }
            default:
                break
        }
    }

    this.setDirty()
  }

  isWeblGlContextLost() {
    if (!this.threeRenderer) {
      return false
    }
    const context = this.threeRenderer.getContext()
    return context && context.isContextLost()
  }

  abstract changeViewerSettings(settings: ViewerSettings): void

  getDebugSettings() { 
    return this.debugSettings
  }

  changeDebugSettings(settings: DebugSettings): void {
    const prevSettings = {
      ...this.debugSettings
    }

    if (settings) {
      Object.assign(this.debugSettings, settings)
    }

    this.setOutlineThickness()

    if (this.aoPass) {
      this.aoPass.enabled = !!this.debugSettings.enableGTAO && (!this.antiAliasPass || this.aaType !== AA_TAA)
      this.aoPass.updateGtaoMaterial({ radius: this.debugSettings.gtaoRadius })
      this.aoPass.blendIntensity = this.debugSettings.gtaoIntensity ?? 1.0
    }

    if (!this.normalsVizApplied || prevSettings.normalsViz !== this.debugSettings.normalsViz) {
      this.normalsVizApplied = this.setNormalsVisible(this.debugSettings.normalsViz)
    }
    if (!this.environmentRotationApplied ||
      prevSettings.environmentRotation !== this.debugSettings.environmentRotation) {
      this.environmentRotationApplied = this.setEnvironmentRotation(this.debugSettings.environmentRotation)
    }
    if (!this.backgroundEnvRotationApplied ||
      prevSettings.environmentVizBackground !== this.debugSettings.environmentVizBackground) {
      this.backgroundEnvRotationApplied = this.setBackgroundEnvRotation(this.debugSettings.environmentRotation)
    }
    if (!this.environmentIntensityApplied ||
      prevSettings.environmentIntensity !== this.debugSettings.environmentIntensity) {
      this.environmentIntensityApplied = this.setEnvironmentIntensity(this.debugSettings.environmentIntensity)
    }
    if (!this.aoMapIntensityApplied || prevSettings.aoMapIntensity !== this.debugSettings.aoMapIntensity) {
      this.aoMapIntensityApplied = this.setAoMapIntensity(this.debugSettings.aoMapIntensity)
    }
    if(!this.enableContactShadowsApplied ||
      prevSettings.useFloorContactShadows !== this.debugSettings.useFloorContactShadows) {
      this.enableContactShadowsApplied = this.updateFloorContactShadowsEnabled()
    }

    if (!this.useFilmicLUTApplied || prevSettings.useFilmicLUT !== this.debugSettings.useFilmicLUT) {
      this.useFilmicLUTApplied = this.switchLUTtoneMapping(this.debugSettings.useFilmicLUT)
    }
    if (!this.disableParallaxMappingApplied ||
      prevSettings.disableParallaxMapping !== this.debugSettings.disableParallaxMapping) {
      this.disableParallaxMappingApplied = this.switchParallaxMapping(this.debugSettings.disableParallaxMapping)
    }
    if (!this.showFPSCounterApplied ||
      prevSettings.showFPSCounter !== this.debugSettings.showFPSCounter) {
      this.showFPSCounterApplied = this.switchFPSCounterVisibility(this.debugSettings.showFPSCounter)
    }
    if (prevSettings.disableLightingEffects !== this.debugSettings.disableLightingEffects) {
      this.disableLightingEffects(this.debugSettings.disableLightingEffects)
    }

    if (!this.toneMappingApplied || prevSettings.toneMappingType !== settings.toneMappingType) {
      this.toneMappingApplied = this.setToneMappingParameters(
        this.debugSettings.toneMappingType as THREE.ToneMapping,
        2 ** this.debugSettings.toneMappingExposureCompensation
      )
    }

    if (prevSettings.toneMapCurve !== settings.toneMapCurve) {
      this.updateMaterials()
    }

    if (this.scene) {
      this.scene.setSceneSamplingVisualizerActive(!!this.debugSettings.enableSamplingVisualizer)
      this.scene.enableInspectorMode(!!this.debugSettings.enableObjectInspector)
      const usingPBR = !this.threeRenderer?.useLegacyLights
      this.scene.setLightsIntensities(
        this.debugSettings.directionalLightIntensities,
        this.debugSettings.pointLightIntensities,
        this.debugSettings.spotLightIntensities,
        this.debugSettings.areaLightIntensities,
        usingPBR,
      )
    }

    if (
      prevSettings.toneMappingExposureCompensation !== settings.toneMappingExposureCompensation ||
      prevSettings.autoExposure !== settings.autoExposure ||
      prevSettings.autoExposureTarget !== settings.autoExposureTarget ||
      prevSettings.autoExposureMeasurementMethod !== settings.autoExposureMeasurementMethod
    ) {
      this.triggerAutoExposure()
    }

    const useFXAA = this.debugSettings.forceFXAA ||
      this.debugSettings.environmentVizBackground ||
      getE2ETestingEnv()
    const targetAA = useFXAA ? AA_FXAA : AA_TAA
    if (this.aaType !== targetAA) {
      this.setAntiAliasing(targetAA)
    }

    if (this.hasRendered) {
      this.setDirty()
    }
  }

  triggerAutoExposure() {
    this.autoExposureStabilized = false;
    this.computeExposure(true)
  }

  queryGpuMemoryUsage(): GpuMemoryStats {
    const stats = {
      currentBufferMemory: 0,
      currentTextureMemory: 0,
    }
    if (this.glMemoryRecorder) {
        stats.currentTextureMemory = this.glMemoryRecorder.currentTextureMemory
        stats.currentBufferMemory = this.glMemoryRecorder.currentBufferMemory
    }
    return stats
  }

  public updateOutline() {
    if (!this.hoveredOutlinePass || !this.selectedOutlinePass) {
      return
    }
    const outlineArray = this.hoveredOutlinePass.selectedObjects
    outlineArray.forEach(obj => {
      this.addObjectToOutline(obj, false)
    })

    const selectedOutlineArray = this.selectedOutlinePass.selectedObjects
    selectedOutlineArray.forEach(obj => {
      this.addObjectToOutline(obj, true)
    })
  }

  public addObjectToOutline(object: THREE.Object3D, selected: boolean): void {
    if (!object || !this.hoveredOutlinePass || !this.scene || !this.selectedOutlinePass) {
      return
    }

    const isInSelectedOutline: boolean = this.selectedOutlinePass.selectedObjects.includes(object)
    const isInOutline: boolean = this.hoveredOutlinePass.selectedObjects.includes(object)

    if (isInSelectedOutline || isInOutline) {
      this.removeObjectFromOutline(object)
    }

    const renderItems = Array.from(this.scene.getRenderItems())
    const renderItem = renderItems.find(item => item.containsObject(object))
    const outlineArray = selected ? this.selectedOutlinePass.selectedObjects : this.hoveredOutlinePass.selectedObjects

    renderItem?.traverse(item => {
      const obj = item.getObject()
      if (obj && !item.isStackableSurfaceItem()) {
        const index = outlineArray.indexOf(obj)
        if (index === -1) {
          outlineArray.push(obj)
          this.setDirty()
        }
      }
      return true
    })
  }

  public removeObjectFromOutline(object: THREE.Object3D): void {
    if (!object || !this.hoveredOutlinePass || !this.scene || !this.selectedOutlinePass) {
      return
    }

    const isSelected: boolean = this.selectedOutlinePass.selectedObjects.includes(object)

    const renderItems = Array.from(this.scene.getRenderItems())
    const renderItem = renderItems.find(item => item.getObject() === object)
    const outlineArray = isSelected ? this.selectedOutlinePass.selectedObjects : this.hoveredOutlinePass.selectedObjects

    renderItem?.traverse(item => {
      const obj = item.getObject()
      if (obj && !item.isStackableSurfaceItem()) {
        const index = outlineArray.indexOf(obj)
        if (index > -1) {
            outlineArray.splice(index, 1)
            this.setDirty()
        }
      }
      return true
    })
  }

  public setOutlineThickness() {
    if (!this.hoveredOutlinePass || !this.selectedOutlinePass) {
        return
    }
    this.hoveredOutlinePass.edgeThickness = this.debugSettings.selectionOutlineThickness
    this.selectedOutlinePass.edgeThickness = this.debugSettings.selectionOutlineThickness

    this.setDirty()
  }

  public prepareRugsContactShadowsFrameRender() {
    if (!this.scene) {
      return
    }

    this.floorContactShadowTempBbox.makeEmpty()
    this.floorContactShadowItemsBoundingBox.makeEmpty()

    const renderItems = Array.from(this.scene.getRenderItems())
    renderItems.forEach(item => {
      if (isFurnitureItem3D(item)) {
        const contactShadowPlanes = item.getContactShadowPlanes()
        if (contactShadowPlanes) {
          const downwardRugPlane = contactShadowPlanes.downwardRug
          if (!downwardRugPlane) {
            return
          }
          const isStackedOnSurface = !!item.getParent()
          const renderObject = item.getObject()
          if (isStackedOnSurface) {
            downwardRugPlane.toggleVisibilityOff()
          } else if (renderObject) {
            this.floorContactShadowTempBbox.makeEmpty()
            this.floorContactShadowTempBbox
              .expandByObject(renderObject)
              .expandByScalar(downwardRugPlane.getPadding())
            this.floorContactShadowItemsBoundingBox.union(this.floorContactShadowTempBbox)
          }
        }
      }
    })

    WallspiceWebgl.fitContactShadowMap(
      this.contactShadowCamera, this.floorContactShadowItemsBoundingBox
    )

    // update the rug contact shadow catcher shaders' uniforms with the new fitted shadow matrix
    const shadowMatrix = this.contactShadowCamera.projectionMatrix.clone().multiply(
      this.contactShadowCamera.matrixWorldInverse)
    renderItems.forEach(item => {
      if (isFurnitureItem3D(item) && item.getIsRug() && item.getObject()) {
        const catcher = item.getShadowCatcher()
        if (catcher && !Array.isArray(catcher.material) && isShaderMaterial(catcher.material)) {
            /* eslint-disable-next-line no-param-reassign */
            catcher.material.uniforms.uShadowMatrix.value = shadowMatrix
        }
      }
    })

  }

  public revertContactShadowsCustomPreparations() {
    if (!this.scene) {
      return
    }

    const renderItems = Array.from(this.scene.getRenderItems())
    renderItems.forEach(item => {
      if (isFurnitureItem3D(item)) {
        const contactShadowPlanes = item.getContactShadowPlanes()
        if (contactShadowPlanes) {
          const downwardRugPlane = contactShadowPlanes.downwardRug
          if (!downwardRugPlane) {
            return
          }
          if (item.getParent()) {
            downwardRugPlane.toggleVisibilityOn()
          }
        }
      }
    })
  }

  // Detect a switch from high to low performance and dispatch an event
  private trackLowPerformance() {
    if (!this.frameMetric){
      return
    }

    const frameTimeStamps = this.frameMetric.frameTimeStamps

    if (this.prevMedianFrameTime === 0.0 &&
        this.frameMetric.medianFrameTime > LOW_PERFORMANCE_FRAME_TIME_UPPER_THRESHOLD) {
      dispatchLowPerformanceNotification({
        frameTimes: this.frameMetric.frameTimesSlidingWindow,
        medianFrameTime: this.frameMetric.medianFrameTime,
        firstFrameTimeStamp: frameTimeStamps[0],
        lastFrameTimeStamp: frameTimeStamps[frameTimeStamps.length - 1]
      })
      this.prevMedianFrameTime = this.frameMetric.medianFrameTime
    }

    if (this.prevMedianFrameTime > 0.0 &&
        this.frameMetric.medianFrameTime < LOW_PERFORMANCE_FRAME_TIME_LOWER_THRESHOLD) {
      this.prevMedianFrameTime = 0.0
    }
  }

  protected animate() {
    if (this.debugSettings.showFPSCounter) {
      this.stats?.begin()
    }
    this.animationFrameId = requestAnimationFrame(this.animate)
    let taaIsAccummulating = false
    if(this.aaType === AA_TAA) {
      const taaPass = this.antiAliasPass as CustomTAARenderPass
      taaIsAccummulating = taaPass.accumulate && taaPass.accumulateIndex !== -1
    }
    if (this.wasDirty) {
      this.wasDirty = false
      if (this.frameMetric && !taaIsAccummulating) {
        this.frameMetric.intervalStop()
        this.trackLowPerformance()
      }

      if (!this.isFrameNeedsRender()) {
        this.onIdleRenderHooks.forEach((hook) => {
          hook()
        })

        if (this.sendNotificationOnDrawIdle) {
          this.sendNotificationOnDrawIdle = false
          dispatchIdleDrawLoopNotification()
        }
      }
    }
    if (this.isFrameNeedsRender()) {
      if (this.settings.onOffOptions.collectFrameMetric && this.frameMetric) {
        this.frameMetric.intervalStart()
      }
      this.threeRenderer?.info?.reset()
      this.renderFrame()
      this.wasDirty = true
    } else {
      // Handle WebGL errors only when the draw loop is idle
      this.handleGlError()
    }
    if (this.hasRendered) {
      this.onFrameRenderSuccess()
    }
    if (this.debugSettings.showFPSCounter) {
      this.stats?.end()
    }
  }

  protected isFrameNeedsRender() {
    const sceneIsDirty = this.scene?.getIsDirty() || false
    if (sceneIsDirty) {
      this.setDirty()
    }
    const aaIsAccumulating = (isCustomTAAPass(this.antiAliasPass))
      && this.antiAliasPass.accumulateIndex < 32

    const autoExposureAccumulating = this.debugSettings.autoExposure && !this.autoExposureStabilized
    return this.isDirty || aaIsAccumulating || autoExposureAccumulating
  }

  private initCanvasSize() {
    Sentry.addBreadcrumb({
        category: SENTRY_BREADCRUMB_CATEGORY,
        message: `Initial canvas size`,
        data: {
            width: this.canvas.width,
            height: this.canvas.height,
            wallWidth: this.width,
            wallHeight: this.height,
        },
    })

    if (isMobile() && !this.settings.onOffOptions.disableMobileCanvasSizing) {
        this.initCanvasSizeMobile()
    } else {
        this.initCanvasSizeDesktop()
    }

    Sentry.addBreadcrumb({
        category: SENTRY_BREADCRUMB_CATEGORY,
        message: `Final canvas size`,
        data: {
            width: this.canvas.width,
            height: this.canvas.height,
        },
    })
}

  private initCanvasSizeMobile() {
      const aspect = this.width / this.height
      const landscapeWidth = Math.max(window.screen.width, window.screen.height)
      const landscapeHeight = Math.min(window.screen.width, window.screen.height)
      const screenAspect = landscapeWidth / landscapeHeight
      let cssWidth = 0
      let cssHeight = 0
      if (screenAspect > aspect) {
          // fit by height
          if (this.height / window.devicePixelRatio > landscapeHeight) {
              cssHeight = landscapeHeight
              cssWidth = cssHeight * aspect
          } else {
              cssHeight = this.height / window.devicePixelRatio
              cssWidth = this.width / window.devicePixelRatio
          }
      } else if (this.width / window.devicePixelRatio > landscapeWidth) {
          // fit by width
          cssWidth = landscapeWidth
          cssHeight = cssWidth / aspect
      } else {
          cssWidth = this.width / window.devicePixelRatio
          cssHeight = this.height / window.devicePixelRatio
      }

      if (this.threeRenderer && !this.isCanvasSameSize(cssWidth, cssHeight)) {
          this.threeRenderer.setSize(cssWidth, cssHeight)
      }
  }

  protected initCanvasSizeDesktop() {
      const width = this.canvas.clientWidth || getMaxWindowSize()
      const height = this.width > 0 ? Math.floor(width * this.height / this.width) : 0
      if (this.threeRenderer) {
          this.threeRenderer.setSize(width, height)
      }
  }

  /**
   * Returns true if the THREE.js renderer canvas is already at the given logical CSS dimensions,
   * accounting for the device pixel ratio. Setting canvas.width/height to the same value still
   * clears the WebGL context, so we skip the setSize call when dimensions are unchanged to avoid
   * redundant canvas clears that cause visible flashing during scene restore.
   */
  private isCanvasSameSize(cssWidth: number, cssHeight: number): boolean {
      if (!this.threeRenderer) return false
      const pixelRatio = this.threeRenderer.getPixelRatio()
      const currentW = this.threeRenderer.domElement.width
      const currentH = this.threeRenderer.domElement.height
      return (
          currentW === Math.floor(cssWidth * pixelRatio) &&
          currentH === Math.floor(cssHeight * pixelRatio)
      )
  }

  private initPostprocessing() {
    if (!this.threeRenderer) {
        return
    }

    const postProcessingDisabled = isMobile() && !this.settings.mobileFeatures.enableFXAA
    if (postProcessingDisabled) {
        return
    }

    if (this.composer) {
      this.composer.renderTarget1.dispose()
      this.composer.renderTarget2.dispose()
      this.composer.writeBuffer.dispose()
      this.composer.readBuffer.dispose()

      if (this.hoveredOutlinePass) {
        this.hoveredOutlinePass.dispose()
      }

      if (this.selectedOutlinePass) {
        this.selectedOutlinePass.dispose()
      }

      if (this.aoPass) {
        this.aoPass.dispose()
      }
    }

    this.composer = new EffectComposer(this.threeRenderer)
    this.composer.renderTarget1.stencilBuffer = true
    this.composer.renderTarget2.stencilBuffer = true
    if (!this.debugSettings.useFilmicLUT) {
        // Switchable behavior requires conditional initialization
        this.composer.renderTarget1.texture.colorSpace = THREE.SRGBColorSpace
        this.composer.renderTarget2.texture.colorSpace = THREE.SRGBColorSpace
    }

    this.renderPass = new CustomRenderPass(this.renderScene.bind(this))
    this.composer.addPass(this.renderPass)

    // GTAO setup
    if(this.threeRenderer.capabilities.isWebGL2) {
      this.aoPass = new CustomGTAOPass(this.getScene()?.getObjectsScene(), this.getCamera())
      this.aoPass.enabled = !!this.debugSettings.enableGTAO && (!this.antiAliasPass || this.aaType !== AA_TAA)
      this.aoPass.blendIntensity = this.debugSettings.gtaoIntensity ?? 1.0
      this.composer.addPass(this.aoPass)
      this.aoPass.output = CustomGTAOPass.OUTPUT.Default

      const aoParameters = {
        radius: this.debugSettings.gtaoRadius ?? 1.0,
        distanceExponent: 1.9,
        scale: 1.0,
        samples: 8,
        screenSpaceRadius: false,
      };

      const pdParameters = {
        lumaPhi: 5.0,
        depthPhi: 5.,
        normalPhi: 5.,
        radius: 4.0,
        radiusExponent: 1.5,
        rings: 2.,
        samples: 8,
      };
      this.aoPass.updateGtaoMaterial(aoParameters)
      this.aoPass.updatePdMaterial(pdParameters)

      // set before render hook for updates.
      this.registerBeforeRenderHook(() => {
        if ( !this.aoPass ) {
          return
        }

        if (this.settings.onOffOptions.magicEraserMode) {
          // Disable GTAO for magicEraserMode. Ideally we would disable
          // the pass itself but due to pass handling differences between TAA
          // this is much simpler.
          this.aoPass.output = CustomGTAOPass.OUTPUT.Diffuse
        } else {
          this.aoPass.output = CustomGTAOPass.OUTPUT.Default
        }
      })
    }

    this.hoveredOutlinePass = this.createOutlinePass()
    this.hoveredOutlinePass.visibleEdgeColor.set(EDGE_VISIBLE_COLOR)
    this.hoveredOutlinePass.selectedEdgeColor.set(EDGE_SELECTED_COLOR)
    this.hoveredOutlinePass.hiddenEdgeColor.set(EDGE_HIDDEN_COLOR)
    this.hoveredOutlinePass.edgeStrength = 0.8
    this.hoveredOutlinePass.edgeThickness = this.debugSettings.selectionOutlineThickness
    this.composer.addPass(this.hoveredOutlinePass)

    this.selectedOutlinePass = this.createOutlinePass()
    this.selectedOutlinePass.visibleEdgeColor.set(EDGE_VISIBLE_COLOR)
    this.selectedOutlinePass.selectedEdgeColor.set(EDGE_SELECTED_COLOR)
    this.selectedOutlinePass.hiddenEdgeColor.set(EDGE_HIDDEN_COLOR)
    this.selectedOutlinePass.edgeStrength = 1.0
    this.selectedOutlinePass.edgeThickness = this.debugSettings.selectionOutlineThickness
    this.composer.addPass(this.selectedOutlinePass)

    this.setAntiAliasing(getE2ETestingEnv() ? AA_FXAA : AA_TAA)
  }

  protected setAntiAliasing(desiredType: AntialiasingType) {
    if (!this.composer || !this.threeRenderer || !this.camera) {
      return
    }
    let type = desiredType
    // only FXAA on mobile
    if (isMobile()) {
        type = AA_FXAA
    }
    // only FXAA on Chrome OS
    const contextInfo: GlContextInfo = WallspiceWebgl.queryContextInfo(this.threeRenderer)
    if (contextInfo?.hwinfo?.os?.name === 'Chrome OS') {
      type = AA_FXAA
    }

    if (type === AA_TAA) {
        // We need to drain all gl errors before testing, else test may
        // fail because of a yet unhandled error, unrelated to float RT.
        this.handleGlError()

        const textureHelper = new TextureHelper()
        const { floatRTresult, error } = textureHelper.testFloatRT()
        if (!floatRTresult) {
            type = AA_FXAA
            if (error) {
                this.onInitializationFailure({ error, taafailure: true })
                this.taaCheckHasFailed = true
            }
        }
        textureHelper.dispose()
    }

    const isAAPassInComposer = this.antiAliasPass && this.composer.passes.includes(this.antiAliasPass)
    if (this.aaType === type && isAAPassInComposer) {
        return
    }

    this.aaType = type
    if (this.antiAliasPass) {
        this.composer.removePass(this.antiAliasPass)
        if (isCustomTAAPass(this.antiAliasPass)) {
            this.antiAliasPass.dispose.apply(this.antiAliasPass)
        }
        this.antiAliasPass = null
    }

    // might be turned off for TAA
    if (this.renderPass) {
      this.renderPass.enabled = true
    }
    if (this.hoveredOutlinePass && this.selectedOutlinePass) {
      this.hoveredOutlinePass.enabled = this.showOutlines
      this.selectedOutlinePass.enabled = this.showOutlines
    }

    switch (type) {
        case AA_FXAA:
            this.antiAliasPass = new ShaderPass(FXAAShader)
            this.antiAliasPass.uniforms.resolution.value.set(1 / this.canvas.width, 1 / this.canvas.height)
            this.composer.addPass(this.antiAliasPass)
            if (this.aoPass) {
              this.aoPass.enabled = true
            }
            break
        case AA_TAA: {
            if (this.renderPass) {
              this.renderPass.enabled = false
            }
            if (this.hoveredOutlinePass && this.selectedOutlinePass) {
              this.hoveredOutlinePass.enabled = false
              this.selectedOutlinePass.enabled = false
            }
            if (this.aoPass) {
              this.aoPass.enabled = false
            }
        const renderFunction = (renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget,
              readBuffer: THREE.WebGLRenderTarget, accumulateIndex: number) => {
                this.renderScene()

                // GTAO Pass w/ TAA
                if (this.debugSettings.enableGTAO && this.aoPass && this.scene){
                  this.aoPass.updateNoise(accumulateIndex);
                  this.aoPass.render(renderer, readBuffer, readBuffer);
                }

                if (this.showOutlines) {
                    this.hoveredOutlinePass?.render(renderer, writeBuffer, readBuffer)
                    this.selectedOutlinePass?.render(renderer, writeBuffer, readBuffer)
                }
            }
        this.antiAliasPass = new CustomTAARenderPass(this.getCamera(), renderFunction)
            this.antiAliasPass.setEncoding(
              this.debugSettings.useFilmicLUT ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
            )
            this.composer.addPass(this.antiAliasPass)
            this.composer.addPass(new ShaderPass(CopyShader))
            break
        }
        default:
            break
    }
    this.setDirty()
  }

  private computeLuminanceForView(view: CameraView): number | undefined {
    let result: number | undefined = undefined

    this.exposureCanvas.width = 16
    this.exposureCanvas.height = 16

    const camera = this.camera
    const prevView = this.camera.getView()

    const viewForExposure = { ...view }
    camera.setFromView(viewForExposure)

    if (this.threeRenderer) {
      this.threeRenderer.toneMappingExposure /= 2 ** this.debugSettings.toneMappingExposureCompensation
    }

    this.forAllMaterials(m => {
      m.setOutputSRGB(false)
    })

    this.renderToCanvas(this.exposureCanvas)

    const ctx = this.exposureCanvas.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, this.exposureCanvas.width, this.exposureCanvas.height)
      let luminance = 0.18

      switch (this.debugSettings.autoExposureMeasurementMethod) {
        case AutoExposureMeasurementMethod.AverageLogLuminance:
          luminance = AutoExposure.computeLogAverageLuminance(imageData.data)
          break;
        case AutoExposureMeasurementMethod.PercentileLuminance90:
          luminance = AutoExposure.compute90thPercentileLuminance(imageData.data)
          break;
        case AutoExposureMeasurementMethod.Hybrid:
        default:
          luminance = 
            0.80 * AutoExposure.computeLogAverageLuminance(imageData.data) +
            0.20 * AutoExposure.compute90thPercentileLuminance(imageData.data)
          break;
      }

      result = luminance
    }
    
    this.forAllMaterials(m => {
      m.setOutputSRGB(true)
    })

    if (prevView) {
      camera.setFromView(prevView)
    }

    if (this.threeRenderer) {
      this.threeRenderer.toneMappingExposure *= 2 ** this.debugSettings.toneMappingExposureCompensation
    }

    if (this.debugSettings.autoExposureLogCanvas) {
      /* eslint-disable no-console */
      console.log(`%c `, 
        `font-size:200px; background:url(${this.exposureCanvas.toDataURL()}) no-repeat; background-size: contain;`
      );
    }
    
    return result
  }

  protected computeExposure(forceUpdate = false) {
    if (!this.threeRenderer) {
        return
    }

    if (!this.debugSettings.autoExposure || this.autoExposureStabilized) {
      this.threeRenderer.toneMappingExposure = 
        2 ** this.debugSettings.toneMappingExposureCompensation * this.autoExposureStabilizedValue
      return;
    }

    const allViewLabels = gvViewManager()?.getAllViewLabels() 
    if (!allViewLabels) return;

    const views = new Map<string, CameraView>()
    allViewLabels.forEach(label => {
      if (label) {
        const cameraView = gvViewManager()?.getCameraView(label)
        if (cameraView) views.set(label, cameraView)
      }
    })

    const exposureResult = this.autoExposure.computeExposure(
      views, 
      {
        computeLuminanceForView: view => this.computeLuminanceForView(view),
        getSettings: () => ({
          autoExposureTarget: this.debugSettings.autoExposureTarget
        })
      })

    if (exposureResult.changed || forceUpdate) {
      this.threeRenderer.toneMappingExposure = 
        exposureResult.exposure * (2 ** this.debugSettings.toneMappingExposureCompensation)
      this.autoExposureStabilizationFrames = 0
      this.autoExposureStabilized = false
    } else if (!exposureResult.changed) {
      this.autoExposureStabilizationFrames += 1
      if (this.autoExposureStabilizationFrames > 60) {
        // If auto exposure isn't changing for 60 frames, turn it off for performance reasons.
        this.autoExposureStabilized = true
        this.autoExposureStabilizedValue = exposureResult.exposure
      }
    }
  }

  protected renderFrame() {
    this.beforeRenderHooks.forEach((hook) => {
      hook()
    })

    this.computeExposure()

    if (this.composer) {
      this.composer.render()
    } else {
      this.renderScene()
    }

    this.afterRenderHooks.forEach((hook) => {
      hook()
    })

    let i = this.scheduledRenderCallbacks.length
    while (i > 0) {
      i -= 1
      const scheduled = this.scheduledRenderCallbacks[i]
      if (scheduled.framesToSkip === 0) {
        this.addRenderCallback(scheduled.callback)
        this.scheduledRenderCallbacks.splice(i, 1)
        } else {
          scheduled.framesToSkip -= 1
        }
    }

    if (this.oneTimeRenderCallbacks.length > 0) {
      // YP: TODO: these callbacks will usually dispatch redux action(s). and may start a complex
      // chain of synchronous calls, e.g. instantiating new items via redux, etc, while still in the render() function
      // perhaps even assigning new oneTimeRenderCallbacks which will be cleared right away here,
      // or clearing render flag without rendering, etc. causing hard to trace bugs.
      //
      // MO: Because callbacks can add new callbacks, loop and run the first in the queue
      // until the queue is empty.
      let callbackFn
      while (callbackFn = this.oneTimeRenderCallbacks.shift()) { // eslint-disable-line no-cond-assign
        callbackFn()
      }
    }

    if (!this.hasRendered) {
      this.hasRendered = this.onFirstRenderCallback()
    }
  }

  public renderToCanvas(canvas: HTMLCanvasElement): void {
    if (this.offscreenRenderer) {
      this.offscreenRenderer.renderToCanvas(canvas, () => { 
        this.renderSceneOffscreen() 
      })
    }
  }

  protected abstract renderScene(): void

  protected renderSceneOffscreen() {
    this.renderScene()
  }

  protected abstract createOutlinePass(): CustomOutlinePass

  private handleCompilationErrors() {
    if (!this.threeRenderer) {
      return
    }

    this.threeRenderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      if (gl.isContextLost()) {
        console.warn("Context lost before shader compilation.");
        return
      }

      // Emulate default threejs error reporting
      const getShaderErrors = (shader: WebGLShader) => {
        const status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        const shaderInfoLog = gl.getShaderInfoLog(shader) || '';
        const errors = shaderInfoLog.trim();
        if (status && errors === '') return '';
        return errors;
      }

      const programInfoLog = gl.getProgramInfoLog(program) || '';
      const programLog = programInfoLog.trim();
      const vertexErrors = getShaderErrors(vertexShader);
      const fragmentErrors = getShaderErrors(fragmentShader);

      // Create a full log for this shader error.
      const log = `THREE.WebGLProgram: Shader Error ${gl.getError()} - ` +
        `VALIDATE_STATUS ${gl.getProgramParameter(program, gl.VALIDATE_STATUS)}\n\n` +
        `Program Info Log: ${programLog}\n${vertexErrors}\n${fragmentErrors}`
      const err = gl.getError()

      if (!isProd) {
        // Only log the error to console in dev,
        // otherwise sentry will capture both this error and the manually sent
        // event below.
        console.error(log);
      }

      const event = {
        message: `GLSL Compilation Error`,
        breadcrumbs: [{
          type: `Compilation error`,
          category: SENTRY_BREADCRUMB_CATEGORY,
          data: {
            errorCode: err,
            errorLabel: GL_ERR_CODES[err] || 'UNKNOWN_ERR_CODE',
            log,
          },
        }],
      }

      Sentry.captureEvent(event)
    }
  }

  private handleGlError() {
      if (!this.threeRenderer) {
          return
      }
      const context = this.threeRenderer.getContext()
      if (!context || context?.isContextLost()) {
          return
      }

      // Note context loss is already handled so no need to report it as errors to Sentry
      let err = context.getError()
      while(GL_ERR_CODES[err] !== 'GL_NO_ERROR' && GL_ERR_CODES[err] !== 'GL_CONTEXT_LOST') {
          const composerRtSize = {
              width: 0,
              height: 0,
          }
          if (this.composer && this.composer.readBuffer) {
              composerRtSize.width = this.composer.readBuffer.width
              composerRtSize.height = this.composer.readBuffer.height
          }

          const taaSampleRtSize = {
              width: 0,
              height: 0,
          }
          if (isCustomTAAPass(this.antiAliasPass)) {
              taaSampleRtSize.width =
                  (this.antiAliasPass.sampleRenderTarget && this.antiAliasPass.sampleRenderTarget.width) || 0
              taaSampleRtSize.height =
                  (this.antiAliasPass.sampleRenderTarget && this.antiAliasPass.sampleRenderTarget.height) || 0
          }
          const event = {
              message: `GL Error`,
              breadcrumbs: [
                  {
                      type: `error`,
                      category: SENTRY_BREADCRUMB_CATEGORY,
                      data: {
                          errorCode: err,
                          errorLabel: GL_ERR_CODES[err] || 'UNKNOWN_ERR_CODE',
                          hasComposer: !!this.composer,
                          composerRtSize,
                          usingTAA: isCustomTAAPass(this.antiAliasPass),
                          taaSampleRtSize,
                      },
                  },
              ],
          }
          // From previously reported Sentry errors it seems that GL_INVALID_OPERATION report is strongly
          // correlated with TAA check failure on "copyRender" render stage (in TextureHelper.testFloatRT).
          // The current hypothesis is that GL_INVALID_OPERATION here might be related to either incorrect
          // state cleanup in testFloatRT, or multiple errors generated during the check,
          // i.e. it's still related to the TAA check and does not affect the user, that's why reporting
          // it here to MixPanel.
          // For more info see https://geomagical.atlassian.net/browse/GFX-1394
          if (this.taaCheckHasFailed && GL_ERR_CODES[err] === 'GL_INVALID_OPERATION') {
              this.onInitializationFailure({ event, taafailure: true })
          } else {
              Sentry.captureEvent(event)
          }

          err = context.getError()
      }
  }

  addRenderCallback(callback: RenderCallback) {
    this.oneTimeRenderCallbacks.push(callback)
  }

  protected scheduleRenderCallback(callback: RenderCallback, framesToSkip = 0) {
    if (framesToSkip > 0) {
        this.scheduledRenderCallbacks.push({ callback, framesToSkip })
    } else {
        this.oneTimeRenderCallbacks.push(callback)
    }
    this.setDirty()
  }

  protected setToneMappingParameters(type: THREE.ToneMapping, exposure: number): boolean {
    if (!this.threeRenderer) {
        return false
    }
    this.threeRenderer.toneMapping = type
    this.threeRenderer.toneMappingExposure = exposure
    return true
  }

  protected switchLUTtoneMapping(useFilmicLUT: boolean): boolean {
    if (this.composer) {
        this.composer.renderTarget1.texture.colorSpace = 
        useFilmicLUT ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
        this.composer.renderTarget2.texture.colorSpace = 
        useFilmicLUT ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
    }

    if (isCustomTAAPass(this.antiAliasPass)) {
        this.antiAliasPass.setEncoding(useFilmicLUT ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace)
    }
    return true
  }

  protected switchParallaxMapping(disableParallaxMapping: boolean) {
    const scene = this.getScene()?.getObjectsScene()
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof CustomStandardMaterial) {
          child.material.switchParallaxMapping(disableParallaxMapping)
        }
      })
      return true
    }
    return false
  }

  protected disableLightingEffects(disable: boolean) {
    const renderScene = this.scene?.getObjectsScene()
    if (!renderScene || !this.threeRenderer) {
      return
    }

    if (disable) {
      this.autoExposureStabilized = true;
      this.autoExposureStabilizedValue = 1.0;
      this.threeRenderer.toneMapping = THREE.NoToneMapping
      this.threeRenderer.toneMappingExposure = 1.0
    } else {
      this.threeRenderer.toneMapping = THREE.CustomToneMapping
      this.triggerAutoExposure()
    }

    const toggleLightingForObject = (object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh && object.material instanceof CustomStandardMaterial) {
        const currentMaterial = object.material as CustomStandardMaterial
        // eslint-disable-next-line no-param-reassign
        object.userData.originalMaterial = currentMaterial
        if (disable) {
          // eslint-disable-next-line no-param-reassign
          object.material = new THREE.MeshBasicMaterial().copy(currentMaterial)
          if (object.material.map) {
            object.material.map.colorSpace = THREE.LinearSRGBColorSpace
            object.material.map.needsUpdate = true
          }
          if (object.material.aoMap) {
            object.material.aoMap = null
          }
          object.material.needsUpdate = true
        }
      } else if (object instanceof THREE.Mesh &&
        object.userData.originalMaterial &&
        object.material instanceof THREE.MeshBasicMaterial) {
        if (!disable) {
          // eslint-disable-next-line no-param-reassign
          // const material = object.userData.originalMaterial as CustomStandardMaterial
          const material = object.userData.originalMaterial as THREE.MeshStandardMaterial
          object.material = new CustomStandardMaterial().copy(material)
          if (object.material.map) {
            object.material.map.colorSpace = THREE.SRGBColorSpace
            object.material.map.needsUpdate = true
          }
          if (object.userData.originalMaterial.aoMap) {
            object.material.aoMap = object.userData.originalMaterial.aoMap
          }
          object.material.needsUpdate = true
        }
      }
    }

    renderScene.children.forEach((child) => {
      // only disable effects on the room shell.
      if ('geomagicalScene' in child.userData && child.userData.geomagicalScene === 0) {
        child.traverse((object) => {
          toggleLightingForObject(object)
        });
      }
    })
  }

  private setNormalsVisible(visible: boolean) {
    const scene = this.getScene()?.getObjectsScene()
    if (scene) {
      scene.traverse((node: THREE.Object3D) => {
        if (node instanceof THREE.Mesh) {
          if (visible && node.material.normalMap) {
            const oldmat = node.material
            // eslint-disable-next-line no-param-reassign
            node.material = new THREE.MeshNormalMaterial({ normalMap: node.material.normalMap })
            // eslint-disable-next-line no-param-reassign
            node.material.oldmat = oldmat
          } else if (node.material.oldmat) {
            // eslint-disable-next-line no-param-reassign
            node.material = node.material.oldmat
          }
        }
      })
      return true
    }
    return false
  }

  private setEnvironmentRotation(rotation: number) {
    const scene = this.getScene()?.getObjectsScene()
    if (scene) {
      const rotationInRadian = rotation * Math.PI / 180
      const mat4 = new THREE.Matrix4().makeRotationY(rotationInRadian)
      const mat3 = new THREE.Matrix3().setFromMatrix4(mat4).transpose()
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh &&
          isMeshStandardMaterial(child.material) &&
          'envMapRotation' in child.material) {
          child.material.envMapRotation = mat3
        }
      })
      const internalRenderLists = this.threeRenderer?.renderLists.get(scene, 0)
      const backgroundCube = internalRenderLists?.opaque[0]
      if (backgroundCube?.geometry instanceof THREE.BoxGeometry
        && backgroundCube?.material instanceof THREE.ShaderMaterial
        && backgroundCube.material.uniforms.envMapRotation) {
        backgroundCube.material.uniforms.envMapRotation.value = mat3
        backgroundCube.material.needsUpdate = true
      }
      return true
    }
    return false
  }

  private setBackgroundEnvRotation(rotation: number) {
    // Because the background object is internally created and destroyer by ThreeJS on its
    // render calls; it's rotation initialization is added as a render callback.
    this.addRenderCallback(() => {
      this.backgroundEnvRotationApplied = this.setEnvironmentRotation(rotation) })
    return false
  }

  private setEnvironmentIntensity(intensity: number) {
    const scene = this.getScene()?.getObjectsScene()
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && isMeshStandardMaterial(child.material)) {
          // eslint-disable-next-line no-param-reassign
          child.material.envMapIntensity = intensity
        }
      })
      return true
    }
    return false
  }

  private setAoMapIntensity(intensity: number) {
    const scene = this.getScene()?.getObjectsScene()
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && isMeshStandardMaterial(child.material)) {
            // eslint-disable-next-line no-param-reassign
            child.material.aoMapIntensity = intensity
        }
      })
      return true
    }
    return false
  }

  private updateFloorContactShadowsEnabled() {
    const renderItems = this.scene?.getRenderItems()
    if (renderItems) {
      Array.from(renderItems).forEach((item) => {
        if (isFurnitureItem3D(item)) {
            item.updateFloorContactShadowsEnabled()
        }
      })
      return true
    }
    return false
  }

  private switchFPSCounterVisibility(showFPSCounter?: boolean) {
    if (this.stats) {
      if (showFPSCounter) {
        window.document.body.append(this.stats.dom)
      } else {
        this.stats.dom.remove()
      }
    }
    return false
  }


  requestNotificationOnDrawIdle() {
    if (!this.isFrameNeedsRender()) {
      dispatchIdleDrawLoopNotification()
    } else {
        this.sendNotificationOnDrawIdle = true
    }
  }

  registerBeforeRenderHook(callback: RenderCallback) {
    this.beforeRenderHooks.push(callback)
  }

  registerAfterRenderHook(callback: RenderCallback) {
    this.afterRenderHooks.push(callback)
  }

  registerOnIdleRenderHook(callback: RenderCallback) {
    this.onIdleRenderHooks.push(callback)
  }

  // eslint-disable-next-line class-methods-use-this
  public renderColorIds() {
  }

  private initFPSCounter() {
    if (this.settings.onOffOptions.enableDebugControls) {
      this.stats = new Stats()
    }
  }

    private forAllMaterials(action: (material: CustomStandardMaterial | LitShadowMaterial) => void ) {
      if (this.scene) {
        const threeScene = this.scene.getObjectsScene()
        threeScene?.traverse((obj) => {
            if (obj instanceof THREE.Mesh && 
                (obj.material instanceof CustomStandardMaterial || obj.material instanceof LitShadowMaterial) ) {
                  action(obj.material)
            }
        })
      }
    }
}
