import * as THREE from 'three'
import { PointXY } from 'Renderer/geomviewer/geom_types'
import { Point2, Point3 } from 'Renderer/geometry'
import type { PointSampleResult } from 'Renderer/rendering/SceneSampler'
import { createThreeMatrix4 } from 'Renderer/positioning/positioning_utilities'
import { gvCurrentCamera } from 'Renderer/foundation/geom_app'
import type { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'

const workspace = {
  pt2: new Point2(0, 0),
  pt3: new Point3(0, 0, 0),
  v1: new THREE.Vector3(),
  v2: new THREE.Vector3(),
  v3: new THREE.Vector3(),
  m1: new THREE.Matrix4(),
  m2: new THREE.Matrix4(),
}

function createText(text: string) {
  // Empirical constants to format the text.
  const fontSize = 16
  const canvasToWorldScale = 0.0015
  const textMargin = 0.01

  const canvas = document.createElement('canvas')
  canvas.width = 2 * fontSize + (text.length * fontSize) / 2
  canvas.height = fontSize
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.font = `${fontSize}px Monospace`
    ctx.fillText(text, 0, fontSize - 2)
  }

  const textTexture = new THREE.CanvasTexture(canvas)
  const planeWidth = canvas.width * canvasToWorldScale
  const planeHeight = 2.0 * canvas.height * canvasToWorldScale
  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
  geometry.translate(0.5 * planeWidth, 0.5 * planeHeight, 0.0)

  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      uniform vec2 projectedScreenPos;
      uniform vec2 margin;
      void main() {
          vUv = uv;
          vec2 pos = margin + position.xy + projectedScreenPos;
          gl_Position = vec4(pos, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(map, vUv);
      }
    `,
    uniforms: {
      map: { value: textTexture },
      projectedScreenPos: { value: new THREE.Vector2(0.0, 0.0) },
      margin: { value: new THREE.Vector2(textMargin, textMargin) },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: false,
  })
  mat.needsUpdate = true
  return new THREE.Mesh(geometry, mat)
}

export class SceneSamplingVisualizer {
  private scene: GeomBaseScene
  private rootObject: THREE.Object3D | null = null
  private orientationObject: THREE.Object3D | null = null
  private active = false
  private classTexts: Map<string, THREE.Mesh> = new Map()

  constructor(scene: GeomBaseScene) {
    this.scene = scene
    this.createRenderObject()
  }

  public setActive(shouldBeActive: boolean) {
    const sceneFront = this.scene.getObjectsScene()
    if (!this.rootObject || !sceneFront) {
      return
    }
    this.active = shouldBeActive
    if (shouldBeActive) {
      sceneFront.add(this.rootObject)
    } else {
      sceneFront.remove(this.rootObject)
    }
  }

  public samplePoint(relativePoint: PointXY) {
    const sampler = this.scene.getSceneSampler()
    const result = sampler.sampleRelativePoint(workspace.pt2.set(relativePoint.x, relativePoint.y))
    if (result) {
      this.visualizeSampleResult(result)
    } else if (this.rootObject) {
      this.rootObject.visible = false
    }
  }

  public isActive() {
    return this.active
  }

  private createRenderObject() {
    this.rootObject = new THREE.Group()

    // Empirical constants to control the visual appearance of helper objects.
    const centerSphereRadius = 0.025
    const centerSphereColor = 0xD3D3D3
    const axesLength = 0.25

    const sphereGeometry = new THREE.SphereGeometry(centerSphereRadius)
    const positionMarker = new THREE.Mesh(sphereGeometry, new THREE.MeshBasicMaterial({ color: centerSphereColor }))
    this.rootObject.add(positionMarker)

    this.orientationObject = new THREE.Object3D()
    const axesHelper = new THREE.AxesHelper(axesLength)
    if (!Array.isArray(axesHelper.material)) {
      axesHelper.material.depthTest = false
    }
    this.orientationObject.add(axesHelper)
    this.orientationObject.matrixAutoUpdate = false
    this.rootObject.add(this.orientationObject)

    const classes = [`floor`, `wall`, `ceiling`]
    classes.forEach((classString) => {
      const textObject = createText(classString)
      this.rootObject?.add(textObject)
      this.classTexts.set(classString, textObject)
    })
  }

  private visualizeSampleResult(sampleResult: PointSampleResult) {
    if (!this.rootObject) {
      return
    }
    this.rootObject.position.set(sampleResult.position.x, sampleResult.position.y, sampleResult.position.z)
    this.rootObject.updateMatrix()
    this.rootObject.updateMatrixWorld()

    if (this.orientationObject) {
      createThreeMatrix4(sampleResult.plane.rot, sampleResult.position, this.orientationObject.matrixWorld)
      this.orientationObject.matrix = workspace.m1.copy(this.rootObject.matrixWorld).invert()
        .multiply(workspace.m2.copy(this.orientationObject.matrixWorld))
    }

    const camera = gvCurrentCamera()?.getThreeCamera()
    this.classTexts.forEach((textObject, name) => {
      if (camera) {
        textObject.visible = sampleResult.plane.class === name
        const screenPos = textObject.getWorldPosition(workspace.v1).project(camera)
        const mat = textObject.material as THREE.ShaderMaterial
        mat.uniforms.projectedScreenPos.value = screenPos
      } else {
        textObject.visible = false
      }
    })

    this.rootObject.visible = true
  }
}