import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'

import { WallElementInfo } from 'Planner/planner_types'

export class WallElementMeasurements {
  private rootObject: THREE.Group = new THREE.Group()
  private left: Line2
  private right: Line2
  private top: Line2
  private bottom: Line2
  private leftTick: Line2
  private rightTick: Line2
  private topTick: Line2
  private bottomTick: Line2
  private lineMaterial: LineMaterial

  constructor(lineWidth: number, opacity = 1.0) {
    const geometry = new LineGeometry()
    geometry.setPositions([0, 0, 0, 0, 0, 0])
    this.lineMaterial = new LineMaterial({
      color: 0xA8A8A8,
      transparent: opacity !== 1.0,
      opacity,
      linewidth: lineWidth
    })

    this.left = new Line2(geometry.clone() as LineGeometry, this.lineMaterial)
    this.right = new Line2(geometry.clone() as LineGeometry, this.lineMaterial)
    this.top = new Line2(geometry.clone() as LineGeometry, this.lineMaterial)
    this.bottom = new Line2(geometry.clone() as LineGeometry, this.lineMaterial)

    this.leftTick = new Line2(geometry.clone() as LineGeometry, this.lineMaterial)
    this.rightTick = new Line2(geometry.clone() as LineGeometry, this.lineMaterial)
    this.topTick = new Line2(geometry.clone() as LineGeometry, this.lineMaterial)
    this.bottomTick = new Line2(geometry.clone() as LineGeometry, this.lineMaterial)

    this.rootObject.add(this.left, this.right, this.top, this.bottom, this.leftTick, this.rightTick, this.topTick,
      this.bottomTick
    )
    this.setVisible(false, false)
  }

  public getRootObject() {
    return this.rootObject
  }

  public setVisible(vertical: boolean, horizontal: boolean) {
    this.left.visible = horizontal
    this.right.visible = horizontal
    this.leftTick.visible = horizontal
    this.rightTick.visible = horizontal

    this.top.visible = vertical
    this.bottom.visible = vertical
    this.topTick.visible = vertical
    this.bottomTick.visible = vertical
  }

  public setResolution(resolution: THREE.Vector2) {
    this.lineMaterial.resolution.copy(resolution)
  }

  public refresh(elementInfo: WallElementInfo, elementObject: THREE.Object3D) {
    const upWall = elementInfo.roomIntersections[0]
    const downWall = elementInfo.roomIntersections[1]
    const leftWall = elementInfo.roomIntersections[2]
    const rightWall = elementInfo.roomIntersections[3]

    const leftBottom = elementInfo.corners[0]
    const leftTop = elementInfo.corners[1]
    const rightTop = elementInfo.corners[2]
    const rightBottom = elementInfo.corners[3]

    const normalOffsetValue = 0.01
    const normalOffset = elementObject.getWorldDirection(new THREE.Vector3()).multiplyScalar(normalOffsetValue)
    if (upWall) { upWall.add(normalOffset) }
    if (downWall) { downWall.add(normalOffset) }
    if (leftWall) { leftWall.add(normalOffset) }
    if (rightWall) { rightWall.add(normalOffset) }

    if (leftBottom) { leftBottom.add(normalOffset) }
    if (leftTop) { leftTop.add(normalOffset) }
    if (rightTop) { rightTop.add(normalOffset) }
    if (rightBottom) { rightBottom.add(normalOffset) }

    // A small offset to allow line end ticks be rendered without them intersecting adjacent walls or floor.
    const endsOffset = 0.025
    const tickLength = 0.25
    const tickUp = upWall &&
      new THREE.Vector3().subVectors(upWall, elementInfo.centerWorldPos).setLength(0.5 * tickLength)
    const tickDown = tickUp && tickUp.clone().negate()
    const tickRight = rightWall &&
      new THREE.Vector3().subVectors(rightWall, elementInfo.centerWorldPos).setLength(0.5 * tickLength)
    const tickLeft = tickRight && tickRight.clone().negate()

    if (this.left.visible && leftBottom && leftTop && leftWall && tickLeft) {
      const start = new THREE.Vector3().addVectors(leftBottom, leftTop).multiplyScalar(0.5)
      const end = new THREE.Vector3().subVectors(leftWall, tickLeft.clone().setLength(endsOffset))
      WallElementMeasurements.setupLine(this.left, start, end)
      if (tickUp && tickDown) {
        const tickFrom = new THREE.Vector3().addVectors(end, tickDown)
        const tickTo = new THREE.Vector3().addVectors(end, tickUp)
        WallElementMeasurements.setupLine(this.leftTick, tickFrom, tickTo)
      }
    }
    if (this.right.visible && rightBottom && rightTop && rightWall && tickRight) {
      const start = new THREE.Vector3().addVectors(rightBottom, rightTop).multiplyScalar(0.5)
      const end = new THREE.Vector3().subVectors(rightWall, tickRight.clone().setLength(endsOffset))
      WallElementMeasurements.setupLine(this.right, start, end)
      if (tickUp && tickDown) {
        const tickFrom = new THREE.Vector3().addVectors(end, tickDown)
        const tickTo = new THREE.Vector3().addVectors(end, tickUp)
        WallElementMeasurements.setupLine(this.rightTick, tickFrom, tickTo)
      }
    }
    if (this.top.visible && leftTop && rightTop && upWall && tickUp) {
      const start = new THREE.Vector3().addVectors(leftTop, rightTop).multiplyScalar(0.5)
      const end = new THREE.Vector3().subVectors(upWall, tickUp.clone().setLength(endsOffset))
      WallElementMeasurements.setupLine(this.top, start, end)
      if (tickLeft && tickRight) {
        const tickFrom = new THREE.Vector3().addVectors(end, tickLeft)
        const tickTo = new THREE.Vector3().addVectors(end, tickRight)
        WallElementMeasurements.setupLine(this.topTick, tickFrom, tickTo)
      }
    }
    if (this.bottom.visible && leftBottom && rightBottom && downWall && tickDown) {
      const start = new THREE.Vector3().addVectors(leftBottom, rightBottom).multiplyScalar(0.5)
      const end = new THREE.Vector3().subVectors(downWall, tickDown.clone().setLength(endsOffset))
      WallElementMeasurements.setupLine(this.bottom, start, end)
      if (tickLeft && tickRight) {
        const tickFrom = new THREE.Vector3().addVectors(end, tickLeft)
        const tickTo = new THREE.Vector3().addVectors(end, tickRight)
        WallElementMeasurements.setupLine(this.bottomTick, tickFrom, tickTo)
      }
    }
  }

  private static setupLine(lineObject: Line2, from: THREE.Vector3, to: THREE.Vector3) {
    lineObject.geometry.setPositions([
      from.x, from.y, from.z,
      to.x, to.y, to.z,
    ])
  }
}