/* eslint-disable class-methods-use-this */
import * as THREE from 'three'

import { WallsGraph, Wall, WallVertex } from 'Planner/editor/walls_graph'
import { PlaneType } from 'Renderer/geomviewer'
import { planeToWorld } from 'Planner/room_geometry'
import { WALL_GRAPH_VIEW_ROOT_NAME } from 'Planner/planner_constants'

type WallMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>

type VertexObject = {
  root: THREE.Object3D
}

export class WallsGraphView {
  private readonly enableDebugRendering = false
  private readonly wallThickness = 0.05

  private rootObject: THREE.Group = new THREE.Group()
  private wallRenderObjects = new Map<string, WallMesh>
  private vertexRenderObjects = new Map<string, VertexObject>

  constructor(graph: WallsGraph, ceilingPlane: PlaneType) {
    this.createRenderObjects(graph, ceilingPlane)
  }

  public getRenderObject(): THREE.Group {
    return this.rootObject
  }

  public setVisible(visible: boolean) {
    this.rootObject.visible = visible
  }

  private createRenderObjects(wallsGraph: WallsGraph, ceilingPlane: PlaneType) {
    this.rootObject.name = WALL_GRAPH_VIEW_ROOT_NAME
    this.rootObject.userData.exportIgnore = true
    const xAxis = new THREE.Vector3().fromArray(ceilingPlane.rot[0])
    const yAxis = new THREE.Vector3().fromArray(ceilingPlane.rot[2]).negate()
    const zAxis = new THREE.Vector3().fromArray(ceilingPlane.rot[1]).negate()
    const originPos = planeToWorld(ceilingPlane, new THREE.Vector2(0, 0))
    this.rootObject.matrix.makeBasis(xAxis, yAxis, zAxis)
    this.rootObject.matrix.setPosition(originPos)
    this.rootObject.matrix.decompose(this.rootObject.position, this.rootObject.quaternion, this.rootObject.scale)

    const walls = wallsGraph.getWalls()
    walls.forEach((wall) => {
      this.createWallObject(wall, wallsGraph)
    })

    if (this.enableDebugRendering) {
      const vertices = wallsGraph.getVertices()
      vertices.forEach((vertex) => {
        const vertexObject = this.createVertexDebugObject(wallsGraph, vertex)
        this.rootObject.add(vertexObject.root)
        this.vertexRenderObjects.set(vertex.id, vertexObject)
      })
      const xArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0))
      xArrow.setColor(0xFF0000)
      const yArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1))
      yArrow.setColor(0x00FF00)
      this.rootObject.add(xArrow)
      this.rootObject.add(yArrow)
    }
  }

  private createWallObject(wall: Wall, wallsGraph: WallsGraph): WallMesh | null {
    const graphVertex1Pos = wallsGraph.getVertexPosition(wall.vertexIds[0])
    const graphVertex2Pos = wallsGraph.getVertexPosition(wall.vertexIds[1])
    if (!graphVertex1Pos || !graphVertex2Pos) {
      return null
    }

    const wallLength = graphVertex1Pos.distanceTo(graphVertex2Pos)
    const geometry = new THREE.PlaneGeometry(wallLength, this.wallThickness)
    geometry.rotateX(-Math.PI * 0.5)

    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(wall.uiColor).convertSRGBToLinear() })
    const plane = new THREE.Mesh(geometry, material)
    plane.name = `Wall-${wall.id} view`

    const midpoint = new THREE.Vector2().addVectors(graphVertex1Pos, graphVertex2Pos).multiplyScalar(0.5)
    plane.position.set(midpoint.x, 0.0, midpoint.y)

    const angle = -Math.atan2(graphVertex2Pos.y - graphVertex1Pos.y,
      graphVertex2Pos.x - graphVertex1Pos.x)
    plane.rotation.y = angle

    if (this.enableDebugRendering) {
      this.addWallElmentsDebugObjects(wallsGraph, wall, plane, wallLength)
    }
    plane.userData = {
      class: `wall`,
      wallId: wall.id,
    }
    if (plane) {
      this.wallRenderObjects.set(wall.id, plane)
      this.rootObject.add(plane)
    }
    return plane
  }

  public refresh(wallsGraph: WallsGraph) {
    const graphWalls = wallsGraph.getWalls()

    const deletedWalls = [...this.wallRenderObjects.keys()].filter(id => !graphWalls.has(id))
    deletedWalls.forEach(id => this.deleteWallObject(id))

    graphWalls.forEach((wall) => this.refreshWallObject(wall, wallsGraph))
    if (this.enableDebugRendering) {
      const vertices = wallsGraph.getVertices()
      vertices.forEach(vertex => this.refreshVertexObject(wallsGraph, vertex))
    }
  }

  private refreshWallObject(wall: Wall, wallsGraph: WallsGraph) {
    const renderObject = this.wallRenderObjects.get(wall.id)
    if (!renderObject) {
      this.createWallObject(wall, wallsGraph)
      return
    }
    const graphVertex1Pos = wallsGraph.getVertexPosition(wall.vertexIds[0])
    const graphVertex2Pos = wallsGraph.getVertexPosition(wall.vertexIds[1])
    if (!graphVertex1Pos || !graphVertex2Pos) {
      return
    }
    const wallLength = graphVertex1Pos.distanceTo(graphVertex2Pos)

    const positionAttribute = renderObject.geometry.getAttribute('position')
    // Assuming that we're working with plane geometry.
    positionAttribute.setX(0, -0.5 * wallLength)
    positionAttribute.setX(1, 0.5 * wallLength)
    positionAttribute.setX(2, -0.5 * wallLength)
    positionAttribute.setX(3, 0.5 * wallLength)
    positionAttribute.needsUpdate = true

    const midpoint = new THREE.Vector2().addVectors(graphVertex1Pos, graphVertex2Pos).multiplyScalar(0.5)
    renderObject.position.set(midpoint.x, 0.0, midpoint.y)

    const angle = -Math.atan2(graphVertex2Pos.y - graphVertex1Pos.y,
      graphVertex2Pos.x - graphVertex1Pos.x)
    renderObject.rotation.y = angle

    renderObject.material.color.copy(wall.uiColor).convertSRGBToLinear()
    renderObject.geometry.computeBoundingSphere()
    renderObject.geometry.computeBoundingBox()
  }

  private refreshVertexObject(wallsGraph: WallsGraph, graphVertex: WallVertex) {
    const vertexVisual = this.vertexRenderObjects.get(graphVertex.id)
    if (!vertexVisual) {
      return
    }
    const position = wallsGraph.getVertexPosition(graphVertex.id)
    if (!position) {
        return
    }
    vertexVisual.root.position.set(position.x, 0.0, position.y)
  }

  private deleteWallObject(id: string) {
    const object = this.wallRenderObjects.get(id)
    if (!object) {
      return
    }
    this.wallRenderObjects.delete(id)
    this.rootObject.remove(object)
    object.material.dispose()
    object.geometry.dispose()
  }

  private addWallElmentsDebugObjects(wallsGraph: WallsGraph, wall: Wall, renderObject: THREE.Object3D, 
                                     wallLength: number) {
    wall.elements.forEach((element, index) => {
      const elPos = wallsGraph.getWallElementPosition(element.id)
      if (!elPos) {
        return
      }
      const positionX = elPos.x - wallLength * 0.5
      const positionBound1 = -element.size.x * 0.5
      const positionBound2 =  element.size.x * 0.5

      const sphereGeom = new THREE.SphereGeometry(0.025)
      const markerMtl = new THREE.MeshBasicMaterial({
        color: 0x0000FF,
        depthTest: false,
      })
      const elementObject = new THREE.Group()
      elementObject.userData = {
        elementIndex: index
      }
      const marker = new THREE.Mesh(sphereGeom, markerMtl)
      marker.position.set(0.0, 0.0, 0.0)
      elementObject.add(marker)

      const markerB1 = new THREE.Mesh(sphereGeom, markerMtl)
      markerB1.position.set(positionBound1, 0.0, 0.0)
      elementObject.add(markerB1)

      const markerB2 = new THREE.Mesh(sphereGeom, markerMtl)
      markerB2.position.set(positionBound2, 0.0, 0.0)
      elementObject.add(markerB2)

      elementObject.position.x = positionX
      renderObject.add(elementObject)
    })
  }

  private createVertexDebugObject(wallsGraph: WallsGraph, graphVertex: WallVertex): VertexObject {
    const sphereGeom = new THREE.SphereGeometry(0.05)
    const markerMtl = new THREE.MeshBasicMaterial({
      color: 0x0080FF,
      depthTest: false,
    })
    const object = new THREE.Mesh(sphereGeom, markerMtl)
    const vertexPosition = wallsGraph.getVertexPosition(graphVertex.id)
    if (!vertexPosition) {
        const ret = {
            root: object,
            requestedDisplacement: new THREE.ArrowHelper(),
            limitedDisplacement: new THREE.ArrowHelper(),
            limits: [],
        }
        return ret
    }
    object.position.set(vertexPosition.x, 0.0, vertexPosition.y)
    const ret = {
      root: object,
      requestedDisplacement: new THREE.ArrowHelper(),
      limitedDisplacement: new THREE.ArrowHelper(),
      limits: [],
    }
    ret.root.add(ret.requestedDisplacement)
    ret.root.add(ret.limitedDisplacement)
    ret.requestedDisplacement.setColor(0xFF0000)
    ret.limitedDisplacement.setColor(0x00FF00)
    ret.requestedDisplacement.visible = false
    ret.limitedDisplacement.visible = false

    ret.requestedDisplacement.renderOrder = 1
    ret.limitedDisplacement.renderOrder = 2

    if (ret.limitedDisplacement.line.material instanceof THREE.Material) {
      ret.limitedDisplacement.line.material.depthTest = false
    }
    if (ret.requestedDisplacement.line.material instanceof THREE.Material) {
      ret.requestedDisplacement.line.material.depthTest = false
    }
    if (ret.limitedDisplacement.cone.material instanceof THREE.Material) {
      ret.limitedDisplacement.cone.material.depthTest = false
    }
    if (ret.requestedDisplacement.cone.material instanceof THREE.Material) {
      ret.requestedDisplacement.cone.material.depthTest = false
    }
    return ret
  }
}
