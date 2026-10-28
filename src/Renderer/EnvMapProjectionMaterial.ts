import * as THREE from 'three'

export class EnvMapProjectionMaterial extends THREE.ShaderMaterial {

  constructor(envMapTexture: THREE.Texture) {
    super()

    this.uniforms = {
      envMapText: { value: envMapTexture },
    }
    this.vertexShader = /* glsl */ ` 
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `
    this.fragmentShader = /* glsl */ ` 
      float pi = 3.1415926536;
      varying vec2 vUv;
      uniform sampler2D envMapText;

      float getFaceIndex(vec3 dir) {
        vec3 absDir = abs(dir);

        if (absDir.x >= absDir.y && absDir.x >= absDir.z) {
          return dir.x > 0.0 ? 0. : 3.;
        } else if (absDir.y >= absDir.x && absDir.y >= absDir.z) {
          return dir.y > 0.0 ? 4. : 1.;
        } else {
          return dir.z > 0.0 ? 5. : 2.;
        }
      }

      vec2 rotateFaceUV(vec2 uv, float angle) {
        uv -= 0.5;
        float cosA = cos(angle);
        float sinA = sin(angle);
        uv = mat2(cosA, -sinA, sinA, cosA) * uv;
        uv += 0.5;
        return uv;
      }

      vec2 getFaceUV(vec3 dir, float faceIndex) {
        vec2 uv;
        vec3 absDir = abs(dir);

        if (faceIndex == 0.) {
          uv = vec2(-dir.z, dir.y) / absDir.x;
        } else if (faceIndex == 1.) {
          uv = vec2(dir.x, dir.z) / absDir.y;
        } else if (faceIndex == 2.) {
          uv = vec2(-dir.x, dir.y) / absDir.z;
        } else if (faceIndex == 3.) {
          uv = vec2(dir.z, dir.y) / absDir.x;
        } else if (faceIndex == 4.) {
          uv = vec2(dir.x, -dir.z) / absDir.y;
        } else if (faceIndex == 5.) {
          uv = vec2(dir.x, dir.y) / absDir.z;
        }

        vec2 faceUV = 0.5 * (uv + 1.0);
        if (faceIndex == 1. || faceIndex == 4.)
          faceUV = rotateFaceUV(faceUV, pi * 180.0 / 180.0);

        return faceUV;
      }

      vec2 getEnvMapUV(vec2 faceUV, float faceIndex) {
        int col = int(faceIndex) % 3;
        int row = int(faceIndex) / 3;
        vec2 offset = vec2(float(col), float(row)) / vec2(3.0, 4.0);
        vec2 scale = vec2(1.0 / 3.0, 1.0 / 4.0);
        faceUV.y = 1.0 - faceUV.y;
        return offset + faceUV * scale;
      }

      void main( void ) {
        vec2 uv = vec2(vUv);
        float theta = (1.0 - uv.y) * pi;
        float phi = uv.x * pi * 2.0;
        vec3 dir = vec3(sin(theta) * sin(phi), cos(theta), sin(theta) * cos(phi));
        float faceIndex = getFaceIndex(dir);
        vec2 faceUV = getFaceUV(dir, faceIndex);
        vec2 envMapUV = getEnvMapUV(faceUV, faceIndex);
        gl_FragColor = texture2D(envMapText, envMapUV);
        gl_FragColor.a = 1.0;
      }
    `
  }
}