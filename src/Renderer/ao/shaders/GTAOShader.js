/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-continue */
/* eslint-disable no-plusplus */
import {
	Matrix4,
	Vector2,
} from 'three';

/** @module GTAOShader */

/**
 * GTAO shader. Use by {@link GTAOPass}. Modified to work with pano based rooms,
 * use thinDecay (as in the original paper) instead of constant thickness, 
 * and output single channe red format instead of RGB.
 *
 * References:
 * - [Practical Realtime Strategies for Accurate Indirect Occlusion]{@link https://iryoku.com/downloads/Practical-Realtime-Strategies-for-Accurate-Indirect-Occlusion.pdf}.
 * - [Horizon-Based Indirect Lighting (HBIL)]{@link https://github.com/Patapom/GodComplex/blob/master/Tests/TestHBIL/2018%20Mayaux%20-%20Horizon-Based%20Indirect%20Lighting%20(HBIL).pdf}
 *
 * @constant
 * @type {ShaderMaterial~Shader}
 */
const GTAOShader = {

	name: 'GTAOShader',

	defines: {
		PERSPECTIVE_CAMERA: 1,
		SAMPLES: 16,
		NORMAL_VECTOR_TYPE: 3,
		DEPTH_SWIZZLING: 'x',
		SCENE_CLIP_BOX: 0,
	},

	uniforms: {
		tNormal: { value: null },
		tDepth: { value: null },
		tNoise: { value: null },
		resolution: { value: new Vector2() },
		cameraNear: { value: null },
		cameraFar: { value: null },
		cameraProjectionMatrix: { value: new Matrix4() },
		cameraProjectionMatrixInverse: { value: new Matrix4() },
		cameraWorldMatrix: { value: new Matrix4() },
		radius: { value: 0.25 },
		distanceExponent: { value: 1. },
		scale: { value: 1. },
	},

	vertexShader: /* glsl */`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,

	fragmentShader: /* glsl */`
  varying vec2 vUv;
  uniform highp sampler2D tNormal;
  uniform highp sampler2D tDepth;
  uniform sampler2D tNoise;
  uniform vec2 resolution;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform mat4 cameraProjectionMatrix;
  uniform mat4 cameraProjectionMatrixInverse;
  uniform mat4 cameraWorldMatrix;
  uniform float radius;
  uniform float distanceExponent;
  uniform float scale;

  #include <common>
  #include <packing>

  #ifndef FRAGMENT_OUTPUT
  #define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
  #endif

  vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
    vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
    vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
    return viewSpacePosition.xyz / viewSpacePosition.w;
  }

  float getDepth(const vec2 uv) {
    return textureLod(tDepth, uv.xy, 0.0).DEPTH_SWIZZLING;
  }

  float fetchDepth(const ivec2 uv) {
    return texelFetch(tDepth, uv.xy, 0).DEPTH_SWIZZLING;
  }

  vec3 computeNormalFromDepth(const vec2 uv) {
    vec2 size = vec2(textureSize(tDepth, 0));
    vec2 invSize = 1.0 / size;
    ivec2 p = ivec2(uv * size);

    float c0 = fetchDepth(p);
    float l2 = fetchDepth(p - ivec2(2, 0));
    float l1 = fetchDepth(p - ivec2(1, 0));
    float r1 = fetchDepth(p + ivec2(1, 0));
    float r2 = fetchDepth(p + ivec2(2, 0));
    float b2 = fetchDepth(p - ivec2(0, 2));
    float b1 = fetchDepth(p - ivec2(0, 1));
    float t1 = fetchDepth(p + ivec2(0, 1));
    float t2 = fetchDepth(p + ivec2(0, 2));

    float dl = abs((2.0 * l1 - l2) - c0);
    float dr = abs((2.0 * r1 - r2) - c0);
    float db = abs((2.0 * b1 - b2) - c0);
    float dt = abs((2.0 * t1 - t2) - c0);

    vec3 ce = getViewPosition(uv, c0).xyz;
    vec2 dx = vec2(invSize.x, 0.0);
    vec2 dy = vec2(0.0, invSize.y);

    vec3 dpdx = (dl < dr)
      ? ce - getViewPosition(uv - dx, l1).xyz
      : -ce + getViewPosition(uv + dx, r1).xyz;

    vec3 dpdy = (db < dt)
      ? ce - getViewPosition(uv - dy, b1).xyz
      : -ce + getViewPosition(uv + dy, t1).xyz;

    return normalize(cross(dpdx, dpdy));
  }

  vec3 getViewNormal(const vec2 uv) {
    return computeNormalFromDepth(uv);
  }

  vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
    vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.0);
    float invW = 1.0 / sampleClipPos.w;
    vec2 sampleUv = sampleClipPos.xy * invW * 0.5 + 0.5;
    float sampleSceneDepth = getDepth(sampleUv);
    return vec3(sampleUv, sampleSceneDepth);
  }

  bool isPano(const vec2 uv) {
    vec4 normalColor = textureLod(tNormal, uv, 0.0);
    return normalColor.a < 1.0;
  }

  void main() {
    float depth = getDepth(vUv.xy);
    if (depth >= 1.0) {
      discard;
      return;
    }

    vec3 viewPos    = getViewPosition(vUv, depth);
    vec3 viewNormal = getViewNormal(vUv);
    bool isCurrentPano = isPano(vUv);

    float falloffStart = radius * 0.05;
    float falloffEnd   = radius * 1.05;

    vec2 noiseResolution = vec2(textureSize(tNoise, 0));
    vec2 noiseUv = vUv * resolution / noiseResolution;
    vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
    vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;

    vec3 tangent   = normalize(vec3(randomVec.xy, 0.0));
    vec3 bitangent = vec3(-tangent.y, tangent.x, 0.0);
    mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0.0, 0.0, 1.0));

    const int DIRECTIONS = SAMPLES < 30 ? 2 : 5;
    const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;

    vec3 viewDir = normalize(-viewPos.xyz);

    // Thin object issue: original threejs gtao example used a constant thickness for all objects,
    // but gtao paper used a "decay" value assuming objects are as thick as they are wide
    // in screenspace, so when a lower horizon angle is encountered, we 
    // reduce the AO. It is a very small decay because we are using very few samples per pixel
    // for better performance and larger decays doesn't work very well visually.
    float thinDecay = 0.95;
    float invSteps = 1.0 / float(STEPS);
    float expFactor = distanceExponent * (noiseTexel.x * 0.5 + 1.0);

    float ao = 0.0;

    for (int i = 0; i < DIRECTIONS; ++i) {
      float angle = float(i) / float(DIRECTIONS) * PI;
      vec4 sampleDir = vec4(cos(angle), sin(angle), 0.0, 0.5 + 0.5 * noiseTexel.w);
      sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);

      vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
      vec3 sliceTangent   = cross(sliceBitangent, viewDir);
      vec3 normalInSlice  = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));

      vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
      vec2 lowCosHorizons = vec2(
        dot(viewDir, tangentToNormalInSlice),
        dot(viewDir, -tangentToNormalInSlice)
      );
      vec2 cosHorizons = lowCosHorizons;

      for (int j = 0; j < STEPS; ++j) {
        float t = float(j + 1) * invSteps;
        float stepLen = radius * sampleDir.w * pow(t, expFactor);
        vec3 offset = sampleDir.xyz * stepLen;

        // +offset (forward)
        {
          vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + offset);
          vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
          vec3 viewDelta = sampleSceneViewPos - viewPos;

          float lenDelta = length(viewDelta);
          float weight = 1.0 - smoothstep(falloffStart, falloffEnd, lenDelta);
          if (isCurrentPano) {
            bool isSamplePano = isPano(sampleSceneUvDepth.xy);
            weight = isSamplePano ? 0.0 : weight;
          }

          float invLenDelta = lenDelta > 0.0 ? (1.0 / lenDelta) : 0.0;
          float sampleCosHorizon = max(0.0, dot(viewDir, viewDelta) * invLenDelta);

          sampleCosHorizon = mix(lowCosHorizons.x, sampleCosHorizon, weight);
          if (sampleCosHorizon >= cosHorizons.x) {
            cosHorizons.x = sampleCosHorizon;
          } else {
            cosHorizons.x = max(cosHorizons.x * thinDecay, lowCosHorizons.x);
          }
        }

        // -offset (backward)
        {
          vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos - offset);
          vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
          vec3 viewDelta = sampleSceneViewPos - viewPos;

          float lenDelta = length(viewDelta);
          float weight = 1.0 - smoothstep(falloffStart, falloffEnd, lenDelta);
          if (isCurrentPano) {
            bool isSamplePano = isPano(sampleSceneUvDepth.xy);
            weight = isSamplePano ? 0.0 : weight;
          }

          float invLenDelta = lenDelta > 0.0 ? (1.0 / lenDelta) : 0.0;
          float sampleCosHorizon = max(0.0, dot(viewDir, viewDelta) * invLenDelta);

          sampleCosHorizon = mix(lowCosHorizons.y, sampleCosHorizon, weight);
          if (sampleCosHorizon >= cosHorizons.y) {
            cosHorizons.y = sampleCosHorizon;
          } else {
            cosHorizons.y = max(cosHorizons.y * thinDecay, lowCosHorizons.y);
          }
        }
      }

      vec2 sinHorizons = sqrt(1.0 - cosHorizons * cosHorizons);
      float nx = dot(normalInSlice, sliceTangent);
      float ny = dot(normalInSlice, viewDir);
      float nxb = 0.5 * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
      float nyb = 0.5 * (2.0 - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
      float occlusion = nx * nxb + ny * nyb;
      ao += occlusion;
    }

    ao = clamp(ao / float(DIRECTIONS), 0.0, 1.0);
    ao = pow(ao, scale);
    gl_FragColor = FRAGMENT_OUTPUT;
  }`
};

/**
 * GTAO depth shader. Use by {@link GTAOPass}.
 *
 * @constant
 * @type {Object}
 */
const GTAODepthShader = {
	name: 'GTAODepthShader',

	defines: {
		PERSPECTIVE_CAMERA: 1
	},

	uniforms: {
		tDepth: { value: null },
		cameraNear: { value: null },
		cameraFar: { value: null },
	},

	vertexShader: /* glsl */`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,

	fragmentShader: /* glsl */`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`
};

/**
 * GTAO blend shader. Use by {@link GTAOPass}.
 *
 * @constant
 * @type {Object}
 */
const GTAOBlendShader = {

	name: 'GTAOBlendShader',

	uniforms: {
		tDiffuse: { value: null },
		intensity: { value: 1.0 }
	},

	vertexShader: /* glsl */`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,

	fragmentShader: /* glsl */`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rrr, intensity), texel.a);
		}`

};

export { GTAOShader, GTAODepthShader, GTAOBlendShader };
