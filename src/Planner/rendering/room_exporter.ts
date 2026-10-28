import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

import { GeomagicalExtras } from 'Renderer/assets/Types'
import { GLTf, TextureInfo, MaterialNormalTextureInfo, MaterialOcclusionTextureInfo } from 'Renderer/gltf/gltf'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { Room } from 'Planner/room'
import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import { exportHDRblobFromPixelData, projectEquirectRTfromMipmaps } from 'Renderer/utils/rgbeUtils'
import { IOffscreenRenderContext } from 'Renderer/rendering/OffscreenRenderer'
import type { RoomTemplate } from 'Planner/room_template/room_template'
import type {
    TemplateVertex,
    TemplateWall,
    TemplateWallElement,
    TemplateAssetInfo,
} from 'Planner/room_template/room_template_types'

import { ROOM_MESH_ROOT_NAME } from 'Planner/planner_constants'
import { cameraIntrinsicsForViewName, generateCameraViews } from 'Planner/camera_views'

type ExportedMaterialExtras = {
    mapUrl?: string
    aoMapUrl?: string
    emissiveMapUrl?: string
    metalnessRoughnessMapUrl?: string
    normalMapUrl?: string
}

export class RoomExporter {
    public static async exportRoom(room: Room, binary: boolean, download: boolean) {
        room.getRoomMesh()?.generateRibbonMeshes()

        const scene = room.getScene()
        scene.refreshLights()
        scene.refreshSunlight()
        const sceneRoot = scene.getRenderScene()
        if (!sceneRoot) {
            return null
        }
        const exportedObject = SkeletonUtils.clone(sceneRoot)
        exportedObject.updateMatrixWorld(true)

        RoomExporter.preprocessScene(room, exportedObject)
        const rootExtras = { ...exportedObject.userData } as GeomagicalExtras
        const roomTemplate = RoomExporter.exportRoomAsTemplate(room, false)
        if (roomTemplate) {
            rootExtras.geomagical.geomagicalScenes[0].roomTemplate = roomTemplate
        }
        exportedObject.userData = { geomagicalScene: 0 }

        const exporter = new GLTFExporter()
        const result = (await exporter.parseAsync(exportedObject, {
            trs: true,
            binary,
        })) as unknown as GLTf

        RoomExporter.postProcessResult(result, exportedObject, rootExtras)

        if (download) {
            RoomExporter.downloadResult(result, binary)
        }
        return result
    }

    public static async exportEnvMap(room: Room, offscreenRenderCtx: IOffscreenRenderContext,
        exportAsEquirect: boolean, download: boolean) {
        const scene = room.getScene()

        scene.setCubemapIsDirty()
        let envMapRenderTarget = await scene.getCubemap().ready()
        if (!envMapRenderTarget) {
            return null
        }

        if (exportAsEquirect) {
            const mipmapTexture = envMapRenderTarget.texture
            envMapRenderTarget = projectEquirectRTfromMipmaps(offscreenRenderCtx, mipmapTexture)
        }

        const width = envMapRenderTarget.width
        const height = envMapRenderTarget.height
        const uintBuff = new Uint16Array(width * height * 4)
        offscreenRenderCtx.readRenderTargetPixels(envMapRenderTarget, 0, 0, width, height, uintBuff)
        envMapRenderTarget.dispose()

        const hdrBlob = exportHDRblobFromPixelData(uintBuff, width, height)

        if (download) {
            const url = URL.createObjectURL(hdrBlob)
            try {
                const linkElement = document.createElement("a")
                linkElement.href = url
                linkElement.download = `environment.hdr`
                linkElement.style.display = `none`
                document.body.appendChild(linkElement)
                linkElement.click()
                linkElement.remove()
            } finally {
                URL.revokeObjectURL(url)
            }
        }
        return hdrBlob
    }

    private static downloadResult(data: object | ArrayBuffer, isBinary: boolean, fileName?: string) {
        const type = isBinary ? `application/octet-stream` : `application/json`
        const toSave = isBinary ? (data as ArrayBuffer) : JSON.stringify(data, null, 2)
        const blob = new Blob([toSave], { type })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = isBinary ? `exported.glb` : `exported.gltf`
        if (fileName) {
            a.download = fileName
        }
        document.body.appendChild(a)
        a.click()

        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    private static preprocessScene(room: Room, rootObject: THREE.Object3D) {
        if (!rootObject.userData) {
            rootObject.userData = {}
        }
        if (!rootObject.userData.geomagical) {
            rootObject.userData.geomagical = {}
        }

        const roomMeshObject = rootObject.getObjectByName(ROOM_MESH_ROOT_NAME)
        if (roomMeshObject) {
            rootObject.remove(roomMeshObject)
            const children = [...roomMeshObject.children]
            children.forEach(child => {
                child.visible = true // It might be invisible due to hiding back facing walls.
                if (child instanceof THREE.Mesh) {
                    child.material.side = THREE.FrontSide
                }
                rootObject.add(child)
            })
            rootObject.userData.geomagical.geomagicalSurfaces = [
                ...roomMeshObject.userData.geomagical.geomagicalSurfaces
            ]
        }

        const toRemove: THREE.Object3D[] = []
        const toAdd: THREE.Object3D[] = []
        rootObject.traverse((object) => {
            if (object.userData.exportIgnore) {
                toRemove.push(object)
                return
            }
            if (object instanceof THREE.Mesh) {
                // Show room border meshes.
                if (object.name.includes('thickness') || object.name.includes('baseboard')) {
                    object.visible = true
                }

                if (object.material instanceof THREE.MeshStandardMaterial ||
                    object.material instanceof CustomStandardMaterial) {
                    // GLTF exporter does not support ShaderMaterial from which CustomStandardMaterial is derived,
                    // at the same time CustomStandardMaterial mimics all properties of MeshStandardMaterial,
                    // so simply setting isShaderMaterial to false is enough here.
                    if (object.material instanceof CustomStandardMaterial) {
                        // eslint-disable-next-line i18next/no-literal-string
                        Object.defineProperty(object.material, 'isShaderMaterial', { value: false })
                    }
                    if (!object.material.userData) {
                        object.material.userData = {}
                    }

                    // THREE's gltf exporter will export material's userData as "extras".
                    object.material.userData.mapUrl =
                        object.material.map?.userData?.sourceUrl as (undefined | string)
                    object.material.userData.emissiveMapUrl =
                        object.material.emissiveMap?.userData?.sourceUrl as (undefined | string)
                    object.material.userData.metalnessRoughnessMapUrl =
                        (object.material.metalnessMap?.userData?.sourceUrl ||
                            object.material.roughnessMap?.userData?.sourceUrl) as (undefined | string)
                    object.material.userData.normalMapUrl =
                        object.material.normalMap?.userData?.sourceUrl as (undefined | string)

                    // Turn off ao map support for now.
                    const supportAOMap = false
                    if (supportAOMap) {
                        object.material.userData.aoMapUrl = 
                        object.material.aoMap?.userData?.sourceUrl as (undefined | string)
                    } else {
                        object.material.aoMap = null
                    }
                }
            }

            if (object instanceof THREE.DirectionalLight) {
                object.visible = true
            }

            // Area lights aren't supported in the gltf format, so point light placeholders
            // are added instead. Loaders will later use geomagicalLights props to override.
            if (object instanceof THREE.RectAreaLight && object.intensity !== 0.0) {
                const replacement = new THREE.PointLight(object.color, object.intensity)
                replacement.position.copy(object.position)
                replacement.quaternion.copy(object.quaternion)
                replacement.updateMatrix()
                replacement.updateMatrixWorld()
                replacement.userData.parent = object.parent
                replacement.userData.geomagicalLightProps = {
                    dimensions: [object.width, object.height],
                    pbrType: `area`,
                }
                toAdd.push(replacement)
                toRemove.push(object)
            }

            if (object instanceof THREE.HemisphereLight) {
                toRemove.push(object)
            }

            if (object instanceof THREE.Light && object.intensity === 0.0) {
                toRemove.push(object)
            }

            if (object.userData.isLightFixture && !object.visible) {
                toRemove.push(object)
            }
        })

        toAdd.forEach(obj => { obj.userData.parent.add(obj); delete obj.userData.parent })
        toRemove.forEach(obj => obj.removeFromParent())

        RoomExporter.bakeSkinnedMeshes(rootObject)

        RoomExporter.addGeomagicalCameras(room, rootObject)
        RoomExporter.addGeomagicalLights(room, rootObject)
    }

    private static postProcessResult(result: GLTf, sceneRoot: THREE.Object3D, rootExtras: GeomagicalExtras) {
        result.extras = rootExtras

        if (result.materials) {
            result.materials?.forEach((material) => {
                if (!material.extras || !result.textures || !result.images) {
                    return
                }
                const extras = material.extras as ExportedMaterialExtras
                RoomExporter.replaceImageUriWithUrl(result, extras.mapUrl,
                    material.pbrMetallicRoughness?.baseColorTexture)
                RoomExporter.replaceImageUriWithUrl(result, extras.metalnessRoughnessMapUrl,
                    material.pbrMetallicRoughness?.metallicRoughnessTexture)
                RoomExporter.replaceImageUriWithUrl(result, extras.normalMapUrl, material.normalTexture)
                RoomExporter.replaceImageUriWithUrl(result, extras.aoMapUrl, material.occlusionTexture)
                RoomExporter.replaceImageUriWithUrl(result, extras.emissiveMapUrl, material.emissiveTexture)
            })
        }
        if (result.cameras) {
            result.cameras.forEach((camera, idx) => {
                camera.extras = {
                    geomagicalCamera: idx
                }
            })
        }
        // Hela's uses non-standard gltf validation and does not accept all the official GLTF features,
        // such as all the possible values of minFilter.They are optional in GLTF spec,
        // and by default in GLTFLoader ThreeJS uses:
        // magFilter: LinearFilter
        // minFilter: LinearMipmapLinearFilter
        if (result.samplers) {
            result.samplers.forEach((sampler) => {
                delete sampler.minFilter
                delete sampler.magFilter
            })
        }

        if (result.nodes && Array.isArray(result.extensions?.KHR_lights_punctual?.lights)) {
            result.nodes.forEach((node) => {
                const lightIndex = node.extensions?.KHR_lights_punctual?.light
                if (lightIndex !== undefined) {
                    result.extensions.KHR_lights_punctual.lights[lightIndex].extras = {
                        geomagicalLight: node.extras.geomagicalLight
                    }
                    delete node.extras
                }
            })
        }
    }

    private static replaceImageUriWithUrl(result: GLTf, url: string | undefined,
        textureInfo: TextureInfo | MaterialNormalTextureInfo | MaterialOcclusionTextureInfo | undefined) {
        if (!url || !textureInfo || !result.textures || !result.images) {
            return
        }
        const textureSource = result.textures[textureInfo.index]?.source
        if (textureSource !== undefined) {
            const image = result.images[textureSource]
            if (image) {
                image.uri = url
            }
        }
    }

    private static addGeomagicalCameras(room: Room, exportedScene: THREE.Object3D) {
        const views = generateCameraViews(room)
        const extras: unknown[] = []
        views.forEach((cameraView, index) => {
            const camera = new THREE.PerspectiveCamera()
            camera.position.copy(cameraView.position)
            camera.quaternion.copy(cameraView.quaternion)
            camera.up.copy(cameraView.up)
            camera.fov = cameraView.fov
            camera.updateProjectionMatrix()
            camera.updateMatrixWorld()
            camera.userData = {
                geomagicalCamera: index,
            }

            exportedScene.add(camera)

            const intrinsics = cameraIntrinsicsForViewName(cameraView.name)
            extras.push({
                version: '1.0',
                intrinsics: {
                    version: '1.1',
                    fxy: [intrinsics.fx, intrinsics.fy],
                    cxy: [intrinsics.px, intrinsics.py],
                    fxyNormalized: [intrinsics.fx / (2.0 * intrinsics.px), intrinsics.fy / (2.0 * intrinsics.py)],
                    cxyNormalized: [0.5, 0.5],
                }
            })
        })
        if (!exportedScene.userData) {
            exportedScene.userData = {}
        }
        exportedScene.userData.geomagical.geomagicalCameras = extras
    }

    private static addGeomagicalLights(room: Room, exportedScene: THREE.Object3D) {
        const geomagicalLights: unknown[] = []
        let index = 0
        exportedScene.traverse((object) => {
            const isDirectionalLight = object instanceof THREE.DirectionalLight
            const isPointLight = object instanceof THREE.PointLight
            if (!isPointLight && !isDirectionalLight) {
                return
            }
            geomagicalLights.push({
                version: "1.0",
                id: index,
                isPortal: false,
                pbrType:
                    isPointLight ? `point` :
                    isDirectionalLight ? `directional` :
                    ``,
                ...object.userData.geomagicalLightProps || {},
            })
            delete object.userData.geomagicalLightProps
            object.userData.geomagicalLight = index
            index += 1
        })
        exportedScene.userData.geomagical.geomagicalLights = geomagicalLights
    }

    public static exportRoomAsTemplate(room: Room, download: boolean): RoomTemplate | null {
        const wallsGraph = room.getWallsGraph()
        if (!wallsGraph) {
            return null
        }
        const ceilingMaterialUuid = room.getCeilingMaterialUuid()
        const floorMaterialUuid = room.getFloorMaterialUuid()
        const wallsMaterialUuid = room.getWallsMaterialUuid()
        const wallsColor = room.getWallsColor()

        const templateAssets: TemplateAssetInfo[] = [{
            uuid: floorMaterialUuid,
            type: `material`,
        }, {
            uuid: ceilingMaterialUuid,
            type: `material`,
        }, {
            uuid: wallsMaterialUuid,
            type: `material`,
        }]
        const floorMaterialIdx = 0
        const ceilingMaterialIdx = 1
        const wallsMaterialIdx = 2

        const vertices = [...wallsGraph.getVertices().values()]

        const vertexIdToIndex = new Map<string, number>()
        vertices.forEach((v, i) => vertexIdToIndex.set(v.id, i))

        const templateVertices: TemplateVertex[] = vertices.map((v, index) => {
            const position = wallsGraph?.getVertexPosition(v.id)
            return {
                id: index,
                position: {
                    x: position?.x || 0.0,
                    y: position?.y || 0.0,
                }
            }
        })
        const walls = [...wallsGraph.getWalls().values()]
        const templateWalls: TemplateWall[] = walls.map((wall) => ({
            id: +wall.id,
            vertices: [vertexIdToIndex.get(wall.vertexIds[0]) || 0, vertexIdToIndex.get(wall.vertexIds[1]) || 0],
            asset: wallsMaterialIdx,
            color:
            {
                r: wallsColor[0],
                g: wallsColor[1],
                b: wallsColor[2],
            }
        }))

        const wallElements = [...wallsGraph.getWallElements().entries()]
        wallElements.forEach(([id]) => {
            const uuid = room.getWallElementAsset(id)
            const assetIdx = templateAssets.findIndex(asset => asset.uuid === uuid)
            if (!uuid || assetIdx !== -1) {
                return
            }
            templateAssets.push({ uuid, type: `wall-element` })
        })
        const templateWallElements: TemplateWallElement[] = wallElements.map(([id, wallElement], idx) => {
            const assetId = room.getWallElementAsset(id)
            const assetIdx = templateAssets.findIndex(asset => asset.uuid === assetId)
            const position = wallsGraph.getWallElementPosition(id)
            const wallIndex = walls.findIndex(wall => wall.id === wallElement.wallId)
            return {
                id: idx,
                wallId: wallIndex,
                position:
                {
                    x: position.x,
                    y: position.y,
                },
                size:
                {
                    w: wallElement.size.x,
                    h: wallElement.size.y,
                },
                class: wallElement.class,
                asset: assetIdx,
            }
        })

        const ret: RoomTemplate = {
            version: `1.0`,
            assets: templateAssets,
            floor: {
                asset: floorMaterialIdx,
            },
            ceiling: {
                asset: ceilingMaterialIdx,
                height: room.getRoomHeight(),
            },
            vertices: templateVertices,
            walls: templateWalls,
            wallElements: templateWallElements,
        }

        if (download) {
            RoomExporter.downloadResult(ret, false, `exported.json`)
        }

        return ret
    }

    private static bakeSkinnedMeshes(rootObject: THREE.Object3D) {
        const skinnedMeshes: THREE.SkinnedMesh[] = []
        rootObject.traverse((object) => {
            if (object instanceof THREE.SkinnedMesh) {
                skinnedMeshes.push(object)
            }
        })
        const boneRootsToRemove = new Set<THREE.Object3D>()

        skinnedMeshes.forEach((skinnedMesh) => {
            const parent = skinnedMesh.parent
            if (!parent) {
                return
            }

            const bakedGeometry = RoomExporter.createGeometryFromSkinnedMesh(skinnedMesh)
            const bakedMesh = new THREE.Mesh(bakedGeometry, skinnedMesh.material)

            bakedMesh.name = skinnedMesh.name
            bakedMesh.userData = { ...skinnedMesh.userData }
            bakedMesh.visible = skinnedMesh.visible
            bakedMesh.castShadow = skinnedMesh.castShadow
            bakedMesh.receiveShadow = skinnedMesh.receiveShadow
            bakedMesh.frustumCulled = skinnedMesh.frustumCulled
            bakedMesh.renderOrder = skinnedMesh.renderOrder

            bakedMesh.position.copy(skinnedMesh.position)
            bakedMesh.quaternion.copy(skinnedMesh.quaternion)
            bakedMesh.scale.copy(skinnedMesh.scale)
            bakedMesh.matrix.copy(skinnedMesh.matrix)
            bakedMesh.matrixWorld.copy(skinnedMesh.matrixWorld)
            bakedMesh.matrixAutoUpdate = skinnedMesh.matrixAutoUpdate

            parent.add(bakedMesh)
            skinnedMesh.removeFromParent()

            skinnedMesh.skeleton.bones.forEach((bone) => {
                let root: THREE.Object3D = bone
                while (root.parent && root.parent instanceof THREE.Bone) {
                    root = root.parent
                }
                boneRootsToRemove.add(root)
            })
        })

        for (const boneRoot of boneRootsToRemove) {
            boneRoot.removeFromParent()
        }
        rootObject.updateMatrixWorld(true)
    }

    private static createGeometryFromSkinnedMesh(skinnedMesh: THREE.SkinnedMesh): THREE.BufferGeometry {
        const sourceGeometry = skinnedMesh.geometry
        const resultGeometry = sourceGeometry.clone()

        const sourcePosition = sourceGeometry.getAttribute('position')
        if (!sourcePosition) {
            return resultGeometry
        }

        const bakedPosition = sourcePosition.clone()

        const tempVector = new THREE.Vector3()
        for (let i = 0; i < sourcePosition.count; i += 1) {
            tempVector.fromBufferAttribute(sourcePosition, i)
            skinnedMesh.applyBoneTransform(i, tempVector)
            bakedPosition.setXYZ(i, tempVector.x, tempVector.y, tempVector.z)
        }

        resultGeometry.setAttribute(`position`, bakedPosition)
        resultGeometry.deleteAttribute(`skinIndex`)
        resultGeometry.deleteAttribute(`skinWeight`)

        if (resultGeometry.getAttribute(`normal`)) {
            resultGeometry.computeVertexNormals()
        }
        resultGeometry.computeBoundingBox()
        resultGeometry.computeBoundingSphere()
        return resultGeometry
    }
}
