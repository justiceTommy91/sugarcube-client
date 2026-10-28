import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2'

/* eslint-disable class-methods-use-this */
// Version of Line2 with certain ThreeJS features disabled.
export class CustomLine2 extends Line2 {
  // We don't want these lines to affect bounding box of the furniture.
  public boundingBox = new THREE.Box3()

  // We don't want these lines to affect raycast.
  raycast() { }
}

// Modified version of the line vertex shader from THREE.LineMaterial, with dashes of constant length in screen space.
export const screenSpaceDashVS = `
  #include <common>
  #include <color_pars_vertex>
  #include <fog_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  #include <clipping_planes_pars_vertex>

  uniform float linewidth;
  uniform vec2 resolution;

  attribute vec3 instanceStart;
  attribute vec3 instanceEnd;

  attribute vec3 instanceColorStart;
  attribute vec3 instanceColorEnd;

  varying vec2 vUv;

  #ifdef USE_DASH
    uniform float dashScale;
    attribute float instanceDistanceStart;
    attribute float instanceDistanceEnd;
    varying float vLineDistance;
  #endif

  void trimSegment( const in vec4 start, inout vec4 end ) {

    // trim end segment so it terminates between the camera plane and the near plane

    // conservative estimate of the near plane
    float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
    float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
    float nearEstimate = - 0.5 * b / a;

    float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

    end.xyz = mix( start.xyz, end.xyz, alpha );

  }

  void main() {
    float aspect = resolution.x / resolution.y;

    // camera space
    vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
    vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

    vUv = uv;

    // special case for perspective projection, and segments that terminate either in, or behind, the camera plane
    // clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
    // but we need to perform ndc-space calculations in the shader, so we must address this issue directly
    // perhaps there is a more elegant solution -- WestLangley

    bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

    if ( perspective ) {
      if ( start.z < 0.0 && end.z >= 0.0 ) {
        trimSegment( start, end );
      } else if ( end.z < 0.0 && start.z >= 0.0 ) {
        trimSegment( end, start );
      }
    }

    // clip space
    vec4 clipStart = projectionMatrix * start;
    vec4 clipEnd = projectionMatrix * end;

    // ndc space
    vec3 ndcStart = clipStart.xyz / clipStart.w;
    vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

    // direction
    vec2 dir = ndcEnd.xy - ndcStart.xy;

    // account for clip-space aspect ratio
    dir.x *= aspect;
    dir = normalize( dir );

    vec2 offset = vec2( dir.y, - dir.x );
    // undo aspect ratio adjustment
    dir.x /= aspect;
    offset.x /= aspect;

    // sign flip
    if ( position.x < 0.0 ) {
      offset *= - 1.0;
    }

    // endcaps
    if ( position.y < 0.0 ) {
      offset += - dir;
    } else if ( position.y > 1.0 ) {
      offset += dir;
    }

    // adjust for linewidth
    offset *= linewidth;

    // adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
    offset /= resolution.y;

    // select end
    vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

    // back to clip space
    offset *= clip.w;
    clip.xy += offset;
    gl_Position = clip;

    #ifdef USE_DASH
      vec2 screenStart = ( ndcStart.xy * 0.5 + 0.5 ) * resolution;
      vec2 screenEnd   = ( ndcEnd.xy   * 0.5 + 0.5 ) * resolution;

      float segWorld  = length(end.xyz - start.xyz);
      float segPixels = length(screenEnd - screenStart);
      float worldToPx = ( segWorld == 0.0 ) ? 0.0 : segPixels / segWorld;

      float worldDist = ( position.y < 0.5 ) ? instanceDistanceStart : instanceDistanceEnd;
      vLineDistance = worldDist * worldToPx;
    #endif

    vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    #include <fog_vertex>
  }
`
