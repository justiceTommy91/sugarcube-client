import * as THREE from 'three'

import {
    NOTIFY_FURNITURE_ITEM_MOVE_START,
    NOTIFY_FURNITURE_ITEM_MOVE_END,
    PLACEABLE_HINT_APPEAR_DISTANCE_WALL,
    PLACEABLE_HINT_APPEAR_DISTANCE_FLOOR,
    PLACEABLE_HINT_ARROW_URL,
    PLACEABLE_HINT_ARROW_SHADOW_URL,
} from 'Renderer/constants'

import Fading from 'utils/fading'
import type { FurnitureItemInfo, NotificationInfo } from 'Renderer/NotificationDispatcher'
import { Point3 } from "Renderer/geometry/Point3";
import { Vector3 } from "Renderer/geometry/Vector3";
import { getWorldForwardUnitVector, getObjBasisForIntersection } from './utils/posUtils'
import { GrandCentral } from './GrandCentral'
import { PlacingBehavior } from './geomviewer/geom_constants'

import type { GeomBaseScene } from './rendering/GeomBaseScene'
import { COS_45 } from './positioning/positioning_constants'
import * as pu from './positioning/positioning_utilities'
import { IntersectionInfo, Ray, ThreeBasis } from './positioning/positioning_types'
import FurnitureItem3D from './model/FurnitureItem3D'
import { disposeMeshes } from './rendering/rendering_utils';


const MOVEMENT_NONE = 0
const MOVEMENT_TOWARDS = 1
const MOVEMENT_AWAY = 2
type Movement = typeof MOVEMENT_NONE | typeof MOVEMENT_TOWARDS | typeof MOVEMENT_AWAY
export class PlaceableHint {
    private scene: GeomBaseScene

    private trackingRenderItem: FurnitureItem3D | null = null

    private trackingIntervalId: number | null = null

    private visualObject: THREE.Object3D | null = null

    private visualObjectFading: Fading | null = null

    private visualObjectVisible = false

    private arrows: THREE.Object3D[] = []

    private arrowMaterials: THREE.MeshBasicMaterial[] = []

    private shadows: THREE.Mesh[] = []

    private lastTrackedDistance = 0.0

    private lastTrackedItem: FurnitureItem3D | null = null

    private currentMovement: Movement = MOVEMENT_NONE

    // a visual gap between furniture's bbox edge and arrow's "starting point"
    private arrowFurnitureGap = 0.1

    // debug related options
    private debugAlwaysVisible = false

    constructor(scene: GeomBaseScene) {
        this.scene = scene

        this.onFurnitureItemMoveStart = this.onFurnitureItemMoveStart.bind(this)
        this.onFurnitureItemMoveFinish = this.onFurnitureItemMoveFinish.bind(this)
        this.trackCurrentItemMovement = this.trackCurrentItemMovement.bind(this)

        this.createVisualObject()
        this.activate()
    }

    public getVisualObject() {
        return this.visualObject
    }

    public setDebugAlwaysVisible(shouldBeVisible: boolean) {
        if (this.debugAlwaysVisible === shouldBeVisible) {
            return
        }
        this.debugAlwaysVisible = shouldBeVisible
        this.updateVisualObjectVisibility(this.debugAlwaysVisible)
    }

    /* eslint-disable no-param-reassign */
    public setArrowPlaneGap(gap: number) {
        this.arrows.forEach((object) => {
            object.position.z = gap
            object.matrixWorldNeedsUpdate = true
        })
    }
    /* eslint-enable no-param-reassign */

    public setArrowFurnitureGap(gap: number) {
        if (this.arrowFurnitureGap === gap) {
            return
        }
        this.arrowFurnitureGap = gap
        if (this.lastTrackedItem) {
            if (this.lastTrackedItem.getIsDeleted()) {
                this.lastTrackedItem = null
            } else {
                this.trackItemMovement(this.lastTrackedItem)
            }
        }
    }

    private createVisualObject() {
        this.visualObject = new THREE.Group()
        this.visualObject.name = `PlaceableHint`

        const textureLoader = new THREE.TextureLoader()
        const planeSize = 0.35
        const geometry = new THREE.PlaneGeometry(planeSize, planeSize)
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            map: textureLoader.load(PLACEABLE_HINT_ARROW_URL),
            depthWrite: false,
            transparent: true,
            opacity: 0.0,
        })

        const arrowZLocalPos = 0.025
        const shadowZLocalPos = 0.005 // a small gap to prevent z-fight with the wall/floor
        const arrowYLocalPos = planeSize * 0.5
        const centerArrowXLocalPos = 0.0
        const sideArrowXLocalPos = 0.25

        const arrow1 = new THREE.Mesh(geometry, arrowMaterial)
        arrow1.position.set(-sideArrowXLocalPos, arrowYLocalPos, arrowZLocalPos)
        this.visualObject.add(arrow1)
        const arrow2 = new THREE.Mesh(geometry, arrowMaterial)
        arrow2.position.set(centerArrowXLocalPos, arrowYLocalPos, arrowZLocalPos)
        this.visualObject.add(arrow2)
        const arrow3 = new THREE.Mesh(geometry, arrowMaterial)
        arrow3.position.set(sideArrowXLocalPos, arrowYLocalPos, arrowZLocalPos)
        this.visualObject.add(arrow3)

        const shadowMaterial = arrowMaterial.clone()
        shadowMaterial.map = textureLoader.load(PLACEABLE_HINT_ARROW_SHADOW_URL)

        const shadow1 = new THREE.Mesh(geometry, shadowMaterial)
        shadow1.position.set(-sideArrowXLocalPos, arrowYLocalPos, shadowZLocalPos)
        this.visualObject.add(shadow1)

        const shadow2 = new THREE.Mesh(geometry, shadowMaterial)
        shadow2.position.set(centerArrowXLocalPos, arrowYLocalPos, shadowZLocalPos)
        this.visualObject.add(shadow2)

        const shadow3 = new THREE.Mesh(geometry, shadowMaterial)
        shadow3.position.set(sideArrowXLocalPos, arrowYLocalPos, shadowZLocalPos)
        this.visualObject.add(shadow3)

        this.visualObject.matrixAutoUpdate = false
        this.visualObject.visible = false

        this.arrowMaterials = [arrowMaterial, shadowMaterial]
        this.arrows = [arrow1, arrow2, arrow3]

        this.shadows = [shadow1, shadow2, shadow3]
    }

    private onFurnitureItemMoveStart(info: NotificationInfo) {
        const itemId = String((info?.payload as FurnitureItemInfo)?.furnitureItemId)
        const renderItem = this.scene.getRenderItem(itemId) as FurnitureItem3D
        if (!renderItem || !renderItem.needsPlaceableHint?.()) {
            return
        }
        this.trackingRenderItem = renderItem
        this.lastTrackedItem = this.trackingRenderItem

        this.trackingIntervalId = window.requestAnimationFrame(this.trackCurrentItemMovement)
    }

    private onFurnitureItemMoveFinish(info: NotificationInfo) {
        const itemId = String((info?.payload as FurnitureItemInfo)?.furnitureItemId)
        const renderItem = this.scene.getRenderItem(itemId)
        if (renderItem === this.trackingRenderItem) {
            this.trackingRenderItem = null
            if (this.trackingIntervalId !== null) {
                window.cancelAnimationFrame(this.trackingIntervalId)
                this.trackingIntervalId = null
            }
            if (this.visualObject && !this.debugAlwaysVisible) {
                this.updateVisualObjectVisibility(false)
                this.lastTrackedDistance = 0.0
                this.currentMovement = MOVEMENT_NONE
            }
        }
    }

    private trackCurrentItemMovement() {
        this.trackingIntervalId = window.requestAnimationFrame(this.trackCurrentItemMovement)
        if (this.trackingRenderItem) {
            this.trackItemMovement(this.trackingRenderItem)
        }
    }

    private trackItemMovement(renderItem: FurnitureItem3D) {
        if (!renderItem) {
            return
        }
        switch(renderItem.getPlacingBehavior()) {
            case PlacingBehavior.ON_FLOOR:
                this.trackWallsProximity(renderItem)
                break
            case PlacingBehavior.ON_WALL:
                this.trackFloorProximity(renderItem)
                break
            default:
                break
        }
    }

    private trackFloorProximity(renderItem: FurnitureItem3D) {
        if (!renderItem) {
            return
        }
        const renderObject = renderItem.getObject()
        if (!renderObject) {
            return
        }
        // Ray origin is at the furniture item position, adjusted to start
        // off the bbox edge which is opposite to the wall,
        // i.e. by bbox size along Z axis of the furniture, as requested by design team.
        const worldPos = renderObject.getWorldPosition(new THREE.Vector3())
        const worldZAxis = new THREE.Vector3().subVectors(renderObject
            .localToWorld(new THREE.Vector3(0.0, 0.0, 1.0)), worldPos)
            .normalize()
        const bbox = renderItem.getBbox()
        const bboxSize = bbox.getSize(new THREE.Vector3())
        worldPos.add(worldZAxis.multiplyScalar(0.5 * bboxSize.z))
        const ray: Ray = {
            origin: new Point3(worldPos.x, worldPos.y, worldPos.z),
            dir: new Vector3(0, -1, 0)
        }
        const nearestIntersection = pu.castRayToFloorPlane(ray)
        const distance = nearestIntersection?.distance || 0
        this.updateCurrentMovement(distance)
        if (this.debugAlwaysVisible ||
            (this.currentMovement === MOVEMENT_TOWARDS && distance < PLACEABLE_HINT_APPEAR_DISTANCE_FLOOR)) {
            this.updateVisualObject(renderItem, nearestIntersection)
        } else {
            this.updateVisualObjectVisibility(false)
        }
        this.lastTrackedDistance = distance
    }

    // This function checks if the furniture item with its current world transform
    // will attach to the wall if pushed against it.
    // eslint-disable-next-line class-methods-use-this
    private canItemAttachToWall(itemWorldTransform: THREE.Matrix4, wallNormal: Vector3, planeDist: number) {
        if (!wallNormal || !itemWorldTransform) {
            return false
        }
        // Orientation check.
        const worldZAxis = getWorldForwardUnitVector(itemWorldTransform)
        const dotOrientation = wallNormal.dot({dx: worldZAxis[0], dy: worldZAxis[1], dz: worldZAxis[2]})

        // Position check. For island-walls. If item is behind the wall it cannot attach.
        const transfMatEls = itemWorldTransform.elements
        const itemPos = {dx: transfMatEls[12], dy: transfMatEls[13], dz: transfMatEls[14]} 
        const dotPosition = wallNormal.dot(itemPos)
        const isBehind = dotPosition + planeDist < 0
        const willAttach = dotOrientation > COS_45 && !isBehind;
        
        return willAttach
    }

    private trackWallsProximity(renderItem: FurnitureItem3D) {
        if (!renderItem) {
            return
        }
        const renderObject = renderItem.getObject()
        if (!renderObject) {
            return
        }
        const floorPlane = pu.getFloorPlane();
        const floorX = new Vector3(1, 0, 0)
        const floorY = new Vector3(0, 1, 0)
        if (floorPlane) {
            floorX.set(floorPlane.rot[0][0], floorPlane.rot[0][1], floorPlane.rot[0][2])
            floorY.set(floorPlane.rot[1][0], floorPlane.rot[1][1], floorPlane.rot[1][2])
        }

        // Some rooms have "skirting" on the wall, along the floor, which has pixel segmentation class "floor",
        // so we need to put ray origin in the center on item's world bbox.
        // Also, as requested by design team, the arrow should appear on the wall at the item's height.
        const worldPos = renderObject.getWorldPosition(new THREE.Vector3())
        const worldUp = renderItem.getWorldUpVector?.()
        if (!worldUp) {
            return
        }
        const worldYAxis = new THREE.Vector3().fromArray([worldUp.dx, worldUp.dy, worldUp.dz])
        const bbox = renderItem.getBbox()
        const bboxSize = bbox.getSize(new THREE.Vector3())
        worldYAxis.multiplyScalar(renderItem.getIsDefaultRotation() ? bboxSize.y : bboxSize.x)
        worldPos.add(worldYAxis)

        const origin = new Point3(worldPos.x, worldPos.y, worldPos.z)
        const rayX = { origin, dir: floorX }
        const rayY = { origin, dir: floorY }
        const rayXNeg = { origin, dir: floorX.clone().negate() }
        const rayYNeg = { origin, dir: floorY.clone().negate() }

        const closestPoint = [rayX, rayY, rayXNeg, rayYNeg]
            .map((ray) => this.getClosestAttachableWallIntersection(renderObject.matrixWorld, ray.origin, ray.dir))
            .reduce((curr, accum) => (curr.distance < accum.distance) ? curr : accum, {
                distance: Infinity,
                point: null,
                normal: null,
                plane: null,
            })
        // show the arrows only when we're moving towards the plane (i.e. the distance becomes shorter)
        const distance = closestPoint.distance - bboxSize.z * 0.5
        this.updateCurrentMovement(distance)
        if (this.debugAlwaysVisible ||
            (this.currentMovement === MOVEMENT_TOWARDS && distance < PLACEABLE_HINT_APPEAR_DISTANCE_WALL)) {
            this.updateVisualObject(renderItem, closestPoint)
        } else {
            this.updateVisualObjectVisibility(false)
        }
        this.lastTrackedDistance = distance
    }

    private getClosestAttachableWallIntersection(itemWorldTransformm: THREE.Matrix4, origin: Point3,
        direction: Vector3) {
        const ray: Ray = { origin, dir: direction }
        const intersections = pu.castRayToAllWalls(ray, true /* strict */)

        // Intersections sorted by distance.
        for(let i = 0; i < intersections.length; i += 1) {
            const intersection = intersections[i]
            const { normal } = intersection
            const  planeDist = intersection.plane?.d
            if (normal && planeDist && this.canItemAttachToWall(itemWorldTransformm, normal, planeDist)) {
                return intersection
            }
        }
        return {
            distance: Infinity,
            point: null,
            normal: null,
            plane: null,
        }
    }

    private updateCurrentMovement(newDistance: number) {
        // change the current movement only if direction have actually changed, often while dragging an item,
        // on some frames distance delta remains 0, movement direction should remain the same in that case
        if (!Number.isFinite(newDistance)) {
            return
        }
        if (newDistance > this.lastTrackedDistance) {
            this.currentMovement = MOVEMENT_AWAY
        } else if (newDistance < this.lastTrackedDistance) {
            this.currentMovement = MOVEMENT_TOWARDS
        }
    }

    private updateVisualObject(renderItem: FurnitureItem3D, intersection: IntersectionInfo | undefined) {
        if (!this.visualObject) {
            return
        }

        if (!intersection ||
            !intersection.point ||
            !intersection.normal ||
            !renderItem) {
            return
        }
        const trackingObject = renderItem.getObject()
        if (!trackingObject) {
            return
        }

        this.updateVisualObjectVisibility(true)

        // const position = intersection.point.clone()

        // Arrow (visualObject) orientation:
        // When on a wall:
        // Y axis - along tracking obj Z axis (away from the wall)
        // Z axis - along intersection normal
        // X axis - Y x Z
        // When on the floor:
        // Y axis - along tracking obj Y axis (upward)
        // Z axis - along intersection normal
        // X axis - Y x Z
        const floorPlane = pu.getFloorPlane()
        const visualObjDestinationSurf = (renderItem.getSurfaceBoundTo?.() || intersection.plane)
        let worldItemBasis: ThreeBasis | null = null
        if (floorPlane && visualObjDestinationSurf) {
            worldItemBasis = getObjBasisForIntersection(intersection, trackingObject,
                floorPlane, visualObjDestinationSurf, renderItem.getPlacingBehavior())
        }
        if (worldItemBasis) {
            this.visualObject.matrix.makeBasis(...worldItemBasis)
        }
        this.visualObject.matrix.setPosition(intersection.point.x, intersection.point.y, intersection.point.z)
        this.visualObject.updateMatrixWorld(true)
    }

    private updateVisualObjectVisibility(shouldBeVisible: boolean) {
        if (!this.visualObject) {
            return
        }
        if (this.visualObjectVisible === shouldBeVisible) {
            return
        }

        this.visualObjectVisible = shouldBeVisible
        this.visualObject.visible = true
        // easeOutExp
        const ease = shouldBeVisible ?
            (t: number) => 1 - 2 ** (-10 * t) :
            (t: number) => 2 ** (10 * t - 10)

        const totalTime = 0.5
        let tStart = 0.0
        if (this.visualObjectFading) {
            this.visualObjectFading.stop()
            tStart = this.visualObjectFading.t
        }

        this.visualObjectFading = new Fading(totalTime,
            (t) => {
                const timeFactor = shouldBeVisible ? t : (1.0 - t)
                // eslint-disable-next-line no-param-reassign
                this.arrowMaterials.forEach((mtl) => { mtl.opacity = ease(timeFactor) })
                this.scene.setIsDirty(true)
            },
            () => {
                this.visualObjectFading = null
                if (this.visualObject) {
                    this.visualObject.visible = shouldBeVisible
                }
            }
        )
        this.visualObjectFading.t = tStart
    }

    cleanup() {
        this.deactivate()

        this.arrows.forEach(arrow => {
            disposeMeshes(arrow)
        });
        this.arrows = []
        this.arrowMaterials = []

        this.shadows.forEach(shadow => {
            disposeMeshes(shadow)
        })
        this.shadows = []
    }

    public activate() {
        GrandCentral.getDispatcher().addObserver(NOTIFY_FURNITURE_ITEM_MOVE_START, this.onFurnitureItemMoveStart)
        GrandCentral.getDispatcher().addObserver(NOTIFY_FURNITURE_ITEM_MOVE_END, this.onFurnitureItemMoveFinish)
    }

    public deactivate() {
        GrandCentral.getDispatcher().removeObserver(this.onFurnitureItemMoveStart)
        GrandCentral.getDispatcher().removeObserver(this.onFurnitureItemMoveFinish)
    }
}
