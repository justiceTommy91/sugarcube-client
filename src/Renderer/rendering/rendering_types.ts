import type { Line2 } from 'three/examples/jsm/lines/Line2'
import {
  AA_TAA,
  AA_FXAA,
  SKYSPHERE_NAME,
} from 'Renderer/constants'

export type StandardMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>

export type ThumbnailTelemetry = {
  scale: number
  quality: number
  tabIsHidden: boolean
  artCanvasExists: boolean
  artCanvasWidth: number
  artCanvasHeight: number
  artCanvasContextInitialized: boolean
  artCanvasIsBlack: boolean
  thumbCanvasExists: boolean
  thumbCanvasWidth: number
  thumbCanvasHeight: number
  thumbCanvasContextInitialized: boolean
  imageIsBlack: boolean;
}

export type ThumbnailGenerationResult = {
  thumbTelemetry: ThumbnailTelemetry,
  thumbDataUrl: string
}

export type AntialiasingType = typeof AA_TAA | typeof AA_FXAA

export type InitializationFailureCallback = (info: { [key: string]: undefined | boolean | string | object }) => void

export type OnFirstRenderCallback = () => boolean
export interface FurnitureObject3D extends THREE.Object3D {
  isFurniture: boolean
}

export interface RugObject3D extends FurnitureObject3D {
  isRug: boolean
}

export function isRugObject3D(object: THREE.Object3D | null): object is RugObject3D {
  return object !== null && ((('isRug' in object) && object.isRug === true) || 
    object.userData?.isRug === true)
}

export function isFurnitureObject3D(object: THREE.Object3D | null): object is FurnitureObject3D {
  return object !== null && ((('isFurniture' in object) && object.isFurniture === true) ||
    object.userData?.isFurniture === true)
}

export const isMesh = (obj: THREE.Object3D | undefined | null): obj is StandardMesh =>
  !!obj && 'isMesh' in obj && !!(obj as THREE.Mesh).material && !Array.isArray((obj as THREE.Mesh).material)

export function isMeshStandardMaterial(material: THREE.Material | null): material is THREE.MeshStandardMaterial {
  return material !== null && ('isMeshStandardMaterial' in material) && material.isMeshStandardMaterial === true
}

export function isShaderMaterial(material: THREE.Material | null): material is THREE.ShaderMaterial {
  return material !== null && ('isShaderMaterial' in material) && material.isShaderMaterial === true
}

export function isCamera(obj: THREE.Object3D | null): obj is THREE.Camera {
  return obj !== null && ('isCamera' in obj)
}

export function isLight(obj: THREE.Object3D | null): obj is THREE.Light {
  return obj !== null && ('isLight' in obj)
}

export function isDirectionalLight(obj: THREE.Object3D | null): obj is THREE.DirectionalLight {
  return obj !== null && obj.type === 'DirectionalLight'
}

export function isPointLight(obj: THREE.Object3D | null): obj is THREE.PointLight {
  return obj !== null && obj.type === 'PointLight'
}

export function isSpotLight(obj: THREE.Object3D | null): obj is THREE.SpotLight {
  return obj !== null && obj.type === 'SpotLight'
}

export function isAreaLight(obj: THREE.Object3D | null): obj is THREE.RectAreaLight {
  return obj !== null && obj.type === 'RectAreaLight'
}

export function isAmbientLight(obj: THREE.Object3D | null): obj is THREE.AmbientLight {
  return obj !== null && obj.type === 'AmbientLight'
}

export function isHemisphereLight(obj: THREE.Object3D | null): obj is THREE.HemisphereLight {
  return obj !== null && obj.type === 'HemisphereLight'
}

export function isSkySphereObj(obj: THREE.Object3D | null) {
  return obj !== null && obj.name === SKYSPHERE_NAME
}

export function isLineObj(obj: THREE.Object3D | null): obj is Line2 {
  return obj !== null && obj.type === 'Line2'
}

export type RenderCallback = () => void

export type DelayedRenderCallback = {
  framesToSkip: number
  callback: RenderCallback
}

export interface ExtendedLight extends THREE.Light {
  originalColor: THREE.Color
}

export function isExtendedLight(object: THREE.Object3D | null): object is ExtendedLight {
  return object !== null && ('originalColor' in object)
}

export type EnvMapsSet = {
  roomHasEquirectangular: boolean
  roomHasRenderedEquirectangular: boolean
  loadedDefault: THREE.Texture | null
  generatedDefault: THREE.Texture | null
  clamShell: THREE.Texture | null
}
