/* eslint no-mixed-operators: 0 */
/* eslint camelcase: 0 */
/* eslint @typescript-eslint/naming-convention: 0 */

// This class handles all of the webGL rendering

import * as THREE from 'three'
import { withPrefix } from 'gatsby'

import isMobile from 'utils/isMobile'

import {
    RUG_SUB_LAYER_DELTA,
    ALWAYS_ON_TOP_RENDER_ORDER,
    NYUD40_CLASSES
} from 'Renderer/constants'
import { getHardwareInfo } from 'utils/getHardwareInfo'
import { getSafariVersion, isSafari } from 'utils/browser'
import {
    wattsToLumens,
    LIGHT_DIRECTIONAL,
    LIGHT_POINT,
    LIGHT_SPOT,
    LIGHT_AREA,
} from 'utils/lightUtils'

import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib'
import {
    setupDirectionalLight,
    setupPointColoredLight,
    setupSpotColoredLight,
    setupAreaColoredLight,
} from 'Renderer/rendering/light_build_utils'
import CustomStandardMaterial from './CustomStandardMaterial'
import { CustomShader, LightType, MaterialTypes } from './assets/Types'
import { gvCurrentScene, gvCurrentSettings, gvRenderLibrary } from './foundation/geom_app'
import { RendererContextType } from './rendering/Enums'
import { RenderTargetHandler, setMaterialOnBeforeCompileCallback } from './rendering/rendering_utils'
import LitShadowMaterial from './LitShadowMaterial'

class WallspiceWebgl {
    static createRenderer(canvas, mobileFeatures, usePBR) {
        let downrez = 1
        let antialias = true
        let software = false
        let ext_depth = null
        let canvas_width = null
        let canvas_height = null
        const query_canvas = document.createElement('canvas', { width: 4, height: 4 })
        let ctx = query_canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })
        if (!ctx) {
            software = true
            ctx = query_canvas.getContext('webgl')

            if (!ctx) {
                // failed to find a context, THREE.js fails here too
                return null
            }
        }
        const debugInfo = ctx.getExtension('WEBGL_debug_renderer_info')
        const rendy = ctx.getParameter(ctx.RENDERER)
        const underlyingVendor = debugInfo ? ctx.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : undefined
        const underlyingRenderer = debugInfo ? ctx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : undefined
        ext_depth = ctx.getExtension('EXT_frag_depth')
        const wgl2QueryTimerExt = ctx.getExtension('EXT_disjoint_timer_query_webgl2')
        const wgl1QueryTimerExt = ctx.getExtension('EXT_disjoint_timer_query')

        if (
            rendy === 'WebKit WebGL' &&
            underlyingVendor === 'Intel Inc.' &&
            underlyingRenderer.indexOf('Iris(TM)') >= 0 &&
            underlyingRenderer.indexOf('No Disable AA as bug has gone for now') >= 0 &&
            navigator.platform === 'MacIntel' &&
            navigator.userAgent.indexOf('Chrome') >= 0
        ) {
            antialias = false
        }

        // Disabling GPU acceleration in chrome results in usage of SwiftShader implementation of WebGL.
        // However, context creation with 'failIfMajorPerformanceCaveat' produces a valid context and does not let us know it is software.
        if (
            rendy === 'WebKit WebGL' &&
            underlyingVendor === 'Google Inc. (Google)' &&
            underlyingRenderer.indexOf('SwiftShader Device') >= 0 &&
            underlyingRenderer.indexOf('SwiftShader driver') >= 0 &&
            navigator.userAgent.indexOf('Chrome') >= 0
        ) {
            software = true
        }

        if (software) {
            downrez = 2
            antialias = false
        }

        if (isMobile() && mobileFeatures.noAA) {
            antialias = false
        }

        canvas_width = canvas.width / downrez
        canvas_height = canvas.height / downrez

        WallspiceWebgl.applyPBRCustomShaderChunks()
        if (usePBR) {
            RectAreaLightUniformsLib.init()
        }
        const params = {
            canvas,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
            antialias,
            useWebGL1 : isSafari() && (getSafariVersion() < 16.4)
        }
        // Safari has performance problems for WebGl2 implementation so fallback to WebGl1.
        // Yet as of March 27th, Safari 16.4+ has a bug with Webgl1. So the fallback is disabled
        // as the WebGl2 performance bug was fixed.
        // https://developer.apple.com/forums/thread/696821
        const renderer = gvRenderLibrary().createRenderer(params)
        renderer.shadowMap.enabled = !software
        renderer.shadowMap.type = isMobile() ? gvRenderLibrary().constants.PCFSoftShadowMap : gvRenderLibrary().constants.PCFShadowMap
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setClearAlpha(0)
        renderer.autoClear = false
        renderer.outputColorSpace = gvRenderLibrary().constants.SRGBColorSpace
        renderer.localClippingEnabled = true
        renderer.toneMapping = THREE.CustomToneMapping
        renderer.toneMappingExposure = 1.0
        renderer.useLegacyLights = !usePBR
        renderer.info.autoReset = false
        const hwinfo = getHardwareInfo()
        // Fragment depth is core in WebGL2 (no extension query needed). The EXT_frag_depth
        // getExtension call is unreliable across browsers, e.g., Android Chrome may return null
        // even when the underlying GLES 3.0 driver supports gl_FragDepth natively. Three.js
        // translates gl_FragDepthEXT to gl_FragDepth automatically when targeting WebGL2.
        const isWebGL2 = !params.useWebGL1
        renderer.wallspiceContextInfo = {
            hasFragmentDepth: !!ext_depth || isWebGL2,
            antialias,
            software,
            canvas_height,
            canvas_width,
            hasWGL1QueryTimer: !!wgl1QueryTimerExt,
            hasWGL2QueryTimer: !!wgl2QueryTimerExt,
            hwinfo,
        }
        return renderer
    }

    static applyPBRCustomShaderChunks() {
        gvRenderLibrary().applyCustomShaders(CustomShader.Pbr)
    }

    static applyStandardMaterialsShaderChunks() {
        gvRenderLibrary().applyCustomShaders(CustomShader.Standard)
    }

    static queryContextInfo(wglrend) {
        if (!wglrend) {
            return null
        }
        const ctx = wglrend.getContext()
        const debugInfo = ctx.getExtension('WEBGL_debug_renderer_info')
        const version = ctx.getParameter(ctx.VERSION)
        const GLSLversion = ctx.getParameter(ctx.SHADING_LANGUAGE_VERSION)
        const vendor = ctx.getParameter(ctx.VENDOR)
        const renderer = ctx.getParameter(ctx.RENDERER)
        const underlyingVendor = debugInfo ? ctx.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : undefined
        const underlyingRenderer = debugInfo ? ctx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : undefined
        return {
            ...wglrend.wallspiceContextInfo,
            version,
            GLSLversion,
            vendor,
            renderer,
            underlyingVendor,
            underlyingRenderer,
            devicePixelRatio: window.devicePixelRatio,
        }
    }

    static createScene() {
        return gvRenderLibrary().createScene()
    }

    static hexgammacol(color) {
        const gamma = 1.0
        const r = 255.0 * (color[0] / 255.0) ** (1.0 / gamma)
        const g = 255.0 * (color[1] / 255.0) ** (1.0 / gamma)
        const b = 255.0 * (color[2] / 255.0) ** (1.0 / gamma)

        // eslint-disable-next-line no-bitwise
        return (r << 16) + (g << 8) + b
    }

    static createPointColoredLight(light, castShadow, mobileTextureSize, usePBR) {
        let pLight
        if (usePBR) {
            pLight = gvRenderLibrary().createLight(LightType.Point, gvRenderLibrary().createColor( (light.pbr?.color
                || [WallspiceWebgl.hexgammacol(light.color)]), true), 1, 0, 2 )                  
            pLight.power = wattsToLumens(light.pbr?.power, LIGHT_POINT)
        } else {
            const correctedColor = gvRenderLibrary().createColor(WallspiceWebgl.hexgammacol(light.color))
            pLight = gvRenderLibrary().createLight(LightType.Point, correctedColor, light.intensity)        
        }
        pLight.position.set(light.position[0], -light.position[1], light.position[2])
        setupPointColoredLight(pLight, castShadow, mobileTextureSize)
        return pLight
    }

    static createDirectionalColoredLight(light, castShadow, mobileTextureSize, usePBR) {
        const correctedColor = usePBR ? (light.pbr?.color || [WallspiceWebgl.hexgammacol(light.color)])
            : [WallspiceWebgl.hexgammacol(light.color)]
        const color = gvRenderLibrary().createColor(correctedColor, (usePBR && light.pbr) )
        const intensity = usePBR ? wattsToLumens(light.pbr?.power, LIGHT_DIRECTIONAL) : light.intensity
        const dirLight = gvRenderLibrary().createLight( LightType.Directional, color, intensity)
        setupDirectionalLight(dirLight, castShadow, mobileTextureSize)
        dirLight.position.set(light.direction[0] * 5.0, -light.direction[1] * 5.0, light.direction[2] * 5.0)
        return dirLight
    }

    static createSpotColoredLight(light, castShadow, mobileTextureSize, usePBR) {
        let sLight
        if (usePBR) {
            sLight = gvRenderLibrary().createLight( LightType.Spot,
                gvRenderLibrary().createColor(...(light.pbr?.color || [WallspiceWebgl.hexgammacol(light.color)])),
                1,
                0,
                light.pbr?.outer_angle || 0,
                light.pbr?.inner_angle || 0,
                2,
            )
            sLight.power = wattsToLumens(light.pbr?.power, LIGHT_SPOT, {
                outer_angle: light.pbr?.outer_angle || 0
            })
        } else {
            const correctedColor = gvRenderLibrary().createColor(WallspiceWebgl.hexgammacol(light.color))
            sLight = gvRenderLibrary().createLight(LightType.Spot, correctedColor, light.intensity)
        }
        const target = [0, 1, 2].map((i) => light.position[i] + light.direction[i])
        sLight.position.set(light.position[0], -light.position[1], light.position[2])
        sLight.target.position.set(target[0], -target[1], target[2])
        setupSpotColoredLight(sLight, castShadow, mobileTextureSize)
        return sLight
    }

    static createAreaColoredLight(light, usePBR) {
        let aLight
        const width = gvRenderLibrary().createVec3(...light.volume[0]).length()
        const height = gvRenderLibrary().createVec3(...light.volume[1]).length()
        if (usePBR) {
            aLight = gvRenderLibrary().createLight( LightType.Area, gvRenderLibrary().createColor(...(light.pbr?.color
                || [WallspiceWebgl.hexgammacol(light.color)])), 1, width, height)
            aLight.power = wattsToLumens(light.pbr?.power, LIGHT_AREA)
        } else {
            const correctedColor = gvRenderLibrary().createColor(WallspiceWebgl.hexgammacol(light.color))
            aLight = gvRenderLibrary().createLight( LightType.Area, correctedColor, light.intensity, width, height)
        }
        aLight.lookAt(light.direction[0], -light.direction[1], light.direction[2])
        aLight.position.set(light.position[0], -light.position[1], light.position[2])
        setupAreaColoredLight(aLight)
        return aLight
    }

    /**
     * Fits the passed light's shadow camera boundaries using the passed data
     * to a minimum enclosing area for higher shadows quality.
     * @property {THREE.DirectionalLight} light - The light to be adjusted.
     * @property {THREE.PerspectiveCamera} sceneCam - The active sceneview camera.
     * @property {DepthOcclusionMetadata} depth_occlusion_meta_0 - The min and
     *      max values from the depth map seen from the sceneview camera.
     * @property {Polygon3[]} roomVertices - The room's polygons vertices clipped
     *      within the enclosing visible 3D space of the scene.
     */
    static fitDirectionalLightShadowMap(light, sceneCam, depth_occlusion_meta_0, roomVertices) {
        // Only fit directional light shadow maps
        if (!(light instanceof THREE.DirectionalLight)) return

        // Calculate the shadow camera parameters for improved utilization of the shadow map
        const cameraPos = sceneCam.position
        const cameraFront = sceneCam.getWorldDirection(gvRenderLibrary().createVec3())
        const lightPos = light.position.clone().sub(cameraPos)
        const lightRotMat = gvRenderLibrary().createMat4().lookAt(
            lightPos,
           gvRenderLibrary().createVec3(),
           gvRenderLibrary().createVec3(0, 1, 0)
        )
        const lightTransMat = gvRenderLibrary().createMat4().setPosition(lightPos)
        const lightModelMatInv = gvRenderLibrary().createMat4().multiplyMatrices(lightTransMat, lightRotMat).invert()
        const currentWidthUnits = light.shadow.camera.right - light.shadow.camera.left
        const currentHeightUnits = light.shadow.camera.top - light.shadow.camera.bottom
        const currentCenter = gvRenderLibrary().createVec2(
            (light.shadow.camera.right + light.shadow.camera.left) / 2,
            (light.shadow.camera.top + light.shadow.camera.bottom) / 2,
        )
        const lightSpaceNDCProject = (v) =>
            v.clone().applyMatrix4(lightModelMatInv).applyMatrix4(light.shadow.camera.projectionMatrix)
        light.shadow.camera.updateProjectionMatrix()
        
        // Use the provided data to calculate the shadow camera's boundaries.
        if (roomVertices) {
            // Use the bounding geomety's vertices to accurately fit the shadow map.
            const relativeVertices = roomVertices.map(v => v.sub(cameraPos))

            // Extend bounding geometry towards camera's near plane since furniture items
            // are allowed to be moved out of the enclosing room area towards the camera.
            relativeVertices.push(cameraPos.clone().add(cameraFront.clone().multiplyScalar(sceneCam.near)))
  
            // Project all the polygons' vertices into normalized device coordinates.
            const verticesNDC = relativeVertices.map(v => lightSpaceNDCProject(v))
            
            // Calculate the min width enclosing the projected vertices in normalized device coords.
            let maxXNDC = -Infinity
            let minXNDC = Infinity
            let maxYNDC = -Infinity
            let minYNDC = Infinity
            verticesNDC.forEach(v => {
                if (v.x > maxXNDC) maxXNDC = v.x
                if (v.x < minXNDC) minXNDC = v.x
                if (v.y > maxYNDC) maxYNDC = v.y
                if (v.y < minYNDC) minYNDC = v.y
            });
            const minWidthNDC = maxXNDC - minXNDC
            const minHeightNDC = maxYNDC - minYNDC

            // Calculate the minimum enclosing dimensions.
            const minDimension = Math.max(minWidthNDC, minHeightNDC) * 0.5 * currentWidthUnits

            // Calculate the new shadow map boundaries according to the calculated width/height.
            const newCenterNDCx = (maxXNDC + minXNDC) * 0.5
            const newCenterNDCy = (maxYNDC + minYNDC) * 0.5
            const newCenter = gvRenderLibrary().createVec2(
                currentWidthUnits * (newCenterNDCx * 0.5 + 0.5) + light.shadow.camera.left,
                currentHeightUnits * (newCenterNDCy * 0.5 + 0.5) + light.shadow.camera.bottom,
            )
            /* eslint-disable no-param-reassign */
            light.shadow.camera.left = (newCenter.x - minDimension * 0.5)
            light.shadow.camera.right = (newCenter.x + minDimension * 0.5)
            light.shadow.camera.bottom = (newCenter.y - minDimension * 0.5)
            light.shadow.camera.top = (newCenter.y + minDimension * 0.5)
            /* eslint-enable no-param-reassign */
        } else if (depth_occlusion_meta_0) {
            // Use the room's max/min depth values to fit the shadow map
            const p1NDC = lightSpaceNDCProject(cameraPos.clone())
            const p2NDC = lightSpaceNDCProject(
                cameraPos.clone().add(cameraFront).multiplyScalar(depth_occlusion_meta_0.max),
            )
            const minWidth = Math.abs(p2NDC.x - p1NDC.x)
            const minHeight = Math.abs(p2NDC.y - p1NDC.y)
            const dimensionRatio = light.shadow.mapSize.width / light.shadow.mapSize.height
            const widthNDC = Math.max(minWidth, dimensionRatio * minHeight) * (1.3 + Math.sqrt(2) / 2) // Worst case diagonal padding
            const heightNDC = Math.max(minHeight, (1 / dimensionRatio) * minWidth) * (1.3 + Math.sqrt(2) / 2) // Worst case diagonal padding
            const newRelativeCenterNDC = gvRenderLibrary().createVec2((p1NDC.x + p2NDC.x) / 2, (p1NDC.y + p2NDC.y) / 2)
            /* eslint-disable no-param-reassign */
            light.shadow.camera.left =
                (newRelativeCenterNDC.x - widthNDC / 2) * (currentWidthUnits / 2) + currentCenter.x
            light.shadow.camera.right =
                (newRelativeCenterNDC.x + widthNDC / 2) * (currentWidthUnits / 2) + currentCenter.x
            light.shadow.camera.bottom =
                (newRelativeCenterNDC.y - heightNDC / 2) * (currentHeightUnits / 2) + currentCenter.y
            light.shadow.camera.top =
                (newRelativeCenterNDC.y + heightNDC / 2) * (currentHeightUnits / 2) + currentCenter.y
            /* eslint-enable no-param-reassign */
        } else {
            // Guess the scene's approximate center point using the camera's focal length
            const sceneCenterViewSpace = 0.0008436 * sceneCam.projectionMatrix.elements[0] + 1.501
            const sceneCenter = cameraPos.clone().add(cameraFront).multiplyScalar(sceneCenterViewSpace)
            const sceneCenterLightSpaceNDC = lightSpaceNDCProject(sceneCenter)
            /* eslint-disable no-param-reassign */
            light.shadow.camera.left = sceneCenterLightSpaceNDC.x * (currentWidthUnits / 2) + currentCenter.x - 3.5
            light.shadow.camera.right = sceneCenterLightSpaceNDC.x * (currentWidthUnits / 2) + currentCenter.x + 3.5
            light.shadow.camera.bottom = sceneCenterLightSpaceNDC.y * (currentHeightUnits / 2) + currentCenter.y - 3.5
            light.shadow.camera.top = sceneCenterLightSpaceNDC.y * (currentHeightUnits / 2) + currentCenter.y + 3.5
            /* eslint-enable no-param-reassign */
        }
        light.shadow.camera.updateProjectionMatrix()
    }

    static fitContactShadowMap(shadowCam, bbox) {
        // if there is no furniture do not attempt to modify the map
        if (bbox.isEmpty()) return
        // add padding to ensure the shadow map fully encloses all items
        bbox.expandByScalar(0.01)

        // Calculate the shadow camera parameters for improved utilization of the shadow map
        const lightRotMat = gvRenderLibrary().createMat4().lookAt(
            shadowCam.position,
           gvRenderLibrary().createVec3(),
           gvRenderLibrary().createVec3(0, 1, 0)
        )
        const lightTransMat = gvRenderLibrary().createMat4().setPosition(shadowCam.position)
        const lightModelMatInv = gvRenderLibrary().createMat4().multiplyMatrices(lightTransMat, lightRotMat).invert()
        const currentWidthUnits = shadowCam.right - shadowCam.left
        const currentHeightUnits = shadowCam.top - shadowCam.bottom
        const currentCenter = gvRenderLibrary().createVec2(
            (shadowCam.right + shadowCam.left) / 2,
            (shadowCam.top + shadowCam.bottom) / 2,
        )
        const lightSpaceNDCProject = (v) =>
            v.clone().applyMatrix4(lightModelMatInv).applyMatrix4(shadowCam.projectionMatrix)
        shadowCam.updateProjectionMatrix()

        // Use the scene furniture's min and max bounding values to fit the shadow map
        const p1NDC = lightSpaceNDCProject(bbox.min)
        const p2NDC = lightSpaceNDCProject(bbox.max)
        const minWidth = Math.abs(p2NDC.x - p1NDC.x)
        const minHeight = Math.abs(p2NDC.y - p1NDC.y)
        const widthNDC = Math.max(minWidth, minHeight)
        const heightNDC = Math.max(minHeight, minWidth)
        const newRelativeCenterNDC = gvRenderLibrary().createVec2((p1NDC.x + p2NDC.x) / 2, (p1NDC.y + p2NDC.y) / 2)
        /* eslint-disable no-param-reassign */
        shadowCam.left =
            (newRelativeCenterNDC.x - widthNDC / 2) * (currentWidthUnits / 2) + currentCenter.x
        shadowCam.right =
            (newRelativeCenterNDC.x + widthNDC / 2) * (currentWidthUnits / 2) + currentCenter.x
        shadowCam.bottom =
            (newRelativeCenterNDC.y - heightNDC / 2) * (currentHeightUnits / 2) + currentCenter.y
        shadowCam.top =
            (newRelativeCenterNDC.y + heightNDC / 2) * (currentHeightUnits / 2) + currentCenter.y
        /* eslint-enable no-param-reassign */
        shadowCam.updateProjectionMatrix()
    }

    static createFrameMaterial(
        fname = withPrefix('/testAssets/frames/textures/test.png'), 
        /** @type {string|number} */ albedo = 0xffffff,
        isUsingCustomLUT,
    ) {
        return new Promise((resolve) => {
            const loader = gvRenderLibrary().createTextureLoader()
            loader.load(fname, (texture) => {
                const map = texture
                map.anisotropy = 8
                map.needsUpdate = true
                map.wrapS = gvRenderLibrary().constants.RepeatWrapping
                map.wrapT = gvRenderLibrary().constants.RepeatWrapping
                const frameMaterial = isUsingCustomLUT
                    ? new CustomStandardMaterial({ map, color: albedo })
                    : gvRenderLibrary().createMaterial(MaterialTypes.Standard, { map, color: albedo } )

                if (!isUsingCustomLUT) {
                    setMaterialOnBeforeCompileCallback(
                        frameMaterial,
                        (shader) => {
                            /* eslint-disable no-param-reassign */
                            shader.fragmentShader = shader.fragmentShader.replace(
                                `#include <dithering_fragment>`,
                                `#include <dithering_fragment>
                                gl_FragColor = LinearTosRGB( gl_FragColor );`
                            )
                            /* eslint-enable no-param-reassign */
                        }
                    )
                }

                resolve(frameMaterial)
            })
        })
    }

    static createArtMaterial(artImage) {
        const map = gvRenderLibrary().createDataTexture(
            new Uint8Array(artImage.data),
            artImage.width,
            artImage.height,
            gvRenderLibrary().constants.RGBFormat,
            gvRenderLibrary().constants.UnsignedByteType,
            gvRenderLibrary().constants.UVMapping,
            gvRenderLibrary().constants.ClampToEdgeWrapping,
            gvRenderLibrary().constants.ClampToEdgeWrapping,
            gvRenderLibrary().constants.LinearFilter,
            gvRenderLibrary().constants.LinearFilter,
            8,
            gvRenderLibrary().constants.SRGBColorSpace,
        )
        map.flipY = true
        map.needsUpdate = true
        const envMap = gvCurrentScene()?.getEnvMap()
        const envMapIntensity = gvCurrentSettings()?.debugSettings?.environmentIntensity || 0
        const isUsingCustomLUT = gvCurrentSettings()?.debugSettings?.useFilmicLUT
        const artMaterial = isUsingCustomLUT
            ? new CustomStandardMaterial({ map, side: gvRenderLibrary().constants.DoubleSided })
            : gvRenderLibrary().createMaterial(MaterialTypes.Standard, {map, side: gvRenderLibrary().constants.DoubleSided } )

        let onBeforeCompileCallback = () => {}
        if (!isUsingCustomLUT || gvRenderLibrary()?.getRendererContextType() === RendererContextType.WebGL1Context)
        {
            onBeforeCompileCallback = (shader) => {
                /* eslint-disable no-param-reassign */
                if(!isUsingCustomLUT) {
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

        setMaterialOnBeforeCompileCallback(artMaterial, onBeforeCompileCallback)

        if (envMap) {
            artMaterial.envMap = envMap
            artMaterial.envMapIntensity = envMapIntensity
        }            

        return artMaterial
    }

    static createDebugSphere(pos, radius, col) {
        const bgM = gvRenderLibrary().createMateriall(MaterialTypes.Basic, { color: col, side: gvRenderLibrary().constants.DoubleSided })
        bgM.transparent = false
        bgM.depthTest = false
        bgM.depthWrite = true
        const sphereGeo = gvRenderLibrary().createSphereGeometry(radius, 12, 12)
        // sphereGeo.translate(pos.x, pos.y, pos.z)
        const intrinsicMesh = gvRenderLibrary().createMesh(sphereGeo, bgM)
        intrinsicMesh.position.set(pos.x, pos.y, pos.z)
        intrinsicMesh.name = 'debugLight'
        return intrinsicMesh
    }

    static createAppMesh(fd, debug, options) {
        let shadowfloor = null
        if (debug === 1) {
            const horizongeo = gvRenderLibrary().createPlaneGeometry(2, 2, 2, 2)
            const material = gvRenderLibrary().createMaterial(MaterialTypes.Basic, { color: 0x00ff00, wireframe: true })
            shadowfloor = gvRenderLibrary().createMesh(horizongeo, material)
            shadowfloor.name = 'horizon'
        } else if (debug === 2) {
            const geometry = gvRenderLibrary().createBufferGeometry()
            const pos = []
            let flip = 1
            const radius = 2.0
            for (let f = 0.0; f <= 2.0 * Math.PI + 0.04; f += Math.PI / 100.0) {
                pos.push(Math.cos(f) * radius, Math.sin(f) * radius, -10.0 * flip)
                pos.push(Math.cos(f) * radius, Math.sin(f) * radius, 10.0 * flip)
                flip *= -1.0
            }
            gvRenderLibrary().setBufferGeometryAttribute(geometry, 'position', gvRenderLibrary().createFloat32BufferAttribute(pos, 3) )
            const material = gvRenderLibrary().createMaterial(MaterialTypes.Line, { color: 0xff00ff } )
            material.depthTest = false;
            material.depthWrite = false;
            shadowfloor = gvRenderLibrary().createLine(geometry, material)
            shadowfloor.renderOrder = ALWAYS_ON_TOP_RENDER_ORDER
            shadowfloor.name = 'vertical vanishing lines'
        } else if (debug === 3) {
            const geometry = gvRenderLibrary().createBufferGeometry()
            const pos = []
            const radius = 0.25
            for (let f = 0.0; f <= 2.0 * Math.PI + 0.04; f += Math.PI / 50.0) {
                pos.push(Math.cos(f) * radius, Math.sin(f) * radius, -1.0)
            }
            gvRenderLibrary().setBufferGeometryAttribute(geometry, 'position', gvRenderLibrary().createFloat32BufferAttribute(pos, 3) )
            const material = gvRenderLibrary().createMaterial(MaterialTypes.Line, { color: 0x000000 })
            material.depthTest = false
            material.depthWrite = false
            shadowfloor = gvRenderLibrary().createLine(geometry, material)
            shadowfloor.renderOrder = ALWAYS_ON_TOP_RENDER_ORDER
            shadowfloor.name = 'principal point ring'
        } else {
            const floorgeo = gvRenderLibrary().createPlaneGeometry(50, 50)
            const material = new LitShadowMaterial()
            material.color = new THREE.Color(0xffffff)
            material.blending = THREE.MultiplyBlending
            material.envMap = gvCurrentScene()?.getEnvMap()
            material.envMapIntensity = gvCurrentSettings()?.debugSettings.environmentIntensity || 0
            material.transparent = true
            material.depthWrite = false
            material.setFilteringTexture(options.segmentationTexture, NYUD40_CLASSES.indexOf('floor'))
            shadowfloor = gvRenderLibrary().createMesh(floorgeo, material)
            shadowfloor.receiveShadow = true
            shadowfloor.castShadow = true
            shadowfloor.name = fd.name === 'floor' ? 'shadow floor receiver' : 'shadow wall receiver'
            shadowfloor.material.needsUpdate = true
            shadowfloor.renderOrder = ALWAYS_ON_TOP_RENDER_ORDER
        }

        // planes world position calculated with the plane normal's reverted
        // direction and the perpendicular distance d. Subtracted RUG_SUB_LAYER_DELTA
        // applied to have the shadow receiving plane always in front of the rendered wall
        const shadmat = gvRenderLibrary().createMat4()
        const planePos = [
            -fd.rot[2][0] * (fd.d - 0.5 * RUG_SUB_LAYER_DELTA),
            -fd.rot[2][1] * (fd.d - 0.5 * RUG_SUB_LAYER_DELTA),
            -fd.rot[2][2] * (fd.d - 0.5 * RUG_SUB_LAYER_DELTA),
        ]
        WallspiceWebgl.createMat4(fd.rot, planePos, shadmat)
        shadowfloor.matrixAutoUpdate = false
        if (debug !== 3) {
            shadowfloor.matrix.copy(shadmat)
        }
        shadowfloor.needsUpdate = true
        return shadowfloor
    }

    static intrinsicsRectGeo(intrinsics, width, height, d = 1) {
        const fx = intrinsics[0]
        const fy = intrinsics[1]
        const px = intrinsics[2]
        const py = intrinsics[3]
        const intrinsicRect = gvRenderLibrary().createPlaneGeometry((width / fx) * d, (-height / fy) * d)
        intrinsicRect.translate((d * 0.5 * (width - px - px)) / fx, (d * -0.5 * (height - py - py)) / fy, -1.0 * d)
        return intrinsicRect
    }

    static createBackground(intrinsics, width, height, bgTex) {
        const intrinsicRect = WallspiceWebgl.intrinsicsRectGeo(intrinsics, width, height)
        const bgM = gvRenderLibrary().createCustomShaderMaterial({
            side: gvRenderLibrary().constants.DoubleSided,
            uniforms: gvRenderLibrary().cloneUniform(gvRenderLibrary().basicUniforms),
            vertexShader: gvRenderLibrary().basicVertexShader,
            fragmentShader: gvRenderLibrary().replaceShader(gvRenderLibrary().basicFragmentShader, '#include <tonemapping_fragment>', '' )
        })
        bgM.map = bgTex
        bgM.uniforms.map.value = bgTex
        bgM.uniforms.diffuse.value = gvRenderLibrary().createColor(0xffffff)
        bgM.transparent = false
        bgM.depthTest = false
        bgM.depthWrite = false
        const intrinsicMesh = gvRenderLibrary().createMesh(intrinsicRect, bgM)
        intrinsicMesh.name = 'background image'
        return intrinsicMesh
    }

    static createBackgroundFromTexture(intrinsics, width, height, texture) {
        const intrinsicRect = WallspiceWebgl.intrinsicsRectGeo(intrinsics, width, height)
        const bgM = gvRenderLibrary().createMaterial( MaterialTypes.Basic, { color: 0xffffff, side: gvRenderLibrary().constants.DoubleSided })
        bgM.transparent = false
        bgM.depthTest = false
        bgM.depthWrite = false
        bgM.map = texture
        bgM.opacity = 1.0
        bgM.needsUpdate = true

        setMaterialOnBeforeCompileCallback(
            bgM,
            ( shader ) => {
                // eslint-disable-next-line no-param-reassign
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <alphamap_fragment>`,
            
                    `#ifdef USE_ALPHAMAP
                        diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).r;   // read red channel, instead
                    #endif`
                )
            }
        )

        const intrinsicMesh = gvRenderLibrary().createMesh(intrinsicRect, bgM)
        intrinsicMesh.name = 'background image'
        return intrinsicMesh
    }

    static applyMaskTexToMat(tgtmat, tex) {
        // eslint-disable-next-line no-param-reassign
        tgtmat.opacity = 1.0
        // eslint-disable-next-line no-param-reassign
        tgtmat.alphaTest = 0.5
        // eslint-disable-next-line no-param-reassign
        tgtmat.alphaMap = tex
        // eslint-disable-next-line no-param-reassign
        tgtmat.needsUpdate = true
    }

    static createImgPaste(intrinsics, width, height) {
        let intrinsicMesh = null
        const iM = gvRenderLibrary().createMaterial(MaterialTypes.Basic, { color: 0xffffff, side: gvRenderLibrary().constants.DoubleSided })
        iM.transparent = false
        iM.opacity = 1.0 // keep invisible until texload lmbda completes
        iM.depthTest = false
        iM.depthWrite = false
        const intrinsicRect = WallspiceWebgl.intrinsicsRectGeo(intrinsics, width, height)
        intrinsicMesh = gvRenderLibrary().createMesh(intrinsicRect, iM)
        const pixels = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 255, 255])
        iM.map = gvRenderLibrary().createDataTexture(
            pixels,
            2,
            2,
            gvRenderLibrary().constants.RGBAFormat,
            gvRenderLibrary().constants.UnsignedByteType,
            gvRenderLibrary().constants.UVMapping,
            gvRenderLibrary().constants.ClampToEdgeWrapping,
            gvRenderLibrary().constants.ClampToEdgeWrapping,
            gvRenderLibrary().constants.LinearFilter,
            gvRenderLibrary().constants.LinearFilter,
            2,
        )
        intrinsicMesh.name = 'over image'
        return intrinsicMesh
    }

    static createPlaceableOverlay(intrinsics, width, height, maskData, planes, depth) {
        let intrinsicMesh = null
        const depthUniform = {
            factoralpha: { value: new Float32Array([1.0, 0.125]) },
        }
        const material = gvRenderLibrary().createCustomShaderMaterial({
            uniforms: depthUniform,
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }`,
            fragmentShader: /* glsl */ `
                uniform vec2 factoralpha;
                uniform sampler2D map;
                varying vec2 vUv;
                void main() {
                    vec4 fetch = texture2D( map, vUv);
                    if(fetch.b < 0.001) discard;
                    if((fetch.b - 0.75) * factoralpha[0] < 0.0) discard;
                    gl_FragColor = vec4(0.0, 1.0, 0.0, factoralpha[1]);
                }`,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: gvRenderLibrary().constants.DoubleSided,
        })
        const intrinsicRect = WallspiceWebgl.intrinsicsRectGeo(intrinsics, width, height, depth)
        intrinsicMesh = gvRenderLibrary().createMesh(intrinsicRect, material)
        const pixels = new Uint8Array(maskData.width * maskData.height)
        for (let i = 0; i < maskData.height; i += 1) {
            for (let j = 0; j < maskData.width; j += 1) {
                const index = maskData.data[(i * maskData.width + j) * 4 + 2]
                pixels[i * maskData.width + j] = 0
                if (index > 0) {
                    if (planes[index - 1] && planes[index - 1].class === 'floor') {
                        pixels[i * maskData.width + j] = 128
                    } else {
                        pixels[i * maskData.width + j] = 255
                    }
                }
            }
        }

        const map = gvRenderLibrary().createDataTexture(
            pixels,
            maskData.width,
            maskData.height,
            gvRenderLibrary().constants.RedFormat,
            gvRenderLibrary().constants.UnsignedByteType,
            gvRenderLibrary().constants.UVMapping,
            gvRenderLibrary().constants.ClampToEdgeWrapping,
            gvRenderLibrary().constants.ClampToEdgeWrapping,
            gvRenderLibrary().constants.NearestFilter,
            gvRenderLibrary().constants.NearestFilter,
            8,
        )
        map.flipY = false
        map.needsUpdate = true
        material.uniforms.map = map
        material.uniforms.map.value = map
        material.opacity = 1.0
        material.needsUpdate = true
        return intrinsicMesh
    }

    static setPlaceableAdjust(placeMesh, factor, alpha) {
        if (placeMesh) {
            // eslint-disable-next-line no-param-reassign
            placeMesh.material.uniforms.factoralpha.value = new Float32Array([factor, alpha])
        }
    }

    static isolateChannelDataFromImage(idata, pos) {
        const w = idata.width
        const h = idata.height
        const pixels = new Uint8Array(idata.width * idata.height)
        let segment
        const segments = new Set()
        for (let i = 0; i < w * h; i += 1) {
            segment = idata.data[i * 4 + pos]
            pixels[i] = segment
            if (segment) segments.add(segment)
        }
        return {
            w,
            h,
            pixels,
            numSegments: segments.size,
            segments,
        }
    }

    static generateMask(w, h, val) {
        const pixels = new Uint8Array(w * h)
        for (let x = 0; x < w; x += 1) {
            for (let y = 0; y < h; y += 1) {
                pixels[x + y * w] = val
            }
        }
        return {
            w,
            h,
            pixels,
        }
    }

    static keyMask(mask, segments, index, val) {
        for (let x = 0; x < mask.w; x += 1) {
            for (let y = 0; y < mask.h; y += 1) {
                if (segments.pixels[x + y * segments.w] === index)
                    // eslint-disable-next-line no-param-reassign
                    mask.pixels[x + y * mask.w] = val
            }
        }
    }

    static getValueAtPos(segments, pos) {
        const x = Math.floor((segments.w - 1) * pos[0])
        const y = Math.floor((segments.h - 1) * pos[1])
        const value = segments.pixels[segments.w * y + x]
        return value
    }

    static createLuminanceTextureFromData(maskData) {
        // A tweak to workaround a data error cause ThreeJS dropped support of WGL1 on r153.
        const dataFormat = gvRenderLibrary()?.getRendererContextType() === RendererContextType.WebGL1Context
            ? gvRenderLibrary().constants.LuminanceFormat
            : gvRenderLibrary().constants.RedFormat
        const lTex = gvRenderLibrary().createDataTexture(
            // new Uint8Array(maskData.pixels),
            maskData.pixels,
            maskData.w,
            maskData.h,
            dataFormat,
            gvRenderLibrary().constants.UnsignedByteType,
            gvRenderLibrary().constants.UVMapping,
            gvRenderLibrary().constants.ClampToEdgeWrapping,
            gvRenderLibrary().constants.ClampToEdgeWrapping,
            gvRenderLibrary().constants.NearestFilter,
            gvRenderLibrary().constants.NearestFilter,
            0,
        )
        lTex.flipY = false
        lTex.needsUpdate = true
        return lTex
    }

    static setSegmentsHighlightIndex(segMesh, index) {
        if (segMesh && segMesh.material) {
            // eslint-disable-next-line no-param-reassign
            segMesh.material.uniforms.idhighlight.value = index / 255.0
        }
    }

    static generateHDRfromPano(renderer, wallTexture, desaturate) {
        const threeRenderer = renderer?.getThreeRenderer()
        if (!wallTexture || !threeRenderer) {
            return null
        }
        const camera = gvRenderLibrary().createOrthoCamera(-1, 1, 1, -1, 0.0, 1000)
        const scene = gvRenderLibrary().createScene()
        const material = gvRenderLibrary().createCustomShaderMaterial({
            uniforms: { map: { value: wallTexture }, "desaturate": { value: desaturate } },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: /* glsl */ `
                uniform sampler2D map;
                uniform bool desaturate;
                varying vec2 vUv;
                const float PI = 3.14159;

                // these two functions courtesey of https://gist.github.com/983/e170a24ae8eba2cd174f
                vec3 rgb2hsv(vec3 c) {
                    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
                    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
                    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

                    float d = q.x - min(q.w, q.y);
                    float e = 1.0e-10;
                    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
                }

                vec3 hsv2rgb(vec3 c) {
                    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
                }

                float distanceFromColor(float hue, float targetHue) {
                    hue = hue * 360.0;
                    return min( (360.0 - abs(hue - targetHue)), abs(hue - targetHue) );
                }

                // better version of smoothstep that does not have discontinuities at 0 and 1
                float smootherstep(float edge0, float edge1, float x)
                {
                  x = clamp((x - edge0)/(edge1 - edge0), 0., 1.);
                  return x * x * x * (x * (x * 6. - 15.) + 10.);
                }

                void main() {
                    // Mirror and repeat the function on the horizontal axis
                    vec2 uv = vec2(vUv);
                    uv.x = 0.51+(0.5/PI)*asin(sin(2.0*PI*(uv.x+0.49)));

                    // Apply warp filters
                    float vertical_warp_factor = pow(abs(sin((uv.x-0.26)*PI*2.0)), 0.3);
                    float warped_uv_y = 47.8487*pow(uv.y, 5.0)-117.2299*pow(uv.y,4.0)+111.6932*pow(uv.y,3.0)-51.6537*pow(uv.y,2.0)+13.0765*uv.y-1.2533;
                    uv.x = 223.4925*pow(uv.x, 5.0)-565.83*pow(uv.x,4.0)+560.6275*pow(uv.x, 3.0)-271.7947*pow(uv.x,2.0)+66.2892*uv.x-6.3927;
                    uv.y = mix(warped_uv_y, uv.y, vertical_warp_factor);
                    uv.y = 1.0-uv.y;    // flip the map vertically

                    vec3 hdrColor = texture2D(map, uv).rgb;
                    vec3 mapped = vec3(1.0) - exp(-hdrColor * 3.0); // increasing the map exposure for better highlights
                    mapped = pow(mapped, vec3(4.4)); // reversing the gamma correction multiplied to its double for darker shadows

                    if (desaturate) {
                        // convert to HSV, apply a curve to reduce saturation, and convert back to RGB
                        // hsv.x = hue, hsv.y = saturation, hsv.z = value
                        vec3 hsv = rgb2hsv(mapped);

                        // these weights compensate for the fact that greens are more problematic than other colors, and yellows less so than others.
                        float biasMoreSaturatedYellows = 1.0 + (1.25 * ((hsv.y) * smootherstep(25.0, 0.0, distanceFromColor(hsv.x, 30.0)))); // 30.0 ~ warm yellow
                        float biasLessSaturatedGreens = 1.0 - (0.2 * ((hsv.y) * smootherstep(60.0, 0.0, distanceFromColor(hsv.x, 150.0)))); // 150.0 ~ cool green

                        // compensate for the fact that ceilings are usually not colored like walls and floors, again weighting by color
                        float biasLessSaturatedCeilings = (smootherstep(1.0, 0.7, 1.0 - pow((1.0 - vUv.y),1.3)));
                        if (biasLessSaturatedCeilings < 1.0) {
                            biasLessSaturatedCeilings = min(1.0, biasLessSaturatedCeilings * biasLessSaturatedGreens * biasMoreSaturatedYellows);
                        }

                        // reduce saturation, with highly saturated colors reduced more than less saturated ones.
                        float biasLessSaturationOverall = 0.35 * (1.0 - pow(3.5, -2.0 * hsv.y));

                        hsv.y = biasLessSaturatedCeilings * biasLessSaturatedGreens * biasMoreSaturatedYellows * biasLessSaturationOverall;

                        mapped = hsv2rgb(hsv);
                    }

                    gl_FragColor = vec4(mapped, 1.0);
                }
            `,
            side: gvRenderLibrary().constants.DoubleSided,
        })
        const planeMesh = gvRenderLibrary().createMesh(gvRenderLibrary().createPlaneBufferGeometry(2, 2), material)
        scene.add(planeMesh)
        const renderTarget = gvRenderLibrary().createWebGLRenderTarget(512, 256)
        const currentRenderTarget = threeRenderer.getRenderTarget()
        threeRenderer.setRenderTarget(renderTarget)
        threeRenderer.clear()
        threeRenderer.render(scene, camera)
        threeRenderer.setRenderTarget(currentRenderTarget)

        // Equirectangular unproject
        const pmremGenerator = gvRenderLibrary().createPMREMGenerator(threeRenderer)
        pmremGenerator.compileEquirectangularShader()
        const cubetexRenderTarget = pmremGenerator.fromEquirectangular(renderTarget.texture)

        // Handle the disposing of the render target
        const rtHandler = new RenderTargetHandler()
        rtHandler.addRenderTarget(cubetexRenderTarget)

        pmremGenerator.dispose()
        renderTarget.dispose()
        material.dispose()
        return cubetexRenderTarget.texture
    }

    static createSegmentsMesh(intrinsics, width, height, segsTex, depth, isVisible) {
        let intrinsicMesh = null
        const material = gvRenderLibrary().createCustomShaderMaterial({
            uniforms: {
                idhighlight: { value: 512 / 255.0 }, // out of range (disable)
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }`,
            fragmentShader: /* glsl */ `
                uniform sampler2D segs;
                uniform sampler2D mux;
                uniform float idhighlight;
                varying vec2 vUv;
                precision lowp float;
                void main() {
                    float inc = 1.0/255.0;
                    float alpha = 0.0;
                    float w = 0.0010;
                    float h = 0.0015;
                    vec3 yellow = vec3(1.0, 0.857, 0.003);
                    vec3 blue = vec3(0.0, 0.341, 0.643);
                    vec4 m1 = texture2D( mux, vUv + vec2(-w, -h));
                    vec4 m2 = texture2D( mux, vUv + vec2(w, -h));
                    vec4 m3 = texture2D( mux, vUv + vec2(-w, h));
                    vec4 m4 = texture2D( mux, vUv + vec2(w, h));
                    float mix = max(max(m1.r, m2.r), max(m3.r, m4.r));
                    vec4 p = texture2D( segs, vUv );
                    vec4 p0 = texture2D( segs, vUv + vec2(-w, -h));
                    vec4 p1 = texture2D( segs, vUv + vec2(w, -h));
                    vec4 p2 = texture2D( segs, vUv + vec2(-w, h));
                    vec4 p3 = texture2D( segs, vUv + vec2(w, h));
                    float delta = 100.0 * (abs(p0.r-p1.r) + abs(p0.r-p2.r) + abs(p0.r-p3.r) + abs(p1.r-p2.r));
                    if(p.r == idhighlight) alpha = 0.5;
                    if(delta > 0.1) alpha = 1.0;
                    if(alpha < 0.1) discard;
                    gl_FragColor = vec4(blue*mix+yellow*(1.0-mix), alpha);
                }`,
            depthWrite: false,
            transparent: true,
            colorWrite: true,
            side: gvRenderLibrary().constants.DoubleSided,
        })

        const intrinsicRect = WallspiceWebgl.intrinsicsRectGeo(intrinsics, width, height, depth)
        intrinsicMesh = gvRenderLibrary().createMesh(intrinsicRect, material)
        material.uniforms.segs = { value: segsTex }
        material.opacity = 1.0
        material.needsUpdate = true
        material.depthFunc = gvRenderLibrary().constants.AlwaysDepth
        intrinsicMesh.visible = isVisible
        intrinsicMesh.name = 'segments outline and highlight'
        return intrinsicMesh
    }

    static createDepthOcclusionFromImage(assetManager, intrinsics, width, height, itex, depth, isVisible) {
        let intrinsicMesh = null
        const depthUniform = {
            nearfar: { value: new Float32Array([0.2, 30.0]) },
        }
        const material = gvRenderLibrary().createCustomShaderMaterial({
            uniforms: depthUniform,
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec2 nearfar;
                uniform sampler2D map;
                varying vec2 vUv;
                void main() {
                    vec4 fetch = texture2D( map, vUv);
                    if(fetch.a < 0.5) discard; // reject floor fragments
                    if(fetch.r == 0.0 && fetch.g == 0.0 && fetch.b == 0.0) discard; // see GFX-3192
                    // float z = 0.01 * (fetch.r * 255.0 * 256.0 + fetch.g * 255.0); // 16 bit
                    float z = 0.0099609375 * (fetch.r * 65536.0 + fetch.g * 256.0 + fetch.b);
                    float a = nearfar[1] / ( nearfar[1] - nearfar[0] );
                    float b = nearfar[1] * nearfar[0] / ( nearfar[0] - nearfar[1] );
                    gl_FragDepthEXT = ( a + b / z);
                    z = (z - nearfar[0])*0.1;
                    gl_FragColor = vec4(z, z, z, 1.0);
                }
            `,
            depthWrite: true,
            colorWrite: true,
            side: gvRenderLibrary().constants.DoubleSided,
            stencilWrite: true,
            stencilFunc: gvRenderLibrary().constants.NotEqualStencilFunc,
            stencilRef: 2,
        })
        material.extensions.fragDepth = true
        const intrinsicRect = WallspiceWebgl.intrinsicsRectGeo(intrinsics, width, height, depth)
        intrinsicMesh = gvRenderLibrary().createMesh(intrinsicRect, material)
        const dTex = itex.clone()
        dTex.mapping = gvRenderLibrary().constants.UVMapping
        dTex.wrapS = gvRenderLibrary().constants.ClampToEdgeWrapping
        dTex.wrapT = gvRenderLibrary().constants.ClampToEdgeWrapping
        dTex.magFilter = gvRenderLibrary().constants.NearestFilter
        dTex.minFilter = gvRenderLibrary().constants.NearestFilter
        dTex.anisotropy = 0
        dTex.flipY = false
        dTex.needsUpdate = true
        material.uniforms.map = dTex
        material.uniforms.map.value = dTex
        material.opacity = 1.0
        material.needsUpdate = true
        const depthPackMaterial = gvRenderLibrary().createCustomShaderMaterial({
            uniforms: depthUniform,
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: /* glsl */ `
                #include <packing>
                uniform vec2 nearfar;
                uniform sampler2D map;
                varying vec2 vUv;
                void main() {
                    vec4 fetch = texture2D( map, vUv);
                    if(fetch.a < 0.5) discard; // reject floor fragments
                    float z = 0.0099609375 * (fetch.r * 65536.0 + fetch.g * 256.0 + fetch.b);
                    float a = nearfar[1] / ( nearfar[1] - nearfar[0] );
                    float b = nearfar[1] * nearfar[0] / ( nearfar[0] - nearfar[1] );
                    gl_FragColor = packDepthToRGBA(a + b / z);
                }
            `,
            depthWrite: true,
            side: gvRenderLibrary().constants.DoubleSided,
        })
        depthPackMaterial.uniforms.map = dTex
        depthPackMaterial.uniforms.map.value = dTex
        depthPackMaterial.opacity = 1.0
        depthPackMaterial.needsUpdate = true
        intrinsicMesh.depthPackMaterial = depthPackMaterial
        intrinsicMesh.visible = isVisible
        intrinsicMesh.name = 'depth occlusion modifier'

        return intrinsicMesh
    }

    static createDepthMuxOcclusionFromImages(assetManager, intrinsics, width, height, itex1, itex2, depth, isVisible) {
        let intrinsicMesh = null
        const depthUniform = {
            nearfar: { value: new Float32Array([0.2, 30.0]) },
        }
        const material = gvRenderLibrary().createCustomShaderMaterial({
            uniforms: depthUniform,
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }`,
            fragmentShader: /* glsl */ `
                uniform vec2 nearfar;
                uniform sampler2D mux;
                uniform sampler2D map1;
                uniform sampler2D map2;
                varying vec2 vUv;
                void main() {
                    vec4 fetch;
                    vec4 fetchmask = texture2D( mux, vUv );
                    // if(vUv[0] < 0.5) {
                    if(fetchmask.r < 0.5) {
                        fetch = texture2D( map1, vUv);
                    } else {
                        fetch = texture2D( map2, vUv);
                    }
                    if(fetch.a < 0.5) discard; // reject floor fragments
                    if(fetch.r == 0.0 && fetch.g == 0.0 && fetch.b == 0.0) discard; // see GFX-3192
                    // float z = 0.01 * (fetch.r * 255.0 * 256.0 + fetch.g * 255.0); // 16 bit
                    float z = 0.0099609375 * (fetch.r * 65536.0 + fetch.g * 256.0 + fetch.b);
                    float a = nearfar[1] / ( nearfar[1] - nearfar[0] );
                    float b = nearfar[1] * nearfar[0] / ( nearfar[0] - nearfar[1] );
                    gl_FragDepthEXT = ( a + b / z);
                    // z = (z - nearfar[0])*0.1;
                    gl_FragColor = vec4(z, z, z, 1.0);
                    // gl_FragColor = vec4(fetchmask.r, fetchmask.g, fetchmask.b, 1.0);
                }`,
            depthTest: true,
            depthWrite: true,
            colorWrite: false,
            side: gvRenderLibrary().constants.DoubleSided,
        })
        material.extensions.fragDepth = true
        const intrinsicRect = WallspiceWebgl.intrinsicsRectGeo(intrinsics, width, height, depth)
        intrinsicMesh = gvRenderLibrary().createMesh(intrinsicRect, material)
        const depthPackMaterial = gvRenderLibrary().createCustomShaderMaterial({
            uniforms: depthUniform,
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: /* glsl */ `
                #include <packing>
                uniform vec2 nearfar;
                uniform sampler2D mux;
                uniform sampler2D map1;
                uniform sampler2D map2;
                varying vec2 vUv;
                void main() {
                    vec4 fetch;
                    vec4 fetchmask = texture2D( mux, vUv );
                    if(fetchmask.r < 0.5) {
                        fetch = texture2D( map1, vUv);
                    } else {
                        fetch = texture2D( map2, vUv);
                    }
                    if(fetch.a < 0.5) discard; // reject floor fragments
                    float z = 0.0099609375 * (fetch.r * 65536.0 + fetch.g * 256.0 + fetch.b);
                    float a = nearfar[1] / ( nearfar[1] - nearfar[0] );
                    float b = nearfar[1] * nearfar[0] / ( nearfar[0] - nearfar[1] );
                    gl_FragColor = packDepthToRGBA(a + b / z);
                }
            `,
            depthTest: true,
            depthWrite: false,
            side: gvRenderLibrary().constants.FrontSide,
        })
        const dTex1 = itex1.clone()
        dTex1.mapping = gvRenderLibrary().constants.UVMapping
        dTex1.wrapS = gvRenderLibrary().constants.ClampToEdgeWrapping
        dTex1.wrapT = gvRenderLibrary().constants.ClampToEdgeWrapping
        dTex1.magFilter = gvRenderLibrary().constants.NearestFilter
        dTex1.minFilter = gvRenderLibrary().constants.NearestFilter
        dTex1.anisotropy = 0
        dTex1.flipY = false
        dTex1.needsUpdate = true
        material.uniforms.map1 = dTex1
        material.uniforms.map1.value = dTex1
        const dTex2 = itex2.clone()
        dTex2.mapping = gvRenderLibrary().constants.UVMapping
        dTex2.wrapS = gvRenderLibrary().constants.ClampToEdgeWrapping
        dTex2.wrapT = gvRenderLibrary().constants.ClampToEdgeWrapping
        dTex2.magFilter = gvRenderLibrary().constants.NearestFilter
        dTex2.minFilter = gvRenderLibrary().constants.NearestFilter
        dTex2.anisotropy = 0
        dTex2.flipY = false
        dTex2.needsUpdate = true
        material.uniforms.map2 = dTex2
        material.uniforms.map2.value = dTex2
        material.opacity = 1.0
        material.needsUpdate = true
        intrinsicMesh.visible = isVisible
        intrinsicMesh.name = 'depth occlusion modifiermux'
        depthPackMaterial.uniforms.map1 = dTex1
        depthPackMaterial.uniforms.map1.value = dTex1
        depthPackMaterial.uniforms.map2 = dTex2
        depthPackMaterial.uniforms.map2.value = dTex2
        depthPackMaterial.opacity = 1.0
        depthPackMaterial.needsUpdate = true
        intrinsicMesh.depthPackMaterial = depthPackMaterial

        return intrinsicMesh
    }

    /* eslint-disable no-param-reassign */
    static applyMaskTexToShader(tgtmat, tex) {
        tgtmat.uniforms.mux = { value: tex }
        tgtmat.needsUpdate = true
    }
    /* eslint-enable no-param-reassign */

    static setOcclusionNearFar(depthMesh, near, far) {
        if (depthMesh) {
            // eslint-disable-next-line no-param-reassign
            depthMesh.material.uniforms.nearfar.value = new Float32Array([near, far])
        }
    }

    static createIntrinsicDepthGeom(intrinsics, width, height, idata, floor, textured, offset) {
        const xsize = width / intrinsics[0]
        const ysize = height / intrinsics[1]
        const xoffset = -xsize / 2 + (width * 0.5 - intrinsics[2]) / intrinsics[0]
        const yoffset = -ysize / 2 + (height * 0.5 - intrinsics[3]) / intrinsics[1]
        const vert = []
        const tex = []
        const index = []
        const divx = 600
        const divy = 300
        const incx = 1.0 / divx
        const incy = 1.0 / divy
        let pos = 0
        // let max = 0
        for (let y = 0.0; y <= 1.0001; y += incy) {
            for (let x = 0.0; x <= 1.00001; x += incx) {
                const ypos = Math.floor(y * (idata.height - 1))
                const xpos = Math.floor(x * (idata.width - 1))
                const dpix = (xpos + ypos * idata.width) * 4
                const depthi = idata.data[dpix] * 256 * 256 + idata.data[dpix + 1] * 256 + idata.data[dpix + 2]
                const depthm = depthi * 0.0000390625 - offset
                vert.push((xoffset + xsize * x) * depthm)
                vert.push(-(yoffset + ysize * y) * depthm)
                vert.push(-depthm)
                tex.push(x)
                tex.push(y)
                if (x < 0.9999 && y < 0.9999 && (floor || idata.data[dpix + 3] > 127)) {
                    index.push(pos, pos + 1, pos + divx + 1)
                    index.push(pos + 1, pos + divx + 2, pos + divx + 1)
                }
                pos += 1
            }
        }
        const intrinsicGeom = gvRenderLibrary().createBufferGeometry()
        gvRenderLibrary().setBufferGeometryAttribute(intrinsicGeom, 'position', gvRenderLibrary().createFloat32BufferAttribute(vert, 3) )
        if (textured) {
            gvRenderLibrary().setBufferGeometryAttribute(intrinsicGeom, 'uv', gvRenderLibrary().createFloat32BufferAttribute(tex, 2) )
        }
        intrinsicGeom.setIndex(index)
        return intrinsicGeom
    }

    static createMeshOcclusionFromImage(intrinsics, width, height, occlusionMapPixels, isVisible) {
        const material = gvRenderLibrary().createMaterial(MaterialTypes.Basic, { color: 0x000000, side: gvRenderLibrary().constants.DoubleSided })
        material.colorWrite = false
        const intrinsicRect = WallspiceWebgl.createIntrinsicDepthGeom(
            intrinsics,
            width,
            height,
            occlusionMapPixels,
            false,
            false,
            0.01,
        )
        const intrinsicMesh = gvRenderLibrary().createMesh(intrinsicRect, material)
        intrinsicMesh.name = 'depth occlusion modifier'
        intrinsicMesh.visible = isVisible
        material.needsUpdate = true
        return intrinsicMesh
    }

    static createMat4(rotation, position, outMat) {
        gvRenderLibrary().tmpXAxis.set(rotation[0][0], rotation[0][1], rotation[0][2])
        gvRenderLibrary().tmpYAxis.set(rotation[1][0], rotation[1][1], rotation[1][2])
        gvRenderLibrary().tmpZAxis.set(rotation[2][0], rotation[2][1], rotation[2][2])
        gvRenderLibrary().tmpMat4.makeBasis(gvRenderLibrary().tmpXAxis, gvRenderLibrary().tmpYAxis, gvRenderLibrary().tmpZAxis)
        gvRenderLibrary().tmpMat4.setPosition(gvRenderLibrary().createVec3(position[0], position[1], position[2]))
        outMat.copy(gvRenderLibrary().tmpMat4)
    }

    static unproj(p2, d, fx, fy, cx, cy) {
        return [((p2[0] - cx) / fx) * d, (-(p2[1] - cy) / fy) * d, -d]
    }

    static proj(p3, fx, fy, cx, cy) {
        return [(-p3[0] * fx) / p3[2] + cx, (p3[1] * fy) / p3[2] + cy]
    }

    static projBoundBox(objMat, bbox, camera) {
        const boxCorners = [
           gvRenderLibrary().createVec3(bbox.min.x, bbox.max.y, bbox.max.z),
           gvRenderLibrary().createVec3(bbox.min.x, bbox.min.y, bbox.max.z),
           gvRenderLibrary().createVec3(bbox.min.x, bbox.min.y, bbox.min.z),
           gvRenderLibrary().createVec3(bbox.min.x, bbox.max.y, bbox.min.z),
           gvRenderLibrary().createVec3(bbox.max.x, bbox.max.y, bbox.max.z),
           gvRenderLibrary().createVec3(bbox.max.x, bbox.min.y, bbox.max.z),
           gvRenderLibrary().createVec3(bbox.max.x, bbox.min.y, bbox.min.z),
           gvRenderLibrary().createVec3(bbox.max.x, bbox.max.y, bbox.min.z),
        ]

        const screenbox = gvRenderLibrary().createBox3()

        const viewProjectionMatrix = gvRenderLibrary().createMat4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        boxCorners.forEach((point) => {
            point.applyMatrix4(objMat)
            point.applyMatrix4(viewProjectionMatrix)
            screenbox.expandByPoint(point)
        })

        return [
            [0.5 * (screenbox.min.x + 1), 1.0 - 0.5 * (screenbox.max.y + 1)],
            [0.5 * (screenbox.max.x + 1), 1.0 - 0.5 * (screenbox.max.y + 1)],
            [0.5 * (screenbox.max.x + 1), 1.0 - 0.5 * (screenbox.min.y + 1)],
            [0.5 * (screenbox.min.x + 1), 1.0 - 0.5 * (screenbox.min.y + 1)],
        ]
    }

    static setShadowMeshDirection(shadowMesh, dirVec2) {
        if (shadowMesh) {
            // eslint-disable-next-line no-param-reassign
            shadowMesh.material.uniforms.shadow.value = new Float32Array([dirVec2[0], dirVec2[1]])
        }
    }

    static makeFrameShadow(L, R, B, T, iL, iR, iB, iT, iD, inL, outL) {
        const shadowUniform = {
            shadow: { value: new Float32Array([1, -1.0]) },
        }
        const material = gvRenderLibrary().createCustomShaderMaterial({
            uniforms: shadowUniform,
            vertexShader: /* glsl */ `
                uniform vec2 shadow;
                attribute float alpha;
                attribute float distance;
                attribute float spread;
                varying float vAlpha;
                void main() {
                   vAlpha = alpha;
                   vec2 offset = vec2(-shadow[1], shadow[0]) * spread;
                   vec3 displaced = position + vec3(offset + shadow * distance, 0.0);
                   vec4 mvPosition = modelViewMatrix * vec4( displaced, 1.0 );
                   gl_PointSize = 8.0;
                   gl_Position = projectionMatrix * mvPosition;
                }`,
            fragmentShader: /* glsl */ `
                varying float vAlpha;
                void main() {
                    gl_FragColor = vec4( 0.0, 0.0, 0.0, vAlpha );
                }
            `,
            transparent: true,
            depthWrite: false,
            side: gvRenderLibrary().constants.FrontSide,
        })
        const geometry = WallspiceWebgl.makeFrameShadowGeo(L, R, B, T, iL, iR, iB, iT, iD, inL, outL)
        return gvRenderLibrary().createMesh(geometry, material)
    }

    static makeFrameShadowGeo(L, R, B, T, iL, iR, iB, iT, iD, inL, outL) {
        const distance = 0.02 // AO distance
        const density1 = 0.05 // AO density
        const density2 = 0.3 * 0.2 // shadow density 1/5th there are multiple copies to soften
        const density3 = 0.15 // shadow density inner frame
        const slen = outL // shadow length outer
        const spr = 0.5 // shadow spread factor (corner edge softness with distance)
        const slengthI = inL // shadow length inner
        const offset = 0.001 // zfight offset for inner frame
        const walloffset = 0.007 // zfight offset for wall
        const geo = gvRenderLibrary().createBufferGeometry()
        const vpos = []
        const transp = []
        const extrusion = []
        const ortho = []
        const indices = []

        // ## Positions ##
        // AO halo
        vpos.push(L, T, walloffset)
        vpos.push(L - distance, T + distance, walloffset)
        vpos.push(L, B, 0)
        vpos.push(L - distance, B - distance, walloffset)
        vpos.push(R, B, 0)
        vpos.push(R + distance, B - distance, walloffset)
        vpos.push(R, T, 0)
        vpos.push(R + distance, T + distance, walloffset)

        // 5x Outer shadow
        for (let i = 0; i < 5; i += 1) {
            vpos.push(L, T, walloffset)
            vpos.push(L, T, walloffset)
            vpos.push(L, B, walloffset)
            vpos.push(L, B, walloffset)
            vpos.push(R, B, walloffset)
            vpos.push(R, B, walloffset)
            vpos.push(R, T, walloffset)
            vpos.push(R, T, walloffset)
        }

        // Inner shadow
        vpos.push(iL, iT, iD + offset)
        vpos.push(iL, iT, iD + offset)
        vpos.push(iL, iB, iD + offset)
        vpos.push(iL, iB, iD + offset)
        vpos.push(iR, iB, iD + offset)
        vpos.push(iR, iB, iD + offset)
        vpos.push(iR, iT, iD + offset)
        vpos.push(iR, iT, iD + offset)

        // ## per vertex alpha (darkness) **
        transp.push(density1, 0, density1, 0, density1, 0, density1, 0) // AO
        transp.push(density2, 0, density2, 0, density2, 0, density2, 0) // 5x outer shadow
        transp.push(density2, 0, density2, 0, density2, 0, density2, 0)
        transp.push(density2, 0, density2, 0, density2, 0, density2, 0)
        transp.push(density2, 0, density2, 0, density2, 0, density2, 0)
        transp.push(density2, 0, density2, 0, density2, 0, density2, 0)
        transp.push(0, density3, 0, density3, 0, density3, 0, density3) // Inner Shadow

        // ## degenerate extrusion magnitude ##
        extrusion.push(0, 0, 0, 0, 0, 0, 0, 0) // AO
        extrusion.push(0, slen, 0, slen, 0, slen, 0, slen) // 5x outer shadow
        extrusion.push(0, slen, 0, slen, 0, slen, 0, slen)
        extrusion.push(0, slen, 0, slen, 0, slen, 0, slen)
        extrusion.push(0, slen, 0, slen, 0, slen, 0, slen)
        extrusion.push(0, slen, 0, slen, 0, slen, 0, slen)
        extrusion.push(slengthI, 0, slengthI, 0, slengthI, 0, slengthI, 0) // Inner Shadow

        // ## degenerate orthogonal magnitude ##
        ortho.push(0, 0, 0, 0, 0, 0, 0, 0) // AO
        ortho.push(0, slen * spr, 0, slen * spr, 0, slen * spr, 0, slen * spr) // 5x outer shadow
        ortho.push(0, slen * spr * 0.5, 0, slen * spr * 0.5, 0, slen * spr * 0.5, 0, slen * spr * 0.5)
        ortho.push(0, 0, 0, 0, 0, 0, 0, 0)
        ortho.push(0, slen * -spr * 0.5, 0, slen * -spr * 0.5, 0, slen * -spr * 0.5, 0, slen * -spr * 0.5)
        ortho.push(0, slen * -spr, 0, slen * -spr, 0, slen * -spr, 0, slen * -spr)
        ortho.push(0, 0, 0, 0, 0, 0, 0, 0) // Inner Shadow

        // ## indices ##
        let count = 0
        for (let i = 0; i < 7; i += 1) {
            indices.push(count + 0, count + 1, count + 2)
            indices.push(count + 2, count + 1, count + 3)
            indices.push(count + 2, count + 3, count + 4)
            indices.push(count + 4, count + 3, count + 5)
            indices.push(count + 4, count + 5, count + 6)
            indices.push(count + 6, count + 5, count + 7)
            indices.push(count + 6, count + 7, count + 0)
            indices.push(count + 0, count + 7, count + 1)
            count += 8
        }
        gvRenderLibrary().setBufferGeometryAttribute(geo, 'position', gvRenderLibrary().createFloat32BufferAttribute(vpos, 3) )
        gvRenderLibrary().setBufferGeometryAttribute(geo, 'alpha', gvRenderLibrary().createFloat32BufferAttribute(transp, 1) )
        gvRenderLibrary().setBufferGeometryAttribute(geo, 'distance', gvRenderLibrary().createFloat32BufferAttribute(extrusion, 1) )
        gvRenderLibrary().setBufferGeometryAttribute(geo, 'spread', gvRenderLibrary().createFloat32BufferAttribute(ortho, 1) )
        geo.setIndex(indices)
        return geo
    }

    static extrudeFrame(L, R, B, T, depth, uscale, vscale, xSect) {
        const geo = gvRenderLibrary().createBufferGeometry()
        if (xSect.length < 2) {
            return null
        }
        let length = 0
        let trueLength = 0
        for (let i = 0; i < xSect.length - 1; i += 1) {
            const v1 = xSect[i]
            const v2 = xSect[i + 1]
            const delta = [v2[0] - v1[0], v2[1] - v1[1]]
            trueLength += Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1])
            length += delta[0]
        }

        const Xlength = R - L + length + length
        const Ylength = T - B + length + length
        const Xchamf = length / Xlength
        const Ychamf = length / Ylength

        let innerV = 0
        let outerV = 0
        let innerU = 0
        let outerU = 0

        // eslint-disable-next-line no-array-constructor
        const pos = new Array()
        // eslint-disable-next-line no-array-constructor
        const ind = new Array()
        // eslint-disable-next-line no-array-constructor
        const uv = new Array()
        for (let i = 0; i < xSect.length - 1; i += 1) {
            const indexBase = i * 8
            const v1 = xSect[i]
            const v2 = xSect[i + 1]
            innerV = outerV
            innerU = outerU
            const delta = [v2[0] - v1[0], v2[1] - v1[1]]
            outerV += Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1]) / trueLength
            outerU += delta[0] / length

            pos.push(
                L - v1[0],
                T + v1[0],
                v1[1] + depth,
                L - v2[0],
                T + v2[0],
                v2[1] + depth,
                L - v1[0],
                B - v1[0],
                v1[1] + depth,
                L - v2[0],
                B - v2[0],
                v2[1] + depth,
                R + v1[0],
                B - v1[0],
                v1[1] + depth,
                R + v2[0],
                B - v2[0],
                v2[1] + depth,
                R + v1[0],
                T + v1[0],
                v1[1] + depth,
                R + v2[0],
                T + v2[0],
                v2[1] + depth,
            )
            // left
            let voffset = 0
            ind.push(indexBase + 0, indexBase + 1, indexBase + 2)
            ind.push(indexBase + 2, indexBase + 1, indexBase + 3)
            uv.push(
                (1 - Ychamf + innerU * Ychamf) * uscale,
                innerV * vscale + voffset,
                (1 - Ychamf + outerU * Ychamf) * uscale,
                outerV * vscale + voffset,
                (Ychamf - Ychamf * innerU) * uscale,
                innerV * vscale + voffset,
            )
            uv.push(
                (Ychamf - Ychamf * innerU) * uscale,
                innerV * vscale + voffset,
                (1 - Ychamf + outerU * Ychamf) * uscale,
                outerV * vscale + voffset,
                (Ychamf - Ychamf * outerU) * uscale,
                outerV * vscale + voffset,
            )
            // bottom
            voffset += vscale
            while (voffset > 0.99) voffset -= 1.0
            ind.push(indexBase + 2, indexBase + 3, indexBase + 4)
            ind.push(indexBase + 4, indexBase + 3, indexBase + 5)
            uv.push(
                (1 - Xchamf + innerU * Xchamf) * uscale,
                innerV * vscale + voffset,
                (1 - Xchamf + outerU * Xchamf) * uscale,
                outerV * vscale + voffset,
                (Xchamf - Xchamf * innerU) * uscale,
                innerV * vscale + voffset,
            )
            uv.push(
                (Xchamf - Xchamf * innerU) * uscale,
                innerV * vscale + voffset,
                (1 - Xchamf + outerU * Xchamf) * uscale,
                outerV * vscale + voffset,
                (Xchamf - Xchamf * outerU) * uscale,
                outerV * vscale + voffset,
            )
            // right
            voffset += vscale
            while (voffset > 0.99) voffset -= 1.0
            ind.push(indexBase + 4, indexBase + 5, indexBase + 6)
            ind.push(indexBase + 6, indexBase + 5, indexBase + 7)
            uv.push(
                (1 - Ychamf + innerU * Ychamf) * uscale,
                innerV * vscale + voffset,
                (1 - Ychamf + outerU * Ychamf) * uscale,
                outerV * vscale + voffset,
                (Ychamf - Ychamf * innerU) * uscale,
                innerV * vscale + voffset,
            )
            uv.push(
                (Ychamf - Ychamf * innerU) * uscale,
                innerV * vscale + voffset,
                (1 - Ychamf + outerU * Ychamf) * uscale,
                outerV * vscale + voffset,
                (Ychamf - Ychamf * outerU) * uscale,
                outerV * vscale + voffset,
            )
            // top
            voffset += vscale
            while (voffset > 0.99) voffset -= 1.0
            ind.push(indexBase + 6, indexBase + 7, indexBase + 0)
            ind.push(indexBase + 0, indexBase + 7, indexBase + 1)
            uv.push(
                (1 - Xchamf + innerU * Xchamf) * uscale,
                innerV * vscale + voffset,
                (1 - Xchamf + outerU * Xchamf) * uscale,
                outerV * vscale + voffset,
                (Xchamf - Xchamf * innerU) * uscale,
                innerV * vscale + voffset,
            )
            uv.push(
                (Xchamf - Xchamf * innerU) * uscale,
                innerV * vscale + voffset,
                (1 - Xchamf + outerU * Xchamf) * uscale,
                outerV * vscale + voffset,
                (Xchamf - Xchamf * outerU) * uscale,
                outerV * vscale + voffset,
            )
        }

        // eslint-disable-next-line no-array-constructor
        const pos2 = new Array()
        ind.forEach((index) => {
            pos2.push(pos[index * 3])
            pos2.push(pos[index * 3 + 1])
            pos2.push(pos[index * 3 + 2])
        })

        gvRenderLibrary().setBufferGeometryAttribute(geo, 'position', gvRenderLibrary().createFloat32BufferAttribute(pos2, 3) )
        gvRenderLibrary().setBufferGeometryAttribute(geo, 'uv', gvRenderLibrary().createFloat32BufferAttribute(uv, 2) )

        // geo.setIndex(ind)
        geo.computeVertexNormals()
        geo.verticesNeedUpdate = true
        geo.uvsNeedUpdate = true
        geo.computeBoundingSphere()

        return geo
    }

    // create canvas of stated width, height, depth and wrap uv around edge depth if wrap is true
    static makeCanvasGeometry(width, height, depth, wrap) {
        const geo = gvRenderLibrary().createBufferGeometry()
        let uL = 0
        let uR = 1
        let vB = 0
        let vT = 1

        if (wrap) {
            uL = depth / (width + depth * 2)
            uR = 1 - uL
            vB = depth / (height + depth * 2)
            vT = 1 - vB
        }

        // eslint-disable-next-line no-array-constructor
        const pos = new Array()
        // eslint-disable-next-line no-array-constructor
        const ind = new Array()
        // eslint-disable-next-line no-array-constructor
        const uv = new Array()

        pos.push(-width * 0.5, height * 0.5, depth)
        pos.push(-width * 0.5, -height * 0.5, depth)
        pos.push(width * 0.5, height * 0.5, depth)
        pos.push(width * 0.5, -height * 0.5, depth)
        pos.push(-width * 0.5, height * 0.5, 0.0)
        pos.push(-width * 0.5, -height * 0.5, 0.0)
        pos.push(width * 0.5, height * 0.5, 0.0)
        pos.push(width * 0.5, -height * 0.5, 0.0)

        uv.push(uL, vT)
        uv.push(uL, vB)
        uv.push(uR, vT)
        uv.push(uR, vB)
        uv.push(0.0, 1.0)
        uv.push(0.0, 0.0)
        uv.push(1.0, 1.0)
        uv.push(1.0, 0.0)

        ind.push(0, 1, 2)
        ind.push(2, 1, 3)
        // left
        ind.push(0, 4, 1)
        ind.push(1, 4, 5)
        // right
        ind.push(3, 7, 2)
        ind.push(2, 7, 6)
        // bottom
        ind.push(1, 5, 3)
        ind.push(3, 5, 7)
        // top
        ind.push(2, 6, 0)
        ind.push(0, 6, 4)

        // must deindex for flat shading normals
        // eslint-disable-next-line no-array-constructor
        const pos2 = new Array()
        // eslint-disable-next-line no-array-constructor
        const uv2 = new Array()
        ind.forEach((index) => {
            pos2.push(pos[index * 3])
            pos2.push(pos[index * 3 + 1])
            pos2.push(pos[index * 3 + 2])
            uv2.push(uv[index * 2])
            uv2.push(uv[index * 2 + 1])
        })
        gvRenderLibrary().setBufferGeometryAttribute(geo, 'position', gvRenderLibrary().createFloat32BufferAttribute(pos2, 3) )
        gvRenderLibrary().setBufferGeometryAttribute(geo, 'uv', gvRenderLibrary().createFloat32BufferAttribute(uv2, 2) )
        geo.computeVertexNormals()
        geo.verticesNeedUpdate = true
        geo.uvsNeedUpdate = true
        geo.computeBoundingSphere()
        return geo
    }

    static createBoundingBox(bbox) {
        const geometry = gvRenderLibrary().createBoxBufferGeometry(
            bbox.max.x - bbox.min.x,
            bbox.max.y - bbox.min.y,
            bbox.max.z - bbox.min.z,
        )
        geometry.translate(
            (bbox.max.x - bbox.min.x) * -0.5 + bbox.max.x,
            (bbox.max.y - bbox.min.y) * -0.5 + bbox.max.y,
            (bbox.max.z - bbox.min.z) * -0.5 + bbox.max.z,
        )

        const edges = gvRenderLibrary().createEdgesGeometry(geometry)
        const line = gvRenderLibrary().createLineSegment(
            edges,
            gvRenderLibrary().createMaterial(MaterialTypes.Line, {
            color: 0xffdb00,
            transparent: true,
            depthFunc: gvRenderLibrary().constants.AlwaysDepth,
            })
        )
        return line
    }

    static cardinalToVector(lightDirection) {
        let xcast
        let ycast
        switch (
            lightDirection // convert cardinal direction to shadow displacement
        ) {
            case 0: // S
                xcast = 0
                ycast = -1
                break
            case 1: // SW
                xcast = -1
                ycast = -1
                break
            case 2: // W
                xcast = -1
                ycast = 0
                break
            case 3: // NW
                xcast = -1
                ycast = 1
                break
            case 4: // N
                xcast = 0
                ycast = 1
                break
            case 5: // NE
                xcast = 1
                ycast = 1
                break
            case 6: // E
                xcast = 1
                ycast = 0
                break
            case 7: // SE
                xcast = 1
                ycast = -1
                break
            default:
                xcast = 1
                ycast = -1
        }
        return [xcast, ycast]
    }

    static screenToPlaneWorld(screenPos, plane, intrinsics) {
        const fx = intrinsics[0]
        const fy = intrinsics[1]
        const cx = intrinsics[2]
        const cy = intrinsics[3]
        const d = plane.d
        const zhat = plane.rot[2]
        const line = WallspiceWebgl.unproj(screenPos, 1, fx, fy, cx, cy)
        const t = -d / (+zhat[0] * line[0] + zhat[1] * line[1] + zhat[2] * line[2])
        return [t * line[0], t * line[1], t * line[2]]
    }

    static worldToPlane(plane, pos) {
        const d = plane.d
        const xh = plane.rot[0]
        const yh = plane.rot[1]
        const zh = plane.rot[2]
        const p0 = [-d * zh[0], -d * zh[1], -d * zh[2]]
        const p = [pos[0] - p0[0], pos[1] - p0[1], pos[2] - p0[2]]
        const px = p[0] * xh[0] + p[1] * xh[1] + p[2] * xh[2]
        const py = p[0] * yh[0] + p[1] * yh[1] + p[2] * yh[2]
        const pz = p[0] * zh[0] + p[1] * zh[1] + p[2] * zh[2]
        return [px, py, pz]
    }

    static planeToWorld(plane, pos) {
        const p = [pos[0], pos[1], 0]
        if (pos.length === 3) {
            p[2] = pos[2]
        }
        const d = plane.d
        const xh = plane.rot[0]
        const yh = plane.rot[1]
        const zh = plane.rot[2]
        const p0 = [-d * zh[0], -d * zh[1], -d * zh[2]]
        return [
            p0[0] + xh[0] * p[0] + yh[0] * p[1] + zh[0] * p[2],
            p0[1] + xh[1] * p[0] + yh[1] * p[1] + zh[1] * p[2],
            p0[2] + xh[2] * p[0] + yh[2] * p[1] + zh[2] * p[2],
        ]
    }
}

// These directions are 'where the light is shining'
export const DirectionVectorMap = {
    NORTH: 4,
    NORTHEAST: 5,
    EAST: 6,
    SOUTHEAST: 7,
    SOUTH: 0,
    SOUTHWEST: 1,
    WEST: 2,
    NORTHWEST: 3,
}

export default WallspiceWebgl
