import * as THREE from 'three'

import type { Planner } from 'Planner/planner'

import { RenderEngine } from 'Planner/rendering/render_engine'
import { CameraManager } from 'Planner/rendering/camera_manager'
import { InputHandler } from 'Planner/input_handler'
import type { ViewerContext } from 'Planner/composition/planner_positioning_context'
import { Vector2Like, CameraViewName } from 'Planner/api_types'
import { VIEWER_EVENT_WEBGL_CONTEXT_LOST, PlannerEventMap } from 'Planner/planner_constants'

import type { GlContextInfo } from 'Renderer/geomviewer/geom_types'
import { IOffscreenRenderContext } from 'Renderer/rendering/OffscreenRenderer'

export class PlannerViewer extends THREE.EventDispatcher<PlannerEventMap> {
    private plannerInstance: Planner
    private canvas: HTMLCanvasElement | null = null
    private renderEngine: RenderEngine | null = null
    private cameraManager: CameraManager | null = null
    private inputHandler: InputHandler
    private systemInfo: GlContextInfo | null = null

    constructor(plannerInstance: Planner) {
        super()
        this.onContextLost = this.onContextLost.bind(this)
        this.plannerInstance = plannerInstance
        this.inputHandler = new InputHandler(this.plannerInstance, this)
    }

    public initWithRoom(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        this.canvas.addEventListener('webglcontextlost', this.onContextLost, false)

        this.renderEngine = new RenderEngine(canvas, this)
        this.systemInfo = this.renderEngine.querySystemInfo()

        const viewSize = this.renderEngine.getSize()
        this.cameraManager = new CameraManager(this.plannerInstance, viewSize.width, viewSize.height)

        const currentRoom = this.plannerInstance.getCurrentRoom()
        if (!currentRoom) {
            return Promise.reject()
        }
        this.cameraManager.initWithRoom(this, currentRoom)
        return this.renderEngine.initialize(currentRoom.getScene(), this.cameraManager.getCamera())
            .then(() => {
                if (!this.cameraManager) {
                    return
                }
                this.cameraManager.setTopDownView(currentRoom, false)
            })
    }

    public onContextLost() {
        this.dispatchEvent({
            type: VIEWER_EVENT_WEBGL_CONTEXT_LOST,
        })
    }

    public onCanvasResized() {
        this.renderEngine?.onCanvasResized()
    }

    public getCameraManager() {
        return this.cameraManager
    }

    public getSystemInfo() {
        return this.systemInfo
    }

    public getInputHandler() {
        return this.inputHandler
    }

    public shutDown() {
        if (this.renderEngine) {
            this.renderEngine.shutDown()
            this.renderEngine = null
        }
        if (this.cameraManager) {
            this.cameraManager.shutDown()
            this.cameraManager = null
        }
        if (this.canvas) {
            this.canvas.removeEventListener('webglcontextlost', this.onContextLost, false)
            this.canvas = null
        }
    }

    public getContext(): ViewerContext {
        const camera = this.cameraManager?.getCamera()
        return {
            pixelPointToRelative: this.pixelPointToRelative.bind(this),
            getPosition: camera ? camera.getPosition.bind(camera) : () => new THREE.Vector3(),
            getScreenPointRay: camera ? camera.getScreenPointRay.bind(camera) : () => new THREE.Ray,
            worldToScreenRelative: camera ? camera.worldToScreenRelative.bind(camera) : () => new THREE.Vector2,
            getThreeCamera: camera ? camera.getRenderCamera.bind(camera) : () => undefined,
            getIntrinsics: () => {
                const size = this.renderEngine?.getSize()
                if (size) {
                    return camera?.getIntrinsics(size.width, size.height)
                }
                return undefined
            }
        }
    }

    public setCameraView(viewName: CameraViewName, animate: boolean) {
        const currentRoom = this.plannerInstance.getCurrentRoom()
        if (!currentRoom || !this.cameraManager) {
            return
        }
        this.cameraManager.setCameraView(currentRoom, viewName, animate)
    }

    public setIsOrbitControlsAllowed(enable: boolean) {
        const currentRoom = this.plannerInstance.getCurrentRoom()
        if (!currentRoom || !this.cameraManager) {
            return
        }
        this.cameraManager.setIsOrbitControlsAllowed(enable)
    }

    public getIsOrbitControlsAllowed() {
        const currentRoom = this.plannerInstance.getCurrentRoom()
        if (!currentRoom || !this.cameraManager) {
            return false
        }
        return this.cameraManager.getIsOrbitControlsAllowed()
    }

    public projectWorldPosition(position: THREE.Vector3) {
        const renderCamera = this.cameraManager?.getCamera().getRenderCamera()
        if (!renderCamera) {
            return undefined
        }
        const projected = position.clone().project(renderCamera)
        projected.x = 0.5 * (projected.x + 1.0)
        projected.y = 1.0 - 0.5 * (projected.y + 1.0)
        return projected
    }

    public refreshCurrentCameraVew() {
        const currentRoom = this.plannerInstance.getCurrentRoom()
        if (!currentRoom || !this.cameraManager) {
            return
        }
        this.cameraManager.refreshCurrentCameraVew(currentRoom, true)
    }

    public getRenderDimensions() {
        return this.renderEngine?.getSize() || new THREE.Vector2(1, 1)
    }

    public pixelPointToRelative(pixelsPoint: Vector2Like): THREE.Vector2 {
        const size = this.getRenderDimensions()
        return new THREE.Vector2(pixelsPoint.x / size.width, pixelsPoint.y / size.height)
    }

    public relativePointToPixels(relative: Vector2Like): THREE.Vector2 {
        const ret = new THREE.Vector2()
        const size = this.renderEngine?.getSize()
        if (size) {
            ret.set(relative.x * size.width, relative.y * size.height)
        }
        return ret
    }

    public getCameraPosition() {
        return this.cameraManager?.getCamera().getRenderCamera().getWorldPosition(new THREE.Vector3())
    }

    public onCompositionItemDeleted(itemId: string) {
        this.inputHandler.onCompositionItemDeleted(itemId)
    }

    public onWallElementDeleted(elementId: string) {
        this.inputHandler.onWallElementDeleted(elementId)
    }

    public onFurnitureItemResolved(itemId: string) {
        if (!this.renderEngine) {
            return
        }
        this.renderEngine.onFurnitureItemResolved(itemId)
    }

    public debugForceWebglContextLoss() {
        if (!this.renderEngine) {
            return
        }
        this.renderEngine.debugForceWebglContextLoss()
    }

    public borrowOffscreenRenderContext<T>(fn: (r: IOffscreenRenderContext) => T): T | null {
        if (!this.renderEngine) {
            return null
        }
        return this.renderEngine?.borrowOffscreenRenderContext(fn)
    }
}
