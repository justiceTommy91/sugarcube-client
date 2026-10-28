/* eslint-disable max-classes-per-file */
import * as THREE from 'three'
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { RUG_THICKNESS, DEFAULT_THREE_NATIVE_LAYER, BAKED_RUG_SHADOWS_LAYER } from './constants';
import type { FurnitureItemParameters } from './geomviewer/geom_types';
import { PlacingOptions } from './geomviewer/geom_constants';

// This interface provides convinient access to a FurnitureItem's baked shadow planes
export interface ContactShadowPlanes extends THREE.Group {
    // Copy of downward shadow plane. Lives on separate layer, used to render a map
    // that rugs can look up into to determine where to display contact shadows as textures.
    // This is necessary because rugs sit on top of the standard downward shadow planes
    // and obscure them.
    downwardRug?: BakedRugShadowPlane,
    // This plane is used to display floor contact shadows.
    downward?: BakedShadowPlane,
    // This plane is used to display wall contact shadows.
    backward?: BakedShadowPlane,
    // This member stores all contact shadow render targets for later disposal.
    renderTargets: THREE.WebGLRenderTarget[]
}

// This class holds data and utility functions for baked shadow planes
export class BakedShadowPlane extends THREE.Mesh {
    readonly isBakedShadowPlane = true;
    protected padding: number;
    protected direction: string;
    public wasVisible?: boolean;

    constructor(
        direction: string,
        padding: number,
        geometry: THREE.BufferGeometry,
        material: THREE.Material
        ) {
        super(geometry, material);
        this.scale.z = -1;
        this.padding = padding;
        this.direction = direction;
        this.initName();
        this.initLayer();
    }

    protected initName() {
        this.name = `${this.direction} baked shadow plane`;
    }

    protected initLayer() {
        this.layers.set(DEFAULT_THREE_NATIVE_LAYER);
    }

    getPadding () {
        return this.padding;
    }

    getDirection() {
        return this.direction;
    }

    clone(recursive?: boolean | undefined): this {
        const clonedPlane = super.clone(recursive);
        clonedPlane.padding = this.padding;
        clonedPlane.direction = this.direction;
        clonedPlane.initName();
        clonedPlane.initLayer();
        return clonedPlane;
    }

    setVisible(shouldBeVisible: boolean) {
        this.visible = shouldBeVisible;
    }

    // helper function for situations when visibility needs
    // to be switched off during or before a specific render pass.
    // Temporarily overrides the current visibility settings, but saves
    // them to be re-applied
    toggleVisibilityOff() {
        this.wasVisible = this.visible;
        this.visible = false;
    }

    // helper function for situations when visibility needs
    // to be switched on during or after a specific render pass.
    // Reverts visibility to the state it was in when toggleVisibilityOff()
    // was last called.
    toggleVisibilityOn() {
        if (this.wasVisible !== undefined) {
            this.visible = this.wasVisible;
        } else {
            this.visible = true;
        }
        this.wasVisible = undefined
    }
}

// This class is customized for rug shadow planes. It takes a standard BakedShadowPlane
// in its constructor and creates a rug shadow plane that shares geometry and materials
export class BakedRugShadowPlane extends BakedShadowPlane {
    readonly isBakedRugShadowPlane = true;

    constructor( standardShadowPlane: BakedShadowPlane ) {
        super(
            standardShadowPlane.getDirection(),
            standardShadowPlane.getPadding(),
            standardShadowPlane.geometry,
            standardShadowPlane.material as THREE.Material
        );
        this.copy(standardShadowPlane as BakedRugShadowPlane);
        this.initName();
        this.initLayer();
    }

    protected override initName() {
        this.name = `rug ${this.direction} baked shadow plane`;
    }

    protected override initLayer() {
        this.layers.set(BAKED_RUG_SHADOWS_LAYER);
    }

    override copy(source: BakedShadowPlane, recursive?: boolean | undefined): this {
        super.copy(source as this, recursive);
        this.direction = source.getDirection();
        this.padding = source.getPadding();
        this.initName();
        this.initLayer();
        return this;
    }
}

// Customized depth material that goes from black to transparent, and exposes an intensity multiplier
// Note alpha blend equation will be customized to allow layers blending (additive for wall
// items, max for floor items).
class ShadowBakerDepthMaterial extends THREE.MeshDepthMaterial {
    /* eslint-disable no-underscore-dangle */
    private _intensity = 0.0;

    private shader: THREE.WebGLProgramParametersWithUniforms | undefined;

    constructor(parameters?: THREE.MeshDepthMaterialParameters) {
        super(parameters)
        this.shader = undefined;
        this.onBeforeCompile = (shader) => {
            shader.uniforms = THREE.UniformsUtils.merge([
                THREE.ShaderLib.depth.uniforms,
                { intensity: { value: this.intensity } },
            ]);
            shader.fragmentShader = shader.fragmentShader.replace(
                `void main() {`,
                `
                    uniform float intensity;

                    void main() {
                `
            ).replace(
                `gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );`,
                `gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * intensity);`
            );
            this.shader = shader;
        };
    }

    public get intensity() {
        return this._intensity;
    }

    public set intensity(val: number) {
        this._intensity = val;
        if (!this.shader) {
            this.needsUpdate = true;
        } else {
            this.shader.uniforms.intensity.value = val
        }
    }
}

// ShadowBaker provides an API to generate a baked AO like shadow plane
// that can be attached to an item to simulate contact shadows.
// This is done by rendering a depth map of the passed item using a perpendicular
// camera to the required direction and applying multiple blur passes to smooth
// the resulting texture.
export class ShadowBaker {

    // The maximum blur intensity to avoid blurring glitches and patterns.
    private maxBlurIntensity = 16;

    // The render target dimensions that were used to initially tune the algorithm.
    // This value is now used to maintain consistent blur radius at different resolutions.
    private defaultRtLength = 512;

    // The render targets dimensions.
    private rtLength = 512;

    // The depth material used to render the contact shadow.
    static depthMaterial : ShadowBakerDepthMaterial;

    // The horizontal blurring material used to apply a blur pass.
    static horizontalBlurMaterial : THREE.ShaderMaterial;

    // The vertical blurring material used to apply a blur pass.
    static verticalBlurMaterial : THREE.ShaderMaterial;

    // A customized vertical blur pass that intensifies downward blur.
    static customVerticalBlurMaterial : THREE.ShaderMaterial;

    // The intermediate render target used to apply the blur pass.
    static intermediateRenderTarget : THREE.WebGLRenderTarget;

    constructor() {
        if(!ShadowBaker.depthMaterial) {
            // Create customized depth material, that goes from black to transparent.
            // Note alpha blend equation is customized to allow layers blending (additive for wall
            // items, max for floor items).
            ShadowBaker.depthMaterial = new ShadowBakerDepthMaterial();
            ShadowBaker.depthMaterial.depthWrite = false;
            ShadowBaker.depthMaterial.blending = THREE.CustomBlending;
            ShadowBaker.depthMaterial.side = THREE.FrontSide
        }

        if (!ShadowBaker.horizontalBlurMaterial) {
            // Create horizontal blur material
            // This is a customization built on the actual implementation of HorizontalBlurMaterial
            // to increase it's falloff smoothness.
            ShadowBaker.horizontalBlurMaterial = new THREE.ShaderMaterial({
                ...HorizontalBlurShader,
                fragmentShader: /* glsl */ `
                uniform sampler2D tDiffuse;
                uniform float h;
                varying vec2 vUv;
                void main() {
                    vec4 sum = vec4( 0.0 );
                    sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x - 3.5 * h, vUv.y ) ) * 0.0714 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x - 2.5 * h, vUv.y ) ) * 0.10712 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x - 1.5 * h, vUv.y ) ) * 0.13777 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x - 0.5 * h, vUv.y ) ) * 0.1582 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x + 0.5 * h, vUv.y ) ) * 0.1582 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x + 1.5 * h, vUv.y ) ) * 0.13777 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x + 2.5 * h, vUv.y ) ) * 0.10712 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x + 3.5 * h, vUv.y ) ) * 0.0714 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051 / 2.0;
                    gl_FragColor = sum;
                }`,
                side: THREE.DoubleSide,
                depthTest: false,
            });
        }

        if (!ShadowBaker.verticalBlurMaterial) {
            // Create vertical blur material
            // This is a customization built on the actual implementation of VerticalBlurMaterial
            // to increase it's falloff smoothness.
            ShadowBaker.verticalBlurMaterial = new THREE.ShaderMaterial({
                ...VerticalBlurShader,
                fragmentShader: /* glsl */ `
                uniform sampler2D tDiffuse;
                uniform float v;
                varying vec2 vUv;
                void main() {
                    vec4 sum = vec4( 0.0 );
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.5 * v ) ) * 0.0714 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.5 * v ) ) * 0.10712 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.5 * v ) ) * 0.13777 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 0.5 * v ) ) * 0.1582 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 0.5 * v ) ) * 0.1582 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.5 * v ) ) * 0.13777 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.5 * v ) ) * 0.10712 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.5 * v ) ) * 0.0714 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051 / 2.0;
                    gl_FragColor = sum;
                }`,
                side: THREE.DoubleSide,
                depthTest: false,
            });
        }

        if (!ShadowBaker.customVerticalBlurMaterial) {
            // Create custom vertical blur material that intesifies downward blur.
            // This is a customization built on the actual implementation of VertcialBlurMaterial
            // where the downward blur effect is intensified by multiplication.
            ShadowBaker.customVerticalBlurMaterial = new THREE.ShaderMaterial({
                ...VerticalBlurShader,
                fragmentShader: /* glsl */ `
                uniform sampler2D tDiffuse;
                uniform float v;
                varying vec2 vUv;
                void main() {
                    vec4 sum = vec4( 0.0 );
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.5 * v ) ) * 0.0714 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.5 * v ) ) * 0.10712 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.5 * v ) ) * 0.13777 / 2.0;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 0.5 * v ) ) * 0.1582;
                    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
                    gl_FragColor = sum;
                }`,
                side: THREE.DoubleSide,
                depthTest: false,
            });
        }

        if (!ShadowBaker.intermediateRenderTarget) {
            // Create blur intermediate render target
            ShadowBaker.intermediateRenderTarget = new THREE.WebGLRenderTarget(this.rtLength, this.rtLength);
            ShadowBaker.intermediateRenderTarget.texture.generateMipmaps = false;
            ShadowBaker.intermediateRenderTarget.texture.flipY = false;
        }
    }

    getBakedShadowPlanes(furnitureData: FurnitureItemParameters, mesh: THREE.Object3D, renderer: THREE.WebGLRenderer) {
        const prevParent = mesh.parent
        // Create an empty scene and assign the depth material.
        const scene = new THREE.Scene();
        scene.add(mesh);
        scene.overrideMaterial = ShadowBaker.depthMaterial;

        // Create the group that will contain all contact shadow planes and disposables.
        const planes: ContactShadowPlanes = new THREE.Group() as ContactShadowPlanes;
        planes.renderTargets = [];

        // Calculate the shadow local shadow direction according to the furniture data.
        const itemForwardWorldSpace = mesh.getWorldDirection(new THREE.Vector3());
        const itemForwardLocalSpace = mesh.worldToLocal(itemForwardWorldSpace);
        const itemDirection = new THREE.Vector3();
        itemDirection.x = Math.round(itemForwardLocalSpace.x);
        itemDirection.y = Math.round(itemForwardLocalSpace.y);
        itemDirection.z = Math.round(itemForwardLocalSpace.z);
        
        // Determine the required shadow directions based on the furniture placeables data
        const shadowDirectionsList: string[] = [];
        /* eslint-disable no-bitwise */
        const isWallPlaceableOnly = furnitureData.placingOptions & PlacingOptions.WALL_ONLY
        const isWallOrFloor = furnitureData.placingOptions & PlacingOptions.WALL_OR_FLOOR
        const isWallAndFloor = furnitureData.placingOptions & PlacingOptions.WALL_AND_FLOOR
        /* eslint-enable no-bitwise */
        shadowDirectionsList.push(...isWallPlaceableOnly || isWallAndFloor || isWallOrFloor ? ['BACKWARD'] : []);
        shadowDirectionsList.push(...!isWallPlaceableOnly ? ['DOWNWARD'] : []);
        shadowDirectionsList.forEach(direction => {
            // Calculate the shadow projection plane dimensions.
            const dimensions: number[] = []
            if (direction === 'DOWNWARD')
                dimensions.push(
                    furnitureData.max.x - furnitureData.min.x,
                    furnitureData.max.z - furnitureData.min.z,
                );
            else if (direction === 'SIDEWARD')
                dimensions.push(
                    furnitureData.max.z - furnitureData.min.z,
                    furnitureData.max.y - furnitureData.min.y,
                );
            else if (direction === 'BACKWARD')
                dimensions.push(
                    furnitureData.max.x - furnitureData.min.x,
                    furnitureData.max.y - furnitureData.min.y,
                );
            // Add padding space to the projected shadow plane area.
            const planePadding = Math.min(Math.sqrt(Math.max(...dimensions)) / Math.sqrt(2), 1)

            // Create an orthogonal camera for shadow rendering.
            const shadowCamera = new THREE.OrthographicCamera(
                (-dimensions[0] - planePadding) / 2,
                (dimensions[0] + planePadding) / 2,
                (dimensions[1] + planePadding) / 2,
                (-dimensions[1] - planePadding) / 2,
                -0.01, 1);
            if (direction === 'DOWNWARD') {
                shadowCamera.rotation.set(Math.PI / 2, 0, 0);
                shadowCamera.position.set(0, furnitureData.min.y, 0);
            } else if (direction === 'SIDEWARD') {
                shadowCamera.rotation.set(0, Math.PI / 4, Math.PI);
                shadowCamera.position.set(furnitureData.min.x, dimensions[1] / 2, 0);
            } else if (direction === 'BACKWARD') {
                shadowCamera.rotation.set(0, Math.PI, Math.PI);
                shadowCamera.position.set(0, dimensions[1] / 2, furnitureData.min.z);
            }

            // Create the shadow texture render target.
            const shadowTexRenderTarget = new THREE.WebGLRenderTarget(this.rtLength, this.rtLength);
            shadowTexRenderTarget.texture.generateMipmaps = false;
            shadowTexRenderTarget.texture.flipY = false;

            // Create an intermediate plane to use for blurring the render target.
            const planeGeometry = new THREE.PlaneGeometry(...dimensions.map(l => l + planePadding))
            if (direction === 'DOWNWARD') {
                planeGeometry.rotateX(-Math.PI / 2);
                planeGeometry.translate(0, 0.001, 0);
            } else if (direction === 'SIDEWARD') {
                planeGeometry.rotateZ(-Math.PI / 2);
                planeGeometry.translate(0, dimensions[1] / 2, (furnitureData.max.x - furnitureData.min.x + 0.005) / 2);
            } else if (direction === 'BACKWARD') {
                planeGeometry.rotateX(-Math.PI);
                planeGeometry.translate(0, dimensions[1] / 2, (furnitureData.max.z - furnitureData.min.z + 0.005) / 2);
            }
            const intermediatePlane = new THREE.Mesh(planeGeometry, ShadowBaker.horizontalBlurMaterial);

            // Override the bounding box calculation to avoid affecting the item's hoverable bbox.
            planeGeometry.boundingBox = new THREE.Box3().makeEmpty();
            planeGeometry.boundingBox.expandByObject = () => new THREE.Box3();

            // Utility function to apply a blur pass over the render target
            const applyBlurPass = (intensity: number) => {
                // Calculate compensation factor for render targets of varying resolution.
                // This calculation is pegged to the default resolution because that was the resolution to which
                // the algorithms in this file were initially tuned with.
                const rtResolutionCompensation = Math.sqrt((this.rtLength / this.defaultRtLength))

                // Widen the near/far camera boundaries
                const prevNear = shadowCamera.near;
                const prevFar = shadowCamera.far;
                shadowCamera.near = -0.01;
                shadowCamera.far = 100;
                shadowCamera.updateProjectionMatrix();

                const isVerticalShadowPlane = ['BACKWARD', 'SIDEWARD'].includes(direction);

                // Blur horizontally and draw in the intermediate render target.
                const horizontalIntensity = Math.min(intensity / dimensions[0], this.maxBlurIntensity)
                    * (isVerticalShadowPlane ? 0.25 * rtResolutionCompensation : 1);
                intermediatePlane.material = ShadowBaker.horizontalBlurMaterial;
                ShadowBaker.horizontalBlurMaterial.uniforms.tDiffuse.value = shadowTexRenderTarget.texture;
                ShadowBaker.horizontalBlurMaterial.uniforms.h.value =
                    horizontalIntensity / (this.defaultRtLength * rtResolutionCompensation);
                renderer.setRenderTarget(ShadowBaker.intermediateRenderTarget);
                renderer.render(intermediatePlane, shadowCamera);

                // Blur vertically and draw in the provided render target.
                const verticalIntensity = Math.min(intensity / dimensions[1], this.maxBlurIntensity)
                    * (isVerticalShadowPlane ? 0.5 * rtResolutionCompensation : 1);
                intermediatePlane.material = isVerticalShadowPlane
                    ? ShadowBaker.customVerticalBlurMaterial : ShadowBaker.verticalBlurMaterial;
                ShadowBaker.verticalBlurMaterial.uniforms.tDiffuse.value = ShadowBaker.intermediateRenderTarget.texture;
                ShadowBaker.verticalBlurMaterial.uniforms.v.value =
                    verticalIntensity / (this.defaultRtLength * rtResolutionCompensation);
                renderer.setRenderTarget(shadowTexRenderTarget);
                renderer.render(intermediatePlane, shadowCamera);

                // Rewind the camera's near/far planes
                shadowCamera.near = prevNear;
                shadowCamera.far = prevFar;
                shadowCamera.updateProjectionMatrix();
            };

            // Render the depth material to the main render target
            const currentRenderTarget = renderer.getRenderTarget();
            renderer.setRenderTarget(shadowTexRenderTarget);

            if (direction !== 'DOWNWARD') {
                // wall items cast simpler contact shadows, and can get away with this less adaptive algorithm
                ShadowBaker.depthMaterial.intensity = 2.0;
                ShadowBaker.depthMaterial.blendEquationAlpha = THREE.AddEquation;
                ShadowBaker.depthMaterial.depthTest = false;
                ShadowBaker.depthMaterial.side = THREE.DoubleSide;
                renderer.render(scene, shadowCamera);

                // Apply a multi-blur pass to avoid glitches and patterns
                applyBlurPass(this.maxBlurIntensity);
                applyBlurPass(this.maxBlurIntensity / 3);

                // Re-render depth material with narrower near and far limits
                shadowCamera.near = -0.01;
                shadowCamera.far = 0.3;
                shadowCamera.updateProjectionMatrix();
                renderer.render(scene, shadowCamera);

                // Apply a blur pass with lower intensity for smaller details
                applyBlurPass(this.maxBlurIntensity / 3);
            } else {
                // floor items cast more nuanced shadows, and require a more detailed approach
                ShadowBaker.depthMaterial.intensity = 1.0;
                ShadowBaker.depthMaterial.blendEquationAlpha = THREE.MaxEquation;
                ShadowBaker.depthMaterial.depthTest = true;
                ShadowBaker.depthMaterial.side = THREE.DoubleSide;
                // TUNEABLE VALUES: -----------------------------------------------------------------------------------
                // these numbers were tuned to look as good as possible for as many furniture items as possible.
                // maxDepth indicates how far from the camera the first far plane will be set.
                // larger numbers result in more diffuse shadows as there is more contribution from
                // geometry further from the ground.
                const maxDepth = 0.5
                // steps represent the number of slices that will be rendered and summed.
                // more steps capture more detail, especially towards the ground, where detail is important.
                // each step is another render call and another blur pass, keep performance in mind.
                const steps = 10
                // stepSize is not an adjustable value.
                const stepSize = 1 / (steps - 1)
                // groundBias is an exponent that weights sample position so that more samples are
                // taken closer to the ground.
                // this captures more detail where it is most important.
                // the value is adjustable, but 2 seems to be ideal, at least for floor items.
                const groundBias = 2

                const sliceDepths: number[] = 
                    Array(steps).fill(0).map( (_, i) => maxDepth * (1 - (i * stepSize)) ** groundBias);

                // render the each slice additively onto the main render target, applying blur
                for(let i = 0; i < sliceDepths.length; i += 1) {
                    const sliceDepth = sliceDepths[i]
                    shadowCamera.near = RUG_THICKNESS;
                    shadowCamera.near = -0.01;
                    shadowCamera.far = sliceDepth;
                    shadowCamera.updateProjectionMatrix();
                    renderer.render(scene, shadowCamera);
                    applyBlurPass(Math.max(0.25, this.maxBlurIntensity * sliceDepth));
                }
            }

            // Reset renderer's render target to initial state
            renderer.setRenderTarget(currentRenderTarget);

            // Return the baked contact shadow planes
            const planeMaterial = new THREE.MeshBasicMaterial({
                map: shadowTexRenderTarget.texture,
                opacity: 0.5,
                transparent: true,
                depthWrite: false,
            });
            const plane = new BakedShadowPlane(direction, planePadding, planeGeometry, planeMaterial);
            if (direction === `DOWNWARD`) {
                planes.downward = plane;
                planes.downwardRug = new BakedRugShadowPlane(plane);
                planes.add(planes.downwardRug);
            }
            if (direction === `BACKWARD`) {
                planes.backward = plane;
            }
            planes.renderTargets.push(shadowTexRenderTarget);
            planes.add(plane);
        });

        if (prevParent) {
            prevParent.add(mesh)
        }

        return planes;
    }

    static dispose() {
        ShadowBaker.intermediateRenderTarget?.dispose();
        ShadowBaker.depthMaterial?.dispose();
        ShadowBaker.horizontalBlurMaterial?.dispose();
        ShadowBaker.verticalBlurMaterial?.dispose();
        ShadowBaker.customVerticalBlurMaterial?.dispose();
    }
}
