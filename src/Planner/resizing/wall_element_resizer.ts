/* eslint-disable no-continue */
import * as THREE from 'three'

import type { WallElementObject } from 'Planner/rendering/wall_element_object'

type BoneProperties = {
  scaleX: boolean
  scaleY: boolean
  uniformScale: boolean
}

type BoneState = {
  bone: THREE.Bone
  restPosition: THREE.Vector3
  restScale: THREE.Vector3
  config: BoneProperties
}

export class WallElementResizer {
  private wallElementObject: WallElementObject
  private originalBBox =  new THREE.Box3()
  private rootBones: THREE.Bone[] = []
  private boneStates: BoneState[] = []
  private isLegacyObject = false

  constructor(wallElementObject: WallElementObject) {
    this.wallElementObject = wallElementObject
    this.initialize()
  }

  private initialize() {
    const rootObject = this.wallElementObject.getRootObject()
    rootObject.updateWorldMatrix(true, true)
    this.originalBBox = WallElementResizer.computeRootLocalBoundingBox(rootObject)
    const { rootBones, zoneBones } = WallElementResizer.loadBones(rootObject)
    this.rootBones = rootBones
    this.boneStates = zoneBones.map((bone) => ({
      bone,
      restPosition: bone.position.clone(),
      restScale: bone.scale.clone(),
      config: {
        scaleX: false,
        scaleY: false,
        uniformScale: false,
      }
    }))
    this.isLegacyObject = this.boneStates.length === 0
  }

  public setSize(newWidth: number, newHeight: number) {
    if (this.isLegacyObject) {
      this.setLegacySize(newWidth, newHeight)
      return
    }
  
    this.restoreRestPose()

    const bboxCenter = this.originalBBox.getCenter(new THREE.Vector3())
    const scaleFactors = this.calcScaleFactors(newWidth, newHeight)

    this.boneStates.forEach((boneState) => {
      const anchorPos = boneState.restPosition
      const translatedX = bboxCenter.x + (anchorPos.x - bboxCenter.x) * scaleFactors.scaleFactorX
      const translatedY = bboxCenter.y + (anchorPos.y - bboxCenter.y) * scaleFactors.scaleFactorY

      boneState.bone.position.set(
        translatedX,
        translatedY,
        boneState.restPosition.z,
      )

      let boneScaleX = 1
      let boneScaleY = 1

      if (boneState.config.scaleX) {
        boneScaleX = scaleFactors.scaleFactorX
        if (boneState.config.uniformScale) {
          boneScaleY = scaleFactors.scaleFactorX
        }
      }

      if (boneState.config.scaleY && !boneState.config.uniformScale) {
        boneScaleY = scaleFactors.scaleFactorY
      }

      boneState.bone.scale.set(
        boneState.restScale.x * boneScaleX,
        boneState.restScale.y * boneScaleY,
        boneState.restScale.z,
      )
    })

    this.wallElementObject.getRootObject().traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.computeBoundingBox()
        obj.geometry.computeBoundingSphere()
      }
    })
    this.rootBones.forEach(bone => bone.updateWorldMatrix(true, true))
  }

  private static loadBones(rootObject: THREE.Object3D) {
    const allBones = new Set<THREE.Bone>()
    rootObject.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh) {
        obj.skeleton.bones.forEach(bone => allBones.add(bone))
      }
    })
    const deduplicatedBones = [...allBones.values()]
    const rootBones = deduplicatedBones.filter((bone) => !(bone.parent instanceof THREE.Bone))
    const zoneBones = deduplicatedBones.filter((bone) => !rootBones.includes(bone))
    return {
      rootBones,
      zoneBones,
    }
  }

  private static computeRootLocalBoundingBox(root: THREE.Object3D): THREE.Box3 {
    const bbox = new THREE.Box3()
    const tempVector = new THREE.Vector3()

    root.traverse((object3d) => {
      if (!(object3d instanceof THREE.Mesh)) {
        return
      }
      const positionAttribute = object3d.geometry.getAttribute('position')
      if (!positionAttribute) {
        return
      }
      const meshLocalToRootMatrix = WallElementResizer.calcObjectLocalToRootMatrix(object3d, root)

      for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex += 1) {
        tempVector.set(
          positionAttribute.getX(vertexIndex),
          positionAttribute.getY(vertexIndex),
          positionAttribute.getZ(vertexIndex),
        )
        tempVector.applyMatrix4(meshLocalToRootMatrix)
        bbox.expandByPoint(tempVector)
      }
    })
    return bbox
}

  private static calcObjectLocalToRootMatrix(obj: THREE.Object3D, root: THREE.Object3D): THREE.Matrix4 {
    const objectLocalToRootMatrix = new THREE.Matrix4()
    let currentObject: THREE.Object3D | null = obj
    while (currentObject !== root) {
      if (currentObject === null) {
        break
      }
      currentObject.updateMatrix()
      objectLocalToRootMatrix.premultiply(currentObject.matrix)
      currentObject = currentObject.parent
    }
    return objectLocalToRootMatrix
  }

  private calcScaleFactors(targetWidth: number, targetHeight: number): { scaleFactorX: number, scaleFactorY: number } {
    const bboxSize = this.originalBBox.getSize(new THREE.Vector3())
    return {
      scaleFactorX: bboxSize.x !== 0 ? targetWidth / bboxSize.x : 1,
      scaleFactorY: bboxSize.y !== 0 ? targetHeight / bboxSize.y : 1,
    }
  }

  private restoreRestPose(): void {
    this.boneStates.forEach((boneState) => {
      boneState.bone.position.copy(boneState.restPosition)
      boneState.bone.scale.copy(boneState.restScale)
    })
  }

  private setLegacySize(newWidth: number, newHeight: number) {
    const scaleFactors = this.calcScaleFactors(newWidth, newHeight)
    const rootObject = this.wallElementObject.getRootObject()
    rootObject.scale.set(scaleFactors.scaleFactorX, scaleFactors.scaleFactorY, 1.0)
  }
}