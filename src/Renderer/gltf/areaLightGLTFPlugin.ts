import * as THREE from 'three'
import type { GLTFParser, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

export function createAreaLightProxyGLTFPlugin(parser: GLTFParser) {
    return {
        async afterRoot(gltf: GLTF) {
            const json = parser.json
            const root = gltf.scene
            const replacements: Array<{
                parent: THREE.Object3D
                proxy: THREE.PointLight
                rect: THREE.RectAreaLight
            }> = []

            root.updateMatrixWorld(true)
            root.traverse(obj => {
                if (!(obj instanceof THREE.PointLight) || !obj.parent)
                    return

                const geomagicalLightId = obj.userData.geomagicalLight
                const geomagicalLight = json.extras?.geomagical?.geomagicalLights?.[geomagicalLightId]
                
                if (geomagicalLight?.pbrType !== `area` || geomagicalLight?.isPortal)
                    return

                const areaLight = new THREE.RectAreaLight(
                    obj.color.clone(),
                    obj.intensity,
                    geomagicalLight.dimensions[0],
                    geomagicalLight.dimensions[1]
                )
                areaLight.name = obj.name
                areaLight.userData = { ...obj.userData }
                areaLight.position.copy(obj.position)
                areaLight.quaternion.copy(obj.quaternion)
                areaLight.scale.copy(obj.scale)
                areaLight.updateMatrix()

                replacements.push({
                    parent: obj.parent,
                    proxy: obj,
                    rect: areaLight,
                })
            })

            for (const { parent, proxy, rect } of replacements) {
                parent.add(rect)
                parent.remove(proxy)
            }
            root.updateMatrixWorld(true)
        }
    }
}