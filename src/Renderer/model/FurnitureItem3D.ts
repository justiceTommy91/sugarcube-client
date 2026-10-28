/* eslint-disable class-methods-use-this */
import * as Sentry from '@sentry/react'
import WallspiceWebgl from 'Renderer/WallspiceWebgl'

import * as THREE from 'three'

import Renderer from 'Renderer';
import { RenderItem3D } from "Renderer/model/RenderItem3D"

import * as WallSnap from 'Renderer/WallSnap'
import isMobile from 'utils/isMobile'
import { SnapRotationHandler } from 'Renderer/model/snap_rot_handler'

import {
    DEFAULT_THREE_NATIVE_LAYER,
    WALL_PLACEABLE_LAYER,
    EVT_FURNITURE_LOAD_BEGIN,
    EVT_FURNITURE_LOAD_END,
    EVT_FURNITURE_LOAD_END_DETAIL,
    EVT_FURNITURE_GLB_LOAD_END,
    NOTIFY_FURNITURE_ITEM_READY,
    NOTIFY_FURNITURE_ITEM_MOVE_START,
    NOTIFY_FURNITURE_ITEM_MOVE_END,
    ON_TOP_OF_DEFAULT_RENDER_ORDER,
    RUG_Z_FIGHT_OFFSET,
    AXIS_X,
    AXIS_Y,
    AXIS_Z,
    EXTRA_HINT_STACKABLE,
    AO_LAYER,
    COLOR_ID_SUBOBJECT_LAYER,
} from 'Renderer/constants'
import { NOTIFY_SCENE_ITEM_UPDATE, PlacingOptions, PlacingBehavior, 
  NOTIFY_VIEWER_STATE_UPDATE } from 'Renderer/geomviewer/geom_constants'
import { GrandCentral } from 'Renderer/GrandCentral'
import { BakedRugShadowPlane, ContactShadowPlanes, ShadowBaker } from 'Renderer/ShadowBaker'
import { mirrorModel } from 'Renderer/utils/modelUtils'
import { BehaviorTarget } from 'Renderer/positioning/positioning_system'
import TextureHelper from 'Renderer/TextureHelper'
import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import type { FurnitureItemParameters, Point2D, PointXY, Placement } from 'Renderer/geomviewer/geom_types'
import { Point2, Point3 } from 'Renderer/geometry'
import * as pu from 'Renderer/positioning/positioning_utilities'
import { 
    gvColorIdRenderer,
    gvCurrentCamera,
    gvCurrentScene,
    gvCurrentSettings,
    gvDecorateEngine,
    gvGeomModel,
    gvRenderLibrary } from 'Renderer/foundation/geom_app'
import type {
    DragResult,
    WallSnapAdapter,
    WallSnapBody,
    WallSnapPose,
} from 'Renderer/positioning/positioning_system'
import { PositioningBehavior3D, Behavior3DConfig } from 'Renderer/positioning/positioning_behavior_3d'
import { isFurnitureItem3D, isStackableSurfaceItem3D } from 'Renderer/rendering/scene_utils'
import { disposeMeshes, setMaterialOnBeforeCompileCallback } from 'Renderer/rendering/rendering_utils';
import { 
    getHeadingFromQuaternion,
    getRotationMatrixFromQuaternion,
    getInverted
} from 'Renderer/geometry/utilities'
import {
    convertFurniturePlacementFromSave,
    convertFurniturePlacementToSave,
} from 'Renderer/model/gltf_composition_utils'
import { RendererContextType } from 'Renderer/rendering/Enums'
import type { ItemPlacementData } from 'Renderer/geomviewer';
import { ProductDimensions } from 'Renderer/model/ProductDimensions'
import StackableSurfaceItem3D from './StackableSurfaceItem3D';

export type UpdateReactFunction = (pinInfo: { [key: string]: unknown }) => void

const workspace = {
    pt2: new Point2(0, 0),
    pt3: new Point3(0, 0, 0),
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    v3: new THREE.Vector3(),
}

class FurnitureItem3D extends RenderItem3D implements BehaviorTarget, WallSnapAdapter {
    private positioningBehavior: PositioningBehavior3D

    public pinPosition2d: THREE.Vector2 | null = null
    public defaultPinPosition3d: THREE.Vector3

    private furnitureData: FurnitureItemParameters
    private snapRotHandler?: SnapRotationHandler
    private wallSnapBody: WallSnapBody | null = null
    private furnitureRenderObject: THREE.Object3D | null = null

    private isRug: boolean
    private heading: number
    private isDownloading: boolean
    private isMirrored: boolean

    private marker: THREE.Mesh | null
    private boundingBox: THREE.LineSegments | null
    private lastUpdateFraction: number | null
    private isSelected: boolean
    private placeholderGroup: THREE.Group | null = null
    private placeholder?: THREE.Mesh
    private catcher?: THREE.Mesh

    private updateReactFunc: UpdateReactFunction
    private contactShadowPlanes: ContactShadowPlanes | null = null

    private productDimensions: ProductDimensions
    private swapTimer: ReturnType<typeof setTimeout> | null = null;
    private prevOpacity = new Map<THREE.Mesh, {opacity: number, transparent: boolean}>

    constructor(id: string, renderer: Renderer, incomingPlacement: Placement, furnitureData: FurnitureItemParameters,
        updateReact: UpdateReactFunction) {
        let placement = incomingPlacement
        const snapRotHandler = SnapRotationHandler.create(furnitureData)
        const needsPatch = !!renderer.settings.needs3DCompLoadPatch
        const snapRotUndo = snapRotHandler && getInverted(snapRotHandler.getCurrentSnapRotateTransform(needsPatch))
        if (placement.kind === `location3Legacy`) {
            placement = convertFurniturePlacementFromSave(placement, furnitureData, snapRotUndo)
        }
        super(id, renderer, placement.location3)

        let sx = 0.5 / furnitureData.scale
        let sy = 0.5 / furnitureData.scale
        let sz = 0.5 / furnitureData.scale
        if (furnitureData.min && furnitureData.max) {
            sx = furnitureData.max.x - furnitureData.min.x
            sy = furnitureData.max.y - furnitureData.min.y
            sz = furnitureData.max.z - furnitureData.min.z
        }
        this.productDimensions = new ProductDimensions(sx, sy, sz, 0, -0.5 * sy, 0)

        this.updateReactFunc = updateReact
        this.isDownloading = true

        this.furnitureData = furnitureData
        this.initParent()
        this.positioningBehavior = new PositioningBehavior3D(this, this.getPosSytemConfig())

        // Rotation available means it comes from saved composition, or a swap.
        this.heading = 0
        if (placement.rotation) {
            this.setRotRelative(getRotationMatrixFromQuaternion(placement.rotation))
            this.heading = getHeadingFromQuaternion(placement.rotation)
            const floorPlane = pu.getFloorPlane()
            const isStacked = !!furnitureData.stackOnSurfaceId && 
              placement.location3.hintExtraBindTo === EXTRA_HINT_STACKABLE
            if (floorPlane && !isStacked) {
                const zeroHeading = Math.atan2(-floorPlane.rot[1][0], -floorPlane.rot[1][2])
                this.heading -= zeroHeading
            }
        } else if (placement.kind === `location2Legacy`) {
            this.setHeading(placement.heading);
        }

        this.isRug = furnitureData.isRug

        this.defaultPinPosition3d = new THREE.Vector3()

        // For item's that can be mirrored only, keep track of the mirrored state.
        this.isMirrored = false
        this.renderingLayer = DEFAULT_THREE_NATIVE_LAYER
        this.marker = null
        this.boundingBox = null
        if (snapRotHandler) {
          this.snapRotHandler = snapRotHandler
        }

        if (furnitureData.initialAnimationOverride) {
            this.setAnimationOverride(furnitureData.initialAnimationOverride)
        }

        this.loadFurniture()
        this.lastUpdateFraction = null

        // to handle visual and mouseover states
        this.isSelected = false

        this.initPositioning(placement)
    }

    public getWallSnapAdapter() {
        return this
    }

    override getBbox(): THREE.Box3 {
        const siblings = this.getLinkedSiblings();
        const currentObject = this.getObject()

        // For combinable children with linked siblings,
        // bbox is the union of all siblings.
        if (siblings.length > 0 && currentObject) {
            const groupBbox = this.bbox.clone();
            const tempBox = new THREE.Box3();
            const tempMatrix = new THREE.Matrix4();

            for (const sibling of siblings) {
                const siblingObject = sibling.getObject()
                if (siblingObject) {
                    const siblingWorldMatrix = siblingObject.matrixWorld;
                    tempMatrix.copy(currentObject.matrixWorld).invert().multiply(siblingWorldMatrix);
                    tempBox.copy(sibling.bbox).applyMatrix4(tempMatrix);
                    groupBbox.union(tempBox);
                }
            }

            return groupBbox;
        }

        return super.getBbox();
    }

    public getBoundingBox(): THREE.LineSegments | null {
        return this.boundingBox;
    }

    public getContactShadowPlanes(): ContactShadowPlanes | null {
        return this.contactShadowPlanes
    }

    public getIsRug() {
        return this.isRug
    }

    public getShadowCatcher() {
        return this.catcher
    }

    public getFurnitureData(): FurnitureItemParameters {
        return this.furnitureData
    }

    public getHeading(): number {
        return this.heading
    }

    public setHeading(value: number) {
        this.heading = value
        if (this.wallSnapBody) {
            this.wallSnapBody.rot = value
        }
    }

    public updateReactPin(pinInfo: { [key: string]: unknown }) {
        this.updateReactFunc(pinInfo)
    }

    public override shouldHighLightOnDrag(): boolean {
        return this.getIsPlacedOnFloor()
    }

    private getIsPlacedOnFloor(): boolean {
        return this.getSurfaceBoundTo()?.class === 'floor'
    }

    public setPositionFromScreenPoint( screenPoint: PointXY): boolean {
        if (!this.positioningBehavior) {
            return false
        }
        const isValid = this.positioningBehavior.setTargetScreenPositionStatic([screenPoint.x, screenPoint.y])
        return isValid
    }

    public override dragTargetToScreenPoint(screenPoint: PointXY, dragOffset?: PointXY): DragResult {
        if (!this.positioningBehavior) {
            return { success: false }
        }
        const mousePointArray: Point2D | undefined = dragOffset &&
          [screenPoint.x - dragOffset.x, screenPoint.y - dragOffset.y]

        const dynamicMeasuremments = gvCurrentScene()?.getDynamicMeasurements()
        if (dynamicMeasuremments && dynamicMeasuremments.getTrackedItem() === this) {
            dynamicMeasuremments.refresh()
        }

        if (!this.getCanStack()) {
          return this.positioningBehavior.dragTargetToScreenPoint([screenPoint.x, screenPoint.y], mousePointArray)
        }
        
        // For stackables, keep visibility state, perform the drag and dispatch position validity update if changed.
        const isVisibleBeforeDrag = this.getIsVisible()
        const dragResult = this.positioningBehavior
          .dragTargetToScreenPoint([screenPoint.x, screenPoint.y], mousePointArray)

        if (isVisibleBeforeDrag !== this.visible) {
          GrandCentral.getDispatcher().dispatchNotification({
            what: NOTIFY_VIEWER_STATE_UPDATE,
            payload: {
              stateInfo: `ValidOrInvalidDestinationCursor`,
              isDragDestinationValid: this.visible
            }
          });
        }

        return dragResult
    }

    public inspectorReattachToSurface() {
        this.positioningBehavior.refreshTargetTransform()
    }

    public inspectorWallSnapPushOut() {
        const pos = this.getPosAbsolute()
        const arrayPoint = [pos.x, pos.y, pos.z]
        WallSnap.resetPosition(this, arrayPoint, pu.getFloorPlane())
        WallSnap.pushOut(this)
    }

    public getProductDimensions() {
        return this.productDimensions
    }

    private initParent() {
        if (this.furnitureData.canStack && this.furnitureData.stackOnSurfaceId) {
            this.setParentBySurfaceId(this.furnitureData.stackOnSurfaceId)
        } else if (this.furnitureData.combinablePlacement) {
            this.setParentByRenderItemId(String(this.furnitureData.combinablePlacement.parentId))
        } else {
            this.setParent(null)
        }
    }

    initPositioning(placement: Placement) {
        super.setPlacement(placement)

        if (placement.kind === `location2Legacy`) {
            this.positioningBehavior.setTargetScreenPositionStatic(placement.location2)
        }
        if (this.getPosSytemConfig().canBePlacedOnFloor) {
            this.initPhysicsEntity(placement.location3.hintExtraBindTo === EXTRA_HINT_STACKABLE)
        }

        if (!this.getIsDefaultRotation()) {
            this.adjustAfterSnapRotation()
        }
        this.positioningBehavior.refreshTargetTransform()
    }

    override setPlacement(placement: Placement) {
        super.setPlacement(placement)
        if (this.getIsPlacedOnFloor() && placement.location3.hintExtraBindTo !== EXTRA_HINT_STACKABLE) {
          const { x, y, z } = placement.location3.localPos
          WallSnap.resetPosition(this, [x, y, z], pu.getFloorPlane())
        }
        this.positioningBehavior.updateConfig(this.getPosSytemConfig())
        this.positioningBehavior.refreshTargetTransform()
    }

    // Return true if this is a stackable item, false otherwise.
    getCanStack() {
        return this.furnitureData.canStack
    }

    getOrientation() {
        return this.heading
    }

    setOrientation(orientation: number) {
        this.heading = orientation
        this.positioningBehavior?.refreshTargetTransform()
        if (this.body) this.body.rot = orientation
        this.updateRenderObject()
        const dynamicMeasuremments = gvCurrentScene()?.getDynamicMeasurements()
        if (dynamicMeasuremments && dynamicMeasuremments.getTrackedItem() === this) {
            dynamicMeasuremments.refresh()
        }
    }

    setIsMirrored(isMirrored: boolean) {
        // Ensure the model supports mirroring and the mirror state changed.
        if (this.furnitureData?.mirrorOption && isMirrored !== this.isMirrored) {
            // Despite its name, this function flips the model on each call.
            this.enableMirrorOption()
            this.isMirrored = isMirrored
        }
    }

    updateFloorContactShadowsEnabled() {
        this.updateContactShadowVisibility()
    }

    isCombinableChild() {
        return !!this.furnitureData?.combinablePlacement?.parentId
    }

    usesSockets() {
        return !!this.furnitureData?.combinablePlacement?.socketName
    }

    getLinkedSiblings() {
        const parent = this.getParent();
        const groupName = this.furnitureData?.combinablePlacement?.linkGroupName;

        if (!parent || !groupName) {
            return [];
        }

        return parent.getChildren()
            .filter((child): child is FurnitureItem3D => 
                isFurnitureItem3D(child) &&
                child !== this &&
                child.getFurnitureData().combinablePlacement?.linkGroupName === groupName
            );
    }

    getSocketName() {
        return this.furnitureData?.combinablePlacement?.socketName
    }

    isDuvet() {
        return this.getSocketName() === 'duvet_set_duvet'
    }

    isNoninteractable(): boolean {
        if (this.furnitureData.isNoninteractable) {
            return true;
        }

        return this.isCombinableChild();
    }

    private initPhysicsEntity(isStacked: boolean) {
        const { wallCollisions } = this.Renderer.settings
        const enableWallCollisions = wallCollisions && this.Renderer.isWallSnapSupported();
        if (!enableWallCollisions) {
            return
        }

        const config = this.getPosSytemConfig()
        const floorPlane = pu.getFloorPlane()
        if (floorPlane) {
            this.wallSnapBody = WallSnap.initBody(this, config.targetSizeX, config.targetSizeZ,
                floorPlane, this.Renderer.intrinsics)
            if (this.getIsPlacedOnFloor() && !isStacked) {
                WallSnap.pushOut(this)
            } else if (this.getCanStack() && isStacked) {
              // Item is not on the floor when physics are initialized and composition loads. Physics require a position
              // that is in the floor and within room bounds to avoid misbehaviors when it item switches to the floor.
              const floorDefaultPos = gvCurrentScene()?.getRoomDefaultFloorPos()
              if (floorDefaultPos) {
                const {x, y, z} = floorDefaultPos
                WallSnap.resetPosition(this, [x, y, z], pu.getFloorPlane())
              }
            }
        }
    }

    addPlaceholder() {
        this.placeholderGroup = new THREE.Group()
        this.placeholderGroup.userData.isPlaceholder = true

        let sx = 0.5 / this.furnitureData.scale
        let sy = 0.5 / this.furnitureData.scale
        let sz = 0.5 / this.furnitureData.scale
        if (this.furnitureData.min && this.furnitureData.max) {
            sx = this.furnitureData.max.x - this.furnitureData.min.x
            sy = this.furnitureData.max.y - this.furnitureData.min.y
            sz = this.furnitureData.max.z - this.furnitureData.min.z
        }
        const geometry = new THREE.BoxGeometry(sx, sy, sz)
        if (this.furnitureData.min && !this.usesSockets()) {
            geometry.translate(
                this.furnitureData.min.x + sx * 0.5,
                this.furnitureData.min.y + sy * 0.5,
                this.furnitureData.min.z + sz * 0.5,
            )
        } else {
            geometry.translate(0, 0.5 * sy, 0)
        }
        const emmisiveColor = this.Renderer.debugSettings.useFilmicLUT ? 0xFFFFFF : 0x555555
        this.placeholder = new THREE.Mesh(geometry, new CustomStandardMaterial({
            color: 0xFFFFFF,
            emissive: emmisiveColor,
            opacity: 0.5,
            transparent: true,
        }))

        this.placeholder.matrixAutoUpdate = false
        this.placeholder.visible = this.getIsVisible()
        this.placeholder.castShadow = false
        this.placeholder.receiveShadow = true

        this.bbox.makeEmpty()
        this.bbox.expandByObject(this.placeholder)

        this.placeholderGroup.name = this.name
        this.placeholderGroup.add(this.placeholder)
        this.placeholderGroup.matrixAutoUpdate = false
        this.placeholderGroup.userData.isNoninteractable = this.furnitureData.isNoninteractable
        // If we are waiting smarta, show the place holder only if the item is not stackable.
        const isStackableAndWaitingSmarta = this.getCanStack() && this.furnitureData.pendingSmartaPlacement
        this.placeholderGroup.visible = this.getIsVisible() && !isStackableAndWaitingSmarta

        const marker = new THREE.Mesh(geometry, new CustomStandardMaterial({
            color: 0xFFFFFF,
            emissive: emmisiveColor,
            polygonOffset: true,
            polygonOffsetFactor: 4,
        }))
        marker.name = `marker`
        marker.castShadow = true
        marker.receiveShadow = true
        this.placeholderGroup.add(marker)

        this.placeholderGroup.traverse(obj => {
            obj.layers.set(this.renderingLayer)
            obj.layers.enable(AO_LAYER)

            const material = (obj as THREE.Mesh).material as THREE.Material
            if (!material) return

            let onBeforeCompileCallback: THREE.Material["onBeforeCompile"] = () => {}
            if (!this.Renderer.debugSettings.useFilmicLUT || 
                gvRenderLibrary()?.getRendererContextType() === RendererContextType.WebGL1Context)
            {
                onBeforeCompileCallback = ( shader: { fragmentShader: string } ) => {
                    /* eslint-disable no-param-reassign */
                    if(!this.Renderer.debugSettings.useFilmicLUT) {
                        shader.fragmentShader = shader.fragmentShader.replace(
                            `#include <dithering_fragment>`,
                            `#include <dithering_fragment>
                            gl_FragColor = LinearTosRGB( gl_FragColor );`
                        )
                    }
                    // A tweak to workaround a shader error cause ThreeJS dropped support of WGL1 on r153.
                    if (gvRenderLibrary()?.getRendererContextType() === RendererContextType.WebGL1Context) {
                        shader.fragmentShader = shader.fragmentShader.replace(
                            `#define STANDARD`,
                            `#define STANDARD
                            #extension GL_OES_standard_derivatives : enable
                            `
                        )
                    }
                    /* eslint-enable no-param-reassign */
                }
            }

            setMaterialOnBeforeCompileCallback(material, onBeforeCompileCallback)

            const customMaterial = material as CustomStandardMaterial
            const envMap = gvCurrentScene()?.getEnvMap()
            const envMapIntensity = gvCurrentSettings()?.debugSettings?.environmentIntensity || 0
            if (envMap) {
                customMaterial.envMap = envMap
                customMaterial.envMapIntensity = envMapIntensity
            }
        })

        this.marker = marker
        this.lastUpdateFraction = 0.0

        const snapRotMat = this.snapRotHandler?.getCurrentSnapRotationMatrix()
        if (!this.snapRotHandler?.isDefaultRotation() && snapRotMat) {
            this.placeholderGroup.children.forEach(child => {
              child.matrix.copy(snapRotMat)
              child.matrix.decompose(child.position, child.quaternion, child.scale)
            })
        }

        const colorIdMtl = gvColorIdRenderer()?.createMaterialFor(this)
        if (colorIdMtl) {
            colorIdMtl.uniforms.inflation.value = 0.0
            const placeholderColorId = new THREE.Mesh(geometry, colorIdMtl)
            placeholderColorId.userData.isColorIdMesh = true
            placeholderColorId.userData.isPlaceholder = true
            placeholderColorId.userData.colorIdColor = this.colorIdColor
            placeholderColorId.layers.set(COLOR_ID_SUBOBJECT_LAYER)
            this.placeholderGroup.add(placeholderColorId)
        }

        this.setObject(this.placeholderGroup)
        this.updatePlaceholder(0.0)
    }

    updatePlaceholder(fraction: number) {
        const quantFraction = Math.floor(fraction * 10.0) / 10.0
        const limitedFraction = Math.max(0.001, Math.min(quantFraction, 0.9))

        if (limitedFraction !== this.lastUpdateFraction) {
            if (this.marker) {
                if (this.furnitureData.rotX === 0) {
                    this.marker.scale.z = limitedFraction
                } else {
                    this.marker.scale.y = limitedFraction
                }
                if (this.Renderer.settings.showItemLoaders) {
                    this.Renderer.setRenderIsDirty()
                }
            }
            this.lastUpdateFraction = limitedFraction
        }
    }

    clearObject() {
        disposeMeshes(this.placeholderGroup)

        if (this.marker) {
            this.marker = null
        }
        if (this.getObject()) {
            this.unsetObject()
        }
        this.placeholderGroup = null
    }

    onHover() {
        const childItems = this.children.filter((child): child is FurnitureItem3D => isFurnitureItem3D(child))
        const selectedChildren = childItems.filter(child => child.isSelected)
        if (selectedChildren.length) {
            selectedChildren.forEach(child => child.onHover())
        } else {
            this.enableOutline(this.isSelected)
            this.updateOutlineThickness()
        }
        const dynamicMeasurements = gvCurrentScene()?.getDynamicMeasurements()
        if (dynamicMeasurements && dynamicMeasurements.getIsEnabled()) {
            dynamicMeasurements.setTrackingItem(this)
        }
        this.productDimensions.onObjectHover()
    }

    onHoverEnd() {
        const childItems = this.children.filter((child): child is FurnitureItem3D => isFurnitureItem3D(child))
        const isChildSelected = childItems.some(child => child.isSelected)
        if (!this.isSelected && !isChildSelected) {
            this.disableOutline()
            gvCurrentScene()?.getDynamicMeasurements()?.setTrackingItem(null)
        }
        const dynamicMeasuremments = gvCurrentScene()?.getDynamicMeasurements()
        if (dynamicMeasuremments && dynamicMeasuremments.getTrackedItem() === this) {
            dynamicMeasuremments.setTrackingItem(null)
        }
        this.productDimensions.onObjectHoverEnd(this.isSelected)
        this.updateOutlineThickness()
    }

    onSelect() {
        this.isSelected = true
        const renderObject = this.getObject()
        if (renderObject) {
            renderObject.userData.isSelected = true
        }
        this.enableOutline(true)
        this.productDimensions.onObjectSelect()
    }

    onSelectEnd() {
        this.isSelected = false
        const renderObject = this.getObject()
        if (renderObject) {
            renderObject.userData.isSelected = false
        }
        this.disableOutline()
        this.productDimensions.onObjectSelectEnd()
    }

    updateOutlineThickness() {
        if (!this.Renderer) {
            return
        }
        this.Renderer.setOutlineThickness()
    }

    resizeTextures(rootObject: THREE.Object3D) {
        const textureMap = new Map()
        const textureHelper = new TextureHelper()
        const textureSize = this.Renderer.maxTextureSize
        const processTexture = (texture: THREE.Texture) => {
            if (!texture || !texture.image || textureMap.has(texture.uuid)) {
                return
            }
            if (Math.max(texture.image.width, texture.image.height) <= textureSize) {
                return
            }
            textureMap.set(texture.uuid, {
                old: texture,
                resized: textureHelper.getResizedCopy(texture, textureSize, textureSize)
            })
        }
        const reassignTexture = (material: {
            [key: string]: THREE.Texture | undefined
          }, propertyName: string) => {
            const textureProperty = material[propertyName]
            if (!textureProperty) {
                return
            }
            const info = textureMap.get(textureProperty.uuid)
            if (info && info.resized) {
                // eslint-disable-next-line no-param-reassign
                material[propertyName] = info.resized
            }
        }
        rootObject.traverse((child) => {
            if (!(child instanceof THREE.Mesh) || !child.material) {
                return
            }
            processTexture(child.material.map)
            processTexture(child.material.normalMap)
            processTexture(child.material.roughnessMap)
            processTexture(child.material.metalnessMap)
            processTexture(child.material.aoMap)
        })
        rootObject.traverse((child) => {
            if (!(child instanceof THREE.Mesh) || !child.material) {
                return
            }
            reassignTexture(child.material, `map`)
            reassignTexture(child.material, `normalMap`)
            reassignTexture(child.material, `roughnessMap`)
            reassignTexture(child.material, `metalnessMap`)
            reassignTexture(child.material, `aoMap`)
        })
        textureMap.forEach((value) => {
            value.old.dispose()
            if (value.old.image && value.old.image.close) {
                value.old.image.close()
            }
        })
        textureHelper.dispose()
        textureMap.clear()
    }

    // Create a transparent plane to sit on top of rugs and overlay floor furniture contact shadows.
    private createRugContactShadowCatcherPlane(furnishing: THREE.Object3D) {
        const catcherVertexShader = /* glsl */ `
        varying vec4 vWorldPosition;
        void main() {
            vWorldPosition = modelMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`

        const catcherFragmentShader = /* glsl */ `
            uniform sampler2D map;
            varying vec4 vWorldPosition;
            uniform mat4 uShadowMatrix;

            void main() {
                vec4 shadowSpacePosition = uShadowMatrix * vWorldPosition;
                vec2 shadowUv = (shadowSpacePosition.xy + vec2(1.0)) / vec2(2.0);
                vec4 fetch = pow(vec4(0.5) * texture2D(map, shadowUv.xy), vec4(0.9));
                gl_FragColor = fetch;
            }`

        const shadowCamera = this.Renderer.getContactShadowCamera()
        const catcherMaterial = new THREE.ShaderMaterial({
            vertexShader: catcherVertexShader,
            fragmentShader: catcherFragmentShader,
            transparent: true,
            depthWrite: false,
            // don't render rug contact shadows over footprints
            stencilWrite: true,
            stencilRef: 2,
            stencilFunc: THREE.NotEqualStencilFunc,
            uniforms: {
                map: {
                    value: this.Renderer.getContactShadowTexRenderTarget().texture,
                },
                uShadowMatrix: {
                    value: shadowCamera.projectionMatrix.clone().multiply(shadowCamera.matrixWorldInverse),
                },
            },
        })

        const catcherGeo = new THREE.PlaneGeometry(
            this.furnitureData.max.x - this.furnitureData.min.x,
            this.furnitureData.max.z - this.furnitureData.min.z,
        )
        catcherGeo.rotateX(-Math.PI / 2)
        // apply small random offset to contact shadow catcher to prevent z fighting
        // of contact shadows between rugs of the same thickness
        const quant = 0.025
        const rnd = Math.random()
        const quantifiedRandom = rnd - rnd % quant
        const maxOffset = RUG_Z_FIGHT_OFFSET
        const offset = quantifiedRandom * maxOffset
        const thickness = this.bbox.max.y - this.bbox.min.y
        catcherGeo.translate(0, thickness + offset, 0)

        const noColorDelta = 0.5 * quant * maxOffset
        const noColorGeom = catcherGeo.clone()
        noColorGeom.translate(0, -noColorDelta, 0)

        // trick to stop contact shadows from appearing darker where multiple rugs overlap
        // depth, but not color is rendered to the buffer for all rug catchers before other rendering.
        // overlapping contact shadow catchers will fail the depth test due to the offset.
        // https://stackoverflow.com/a/36948438
        const noColorWriteMaterial = new THREE.MeshStandardMaterial({
            colorWrite: false,
            transparent: true,
        })
        const catcherColorWriteFalse = new THREE.Mesh(noColorGeom, noColorWriteMaterial)
        const catcherColorWriteTrue = new THREE.Mesh(catcherGeo, catcherMaterial)
        catcherColorWriteTrue.renderOrder = ON_TOP_OF_DEFAULT_RENDER_ORDER

        furnishing.add(catcherColorWriteFalse)
        furnishing.add(catcherColorWriteTrue)
        return catcherColorWriteTrue
    }

    private hidePlaceholderGroup() {
        if (!this.placeholderGroup) return;
        this.prevOpacity.clear()

        // Use opacity to hide the placeholder to make sure the boundingbox remains unchanged
        this.placeholderGroup.traverse(obj => { 
            if (obj instanceof THREE.Mesh) { 
                this.prevOpacity.set(
                    obj as THREE.Mesh, 
                    { opacity: obj.material.opacity, transparent: obj.material.transparent }
                );
                obj.material.transparent = true;
                obj.material.opacity = 0.0; 
            }
        });
    }

    private showPlaceholderGroup() {
        if (!this.placeholderGroup) return;
        this.placeholderGroup.traverse(obj => { 
            if (obj instanceof THREE.Mesh) { 
                const prev = this.prevOpacity.get(obj)
                if (prev) {
                    obj.material.transparent = prev.transparent; 
                    obj.material.opacity = prev.opacity; 
                }
            }
        });
    }

    updateMaterial(materialUrl: string) {
        this.Renderer.furnitureManager.getMaterialFromUrl(
            materialUrl, this.furnitureData.id, this.Renderer, this.metrics
        )
        .then(newMaterial => {
            if (this.furnitureRenderObject && this.furnitureRenderObject.children.length > 0) {
                const baseMesh = this.furnitureRenderObject?.children[0] as THREE.Mesh
                baseMesh.material = newMaterial
                this.furnitureData.materialUrl = materialUrl

                this.Renderer.setRenderIsDirty()
            }
        }).catch(error => {
            if (error) {
                // eslint-disable-next-line no-console
                console.error(error)
                Sentry.captureException(error)
            }
        })
    }

    async loadFurniture() {
        this.clearObject()

        gvColorIdRenderer()?.reserveColorId(this)
        this.addPlaceholder()
        if (this.isDuvet() && this.placeholderGroup) {
            // Don't show placeholder for duvets, but still add for removal during loading.
            this.placeholderGroup.visible = false;
        }

        // Delay display of placeholder for swapped-in items
        if (this.furnitureData.swappedInItem) {
            this.hidePlaceholderGroup()

            this.swapTimer = setTimeout(() => {
                this.swapTimer = null;
                if (!this.isDuvet()) {
                    this.showPlaceholderGroup()
                }
            }, 200);
        }

        this.Renderer?.pinsManager?.addItem(this)

        this.metrics.msStartLoad = Date.now()

        if (this.furnitureData.pendingSmartaPlacement) {
            return
        }

        document.dispatchEvent(new Event(EVT_FURNITURE_LOAD_BEGIN))

        const materialPromise = this.furnitureData.materialUrl ? 
            this.Renderer.furnitureManager.getMaterialFromUrl(
                this.furnitureData.materialUrl, this.furnitureData.id,
                this.Renderer, this.metrics
            ) : Promise.resolve(null)

        const modelPromise = this.Renderer.furnitureManager.getModelFromUrl(
            this.furnitureData.modelUrl,
            this.furnitureData.id,
            (progress) => {
                // Use the largest loaded size by default.
                let defaultSize = progress.loaded

                // If request is length computable use total.
                if (progress.lengthComputable) {
                    defaultSize = progress.total
                } else if (progress.currentTarget instanceof XMLHttpRequest) {
                    // If response is gzipped lengthComputable may be false, but
                    //  we can still read the content-length header.
                    // This won't match the transmitted/loaded size but it's still a better indicator.
                    const contentLength = progress.currentTarget.getResponseHeader(`content-length`)
                    if (contentLength) {
                        defaultSize = Number(contentLength)
                    }
                }

                // Save the latest metric.
                this.setLoadSize(defaultSize)

                // Progress is the uncompressed size so get the total from the model data
                const { uncompressedModelSize } = this.furnitureData
                const total = (uncompressedModelSize || defaultSize)

                if (total > 0) {
                    // Total can be smaller (compressed size), so cap progress at 1.0.
                    this.updatePlaceholder(Math.min(progress.loaded / total, 1.0))
                }
            },
            () => {}, // this.update(),
            this.Renderer,
            this.metrics,
            !!this.furnitureData.materialUrl
        )

        Promise.all([
            modelPromise, materialPromise
        ]).then(([model, material]) => {
            document.dispatchEvent(new Event(EVT_FURNITURE_GLB_LOAD_END))

            this.metrics.msEndLoad = Date.now()
            this.metrics.sLoadTime = (this.metrics.msEndLoad - this.metrics.msStartLoad) * 0.001
            /* eslint-disable no-param-reassign */
            model.matrix.identity()
            model.matrix.decompose(model.position, model.quaternion, model.scale)
            model.updateMatrixWorld(true)
            this.bbox.makeEmpty()
            this.bbox.expandByObject(model)

            // Sometimes furniture loading can be slower than scene processing
            // that the view manager updates the placeHolders properties (eg. visibility)
            // instead of the actual item, like view blocking items, so they're copied here.
            const placeHolderUserData = this.placeholderGroup?.userData || {}

            if (this.swapTimer) {
                clearTimeout(this.swapTimer);
                this.swapTimer = null;
            }

            this.clearObject()
            this.furnitureRenderObject = model
            const rootObject = new THREE.Group()
            rootObject.name = this.name
            rootObject.visible = this.getIsVisible()
            rootObject.userData = { ...placeHolderUserData, ...rootObject.userData }
            rootObject.userData.isFurniture = true
            rootObject.userData.isRug = this.isRug
            rootObject.userData.isNoninteractable = this.furnitureData.isNoninteractable
            rootObject.add(model)

            if (material && model.children.length > 0) {
                const baseMesh = model.children[0] as THREE.Mesh
                baseMesh.material = material
            }

            // Item loading may be cancelled by the moment loading finished, the item might be already in deleted state.
            // Most of the resources have been cleared by the CompositionItem's componentWillUnmount at this point - 
            // the only thing left is releasing the freshly loaded model.
            if (this.isDeleted) {
                this.Renderer.furnitureManager.releaseModel(this.furnitureRenderObject)

                this.metrics.msEndFlush = Date.now()
                this.metrics.sFlushTime = (this.metrics.msEndFlush - this.metrics.msEndLoad) * 0.001
                this.metrics.sTotalTime = (this.metrics.msEndFlush - this.metrics.msStartLoad) * 0.001
                return
            }

            // Generate baked shadow surfaces with model at default snap rotate orientation
            if (this.Renderer.getThreeRenderer() 
                && !this.furnitureData.isRug
                && !this.isCombinableChild()) {
                this.contactShadowPlanes = new ShadowBaker().getBakedShadowPlanes(
                    this.furnitureData,
                    model,
                    this.Renderer.getThreeRenderer(),
                )
                this.updateContactShadowVisibility()
                model.add(this.contactShadowPlanes)
            }

            // This updates the renderobject (and snap rotate matrix)
            this.setObject(rootObject)

            if (isMobile()) {
                this.resizeTextures(rootObject)
            }

            // ThreeJS saves the texture memory on RAM to allow future texture updates, so to reduce memory footprint we
            // force early upload the material maps to GPU, delete them from the RAM memory.
            if (this.Renderer.getThreeRenderer()) {
                model.traverse(obj => {
                    if (!(obj instanceof BakedRugShadowPlane)) {
                        obj.layers.set(this.renderingLayer)
                    }
                    if (!(obj instanceof THREE.Mesh) || !obj.material || !obj.material.isMeshStandardMaterial) {
                        return
                    }

                    obj.layers.enable(AO_LAYER)
                    obj.receiveShadow = true

                    if (this.getSocketName() && // Quick way to check for morpheus items.
                        obj.material.type === `CustomStandardMaterial`) {
                        // Apply an empircally chosen subtle sheen effect.
                        // TODO: Remove when we have assets with sheen definition.
                        obj.material.applySheen()
                    }

                    const keyCount = Object.keys(obj.material).length
                    for (let i = 0; i < keyCount; i += 1) {
                        const key = Object.keys(obj.material)[i];

                        if (key !== 'envMap' // envMap is reused between objects and we get an error trying to reinit.
                            && key.toLowerCase().endsWith('map') && obj.material[key]?.image) {
                            obj.material[key].format = THREE.RGBAFormat
                            this.Renderer.getThreeRenderer().initTexture(obj.material[key])

                            // Closing ImageBitmaps here could help us release memory without expensive GC.
                            if (typeof obj.material[key].image.close === 'function') {
                                obj.material[key].image.close()
                            }

                            delete obj.material[key].image
                        }
                    }
                })
            }

            this.boundingBox = WallspiceWebgl.createBoundingBox(this.bbox)
            
            if(this.boundingBox) {
                this.boundingBox.visible = false
                model.add(this.boundingBox)
            }

            this.Renderer.incrementLoadedItems(this.getLoadSize())
            this.addToScene()
            if (this.isSelected) {
                this.onSelect()
            }

            // Call update once more after frame is rendered.
            this.Renderer.onChildUpdate(() => this.notifyScreenProjectionUpdate())
            this.adjustChildSurfaceTransforms()

            this.metrics.msEndFlush = Date.now()
            this.metrics.sFlushTime = (this.metrics.msEndFlush - this.metrics.msEndLoad) * 0.001
            this.metrics.sTotalTime = (this.metrics.msEndFlush - this.metrics.msStartLoad) * 0.001
            this.metrics.isInitPosInRoomBounds = this.isInRoomBounds()

            if (this.isRug) {
                // rugs require extra setup to work properly with footprints and floor contact shadows
                const childMeshes: THREE.Mesh[] = []
                rootObject.traverse((child) => {
                    if (!(child instanceof THREE.Mesh)) {
                        return
                    }
                    childMeshes.push(child)
                })
                childMeshes.forEach((child) => {
                    const backsideMesh = child.clone()
                    backsideMesh.scale.y *= 0.5
                    backsideMesh.matrixAutoUpdate = true

                    const childMaterial = child.material as THREE.MeshStandardMaterial
                    backsideMesh.material = new THREE.MeshStandardMaterial({
                        map: childMaterial.map,
                        color: childMaterial.color,
                        normalMap: childMaterial.normalMap,
                        metalness: childMaterial.metalness,
                        roughness: childMaterial.roughness,
                        metalnessMap: childMaterial.metalnessMap,
                        roughnessMap: childMaterial.roughnessMap,
                        aoMap: childMaterial.aoMap,
                    })
                    backsideMesh.userData = { isBacksideMesh: true }

                    child.add(backsideMesh)
                    childMaterial.stencilWrite = true
                    childMaterial.stencilFunc = THREE.NotEqualStencilFunc
                    childMaterial.stencilRef = 2
                })

                // add a transparent shadow catcher plane above the rug to display the contact shadows of floor items
                this.catcher = this.createRugContactShadowCatcherPlane(rootObject)
            }

            if (this.furnitureData.shouldMirrorItem) {
                this.enableMirrorOption()
                this.isMirrored = true
            }

            rootObject.add(this.productDimensions.getRootObject())

            // Safari WebInspector seem to be ignoring CustomEvents, at the same time we need to pass more
            // info here for tests, that's why there are two dispatches.
            document.dispatchEvent(new Event(EVT_FURNITURE_LOAD_END))
            document.dispatchEvent(new CustomEvent(EVT_FURNITURE_LOAD_END_DETAIL, { detail: {
                furnitureData: this.furnitureData
            }}))
            this.dispatchItemReadyUpdate()

            this.onItemLoadedAndPositioned()
            this.isDownloading = false

        }).catch((error) => {
            this.metrics.msEndLoad = Date.now()
            this.metrics.sLoadTime = (this.metrics.msEndLoad - this.metrics.msStartLoad) * 0.001
            // this.metrics.failed = true
            if (error) {
                // eslint-disable-next-line no-console
                console.error(error)
                this.metrics.errorMessage = error.message
                Sentry.captureException(error)
            }
            this.dispatchItemPlacementUpdate(/* { metrics: this.metrics } */)
        })
    }

    override endIsNigh() {
        if (this.swapTimer) {
            clearTimeout(this.swapTimer);
            this.swapTimer = null;
        }

        this.Renderer?.pinsManager?.removeItem(this)
        disposeMeshes(this.placeholderGroup)
        super.endIsNigh()
        this.disposeContactShadows()
        this.productDimensions.dispose()
    }

    protected override disposeObject() {
        if (!this.furnitureRenderObject) {
          return
        }
        this.Renderer.furnitureManager.releaseModel(this.furnitureRenderObject)
    }

    disposeContactShadows() {
        if (this.catcher) {
            this.catcher.geometry.dispose()

            const material = this.catcher.material as THREE.Material
            if (material) {
                material.dispose()
            }
        }
        if (!this.contactShadowPlanes) {
            return
        }
        this.contactShadowPlanes.traverse(plane => {
            if (!(plane instanceof THREE.Mesh)) {
                return
            }
            plane.geometry.dispose()
            plane.material.map.dispose()
            plane.material.dispose()
        })
        this.contactShadowPlanes.renderTargets.forEach(renderTarget => {
            renderTarget.dispose()
        })
    }

    onDragStart() {
        super.onDragStart()
        const parent = this.getParent()
        if (parent && parent.isStackableSurfaceItem()) {
            // Due to the way threejs sorts the render order of transparent objects
            // contact shadows for stacked items will pop in and out of view as they pass
            // further from the camera than the centroid of the surface they are stacked on.
            // To counteract this, we hide the contact shadow the entire time a stacked item
            // is being moved on its surface.
            // For more information on the problem,
            // see https://discourse.threejs.org/t/material-transparency-problem/3822/5
            this.contactShadowPlanes?.downward?.toggleVisibilityOff()
            parent.onChildDragStart()
        }
        GrandCentral.getDispatcher().dispatchNotification({
            what: NOTIFY_FURNITURE_ITEM_MOVE_START,
            payload: { furnitureItemId: this.id }
        })
        const scene = gvCurrentScene()
        if (scene) {
            scene.getDynamicMeasurements()?.setTrackingItem(this)
            scene.hideAllProductDimensions()
        }
    }

    onDragFinish() {
        super.onDragFinish()
        this.onMoveFinish()
        const parent = this.getParent()
        if (parent && parent.isStackableSurfaceItem()) {
          parent.onChildDragFinish()
        }
        this.refreshChildSurfacesStaticProps()
        this.updateContactShadowVisibility()
        this.productDimensions.onObjectDragFinish()
        const dynamicMeasuremments = gvCurrentScene()?.getDynamicMeasurements()
        if (dynamicMeasuremments && dynamicMeasuremments.getTrackedItem() === this) {
            dynamicMeasuremments.setTrackingItem(null)
        }
    }

    onMoveFinish() {
        GrandCentral.getDispatcher().dispatchNotification({
            what: NOTIFY_FURNITURE_ITEM_MOVE_END,
            payload: { furnitureItemId: this.id }
        })

        this.dispatchItemPlacementUpdate()
    }

    updateParenting() {
        super.updateParenting()

        // Update if wall<->floor transition.
        this.updateContactShadowVisibility()
        this.updateSnapRotHandler()
    }

    updateContactShadowVisibility() {
        const isBoundOnWall = this.isBoundToWall()
        if (this.contactShadowPlanes) {
            this.contactShadowPlanes.backward?.setVisible(isBoundOnWall 
                && this.Renderer.debugSettings.useFloorContactShadows)
            this.contactShadowPlanes.downward?.setVisible(this.getDownwardShadowPlaneVisibility())
            this.contactShadowPlanes.downwardRug?.setVisible(this.getDownwardShadowPlaneVisibility())
        }
        if (this.catcher) {
            this.catcher.visible = this.getDownwardShadowPlaneVisibility()
        }
        const parent = this.getParent()
        if (parent) {
            this.renderingLayer = parent.getRenderingLayer()
        } else {
            const isMeshScene = gvCurrentSettings()?.viewerSettings?.is3dMeshScene || false
            this.renderingLayer = isBoundOnWall && !isMeshScene ? WALL_PLACEABLE_LAYER : DEFAULT_THREE_NATIVE_LAYER
        }

        this.traverse(item => {
            const renderObject = item.getObject()
            renderObject?.traverse(obj => {
                if (obj && !obj.userData?.isColorIdMesh && !(obj instanceof BakedRugShadowPlane)) {
                    obj.layers.set(this.renderingLayer)
                }

                if (obj instanceof THREE.Mesh && obj.material?.isMeshStandardMaterial) {
                    obj.layers.enable(AO_LAYER);
                }
            })
            if (item instanceof StackableSurfaceItem3D) {
                item.setRenderingLayer(this.renderingLayer)
            }
            return true
        })

        this.Renderer?.scene?.updateHasWallAnchored()
    }

    getDownwardShadowPlaneVisibility() {
        // Currently, if item has a parent and it's visible, means that it's either on a stackable surface which
        // is currently visible (e.g. during dragging), or it's a combinable child.
        const parent = this.getParent()
        const isOnVisibleParent = !!(parent && parent.getIsVisible())
        return this.Renderer.debugSettings.useFloorContactShadows &&
            !this.isBoundToWall() &&
            this.getIsDefaultRotation() &&
            !isOnVisibleParent
    }

    enableMirrorOption() {
        const axis = this.furnitureData.mirrorOption
        if (!axis || !this.furnitureRenderObject) {
            return
        }
        mirrorModel(this.furnitureRenderObject, axis)
        this.traverse((child) => {
            if (child === this) {
                return true
            }
            // Re-position any stacked children to match the mirrored parent.
            const position = child.getPosRelative()
            child.setPosRelative(
                { 
                    x: axis === AXIS_X ? -position.x : position.x,
                    y: axis === AXIS_Y ? -position.y : position.y,
                    z: axis === AXIS_Z ? -position.z : position.z
                })
            
            if (child instanceof StackableSurfaceItem3D) {
                // Stackable surfaces need to be mirrored. 
                const renderObject = child.getObject()
                if (renderObject) {
                    mirrorModel(renderObject, axis)
                }
            }
            return true
        })
        this.onMoveFinish()
        this.Renderer.setRenderIsDirty()
    }

    // Get the logical "root" parent for this item, i.e.:
    // - for non-static stackables - furniture item that owns a surface this item is placed on.
    // - for combinable children: the root furniture item for the whole assembly.
    getRootFurnitureParent() {
        const parent = this.getParent()
        if (!parent) {
            return null
        }
        if (parent.isStackableSurfaceItem()) {
            return parent.getParent()
        }
        if (this.isCombinableChild()) {
            let lastParent = parent
            // While practically not occurring now, theoretically it's possible to have a combinable
            // stackable, which may have longer parents chain, we want to stop when we reached
            // the first non-combinable-child parent.
            while (isFurnitureItem3D(lastParent) && lastParent.isCombinableChild()) {
                const nextParent = lastParent.getParent()
                if (!nextParent) {
                    break
                }
                lastParent = nextParent
            }
            return lastParent
        }
        return parent
    }

    // Get placement in the format required by 3D GLTF composition format, in which parenting rules and
    // scene graph is different from the one used in the viewer.
    getSavePositioningInfo() {
        return convertFurniturePlacementToSave(this)
    }

    getItemPlacementData(): ItemPlacementData {
        const gltfSaveInfo = this.getSavePositioningInfo()

        // Data for legacy compositions saving:
        let stackedOnSurfaceId = undefined
        const parent = this.getParent()
        if (parent && parent.isStackableSurfaceItem()) {
            stackedOnSurfaceId = parent.getId()
        }
        const parentId = this.getRootFurnitureParent()?.getId()

        return {
            heading: this.heading,
            stackedOnSurfaceId,
            additionalContacts: [],
            parentId,
            placingBehavior: this.getPlacingBehavior(),
            snapRotationIndex: this.getSnapRotIndex(),
            rawPlacement3d: { ...this.getPlacement() },
            ...gltfSaveInfo
        }
    }

    protected override shouldDispatchPlacementUpdate(): boolean {
        if (!super.shouldDispatchPlacementUpdate()) {
            return false
        }

        // Dispatch furniture item placement updates only when either the scene has been fully loaded
        // or the scene is still loading and the item has been downloaded.
        // This is needed to avoid costly intermediate react updates on scene loading
        // (e.g. dispatching updates for placeholder positions)
        return !gvGeomModel()?.isCompositionLoading() || !this.isDownloading
    }

    // Dispatch a SceneItemUpdateNotification-ItemPlacement notification.
    dispatchItemPlacementUpdate() {
        const collisionState = this.positioningBehavior.getCollisionState().map(surfaceCollision => {
            const type = surfaceCollision.surfaceType
            const id = surfaceCollision.surfaceId
            const collisionString = id ? `${type}-${id}` : type
            return collisionString
        })

        const notification = {
            what: NOTIFY_SCENE_ITEM_UPDATE,
            payload: {
                itemId: this.id,
                stateInfo: `ItemPlacement`,
                itemData: this.getItemPlacementData(),
                collisionState
            }
        }

        // updateReachFunc updates the item's action panel UI coords. UI and the items position need to be synced.
        // This means that both, the call updateReactFunc and the placement update dispatch make sense together.
        this.updateReactFunc({
            corners: this.getCorners(),
            heading: this.heading,
        })
        GrandCentral.getDispatcher().dispatchNotification(notification);
    }

    // Dispatches isAutoplacement flag to track the viewer's autoPlacement usage and the new stackedOnSurfaceId.
    dispatchSceneItemUpdateWithAutoPlacement () {
      const notification = {
        what: NOTIFY_SCENE_ITEM_UPDATE,
        payload: {
          itemId: this.id,
          stateInfo: `ItemPlacement`,
          itemData: {
            isAutoPlacement: true,
            stackedOnSurfaceId: this.getParent()?.getId(),
          }
        }
      }
      GrandCentral.getDispatcher().dispatchNotification(notification);
    }

    getPlacingBehavior() {
        return this.isBoundToWall() ? PlacingBehavior.ON_WALL : PlacingBehavior.ON_FLOOR
    }

    toNextSnapRotation() {
        if (!this.snapRotHandler) {
            return
        }
        this.snapRotHandler.toNextSnapRotation()
        this.adjustAfterSnapRotation()
        this.updateContactShadowVisibility()
    }

    // After a snap rotation, the item may need adjusting, for instance if it's
    // mounted on the wall and now rises above the ceiling line.
    adjustAfterSnapRotation() {
        this.positioningBehavior.updateConfig(this.getPosSytemConfig())
        this.initPhysicsEntity(false)
    }

    isBoundToWall() {
        // Static stackable surfaces have ids 0, 1, 2.. and on. Room surfaces also have ids 0, 1, 2... and on. 
        // This means one same id can map to two different surfaces. These are distinguished through partnership.
        const isParentSsurf = this.getParent()?.isStackableSurfaceItem()
        const isParentStaticSsurf = isParentSsurf && !this.getParent()?.getParent()
        return !isParentStaticSsurf && (this.getSurfaceBoundTo()?.class === 'wall')
    }

    getIsSnapRotatable() {
        // eslint-disable-next-line no-bitwise
        return !!(this.furnitureData.placingOptions & PlacingOptions.SNAP_ROTATABLE)
    }

    getSnapRotIndex() {
        return this.snapRotHandler?.getCurrentSnapRotationIndex() || 0
    }

    // Return whether the item has the default rotation. The default rotation is the item's rotation
    // when it is inserted into the scene. This is useful, for instance, to enable or disable stackable
    // surfaces.
    getIsDefaultRotation() {
        if (this.snapRotHandler) {
            return this.snapRotHandler.isDefaultRotation()
        }
        return true
    }

    isInRoomBounds(/* pose: Pose, position: Point2D, isCombinableChild: boolean */) {
        return true // this.posSystem?.isInRoomBounds(pose, position, isCombinableChild)
    }

    getSnapRotModelMatrix() {
        return this.snapRotHandler?.getCurrentSnapRotationMatrix()
    }

    getPosSytemConfig(): Behavior3DConfig {
        /* eslint-disable no-bitwise */
        const isWallPlaceableOnly = !!(this.furnitureData.placingOptions & PlacingOptions.WALL_ONLY)
        const isWallAndFloor = !!(this.furnitureData.placingOptions & PlacingOptions.WALL_AND_FLOOR)
        const isWallOrFloor = !!(this.furnitureData.placingOptions & PlacingOptions.WALL_OR_FLOOR)
        /* eslint-enable no-bitwise */

        const targetSizeX = this.getIsDefaultRotation()
            ? (this.furnitureData.max.x - this.furnitureData.min.x) * this.furnitureData.scale
            : (this.furnitureData.max.y - this.furnitureData.min.y) * this.furnitureData.scale
        const targetSizeY = this.getIsDefaultRotation()
            ? this.furnitureData.max.y - this.furnitureData.min.y
            : this.furnitureData.max.x - this.furnitureData.min.x
        const targetSizeZ = (this.furnitureData.max.z - this.furnitureData.min.z) * this.furnitureData.scale

        const parent = this.getParent()
        const hasParent = !!parent
        return {
            canBePlacedOnWall: !hasParent && !isWallAndFloor && (isWallPlaceableOnly || isWallOrFloor),
            canBePlacedOnFloor: !this.isCombinableChild() && !isWallAndFloor && !isWallPlaceableOnly,
            canBePlacedOnWallFloorEdge: !hasParent,
            targetSizeX,
            targetSizeY,
            targetSizeZ,
        }
    }
 
    public updateRenderObject(): void {
        const snapRotationMatrix = this.getSnapRotModelMatrix()
        if (snapRotationMatrix && this.furnitureRenderObject) {
            this.furnitureRenderObject.matrix.copy(snapRotationMatrix)
            this.furnitureRenderObject.updateMatrixWorld(true)
            this.productDimensions.setRootTransform(snapRotationMatrix)
        }

        super.updateRenderObject()
        this.productDimensions.onParentTransformUpdated()
    }

    protected override getAdditionalUpdateData(): { [key: string]: unknown } {
        return {
            heading: this.heading,
        }
    }

    // Property for wallsnap.
    public get body() {
        return this.wallSnapBody
    }

    // Property for wallsnap.
    public get position() {
        let worldPos = {x: 0, y: 0, z: 0}
        if (this.sceneNode) {
            worldPos = this.sceneNode?.getAbsoluteTransform().pos
        }

        const screenPos = gvCurrentCamera()?.worldToScreenFloat(workspace.pt3.set(
            worldPos.x,
            worldPos.y,
            worldPos.z
        ))
        return [screenPos?.x || 0, screenPos?.y || 0]
    }

    // Property for wallsnap.
    public set position(screenPoint: Point2D | undefined) {
        // noop
    }

    // Property for wallsnap.
    public get orientation() {
        return this.heading
    }

    // Property for wallsnap.
    public set orientation(heading: number) {
        this.heading = heading
    }

    // Property for wallsnap, in world coordinates.
    public get pose() {
        const result: WallSnapPose = {pos: [0, 0, 0], rot: [[1, 0, 0], [0, 1, 0], [0, 0, 1]]}

        const transformWorld = this.sceneNode?.getAbsoluteTransform()
        if (transformWorld)
        {
            result.rot = getRotationMatrixFromQuaternion(gvDecorateEngine().fromQuat(transformWorld.rot));
            result.pos = gvDecorateEngine().fromVec3(transformWorld.pos)
        }

        return result;
    }

    // Property for wallsnap.
    // This property is set by WallSnap, and it corrects the passed orientation.
    // The same is done in FurnitureItem.update, where the renderObject is additionally rotated around x axis by 90 deg.
    public set pose(pose: WallSnapPose) {
        if (!this.getIsPlacedOnFloor()) {
            return
        }
        const rotWithHeading = pu.getFloorWithHeadingRotMat(this.heading, pose.rot)
        this.setPosAbsolute(gvDecorateEngine().toVec3(pose.pos))
        this.setRotAbsolute(rotWithHeading)
    }

    getIsDownloading() {
        return this.isDownloading
    }

    // Overrides base class method.
    isFurnitureItem() { // eslint-disable-line class-methods-use-this
        return true
    }

    hasStackableSurfaces() {
        return this.children.some(child => child.isStackableSurfaceItem())
    }

    public needsPlaceableHint() {
        const config = this.getPosSytemConfig()
        return config.canBePlacedOnFloor && config.canBePlacedOnWall
    }

    public override dispatchItemReadyUpdate(): void {
        GrandCentral.getDispatcher().dispatchNotification({
            what: NOTIFY_FURNITURE_ITEM_READY,
            payload: {
                furnitureItemId: this.id
            }
        })
        super.dispatchItemReadyUpdate()
    }

    shouldBlockFloorPlacing() {
        return this.getIsPlacedOnFloor() && !this.isRug
    }

    // Only wall-floor-edge items block themselves for default placement.
    shouldBlockWallFloorEdgePlacing() {
      // eslint-disable-next-line no-bitwise
      return !!(this.furnitureData.placingOptions & PlacingOptions.WALL_AND_FLOOR)
    }

    private updateSnapRotHandler() {
        if (!this.getIsSnapRotatable() || !this.snapRotHandler) {
          return
        }

        const snapRotIndex = this.snapRotHandler.getCurrentSnapRotationIndex()
        this.snapRotHandler.update(this.getPlacingBehavior(), snapRotIndex)
    }

    // Gets the snap-rotation transformation matrix if the item is snap rotatable, undefined otherwise.
    // SnapRotataion handler only gets built if the item is snap rotatable.
    getCurrentSnapRotateTransform() {
      const needsPatch = this.Renderer.settings.needs3DCompLoadPatch
      if (this.snapRotHandler) {
        return this.snapRotHandler.getCurrentSnapRotateTransform(needsPatch)
      }
      return undefined
    }

    private refreshChildSurfacesStaticProps() {
      if (!this.hasStackableSurfaces()) {
        return
      }
      this.children.forEach(child => isStackableSurfaceItem3D(child) && child.refreshStaticProperties())
    }

    private adjustChildSurfaceTransforms() {
      if (!this.hasStackableSurfaces()) {
        return
      }
      this.children.forEach(child => isStackableSurfaceItem3D(child) && child.adjustTransformOnParent())
    }

    public override onRenderDimensionsChange(newSize: PointXY) {
        this.productDimensions.setResolution(newSize)
    }
}

export default FurnitureItem3D
