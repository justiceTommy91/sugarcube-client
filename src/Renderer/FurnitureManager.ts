/* eslint-disable max-classes-per-file */

import * as THREE from 'three'

import type Renderer from 'Renderer'

import {
    GlbModelLoader,
    ProgressCallback,
    OnUpdateCallback,
    RenderEngineConnector
} from 'Renderer/GlbModelLoader'
import { SceneItemMetrics } from './geomviewer'
import { GrandCentral } from './GrandCentral'
import { MASK_DATA_READY, ENVIRONMENT_MAP_READY, WALL_SNAP_READY, PLANE_DATA_READY, } from './StartupWarden'
import CustomStandardMaterial from './CustomStandardMaterial';
import { gvStartupWarden } from './foundation/geom_app'

// RendererAdapter provides the loader with a connection to the renderer.
class RendererAdapter implements RenderEngineConnector {
    private renderer: Renderer;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    beginLoadingModel() {
        this.renderer.incrementLoadingItems();
    }

    endLoadingModel() {
        this.renderer.decrementLoadingItems();
    }

    getEnvCubeTexture(): THREE.Texture | null {
        return this.renderer.cubeTex
    }

    shouldUseFrontSideShadows(): boolean {
        return this.renderer.shouldUseFrontSideShadows();
    }

    getEnvMapIntensity(): number {
        return this.renderer.getEnvMapIntensity();
    }

    shouldUseFilmicLUT(): boolean {
        return this.renderer.useFilmicLUT;
    }

    shouldUseXRay(): boolean {
        return this.renderer.shouldUseXRay();
    }
}

// PendingDownload is a helper class that lets several listeners receive updates about
// a shared asynchronous download.
class PendingDownload {
    private rendererAdapter: RendererAdapter;

    private promise: Promise<THREE.Object3D>

    private progressCallbacks: Array<ProgressCallback>

    private onUpdateCallbacks: Array<OnUpdateCallback>

    constructor(loader: GlbModelLoader, url: string, onProgress: ProgressCallback, onUpdate: OnUpdateCallback,
        renderer: Renderer, glbPlacingAllowedPromise: Promise<void>, metrics: SceneItemMetrics) {

        this.rendererAdapter = new RendererAdapter(renderer);

        this.progressCallbacks = [onProgress]
        this.onUpdateCallbacks = [onUpdate]

        const rootOnProgress = (event: ProgressEvent) => {
            this.progressCallbacks.forEach(cb => cb && cb(event));
        }
        const rootOnUpdate = () => {
            this.onUpdateCallbacks.forEach(cb => cb && cb());
        }

        this.promise = loader.loadModelFromUrl(url, rootOnProgress, rootOnUpdate,
            this.rendererAdapter, glbPlacingAllowedPromise, metrics);
    }

    addListeners(onProgress: ProgressCallback, onUpdate: OnUpdateCallback) {
        this.progressCallbacks.push(onProgress);
        this.onUpdateCallbacks.push(onUpdate);
    }

    async getModel(): Promise<THREE.Object3D> {
        return this.promise;
    }
}

// For the internal Model table.
type ModelRecord = {
    model?: THREE.Object3D, // Root node for downloaded 3D object.
    downloading?: PendingDownload, // When the model is being downloaded.
    refCount: number, // How many times this model is used in the scene.
}

type MaterialRecord = {
    material?: THREE.Material,
    downloading?: PendingDownload
}

// For configuring the internal Model table.
type CachedModelConfig = {
    useFilmicLUT: boolean,
}

class FurnitureManager {
    // Errors are dispatched to GrandCentral.
    private dispatchError: GrandCentral;

    // Shared model loader.
    private modelLoader: GlbModelLoader

    // Keep track of all the models used/downloaded in a table indexed by the URL.
    private modelTable: Map<string, ModelRecord>

    // Keep track of all the combinable materials used/downloaded in a table indexed by the URL.
    private combMaterialTable: Map<string, MaterialRecord>

    private glbPlacingAllowedPromise: Promise<void>

    constructor(errorDispatch: GrandCentral) {
        this.dispatchError = errorDispatch;
        this.modelLoader = new GlbModelLoader()
        this.modelTable = new Map()
        this.combMaterialTable = new Map()
        this.glbPlacingAllowedPromise = new Promise((resolve) => {
            // eslint-disable-next-line no-bitwise
            gvStartupWarden()?.registerCallback(MASK_DATA_READY | ENVIRONMENT_MAP_READY | WALL_SNAP_READY 
                | PLANE_DATA_READY,
                () => resolve())
        })
    }

    // Asynchronously download a model given its URL. If an identical model -- with the same
    // URL -- is already available or being downloaded, this function will correctly share
    // that model. Returns a Promise that resolve to the root of the 3D model when successful.
    async getModelFromUrl(url: string, itemId: string, onProgress: ProgressCallback, onUpdate: OnUpdateCallback,
        renderer: Renderer, metrics: SceneItemMetrics, useCombinableMaterials: boolean): Promise<THREE.Object3D> {

        this.incRefCount(url);

        // If we already have a model for this URL, we can just return a copy.
        const retModel = this.modelTable.get(url)?.model;
        if (retModel) {
            return Promise.resolve(FurnitureManager.makeDeepCopy(retModel));
        }

        // If there's already a pending download for this URL, just wait for that model
        // and return a copy.
        const pendingDownload = this.modelTable.get(url)?.downloading;
        if (pendingDownload) {
            pendingDownload.addListeners(onProgress, onUpdate);
            return pendingDownload.getModel().then((model) =>
                Promise.resolve(FurnitureManager.makeDeepCopy(model))
            );
        }

        // This is a brand new model.
        const modelRecord = this.getOrCreateRecordForUrl(url);
        modelRecord.downloading = new PendingDownload(this.modelLoader, url, onProgress, onUpdate,
            renderer, this.glbPlacingAllowedPromise, metrics)
        return modelRecord.downloading.getModel()
            .then((model) => {
                const rec = this.getOrCreateRecordForUrl(url);
                rec.model = model;
                rec.downloading = undefined;
                rec.model.userData.glbUrl = url
                rec.model.userData.usesCombinableMaterials = useCombinableMaterials

                FurnitureManager.tagForCloning(model);
                return new Promise<THREE.Object3D>((resolve) => {
                    resolve(FurnitureManager.makeDeepCopy(model));
                });
            })
            .catch((reason) => {
                // eslint-disable-next-line i18next/no-literal-string
                this.dispatchError.dispatchDownloadError('product', url, 1, itemId);
                throw (reason);
            });
    }

    releaseModel(model: THREE.Object3D) {
        const url = model.userData.glbUrl
        if (!url) {
            FurnitureManager.disposeResources(model);
            return;
        }

        // YP: about the filtering below: before, the combinable children weren't deleted
        // in the redux code when the parent was deleted, and children glbs were released here.
        // Fixing the deletion in the redux state management did lead to double release,
        // hence we need to filter out the children now.
        // https://geomagical.atlassian.net/browse/GFX-661
        let subNodes = FurnitureManager.detachSubModels(model);
        subNodes = subNodes.filter(node => node.userData.glbUrl === url);

        subNodes.forEach((node) => {
            const childUrl = node.userData.glbUrl
            const count = this.decRefCount(childUrl);
            if (count === 0) {
                this.modelTable.delete(childUrl);
                FurnitureManager.disposeResources(node, !node.userData.usesCombinableMaterials);
            }
        });
    }

    async getMaterialFromUrl(url: string, itemId: string, renderer: Renderer,
                             metrics: SceneItemMetrics): Promise<THREE.Material> {
        // If we already have a material for this URL, we can just return a copy.
        const retMaterial = this.combMaterialTable.get(url)?.material;
        if (retMaterial) {
            return Promise.resolve(retMaterial);
        }

        // If there's already a pending download for this URL, just wait for that model
        // and return a copy.
        const pendingDownload = this.combMaterialTable.get(url)?.downloading;
        if (pendingDownload) {
            return pendingDownload.getModel().then((model) => {
                if (model.children.length < 1) {
                    return Promise.reject(new Error(`Incorrect material glb file.`))
                }

                const mesh = model.children[0] as THREE.Mesh
                const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
                return Promise.resolve(material)
            });
        }

        // This is a brand new material.
        const materialRecord: MaterialRecord = {}
        this.combMaterialTable.set(url, materialRecord)
        materialRecord.downloading = new PendingDownload(this.modelLoader, url, ()=>{}, ()=>{},
            renderer, this.glbPlacingAllowedPromise, metrics)
        return materialRecord.downloading.getModel()
            .then(model => {
                if (model.children.length < 1) {
                    return Promise.reject(new Error(`Incorrect material glb file.`))
                }

                const mesh = model.children[0] as THREE.Mesh
                materialRecord.material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                materialRecord.downloading = undefined;

                return Promise.resolve(materialRecord.material)
            })
            .catch((reason) => {
                // eslint-disable-next-line i18next/no-literal-string
                this.dispatchError.dispatchDownloadError('product', url, 1, itemId);
                throw (reason);
            });
    }

    private disposeCombinableMaterials() {
        this.combMaterialTable.forEach(materialRecord => {
            const meshMaterial = materialRecord.material as THREE.MeshStandardMaterial
            if (meshMaterial) {
                FurnitureManager.disposeMaterial(meshMaterial)
            }
        })

        this.combMaterialTable.clear()
    }

    reconfigCachedModels(options: CachedModelConfig) {
        // Adjust the cached models material state according to the current renderer settings
        // Currently only required for the LUT debug switch
        if (options.useFilmicLUT !== undefined) {
            for (const modelRecord of this.modelTable.values()) {
                modelRecord?.model?.traverse((obj) => {
                    const mesh = obj as THREE.Mesh;
                    if (mesh.material instanceof THREE.MeshStandardMaterial
                        || mesh.material instanceof CustomStandardMaterial) {
                            const currentMaterial = mesh.material;
                        mesh.material = options.useFilmicLUT
                            ? new CustomStandardMaterial()
                                : new THREE.MeshStandardMaterial;
                            mesh.material.copy(currentMaterial);
                            currentMaterial.dispose();
                        }
                });
            }
        }
    }

    getGlbPlacingAllowedPromise() {
        return this.glbPlacingAllowedPromise
    }

    private getOrCreateRecordForUrl(url: string): ModelRecord {
        let rec = this.modelTable.get(url);
        if (!rec) {
            rec = { refCount: 0 };
            this.modelTable.set(url, rec);
        }

        return rec;
    }

    private incRefCount(url: string) {
        const rec = this.getOrCreateRecordForUrl(url);
        rec.refCount += 1;
    }

    private decRefCount(url: string): number {
        const rec = this.modelTable.get(url);
        let refCount = 0;
        if (rec) {
            if (rec.refCount > 0) {
                refCount = rec.refCount - 1;
                rec.refCount = refCount;
            }
        }

        return refCount;
    }

    // Tag a newly downloaded model so that we know exactly what the original scene-graph nodes
    // are, v.s. those added later by the app.
    static tagForCloning(model: THREE.Object3D) {
        // The app will add children to this model, like stackable regions and bbox lines.
        // The cloneModel method below will recursively clone any node in the tree. However,
        // it should not clone added children such as stackable or bbox lines. That is
        // because every model needs to have to have its own stackable regions, with different
        // plane IDs and other unique properties. To this end, we tag all the nodes under model,
        // so that we can identify them as part of the raw gltf model.
        model.traverse(obj => {
            obj.userData.gltfDataShouldClone = true // eslint-disable-line no-param-reassign
        });
    }

    static makeDeepCopy(model: THREE.Object3D): THREE.Object3D {
        // TODO(georges): This code is a bit goofy. It copies the entire tree rooted at
        // node <model> then it removes all the children nodes are should not have been.
        // It would be simpler to keep the tree of nodes that form the original model in
        // the modelTable as a template. Then make copies of that template in the scene
        // graph, even for the very first instance.

        // Make a copy of the object tree. Object <model> may already be in the scene graph.
        // Thus we may end up with more than we want if the model has other models as
        // children. Think a vase on a table.
        const cloned = FurnitureManager.cloneModel(model);

        // Now detach any sub-models we did not want to copy from the tree. See
        // comment with "userData.gltfDataShouldClone = true" in function getGlbModel.
        const disassembled = FurnitureManager.detachSubModels(cloned);
        return disassembled[0];
    }

    static cloneModel(object: THREE.Object3D): THREE.Object3D {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const ret = new object.constructor();
        ret.copy(object, false);
        ret.userData.glbUrl = object.userData.glbUrl;
        ret.userData.isFurniture = object.userData.isFurniture;
        // colorIdReady meant to prevent double preparation of the root object
        // for color id rendering (see ColorIdRenderer.prepareFurnitureItem)
        ret.userData.colorIdReady = object.userData.colorIdReady;
        // this mesh is used for color id rendering
        ret.userData.isColorIdMesh = object.userData.isColorIdMesh;
        ret.userData.colorIdColor = object.userData.colorIdColor;

        for (let i = 0; i < object.children.length; i += 1) {
            const child = object.children[i];
            if (child.userData.gltfDataShouldClone) // See tagForCloning.
                ret.add(FurnitureManager.cloneModel(child));
        }

        return ret
    }

    static detachSubModels(rootObject: THREE.Object3D): THREE.Object3D[] {
        // Traverse the scene graph hierarchy under rootObject and collect all
        // the nodes that have a glb URL. These are nodes created from downloaded
        // data.
        const childrenGlbs: THREE.Object3D[] = []
        rootObject.traverse((obj: THREE.Object3D) => {
            if (obj.userData.glbUrl) {
                childrenGlbs.push(obj);
            }
        })
        childrenGlbs.forEach((obj: THREE.Object3D) => {
            rootObject.remove(obj);
        })
        return childrenGlbs;
    }

    static disposeResources(renderObject: THREE.Object3D, disposeMaterials = true) {
        if (!renderObject) {
            return
        }
        renderObject.traverse((obj: THREE.Object3D) => {
            const mesh = obj as THREE.Mesh
            const material = mesh.material as THREE.MeshStandardMaterial
            if (disposeMaterials && material) {
                FurnitureManager.disposeMaterial(material)
            }
            if (mesh.geometry) {
                mesh.geometry.dispose()
            }
        })
    }

    static disposeMap(map: THREE.Texture | null) {
        map?.dispose()
        if (map?.image?.close) {
            map.image.close()
        }
    }

    static disposeMaterial(material: THREE.MeshStandardMaterial) {
        FurnitureManager.disposeMap(material.normalMap)
        FurnitureManager.disposeMap(material.map)
        FurnitureManager.disposeMap(material.aoMap)
        FurnitureManager.disposeMap(material.metalnessMap)
        FurnitureManager.disposeMap(material.roughnessMap)
        material.dispose()
    }

    dispose() {
        this.modelLoader?.dispose()
        this.disposeCombinableMaterials()
    }
}

export default FurnitureManager
