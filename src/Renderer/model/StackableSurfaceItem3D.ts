/* eslint-disable class-methods-use-this */
import * as THREE from 'three'

import Renderer from 'Renderer'
import { RenderItem3D } from 'Renderer/model/RenderItem3D'

import Fading from 'utils/fading'
import { sufficientInteractableDepth } from 'utils/stackablesUX'

import { 
    DEFAULT_THREE_NATIVE_LAYER, 
    STATIC_STACKABLES_THREE_NATIVE_LAYER, 
    WALL_PLACEABLE_LAYER,
    STACKABLE_SURFACE_DEPTH_DELTA,
    STATIC_STACKABLE_SURFACE_DEPTH_DELTA,
} from 'Renderer/constants'

import { StackableSurfaceParameters, Point2D, Location3, Matrix4x4 } from 'Renderer/geomviewer/geom_types'
import type FurnitureItem3D from 'Renderer/model/FurnitureItem3D'
import { getFurnitureItem3D } from 'Renderer/rendering/scene_utils'
import {
    copyMatrix4,
    extractPosition,
    upperLeft3,
    transpose4,
    fromThreeMatrix4,
    multiplyMatrices4x4,
    createIdentity3
} from 'Renderer/geometry/utilities'
import { gvCurrentCamera, gvCurrentSettings } from 'Renderer/foundation/geom_app'
import type { DragResult } from 'Renderer/positioning/positioning_system'
import { Point3 } from 'Renderer/geometry'
import { setMaterialOnBeforeCompileCallback } from 'Renderer/rendering/rendering_utils'

const fullOpacity = 0.75
const defaultColor = new THREE.Color(0x4595FF)
const highlightColor = new THREE.Color(0x0A8A00)
const defaultColorPBR = new THREE.Color(0x88CCFF)
const highlightColorPBR = new THREE.Color(0x0DCF00)

const getDefaultColor = (renderer: Renderer) => renderer.debugSettings.useFilmicLUT
    ? defaultColorPBR : defaultColor
const getHighlightColor = (renderer: Renderer) => renderer.debugSettings.useFilmicLUT
    ? highlightColorPBR : highlightColor

// The legacy code passes the entire parent React item to the StackableSurfaceItem
// ctor. We really only need the unique ID, hence the proxy type below.
export type StackSurfParentItemProxy = {
    uniqueId: string
}

class StackableSurfaceItem3D extends RenderItem3D {
    private plane: StackableSurfaceParameters

    private highlighted = false
    private wantsIndirectMouseInteraction = false
    private material: THREE.MeshBasicMaterial | null = null
    private extrusionObject: THREE.Mesh | null = null

    constructor(id:string, renderer: Renderer, planeParameters: StackableSurfaceParameters,
        parentProxy?: StackSurfParentItemProxy) {
        let transform: Matrix4x4 = copyMatrix4(planeParameters.transform)
        transpose4(transform)
        const location: Location3 = {
            localPos: extractPosition(transform),
            bindTo: '',
        }
        super(id, renderer, location)

        this.plane = planeParameters
        let parentAsFurniture: FurnitureItem3D | null = null
        if (parentProxy !== undefined) {
            parentAsFurniture = getFurnitureItem3D(String(parentProxy.uniqueId))
            if (parentAsFurniture) {
                this.setParent(parentAsFurniture)
            }
        }

        this.setPosRelative(location.localPos)

        // Static stackable surfaces are assigned a separate rendering layer to isolate shadows
        if (parentAsFurniture) {
            const isMeshScene = gvCurrentSettings()?.viewerSettings?.is3dMeshScene || false
            this.renderingLayer = parentAsFurniture.isBoundToWall() && !isMeshScene
                ? WALL_PLACEABLE_LAYER : DEFAULT_THREE_NATIVE_LAYER
            const snapRotMatrix = parentAsFurniture.getSnapRotModelMatrix()
            if (snapRotMatrix) {
                transform = multiplyMatrices4x4(fromThreeMatrix4(snapRotMatrix), transform)
                const position = extractPosition(transform)
                this.setPosRelative(position)
            }
        } else {
            this.renderingLayer = STATIC_STACKABLES_THREE_NATIVE_LAYER
        }

        const rotation = createIdentity3();
        upperLeft3(transform, rotation)
        this.setRotRelative(rotation)

        this.highlighted = false
        this.createThreeObject()
        this.adjustTransformOnParent()
        this.refreshStaticProperties()
        this.addToScene();
    }

    getPlaneParameters() {
        return this.plane
    }

    getIsPlacedOnFloor(): boolean {
        return false
    }

    getItemPlacementData(){
        return undefined
    }

    dispatchItemPlacementUpdate(): void {
    }

    isErased() {
        return this.Renderer.getIsSurfaceErased(this.getId())
    }

    setPositionFromScreenPoint(/* screenPoint: PointXY */): boolean {
        return false
    }

    dragTargetToScreenPoint(/* screenPoint: PointXY */): DragResult {
        return { success: false }
    }

    createThreeObject() {
        let geometry
        let extrusionGeometry
        const extrusionHeight = 0.025

        const { type } = this.plane.parameters

        if( type === "circle" ) {
            const { radius } = this.plane.parameters
            geometry = new THREE.CircleGeometry(radius, 32)
            extrusionGeometry = new THREE.CylinderGeometry(radius, radius, extrusionHeight, 32)
            extrusionGeometry.rotateX(Math.PI / 2)
        }
        else if( type === "polygon" ){
            geometry = new THREE.BufferGeometry()

            const points = this.plane.parameters.vertices.map(
                point => new THREE.Vector2(point[0], point[1])
            )

            // geometry.vertices = points

            const triangles = THREE.ShapeUtils.triangulateShape(points, [])
            const positions: number[] = []
            const normals: number[] = []

            triangles.forEach(triangle => {
                const p0 = points[triangle[0]]
                const p1 = points[triangle[1]]
                const p2 = points[triangle[2]]

                positions.push(p0.x)
                positions.push(p0.y)
                positions.push(0)

                positions.push(p1.x)
                positions.push(p1.y)
                positions.push(0)

                positions.push(p2.x)
                positions.push(p2.y)
                positions.push(0)

                normals.push(0, 0, 1)
                normals.push(0, 0, 1)
                normals.push(0, 0, 1)
            })

            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
            geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))

            const shape = new THREE.Shape()
            shape.moveTo(points[0].x, points[0].y)
            points.forEach(point => shape.lineTo(point.x, point.y))
            extrusionGeometry = new THREE.ExtrudeGeometry(shape, { depth: extrusionHeight, bevelEnabled: false })
        }

        this.material = new THREE.MeshBasicMaterial({
            color: getDefaultColor(this.Renderer),
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            opacity: 1.0,
            toneMapped: false
        })

        setMaterialOnBeforeCompileCallback(
            this.material,
            ( shader: { fragmentShader: string; } ) => {
                // eslint-disable-next-line no-param-reassign
                shader.fragmentShader = shader.fragmentShader.replace(
                `#include <dithering_fragment>`,
                `#include <dithering_fragment>
                
                gl_FragColor = LinearTosRGB( gl_FragColor );
                
                `
                )
            }
        )

        const renderObject: THREE.Mesh = new THREE.Mesh(geometry, this.material)
        this.setObject(renderObject)

        renderObject.name = `StackablePlane${this.id}`
        this.extrusionObject = new THREE.Mesh(extrusionGeometry, this.material)
        this.extrusionObject.visible = false
        renderObject.add(this.extrusionObject)

        const parent = this.getParent()
        renderObject.userData.stackablePlaneId = this.id
        renderObject.userData.isStackableSurface = true
        renderObject.userData.isStaticSurface = !parent

        renderObject.layers.set(this.renderingLayer)

        this.Renderer?.addStackingSurface(this)
        this.updateRenderObject()

        if (!parent) {
            // Lift up the static surface bit to prevent z-fighting
            const pos  = this.getPosAbsolute();
            pos.y += STATIC_STACKABLE_SURFACE_DEPTH_DELTA
            this.setPosAbsolute(pos)

            // Add a shadow layer to static stackable surfaces since they have not a virtual object
            const shadowPlane = new THREE.Mesh(geometry, new THREE.ShadowMaterial())
            shadowPlane.receiveShadow = true
            shadowPlane.material.opacity = 0.3
            shadowPlane.material.depthWrite = false
            shadowPlane.layers.set(this.renderingLayer)
            renderObject.add(shadowPlane)
        }
    }

    // Incoming data is not consistent in terms of how "logical" stackable surface follows the corresponding polygon(s),
    // leading to surfaces and placed items be visually lifted or submerged. This function attempts to adjust this
    // surface's position to better align the parent item.
    public adjustTransformOnParent() {
        const object = this.getParent()?.getObject()
        if (!object) {
            return
        }
        const originOffset = 0.01

        const pos = this.getPosRelative()
        const origin = new THREE.Vector3(pos.x, pos.y + originOffset, pos.z)
        const dir = new THREE.Vector3(0, -1, 0)
        const rayCaster = new THREE.Raycaster(origin, dir)
        rayCaster.layers.enableAll()

        const prevMatrix = object.matrix.clone()
        const prevAutoUpdate = object.matrixAutoUpdate

        object.matrix.identity()
        object.matrixAutoUpdate = false
        object.updateMatrixWorld(true)

        let intersects = rayCaster.intersectObject(object, true)

        object.matrix.copy(prevMatrix)
        object.matrixAutoUpdate = prevAutoUpdate
        object.updateMatrixWorld(true)

        intersects = intersects
            .filter(int => int.distance < 2.0 * originOffset &&
                int.object && int.object instanceof THREE.Mesh &&
                int.object.material.isMeshStandardMaterial)
        if (intersects.length === 0) {
            return
        }
        const resultPosition = { ...intersects[0].point }
        resultPosition.y += STACKABLE_SURFACE_DEPTH_DELTA
        this.setPosRelative(resultPosition)
    }

    frame() {
        const t = this.plane.transform

        return [
            [ t[0][0], t[1][0], t[2][0] ],
            [ t[0][1], t[1][1], t[2][1] ],
            [ t[0][2], t[1][2], t[2][2] ]
        ]
    }

    setVisible(visible: boolean, fade = true) {
        if (visible === this.visible) {
            return
        }
        this.visible = visible

        if (visible) { // if not, object will need to fade out first
            this.addToScene()
            this.highlighted = false
            if (this.material) {
                this.material.color = getDefaultColor(this.Renderer)
            }
        }
        if (fade) {
            this.startFade(visible)
            this.Renderer.onChildUpdate()
        } else if (this.material) {
            this.material.opacity = visible ? 1 : 0
        }

        // Set up extrusion for barely visible surfaces.
        this.refreshExtrusion(visible)
    }

    startFade(isFadeIn: boolean) {
        if (!this.material) {
            return
        }
        // easeOutExp
        const ease = isFadeIn ?
            (t: number) => 1 - 2 ** (-10 * t) :
            (t: number) => 2 ** (10 * t - 10)

        let totalTime = 0.75
        if (this.material.userData.appearFading) {
            totalTime *= this.material.userData.appearFading.t
            this.material.userData.appearFading.stop()
        }

        this.material.userData.appearFading = new Fading(totalTime,
            (t) => {
                const timeFactor = isFadeIn ? t : (1.0 - t)
                if (this.material) {
                    this.material.opacity = fullOpacity * ease(timeFactor)
                }
                this.Renderer.onChildUpdate()
            },
            () => {
                if (!this.material) {
                    return
                }
                this.material.userData.appearFading = null
            }
        )
    }

    setHighlighted(highlight: boolean) {
        if (this.highlighted === highlight) {
            return
        }
        if (!this.Renderer || !this.material) {
            return
        }

        this.highlighted = highlight
        const startColor = new THREE.Color().copy(this.material.color)
        const targetColor = new THREE.Color().copy(highlight 
            ? getHighlightColor(this.Renderer) : getDefaultColor(this.Renderer))

        const ease = (t: number) => 1 - 2 ** (-10 * t)
        let totalTime = 0.75
        if (this.material.userData.highlightFading) {
            totalTime *= this.material.userData.highlightFading.t
            this.material.userData.highlightFading.stop()
        }
        this.material.userData.highlightFading = new Fading(totalTime,
            (t) => {
                if (this.material) {
                    this.material.color = startColor.lerp(targetColor, ease(t))
                }
                this.Renderer.onChildUpdate()
            },
            () => {
                if (this.material) {
                    this.material.userData.highlightFading = null
                    this.material.color = targetColor
                }
                this.Renderer.onChildUpdate()
            }
        )
    }

    refreshExtrusion(visible: boolean) {
        const threeCamera = gvCurrentCamera()?.getThreeCamera()
        this.updateRenderObject()
        const renderObject = this.getObject()
        if (!threeCamera || !this.extrusionObject || !renderObject) {
            return
        }

        if (!visible) {
            this.extrusionObject.visible = false
            return
        }
        renderObject.updateMatrixWorld()
        const worldUpVector = new THREE.Vector3().setFromMatrixColumn(renderObject.matrixWorld, 2)
        const worldPosition = renderObject.getWorldPosition(new THREE.Vector3())
        const objToCamera = new THREE.Vector3().subVectors(threeCamera.position, worldPosition).normalize()
        const needsExtrude = objToCamera.dot(worldUpVector) < 0
        this.extrusionObject.visible = needsExtrude
    }

    endIsNigh() {
        if (this.material) {
            if (this.material.userData.appearFading) {
                this.material.userData.appearFading.stop()
                this.material.userData.appearFading = null
            }
            if (this.material.userData.highlightFading) {
                this.material.userData.highlightFading.stop()
                this.material.userData.highlightFading = null
            }
            this.material.dispose()
            this.material = null
        }
        super.endIsNigh()
    }

    override onDragStart() {
        super.onDragStart()
    }

    override onDragFinish() {
        super.onDragFinish()
        this.refreshStaticProperties()
        this.refreshDynamicProperties()
    }

    override onChildDragStart() {
        this.setVisible(true)
        this.setHighlighted(true)
    }

    override onChildDragFinish() {
        this.setVisible(false)
        this.setHighlighted(false)
    }

    // Updates if the surface wants indirect interaction using the surface and camera positions.
    // Must be called anytime either the surface or the camera move.
    refreshStaticProperties() {
        const minDepth = this.Renderer.debugSettings.stackablesMinInteractibleDepth || 0.3
        this.wantsIndirectMouseInteraction = !sufficientInteractableDepth(this, minDepth)
    }

    refreshDynamicProperties() {
        const parentItem = this.getParent()
        if (parentItem) {
            this.renderingLayer = parentItem.getRenderingLayer()
        }
    }

    //
    // There are two interaction modes for stackable surfaces:
    //
    // 1. If the surface is sufficiently facing the camera then the user can select a point
    //    on the surface by moving the mouse over that point directly.
    //
    // 2. If the surface is parallel to the camera, or slanted away from the camera, then
    //    the system will take mouse positions which are near the surface and translate them
    //    to reasonable points on the surface. The algorithms for this are in
    //    stackablesUX.js. This is called "indirect mouse interaction."
    //

    getWantsIndirectMouseInteraction() {
        return this.wantsIndirectMouseInteraction
    }

    // Return the corners of the stackable surface in relative screen space as
    // [[minX, maxY], [maxX, maxY], [maxX, minY], [minX, minY]].
    getCorners(): Point2D[] {
        const renderObject = this.getObject()
        if (renderObject && this.bbox.isEmpty()) {
            this.bbox.setFromObject(renderObject)
        }

        // Derive the axis-aligned screen bounding box from the extents of the
        // projected 3D bounding box.
        let minX = +Infinity
        let maxX = -Infinity
        let minY = +Infinity
        let maxY = -Infinity
        const bounds = [
            new THREE.Vector3(this.bbox.min.x, this.bbox.max.y, this.bbox.max.z),
            new THREE.Vector3(this.bbox.min.x, this.bbox.min.y, this.bbox.max.z),
            new THREE.Vector3(this.bbox.min.x, this.bbox.min.y, this.bbox.min.z),
            new THREE.Vector3(this.bbox.min.x, this.bbox.max.y, this.bbox.min.z),
            new THREE.Vector3(this.bbox.max.x, this.bbox.max.y, this.bbox.max.z),
            new THREE.Vector3(this.bbox.max.x, this.bbox.min.y, this.bbox.max.z),
            new THREE.Vector3(this.bbox.max.x, this.bbox.min.y, this.bbox.min.z),
            new THREE.Vector3(this.bbox.max.x, this.bbox.max.y, this.bbox.min.z)
        ]
        // Project to screen space.
        bounds.map(q => q.project(this.Renderer.getCamera()))
            // Map to relative screen coordinates.
            .map(q => new THREE.Vector2(0.5 * (q.x + 1), 1.0 - 0.5 * (q.y + 1)))
            // Derive min/max extents.
            .forEach(q => {
                minX = Math.min(minX, q.x)
                maxX = Math.max(maxX, q.x)
                minY = Math.min(minY, q.y)
                maxY = Math.max(maxY, q.y)
            })

        return [[minX, maxY], [maxX, maxY], [maxX, minY], [minX, minY]]
    }

    // Overrides base class method.
    isStackableSurfaceItem() { // eslint-disable-line class-methods-use-this
        return true
    }

    getPlane(): StackableSurfaceParameters {
      return this.plane
    }
      
    // The group of <StackableSurfaceItem3D> of a <FurnitureItem3D> is a stack-group. A <StackableSurfaceItem3D> that
    // belongs to the room and not to a parent <FurnitureItem3D> is called static.
    // A non-static StackableSurfaceItem id is formed concatenating the parent id with the stack-group-id. So, the 
    // stack-group-id is retrieved removing the <parentId> from the <StackableSurfaceItem3D>. Goes from [0, n], being 
    // n surface count - 1. Static surfaces are not parented, don't belong to a stack-group, function returns '-1'.
    getStackGroupId() {
      const parentId = this.getParentId()
      if (parentId) {
        return this.id.replace(parentId, '')
      }

      return '-1'
    }

    setRenderingLayer(layer: number) {
      this.renderingLayer = layer
    }

    public getSurfaceLocalPoints() {
        return this.plane.parameters.vertices
    }

    public getSurfaceWorldPoints() {
        const matWorld = this.getWorldTransform()
        return this.getSurfaceLocalPoints().map(point => new Point3(point[0], point[1], 0.0).mulMat4(matWorld))
    }
}

export default StackableSurfaceItem3D
