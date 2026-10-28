/**
 * GfxInterface.
 * This interface represents the gfxLibrary implementation which will be used by sugarclient.
 * 
 */

import { CustomShader, RenderingParamters } from "Renderer/assets/Types";

export interface GfxInterface { 

libraryName: string,
version: string,
renderer: THREE.WebGL1Renderer | THREE.WebGLRenderer | undefined | null ;

/// ------------- Rendering

  /**
   * Intializes and sets up the webgl renderer. The intial settings
   * for the renderer can be set through the params which are passed in.
   * 
   * @param params { RenderingParamters } The initial parameters to apply.
   * @property useWebGL1 { boolean } Whether to use webGL1 or not.
   * @property software { boolean } Whether to use software or not.
   * @property isMobile { boolean } Is mobile based or not.
   * @property downrez { number } If we wish downscale the canvas with/height based on if running on software.
   * @property usePBR { boolean } Whether to use physically based rendering.
   * @property canvas { HTMLCanvasObject } Base HTML canvas object.'
   * @property antialias { boolean } Turn on/off antialiasing.
   * @property preserveDrawingBuffer { boolean } Whether To preserve the drawing buffer or not.
   * @property powerPreference { string } Defines the renderer's preferred power settings.
   * @property alpha { boolean } Whether to enable alpha or not.
   * 
   * @returns WebglRenderer based on the parameters provided.
   */

createRenderer(params: RenderingParamters): THREE.WebGLRenderer | THREE.WebGL1Renderer;

  /**
   * Inject custom shaderchunk based on the provided customShader parameter. Currently we 
   * have only three custom shaders being applied in the wallspiceWebGL which are env, pbr and standardMaterial.
   * 
   * @param customShader { CustomShader } Enum object for declaring what shaderchunk to change.
   * @type env - For applying env map custom shader chunk
   * @type pbr - For applying pbr custom shader chunk
   * @type standardMaterial - For applying standard Material Custom Shader chunk.
   */

applyCustomShaders(customShader: CustomShader): void;

  /**
   * This returns a scene graph object
   * 
   * @return Scene graph object.
   */

createScene(): THREE.Scene;

  /**
   * @returns The underlying WebGL rendering context version, if applicable.
   */
  getRendererContextType(): number | null;

}