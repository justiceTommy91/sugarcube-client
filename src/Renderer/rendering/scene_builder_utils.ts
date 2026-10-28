import * as THREE from 'three'
import type { BaseRenderEngine } from 'Renderer/rendering/BaseRenderEngine'
import { AssetManager } from 'Renderer/assets/AssetManager'
import { AssetsList } from 'Renderer/assets/AssetsList'
import { GLTFGeomagicalPolygon, PolygonType, GeomagicalExtras } from 'Renderer/assets/Types'
import { ViewerSettings, PlaneType, Matrix4x4, Point2D, SurfaceClass } from 'Renderer/geomviewer/geom_types'
import { constructPlaneFromTransform } from 'Renderer/geometry/PolygonUtils'
import { RoomGLTFAssets } from 'Renderer/assets/RoomGLTFAssets'
import { gvCurrentSettings, gvGeomModel } from 'Renderer/foundation/geom_app'
import { renderCubemap } from 'Renderer/rendering/envmap_rendering_utils'
import { EnvMapsSet } from 'Renderer/rendering/rendering_types'
import * as constants from 'Renderer/constants'
import WallspiceWebgl from 'Renderer/WallspiceWebgl'
import EnvMapViewer from 'Renderer/utils/envmap_viewer'
import { CameraIntrinsics } from 'Renderer/multiview/camera_types'
import { defaultViewerSettings } from 'Renderer/ui/settings'
import { GeomBaseScene } from './GeomBaseScene'
import type { MeshScene } from './MeshScene'
import { RenderTargetHandler } from './rendering_utils'

export type PolygonInfo = {
  segmentationIndex: number
  plane: PlaneType
  polygon: PolygonType
}

export const toLegacyIntrinsics = (cameraIntrinsics: CameraIntrinsics | undefined) => ([
  cameraIntrinsics?.focalLengthX || 0,
  cameraIntrinsics?.focalLengthY || 0,
  cameraIntrinsics?.principalPointX || 0,
  cameraIntrinsics?.principalPointY || 0,
])

export const collectPlaneMeshes = (gltfRoot: THREE.Group) => {
    const planeObjects: THREE.Mesh[] = []
    gltfRoot.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            const geomagicalSurfaceIdx = child.userData?.geomagicalSurface
            if (geomagicalSurfaceIdx !== undefined) {
                planeObjects.push(child)
            }
        }
    })
    return planeObjects
}

const getPolygonFromMesh =
    (mesh: THREE.Mesh, polyInfo: GLTFGeomagicalPolygon, plane: PlaneType): PolygonType => {
        const m = mesh.matrixWorld

        const indices = mesh.geometry.index
            ? Array.from(mesh.geometry.index.array)
            : []
        const positionAttribute = mesh.geometry.getAttribute('position')
        const vertices: Point2D[] = []
        // The room GLTF is constructed such that all the vertices' local coordinates have z = 0.
        // We're interested only in (x, y).
        for (let i = 0; i < positionAttribute.count; i += 1) {
            vertices.push([positionAttribute.getX(i), positionAttribute.getY(i)])
        }
        const transform: Matrix4x4 = [
            [m.elements[0], m.elements[4], m.elements[8], m.elements[12]],
            [m.elements[1], m.elements[5], m.elements[9], m.elements[13]],
            [m.elements[2], m.elements[6], m.elements[10], m.elements[14]],
            [m.elements[3], m.elements[7], m.elements[11], m.elements[15]],
        ]
        return {
            id: polyInfo.id,
            class: polyInfo.type,
            style: `polygon`,
            transform,
            parameters: {
                indices,
                vertices,
            },
            plane,
        }
    }


const getPolygonInfoFromMesh =
    (planeMeshObj: THREE.Mesh, polyInfo: GLTFGeomagicalPolygon): PolygonInfo => {
        planeMeshObj.updateMatrixWorld()
        const matrix = planeMeshObj.matrixWorld
        const x = matrix.elements[12]
        const y = matrix.elements[13]
        const z = matrix.elements[14]

        // Extract basis from the matrix, see THREE.Matrix4.extractBasis().
        const matrix4x4: Matrix4x4 = [
            [matrix.elements[0 * 4 + 0], matrix.elements[0 * 4 + 1], matrix.elements[0 * 4 + 2], 0],
            [matrix.elements[1 * 4 + 0], matrix.elements[1 * 4 + 1], matrix.elements[1 * 4 + 2], 0],
            [matrix.elements[2 * 4 + 0], matrix.elements[2 * 4 + 1], matrix.elements[2 * 4 + 2], 0],
            [x, y, z, 1],
        ]

        const plane = constructPlaneFromTransform(matrix4x4, polyInfo.id, polyInfo.type as SurfaceClass)
        const polygon = getPolygonFromMesh(planeMeshObj, polyInfo, plane)
        return {
            segmentationIndex: polyInfo.id,
            plane,
            polygon,
        }
    }

// Associate gltf meshes with their corresponding geomagical extra polygon information.
export const collectMeshesExtendedInfo =
    (planeMeshes: THREE.Mesh[], geomExtra: GeomagicalExtras | undefined) => 
        (planeMeshes.map((mesh) => {
            const polyIdx = mesh.userData?.geomagicalSurface
            const polyInfo = geomExtra?.geomagical.geomagicalSurfaces[polyIdx]
            if (!polyInfo) {
                return undefined
            }
            return { 'mesh': mesh, 'polygonInfo': getPolygonInfoFromMesh(mesh, polyInfo)}
        }).filter((info): info is { 'mesh': THREE.Mesh, 'polygonInfo': PolygonInfo} => !!info)
          .sort((info1, info2) => info1.polygonInfo.segmentationIndex - info2.polygonInfo.segmentationIndex))

export const buildPlaneAndPolygonData =
    <AssetType extends RoomGLTFAssets>(roomGltfAssets: AssetType, useOpeningsAsWalls: boolean) => 
        roomGltfAssets.getParsedGltfScene().then((resultGroup): 
        Array<{'mesh': THREE.Mesh, 'polygonInfo': PolygonInfo}> => {
            if (resultGroup === null) {
                return []
            }
            const planeMeshes = collectPlaneMeshes(resultGroup)

            const planePolygonsInfo = collectMeshesExtendedInfo(planeMeshes,
                resultGroup.userData as GeomagicalExtras)

            const nonStackablePolygons = planePolygonsInfo.filter((info) =>
                ['wall', 'floor', 'ceiling', 'door', 'window', ...useOpeningsAsWalls ? ['opening'] : []]
                    .includes(info.polygonInfo.plane.class))

            nonStackablePolygons.forEach((item) => {
                gvGeomModel()?.resolveRoomElement(String(item.polygonInfo.polygon.id));
            })

            // Build static stacking surfaces
            const stackablePolygons = planePolygonsInfo.filter(info => info.polygonInfo.polygon.class === 'stackable')
            stackablePolygons.forEach((stackablePolygon) => {
                const strId = stackablePolygon.polygonInfo.segmentationIndex.toString()
                gvGeomModel()?.addStackableSurfaceItem(strId, undefined /* no parent == static */, {
                    id: strId,
                    parameters: {
                        type: `polygon`,
                        vertices: stackablePolygon.polygonInfo.polygon.parameters.vertices,
                    },
                    transform: stackablePolygon.polygonInfo.polygon.transform,
                })
            })
            return nonStackablePolygons
        })

export const initializeEnvMap = (height: number, assetsList: AssetsList, assetManager: AssetManager, 
    resultScene: GeomBaseScene, renderEngine: BaseRenderEngine<GeomBaseScene>, 
    settings: ViewerSettings, altTexture?: THREE.Texture): Promise<EnvMapsSet>  => {
      const result: EnvMapsSet = {
        roomHasEquirectangular: false,
        roomHasRenderedEquirectangular: false,
        loadedDefault: null,
        generatedDefault: null,
        clamShell: null,
      }

      const threeRenderer = renderEngine.getThreeRenderer()
      if (!threeRenderer) {
        return Promise.resolve(result)
      }
    return assetManager.getTextureOrNull(constants.EQUIRECTANGULAR_ASSET_NAME)
        .then((textureRecord) => {
            if (!textureRecord) {
                return
            }

            const { texture: loadedEnvMap, usingAlternateUrl } = textureRecord
            if (!loadedEnvMap) {
                return
            }

            const pmremGenerator = new THREE.PMREMGenerator(threeRenderer)
            pmremGenerator.compileEquirectangularShader()

            const pmremRenderTarget = pmremGenerator.fromEquirectangular(loadedEnvMap)

            // Handle the disposing of the render target
            const rtHandler = new RenderTargetHandler()
            rtHandler.addRenderTarget(pmremRenderTarget)

            result.loadedDefault = pmremRenderTarget.texture

            if (usingAlternateUrl && altTexture) {
                result.clamShell = WallspiceWebgl.generateHDRfromPano(renderEngine, altTexture, true)
            } else {
                result.roomHasEquirectangular = true
            }

            // Set the envMap as early as possible to avoid recompiling
            // any uncompiled shaders when set later.
            resultScene.setEnvMapsSet(result)

            pmremGenerator.dispose()
        })
        .then(() => {
            const viewerSettings = gvCurrentSettings()?.viewerSettings || defaultViewerSettings
            if (!viewerSettings.isRoomBuilderScene)
                return

            const meshScene = resultScene as MeshScene
            const objectsScene = meshScene.getObjectsScene?.()
            const staticSceneGraph = meshScene.getStaticSceneGraph?.()
            if (!staticSceneGraph || !objectsScene) 
                return

            const envmapUrl = assetsList.getAssetUrl(constants.EQUIRECTANGULAR_ASSET_NAME)
            if (envmapUrl && !envmapUrl.includes('gray')) 
                return

            const initRendererSceneState = true
            const envMapRenderTarget = renderCubemap(staticSceneGraph, objectsScene,
                                                     threeRenderer, initRendererSceneState)
            result.generatedDefault = envMapRenderTarget.texture
            result.roomHasRenderedEquirectangular = true
            resultScene.setEnvMapsSet(result)
        })
        .then(() => {
            const envMap = resultScene.getEnvMap()
            if (settings.onOffOptions.enableDebugControls && envMap) {
                const resolution = new THREE.Vector2(...resultScene.getDimensions())
                const envMapViewer = new EnvMapViewer()
                envMapViewer.setEnvMap(envMap)
                envMapViewer.setResolution(resolution)
                resultScene.setEnvMapViewer(envMapViewer)
            }
            return result
        })
}

// Returns -180 to 180 angle from a to b, if rotation a to b is ccw - angle is positive, negative otherwise.
export const signedAngleDeg = (a: THREE.Vector2, b: THREE.Vector2) => {
  const cross = a.cross(b)
  const dot = a.dot(b)
  return Math.atan2(cross, dot) * 180 / Math.PI
}