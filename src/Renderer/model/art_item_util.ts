import * as THREE from 'three'

import WallspiceWebgl from 'Renderer/WallspiceWebgl'
import type { ArtFrameData, ColorRepresentation } from 'Renderer/geomviewer/geom_types'

export type ArtItemModelParameters = {
  artSize: [number, number]
  material: THREE.Material
  frameData: ArtFrameData
  useFilmicLUT: boolean
  castAndReceiveShadows?: boolean
  envMap?: THREE.Texture
  envMapIntensity?: number
}

export const createArtMaterial = (imageData: ImageData) =>  WallspiceWebgl.createArtMaterial(imageData)

export const createArtItemModel = (params: ArtItemModelParameters) => {
  const frame = new THREE.Object3D()
  const width = params.artSize[0]
  const height = params.artSize[1]
  let innerDepth = params.frameData.canvasDepth
  let maxDepth = 0
  let innerLength = 0.02
  const outerLength = 0.04

  let outerL = -width * 0.5
  let outerR = width * 0.5
  let outerB = -height * 0.5
  let outerT = height * 0.5

  const envMap = params.envMap
  const envMapIntensity = params.envMapIntensity || 0
  const castAndReceiveShadows = params.castAndReceiveShadows || false

  // canvas
  const geometryCanvas = WallspiceWebgl.makeCanvasGeometry(width, height, params.frameData.canvasDepth, false)
  const artMaterial = params.material
  const canvas = new THREE.Mesh(geometryCanvas, artMaterial)
  canvas.name = `canvas`
  canvas.castShadow = castAndReceiveShadows
  canvas.receiveShadow = castAndReceiveShadows
  frame.add(canvas)
  const bbox = new THREE.Box3().setFromObject(frame)

  if (params.frameData.matte && params.frameData.matte.sections) {
    const matDesc = params.frameData.matte.sections
    let mOff = 0
    if (params.frameData.matOffset) {
      mOff = params.frameData.matOffset
    }

    for (let i = 0; i < matDesc.length; i += 1) {
      const tmp = matDesc[0].profile[matDesc[i].profile.length - 1][1] + mOff
      if (tmp > innerDepth) {
        innerDepth = tmp;
      }
      const L = outerL
      const R = outerR
      const B = outerB
      const T = outerT
      WallspiceWebgl.createFrameMaterial(matDesc[i].textureName,
        matDesc[i].albedo, params.useFilmicLUT).then((material) => {
          if (envMap) {
            material.envMap = envMap
            material.envMapIntensity = envMapIntensity
          }
          const geometry = WallspiceWebgl.extrudeFrame(L, R, B, T, mOff,
            matDesc[i].scaleU, matDesc[i].scaleV, matDesc[i].profile)
          if (geometry) {
            const segment = new THREE.Mesh(geometry, material)
            segment.name = `matSegment_${i}`
            segment.castShadow = castAndReceiveShadows
            segment.receiveShadow = castAndReceiveShadows
            frame.add(segment)
            // this.updateRenderObject()
          }
        })
      const extrusionDist = matDesc[i].profile[matDesc[i].profile.length - 1][0]
      outerL -= extrusionDist
      outerR += extrusionDist
      outerB -= extrusionDist
      outerT += extrusionDist
    }
  }
  const iL = outerL
  const iR = outerR
  const iB = outerB
  const iT = outerT
  if (params.frameData.sections) {
    const frDesc = params.frameData.sections
    for (let i = 0; i < frDesc.length; i += 1) {
      let textureName = frDesc[i].textureName
      let albedo: ColorRepresentation = frDesc[i].albedo
      if (params.frameData.color) {
        if (params.frameData.color.material) {
          textureName = params.frameData.color.material
          albedo = `#ffffff`
        }
        if (params.frameData.color.albedo) {
          albedo = params.frameData.color.albedo
        }
      }
      for (let j = 0; j < frDesc[i].profile.length; j += 1) {
        if (frDesc[i].profile[j][1] > maxDepth) {
          maxDepth = frDesc[i].profile[j][1]
        }
      }

      const L = outerL
      const R = outerR
      const B = outerB
      const T = outerT

      WallspiceWebgl.createFrameMaterial(textureName, albedo, params.useFilmicLUT).then((material) => {
        if (envMap) {
          material.envMap = envMap
          material.envMapIntensity = envMapIntensity
        }
        const geometry = WallspiceWebgl.extrudeFrame(L, R, B, T, 0,
          frDesc[i].scaleU, frDesc[i].scaleV, frDesc[i].profile)
        if (geometry) {
          const segment = new THREE.Mesh(geometry, material)
          segment.name = `frameSegment_${i}`
          segment.castShadow = castAndReceiveShadows
          segment.receiveShadow = castAndReceiveShadows
          frame.add(segment)
          // this.updateRenderObject()
        }
      })
      const extrusionDist = frDesc[i].profile[frDesc[i].profile.length - 1][0]
      outerL -= extrusionDist
      outerR += extrusionDist
      outerB -= extrusionDist
      outerT += extrusionDist
    }
  } else {
    innerDepth = 0
    innerLength = 0
  }

  bbox.min.x = outerL
  bbox.max.x = outerR
  bbox.min.y = outerB
  bbox.max.y = outerT
  if (bbox.max.z < maxDepth) {
    bbox.max.z = maxDepth
  }

  const shadowMesh = WallspiceWebgl.makeFrameShadow(outerL, outerR, outerB, outerT,
    iL, iR, iB, iT, innerDepth, innerLength, outerLength)

  if (shadowMesh) {
    shadowMesh.name = `frameShadow`
    frame.add(shadowMesh)
  }

  return { frame, shadowMesh, bbox }
}