/* eslint-disable class-methods-use-this */
import * as THREE from 'three'

import type { Wall, WallElement, WallsGraph } from 'Planner/editor/walls_graph'
import type { GeomagicalExtras, PolygonType } from 'Renderer/assets/Types'
import { Matrix3x3, PlaneType } from 'Renderer/geomviewer/geom_types'
import { signedAngleDeg } from 'Renderer/rendering/scene_builder_utils'
import {
  buildPlaneFromTransform,
  buildPolygonFromMesh,
  planeToWorld,
  worldToPlane,
 } from 'Planner/room_geometry'

import { createThreeMatrix4, rayCastToPlane } from 'Renderer/positioning/positioning_utilities'
import { Ray } from 'Renderer/positioning/positioning_types'

import { BASEBOARD_HEIGHT, ROOM_MESH_ROOT_NAME } from 'Planner/planner_constants'
import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import { ToneMapType } from 'Renderer/geomviewer'
import type { Room } from 'Planner/room'
import type { WallElementObject } from 'Planner/rendering/wall_element_object'
import { clamp } from 'utils/math'

type WallVertexPositionsPair = {
  floor: THREE.Vector3 | undefined
  ceiling: THREE.Vector3 | undefined
}

type MeshVertex = {
  vertexIdx: number
  pos: THREE.Vector2
}

type WallElementToVertexMap = Map<string, number>
export type StandardMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
export type CustomMaterialMesh = THREE.Mesh<THREE.BufferGeometry, CustomStandardMaterial>

// When the room is exported and loaded in the designer, too precisely touching polygons
// seem to confuse WallSnap, add a little margin here to produce a slight overlap between wall and wall element.
const WALL_ELEMENT_POLY_MARGIN = 0.015

const WALL_THICKNESS = 0.1
const BASEBOARD_THICKNESS = 0.02

export class RoomMesh {
  private static readonly errorMaterial = new CustomStandardMaterial({ color: 0xFF0000 })

  private room: Room
  private wallsGraph: WallsGraph
  private floorPlane: PlaneType
  private ceilingPlane: PlaneType

  private rootObject: THREE.Group

  private floorMesh: CustomMaterialMesh | null = null
  // Mapping walls graph vertexID => mesh vertex index.
  private floorMeshMapping: Map<string, MeshVertex> = new Map()

  private walls: Map<string, CustomMaterialMesh> = new Map()
  // Mapping wall id => (Map element id => mesh hole index)
  private wallVertexMappings: Map<string, WallElementToVertexMap> = new Map()
  private wallElementsExtrasIndices: Map<string, number> = new Map()
  private wallElementObjects: Map<string, WallElementObject> = new Map()
  private wallElementPolygons: Map<string, StandardMesh> = new Map()

  private ceilingMesh: CustomMaterialMesh | null = null
  // Mapping walls graph vertexID => mesh vertex index.
  private ceilingMeshMapping: Map<string, MeshVertex> = new Map()

  private floorBorderVertices: Array<THREE.Vector3> = []
  private ceilingBorderVertices: Array<THREE.Vector3> = []

  private wallThicknessMaterial: THREE.MeshStandardMaterial
  private wallBaseboardMaterial: THREE.MeshStandardMaterial

  private kreativPolysCache: PolygonType[] = []

  constructor(room: Room, wallsGraph: WallsGraph, floorPlane: PlaneType, ceilingPlane: PlaneType) {
    this.room = room
    this.wallsGraph = wallsGraph
    this.floorPlane = floorPlane
    this.ceilingPlane = ceilingPlane
    this.rootObject = new THREE.Group()
    this.rootObject.name = ROOM_MESH_ROOT_NAME
    this.refreshRootExtras(wallsGraph, floorPlane, ceilingPlane)
    this.syncWithWallsGraph()

    // These values are the same as in room border material we use in hela rooms.
    this.wallThicknessMaterial = new THREE.MeshStandardMaterial({
      name: 'ThicknessMaterial',
      color: 0xFFFFFF,
      emissive: 0xFFFFFF,
      roughness: 0.5
    })

    this.wallBaseboardMaterial = new THREE.MeshStandardMaterial({
      name: 'BaseboardMaterial',
      color: 0xF3F3F3,
      roughness: 0.5
    })
  }

  public syncWithWallsGraph() {
    this.refreshRootExtras(this.wallsGraph, this.floorPlane, this.ceilingPlane)
    this.syncFloorAndCeiling()
    this.syncWalls()
    this.syncGeomagicalSurfaces()
    this.syncKreativPolys()
  }

  public setWallElementObject(wallElementId: string, object: WallElementObject) {
    this.wallElementObjects.set(wallElementId, object)
    this.syncWalls()
  }

  public getRootObject() {
    return this.rootObject
  }

  public getFloorMesh() {
    return this.floorMesh
  }

  public getCeilingMesh() {
    return this.ceilingMesh
  }

  public getWallMesh(id: string) {
    return this.walls.get(id)
  }

  public getWallMeshes() {
    return Array.from(this.walls.values())
  }

  public getWallPlane(id: string) {
    const wallMesh = this.getWallMesh(id)
    if (!wallMesh) {
      return undefined
    }
    return buildPlaneFromTransform(wallMesh.matrix, +id, `wall`)
  }

  public getKreativPolys() {
    return this.kreativPolysCache
  }

  public getWallElement(elementId: string) {
    return this.wallElementObjects.get(elementId)
  }

  public getWallElementVisualObject(elementId: string) {
    return this.getWallElement(elementId)?.getRootObject()
  }

  public getWallElementPolygonMeshes() {
    return Array.from(this.wallElementPolygons.values())
  }

  // Generate room border ("wall thickness") and baseboard ribbon meshes.
  // Wall thickness meshes are extruded one-sided planes,
  // extruded in the direction of the bisecting outward angle between a wall/floor/ceiling.
  //
  // In summary we generate the following meshes:
  // - Floor border mesh
  // - Ceiling border mesh
  // - Border mesh for every wall
  // - Baseboard mesh for every wall
  //
  // Vertices are generated in generateWallBorderVertices()
  public generateRibbonMeshes() {
    this.floorBorderVertices = []
    this.ceilingBorderVertices = []

    const walls = this.wallsGraph.getWalls()
    walls.forEach(wall => {
      const generatedVertices = this.generateWallBorderVertices(this.wallsGraph, wall)
      const wallMesh = this.walls.get(wall.id)

      if (wallMesh && generatedVertices) {
        // Ribbon mesh vertices are in world space and since we add these meshes as children to wallMeshes (in order to
        // hide them when wallMeshes are hidden) we need to compensate for the parent transforms.
        const parentInverse = wallMesh.matrix.clone().invert()
        const wallBorderMesh = RoomMesh.createRibbonMesh(generatedVertices.wallBorderVertices,
                                                         parentInverse,
                                                         this.wallThicknessMaterial)
        wallBorderMesh.name = `${wall.id}[wl][thickness]`
        wallBorderMesh.visible = false

        const wallBaseboardMesh = RoomMesh.createRibbonMesh(generatedVertices.wallBaseboardVertices,
                                                            parentInverse,
                                                            this.wallBaseboardMaterial)
        wallBaseboardMesh.name = `${wall.id}[wl][baseboard]`
        wallBaseboardMesh.visible = false

        wallMesh.add(wallBorderMesh)
        wallMesh.add(wallBaseboardMesh)
      }
    })

    if (this.floorMesh) {
      const floorBorderMesh = RoomMesh.createRibbonMesh(this.floorBorderVertices,
                                                        this.floorMesh.matrix.clone().invert(),
                                                        this.wallThicknessMaterial)
      floorBorderMesh.name = `${this.floorPlane.id}[flr][thickness]`
      floorBorderMesh.visible = false

      this.floorMesh.add(floorBorderMesh)
    }

    if (this.ceilingMesh) {
      const ceilingBorderMesh = RoomMesh.createRibbonMesh(this.ceilingBorderVertices,
                                                          this.ceilingMesh.matrix.clone().invert(),
                                                          this.wallThicknessMaterial)
      ceilingBorderMesh.name = `${this.ceilingPlane.id}[ceil][thickness]`
      ceilingBorderMesh.visible = false

      this.ceilingMesh.add(ceilingBorderMesh)
    }
  }

  private refreshRootExtras(wallsGraph: WallsGraph, floorPlane: PlaneType, ceilingPlane: PlaneType) {
    const extras: GeomagicalExtras = {
      geomagical: {
        geomagicalCameras: [],
        geomagicalSurfaces: [],
        geomagicalScenes: [],
        geomagicalLights: [],
      },
    }

    wallsGraph.getWalls().forEach((wall) => extras.geomagical.geomagicalSurfaces.push({
      type: `wall`,
      id: +wall.id,
      version: '1.0',
    }))

    extras.geomagical.geomagicalSurfaces.push({
      type: floorPlane.class,
      id: floorPlane.id,
      version: '1.0',
    }, {
      type: ceilingPlane.class,
      id: ceilingPlane.id,
      version: '1.0',
    })

    let wallElementId = Math.max(...extras.geomagical.geomagicalSurfaces.map(info => info.id))
    this.wallElementsExtrasIndices.clear()
    wallsGraph.getWalls().forEach((wall) => wall.elements.forEach((element) => {
      wallElementId += 1
      extras.geomagical.geomagicalSurfaces.push({
        type: element.class,
        id: wallElementId,
        version: '1.0',
      })
      this.wallElementsExtrasIndices.set(element.id, wallElementId)
    }))
    extras.geomagical.geomagicalSurfaces.sort((surface1, surface2) => surface1.id - surface2.id)
    this.rootObject.userData = extras
  }

  private syncFloorAndCeiling() {
    let needsRemesh = this.wallsGraph.getIsFloorShapeDirty()
    if (!this.floorMesh) {
      const floorMesh = this.createMeshForPlane(this.floorPlane)
      this.floorMesh = floorMesh 
      this.floorMesh.name = `${this.floorPlane.id}[floor]`
      this.floorMesh.userData = {
        class: `floor`,
      }
      this.rootObject.add(this.floorMesh)
      const floorMaterial = this.room.getFloorMaterial()
      if (floorMaterial) {
          const materialProps = { vignetteAO: true, reduceLightingEffects: true, useSofterShadows: true }
          const customMaterial = new CustomStandardMaterial(materialProps).copy(floorMaterial)
          customMaterial.setToneMapType(ToneMapType.ACESFilmic)
          floorMesh.material = customMaterial
          floorMesh.receiveShadow = true
          floorMesh.castShadow = true
          floorMesh.material.shadowSide = THREE.FrontSide
          this.room.getScene().setIsDirty(true)
      }
      needsRemesh = true
    }
    if (!this.ceilingMesh) {
      const ceilingMesh = this.createMeshForPlane(this.ceilingPlane)
      this.ceilingMesh = ceilingMesh
      this.ceilingMesh.name = `${this.ceilingPlane.id}[ceiling]`
      this.ceilingMesh.userData = {
        class: `ceiling`,
      }
      this.rootObject.add(this.ceilingMesh)
      this.room.getCeilingMaterial().then((material) => {
        const materialProps = { vignetteAO: false, reduceLightingEffects: true, useSofterShadows: true }
        const customMaterial = new CustomStandardMaterial(materialProps).copy(material)
        customMaterial.setToneMapType(ToneMapType.ACESFilmic)
        customMaterial.uniforms.ceilingPointLightMultiplier.value = 0.02
        customMaterial.uniforms.ceilingSkyLightMultiplier.value = 1.0
        ceilingMesh.material = customMaterial
        ceilingMesh.receiveShadow = true
        ceilingMesh.castShadow = true
        ceilingMesh.material.shadowSide = THREE.BackSide
        this.room.getScene().setIsDirty(true)
      })
      needsRemesh = true
    }
    if (needsRemesh) {
      const geometries = this.createFloorAndCeilingGeometry()
      if (geometries) {
        this.floorMesh.geometry = geometries.floor
        this.ceilingMesh.geometry = geometries.ceiling
      }
      this.wallsGraph.setIsFloorShapeDirty(false)
    } else {
      const graphVertices = this.wallsGraph.getVertices()
      const floorPositionAttribute = this.floorMesh.geometry.getAttribute('position')
      const floorUvAttribute = this.floorMesh.geometry.getAttribute('uv')
      const ceilingPositionAttribute = this.ceilingMesh.geometry.getAttribute('position')
      const ceilingUvAttribute = this.ceilingMesh.geometry.getAttribute('uv')

      graphVertices.forEach((graphVertex) => {
        const floorMeshVertexMapping = this.floorMeshMapping.get(graphVertex.id)
        const vertexPosition = this.wallsGraph.getVertexPosition(graphVertex.id)
        if (!vertexPosition || floorMeshVertexMapping === undefined) {
          return
        }
        this.syncPlaneMeshVertex(floorPositionAttribute, floorUvAttribute, floorMeshVertexMapping, vertexPosition)

        const ceilingMeshVertexIndex = this.ceilingMeshMapping.get(graphVertex.id)
        if (ceilingMeshVertexIndex === undefined) {
          return
        }
        const floorWorldPoint = planeToWorld(this.floorPlane, vertexPosition)
        const ray: Ray = { origin: floorWorldPoint, dir: { dx: 0.0, dy: 1.0, dz: 0.0} }
        const intersect = rayCastToPlane(ray, this.ceilingPlane)
        if (intersect) {
          const ceilingWorldPoint = new THREE.Vector3(intersect.x, intersect.y, intersect.z)
          const ceilingPlanePoint = worldToPlane(this.ceilingPlane, ceilingWorldPoint)

          this.syncPlaneMeshVertex(ceilingPositionAttribute, ceilingUvAttribute, ceilingMeshVertexIndex,
            ceilingPlanePoint)
        }
      })

      // Re-triangulate after moving vertices.
      const floorContour = Array.from(this.floorMeshMapping.values()).map(m => m.pos)
      const floorIndices = THREE.ShapeUtils.triangulateShape(floorContour, []).flat()
      this.floorMesh.geometry.setIndex(floorIndices)
      this.syncVAOattribute(this.floorMesh.geometry)

      const ceilingContour = Array.from(this.ceilingMeshMapping.values()).map(m => m.pos)
      const ceilingIndices = THREE.ShapeUtils.triangulateShape(ceilingContour, []).flat()
      this.ceilingMesh.geometry.setIndex(ceilingIndices)
      this.syncVAOattribute(this.ceilingMesh.geometry)
    }
    this.floorMesh.geometry.boundingSphere = null
    this.floorMesh.geometry.boundingBox = null
    this.ceilingMesh.geometry.boundingSphere = null
    this.ceilingMesh.geometry.boundingBox = null
  }

  private syncWalls() {
    const graphWalls = this.wallsGraph.getWalls()
    const deletedWalls: string[] = []
    this.walls.forEach((wallMesh, id) => {
      const deleted = !graphWalls.has(id)
      if (deleted) {
        this.rootObject.remove(wallMesh)
        this.disposeMesh(wallMesh)
        deletedWalls.push(id)
      }
    })
    deletedWalls.forEach(wallId => this.walls.delete(wallId))
    graphWalls.forEach(wall => this.syncWall(wall))
  }

  private syncWall(wall: Wall) {
    let wallMesh = this.walls.get(wall.id)
    if (!wallMesh) {
      wallMesh = this.createWallMesh(wall)
      if (wallMesh) {
        this.rootObject.add(wallMesh)
        this.walls.set(wall.id, wallMesh)
        this.setWallColor(wall.id, this.room.getWallsColor())
      }
    } else {
      this.syncWallTransform(wall, wallMesh)
      const elementsMapping = this.wallVertexMappings.get(wall.id)
      if (wall.elements.size !== elementsMapping?.size) {
        const newGeometryInfo = this.createWallGeometry(wall)
        if (newGeometryInfo) {
          wallMesh.geometry.dispose()
          wallMesh.geometry = newGeometryInfo.geometry
          wallMesh.userData.originX = newGeometryInfo.origin.x
          wallMesh.userData.originY = newGeometryInfo.origin.y
          this.wallVertexMappings.set(wall.id, newGeometryInfo.wallElementsMapping)
        }
      } else {
        // Vertex indexes are all the same for every wall, and rely on the fact that when THREE.Shape
        // triangulates a shape, it puts wall contour vertices sequentially, reversed, at the beginning of the buffer.
        const floorVertexIdx1 = 3
        const ceilingVertexIdx1 = 0
        const pair1 = this.syncWallVertexPairWithGraph(wall.vertexIds[0], wallMesh,
          [floorVertexIdx1, ceilingVertexIdx1])
        const floorVertexIdx2 = 2
        const ceilingVertexIdx2 = 1
        const pair2 = this.syncWallVertexPairWithGraph(wall.vertexIds[1], wallMesh,
          [floorVertexIdx2, ceilingVertexIdx2])

        // Each wall element represent a rectangular hole of 4 vertices, which is layed out in the vertex buffer
        // following 4 vertices of the wall itself.
        const origin = pair1.floor
        const wallVertices = [pair1.floor, pair1.ceiling, pair2.floor, pair2.ceiling]
        if (elementsMapping) {
          elementsMapping.forEach((holeIndex, elementId) => {
            if (!wallMesh) {
              return
            }
            const startIndex = 4 + holeIndex * 4
            this.syncWallElementVertices(this.wallsGraph, wall, wallVertices, wallMesh, elementId, origin, startIndex)
          })
        }
        this.retriangluateWallMesh(wallMesh)
        this.syncVAOattribute(wallMesh.geometry)
        wallMesh.userData.originX = origin.x
        wallMesh.userData.originY = origin.y
      }
    }
    if (wallMesh) {
      this.syncWallElementObjects(wall, wallMesh)
      wallMesh.geometry.boundingSphere = null
      wallMesh.geometry.boundingBox = null
      this.syncWallMeshUVs(wallMesh)
      this.refreshWallVignetteAO(wall)
    }
  }

  private createMeshForPlane(plane: PlaneType) {
    const mesh: CustomMaterialMesh = new THREE.Mesh()
    mesh.material = RoomMesh.errorMaterial

    const position = planeToWorld(plane, new THREE.Vector2(0, 0))
    createThreeMatrix4(plane.rot, position, mesh.matrix)
    mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale)

    return mesh
  }

  private createFloorAndCeilingGeometry() {
    const vertexLoop = this.wallsGraph.collectClosedLoop()
    const floorPoints = vertexLoop.map(v => { 
        const pos = this.wallsGraph.getVertexPosition(v.id)
        if (pos) {
          return pos.clone()
        }
        return undefined
      }).filter(p => p) as THREE.Vector2[]
    if (floorPoints.length < 3) {
      return undefined
    }
    if (!THREE.ShapeUtils.isClockWise(floorPoints)) {
      vertexLoop.reverse()
      floorPoints.reverse()
    }
    const floorShape = new THREE.Shape(floorPoints)
    const floorGeometry = new THREE.ShapeGeometry(floorShape)
    this.syncVAOattribute(floorGeometry)

    this.floorMeshMapping.clear()
    // THREE.Shape adds vertices sequentially, we can rely on its order here.
    vertexLoop.forEach((vertex, index) => this.floorMeshMapping.set(vertex.id, {
      vertexIdx: index,
      pos: floorPoints[index],
    }))

    const ceilingPoints = floorPoints.map((position) => {
      const floorWorldPoint = planeToWorld(this.floorPlane, position)
      const ray: Ray = { origin: floorWorldPoint, dir: { dx: 0.0, dy: 1.0, dz: 0.0} }
      const intersect = rayCastToPlane(ray, this.ceilingPlane)
      const ceilingPlanePoint = intersect ? worldToPlane(this.ceilingPlane,
        new THREE.Vector3(intersect.x, intersect.y, intersect.z)) : undefined
      if (!ceilingPlanePoint) {
        return position
      }
      return new THREE.Vector2(ceilingPlanePoint.x, ceilingPlanePoint.y)
    })
    if (!THREE.ShapeUtils.isClockWise(ceilingPoints)) {
      vertexLoop.reverse()
      floorPoints.reverse()
    }
    const ceilingShape = new THREE.Shape(ceilingPoints)
    const ceilingGeometry = new THREE.ShapeGeometry(ceilingShape)
    this.syncVAOattribute(ceilingGeometry)

    this.ceilingMeshMapping.clear()
    vertexLoop.forEach((vertex, index) => this.ceilingMeshMapping.set(vertex.id, {
      vertexIdx: index,
      pos: ceilingPoints[index],
    }))

    return {
      floor: floorGeometry,
      ceiling: ceilingGeometry
    }
  }

  private createWallMesh(wall: Wall) {
    const geometryInfo = this.createWallGeometry(wall)
    if (!geometryInfo) {
      return undefined
    }
    const { geometry, position, rot, origin, wallElementsMapping } = geometryInfo
    const wallMesh = new THREE.Mesh(geometry, RoomMesh.errorMaterial)
    wallMesh.name = `${wall.id}[wall]`
    wallMesh.userData = {
      class: `wall`,
      wallId: wall.id,
      originX: origin.x,
      originY: origin.y,
    }
    this.wallVertexMappings.set(wall.id, wallElementsMapping)

    // Right now we can't change wall materials in runtime, i.e. we can expect the wall material
    // to be 100% ready at the time of wall mesh creation. It is ensured in RoomBuilder.buildRoom.
    const material = this.room.getWallsMaterial()
    if(material) {
      const materialProps = { vignetteAO: true, reduceLightingEffects: true, useSofterShadows: true }
      const customMaterial = new CustomStandardMaterial(materialProps).copy(material)
      customMaterial.setToneMapType(ToneMapType.ACESFilmic)
      customMaterial.side = THREE.DoubleSide
      wallMesh.material = customMaterial
      wallMesh.receiveShadow = true
      wallMesh.castShadow = true
      wallMesh.material.shadowSide = THREE.BackSide
      this.room.getScene().setIsDirty(true)
    }

    createThreeMatrix4(rot as Matrix3x3, position, wallMesh.matrix)
    wallMesh.matrix.decompose(wallMesh.position, wallMesh.quaternion, wallMesh.scale)
    return wallMesh
  }

  private createWallGeometry(wall: Wall) {
    const { floor: p1, ceiling: p3 } = this.computeWallVertexPositions(wall.vertexIds[0])
    const { floor: p2, ceiling: p4 } = this.computeWallVertexPositions(wall.vertexIds[1])
    if (!p1 || !p2 || !p3 || !p4) {
      return null
    }
    const worldPoints = [p1, p2, p4, p3]
    const { position, xAxis, yAxis, zAxis } = this.computeWallBasisAndPosition(p1, p2, p3)

    // Our points already lay in the plane and don't require projecting on it.
    const planeSpacePoints = worldPoints.map(p => new THREE.Vector2(xAxis.dot(p), yAxis.dot(p)))
    const shape = new THREE.Shape(planeSpacePoints)
    const { elementsMapping, holes } = this.generateWallElementsHoles(this.wallsGraph, wall, planeSpacePoints)
    holes.forEach(hole => shape.holes.push(new THREE.Shape(hole)))

    const geometry = new THREE.ShapeGeometry(shape)
    this.syncVAOattribute(geometry)

    return {
      geometry,
      position,
      rot: [
        [xAxis.x, xAxis.y, xAxis.z],
        [yAxis.x, yAxis.y, yAxis.z],
        [zAxis.x, zAxis.y, zAxis.z],
      ],
      origin: planeSpacePoints[0],
      wallElementsMapping: elementsMapping,
    }
  }

  private disposeMesh(mesh: CustomMaterialMesh) {
    mesh.material.dispose()
    mesh.geometry.dispose()
  }

  // Creates threejs mesh from an array of vertices.
  private static createRibbonMesh(vertices: Array<THREE.Vector3>,
                                  transform: THREE.Matrix4,
                                  material: THREE.MeshStandardMaterial) {
    const positions: Array<number> = []
    for (const point of vertices) {
      positions.push(...point)
    }

    const normals: Array<number> = []
    const indices: Array<number> = []
    for (let i = 0; i < vertices.length; i += 4) {
      indices.push(i)
      indices.push(i + 2)
      indices.push(i + 1)
      indices.push(i + 1)
      indices.push(i + 2)
      indices.push(i + 3)

      const vAB = vertices[i + 2].clone().sub(vertices[i])
      const vAC = vertices[i + 1].clone().sub(vertices[i])
      const vNormal = vAB.cross(vAC).normalize()

      for (let j = 0; j < 4; j += 1) {
        normals.push(...vNormal)
      }
    }

    const borderGeometry = new THREE.BufferGeometry()
    borderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    borderGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    borderGeometry.setIndex(indices)

    const borderMesh = new THREE.Mesh(borderGeometry, material)
    borderMesh.matrix = transform
    borderMesh.matrix.decompose(borderMesh.position, borderMesh.quaternion, borderMesh.scale)

    return borderMesh
  }

  // Generates vertices for wall thickness and baseboard meshes.
  // This function generates vertices for the full border of the wall,
  // the parts of the floor and ceiling wall thickness meshes touching this wall
  // and for this wall's baseboard.
  private generateWallBorderVertices(wallsGraph: WallsGraph, wall: Wall) {
    const adjacentWalls = wallsGraph.getAdjacentWalls(wall.id)
    const vWallDir = wallsGraph.getWallDirection(wall).normalize()
    const vPrevWallDir = wallsGraph.getWallDirection(adjacentWalls[0]).normalize()
    const vNextWallDir = wallsGraph.getWallDirection(adjacentWalls[1]).normalize()

    // Find 2D directions of the bisecting outward angles between
    // this and 2 adjacent walls.
    const v2DCornerDir1 = vPrevWallDir.clone().negate()
    v2DCornerDir1.add(vWallDir).normalize()
    if (vPrevWallDir.clone().negate().cross(vWallDir) > 0) {
      v2DCornerDir1.negate()
    }

    const v2DCornerDir2 = vWallDir.clone().negate()
    v2DCornerDir2.add(vNextWallDir).normalize()
    if (vWallDir.clone().negate().cross(vNextWallDir) > 0) {
      v2DCornerDir2.negate()
    }

    // Transform outward 2D directions into world space.
    const vCornerDir1 = planeToWorld(this.floorPlane, v2DCornerDir1).normalize()
    const vCornerDir2 = planeToWorld(this.floorPlane, v2DCornerDir2).normalize()

    const vUp = new THREE.Vector3(0, 1, 0)
    const vDown = new THREE.Vector3(0, -1, 0)

    // Tilt transformed directions by 45 degrees up and down.
    // This way we end up with 3D directions of the bisecting outward angles between
    // walls, floor and ceiling.
    const vDirFloor1 = vCornerDir1.clone().add(vDown).normalize()
    const vDirFloor2 = vCornerDir2.clone().add(vDown).normalize()
    const vDirCeiling1 = vCornerDir1.clone().add(vUp).normalize()
    const vDirCeiling2 = vCornerDir2.clone().add(vUp).normalize()

    // Get wall end points on the floor and ceiling planes.
    const { floor: pFloorCorner1, ceiling: pCeilingCorner1 } = this.computeWallVertexPositions(wall.vertexIds[0])
    const { floor: pFloorCorner2, ceiling: pCeilingCorner2 } = this.computeWallVertexPositions(wall.vertexIds[1])
    if (!pFloorCorner1 || !pFloorCorner2 || !pCeilingCorner1 || !pCeilingCorner2) {
      return null
    }

    // Move wall end points in 4 previously computed directions.
    const pFloorMoved1 = pFloorCorner1.clone().addScaledVector(vDirFloor1, WALL_THICKNESS)
    const pFloorMoved2 = pFloorCorner2.clone().addScaledVector(vDirFloor2, WALL_THICKNESS)
    const pCeilingMoved1 = pCeilingCorner1.clone().addScaledVector(vDirCeiling1, WALL_THICKNESS)
    const pCeilingMoved2 = pCeilingCorner2.clone().addScaledVector(vDirCeiling2, WALL_THICKNESS)

    const floorBorderVertices = [
      pFloorCorner1, pFloorMoved1, pFloorCorner2, pFloorMoved2
    ]

    const ceilingBorderVertices = [
      pCeilingCorner2, pCeilingMoved2, pCeilingCorner1, pCeilingMoved1
    ]

    // Add this wall's floor and ceiling border vertices to arrays
    // with all floor and ceiling border vertices.
    this.floorBorderVertices.push(...floorBorderVertices)
    this.ceilingBorderVertices.push(...ceilingBorderVertices)

    // Note that wall's border is constructed from 3 quads (pairs of triangles):
    // 2 vertical quads along wall intersection lines and 1 horizontal ceiling quad.
    // Ceiling part is needed here because on some camera angles we hide ceiling plane
    // but ceiling border should still be visible. We don't need wall border geometry for the floor
    // because we never hide the floor plane.
    const wallBorderVertices = [
      pFloorCorner1, pFloorMoved1, pCeilingCorner1, pCeilingMoved1,
      pCeilingCorner1, pCeilingMoved1, pCeilingCorner2, pCeilingMoved2,
      pCeilingCorner2, pCeilingMoved2, pFloorCorner2, pFloorMoved2
    ]

    const vWallNormal = planeToWorld(this.floorPlane, new THREE.Vector2(vWallDir.y, -vWallDir.x)).normalize()

    const baseboardSegmentPoints = wallsGraph.getSortedDoorPoints(wall)

    // Add 0 and 1 for wall ends
    baseboardSegmentPoints.unshift(0.0)
    baseboardSegmentPoints.push(1.0)

    // Calculate this wall's baseboard vertices avoiding door areas.
    const wallBaseboardVertices: Array<THREE.Vector3> = []
    for (let i = 0; i < baseboardSegmentPoints.length; i += 2) {
      const pSegmentStart = pFloorCorner1.clone().lerp(pFloorCorner2, baseboardSegmentPoints[i])
      const pSegmentEnd = pFloorCorner1.clone().lerp(pFloorCorner2, baseboardSegmentPoints[i + 1])

      const firstSegment = i === 0
      const lastSegment = i === baseboardSegmentPoints.length - 2

      const vDirStart = firstSegment ? vCornerDir1.clone().negate() : vWallNormal
      const vDirEnd = lastSegment ? vCornerDir2.clone().negate() : vWallNormal

      const baseboardThicknessStart = BASEBOARD_THICKNESS * (firstSegment ? Math.SQRT2 : 1.0)
      const baseboardThicknessEnd = BASEBOARD_THICKNESS * (lastSegment ? Math.SQRT2 : 1.0)

      const pBBMoved1 = pSegmentStart.clone().addScaledVector(vDirStart, baseboardThicknessStart)
      const pBBMoved2 = pSegmentEnd.clone().addScaledVector(vDirEnd, baseboardThicknessEnd)
      const pBBTop1 = pSegmentStart.clone().addScaledVector(vUp, BASEBOARD_HEIGHT)
      const pBBTop2 = pSegmentEnd.clone().addScaledVector(vUp, BASEBOARD_HEIGHT)
      const pBBTopMoved1 = pBBMoved1.clone().addScaledVector(vUp, BASEBOARD_HEIGHT)
      const pBBTopMoved2 = pBBMoved2.clone().addScaledVector(vUp, BASEBOARD_HEIGHT)

      if (firstSegment) {
        wallBaseboardVertices.push(...[pSegmentStart, pBBTop1, pBBMoved1, pBBTopMoved1])
      }

      wallBaseboardVertices.push(...[pBBTop1, pBBTop2, pBBTopMoved1, pBBTopMoved2,
                                     pBBMoved1, pBBTopMoved1, pBBMoved2, pBBTopMoved2])

      if (lastSegment) {
        wallBaseboardVertices.push(...[pBBTop2, pSegmentEnd, pBBTopMoved2, pBBMoved2])
      }
    }

    return {wallBorderVertices, wallBaseboardVertices}
  }

  private createWallElementPolygon(wallsGraph: WallsGraph, wallElement: WallElement, wallMesh: THREE.Mesh) {
    const elemPos = wallsGraph.getWallElementPosition(wallElement.id)
    if (!wallMesh || !elemPos) {
      return
    }

    const planeSpacePoints = [
      new THREE.Vector2(-0.5 * wallElement.size.x - WALL_ELEMENT_POLY_MARGIN, -0.5 * wallElement.size.y),
      new THREE.Vector2(-0.5 * wallElement.size.x - WALL_ELEMENT_POLY_MARGIN, 0.5 * wallElement.size.y),
      new THREE.Vector2(0.5 * wallElement.size.x + WALL_ELEMENT_POLY_MARGIN, 0.5 * wallElement.size.y),
      new THREE.Vector2(0.5 * wallElement.size.x + WALL_ELEMENT_POLY_MARGIN, -0.5 * wallElement.size.y),
    ]
    const shape = new THREE.Shape(planeSpacePoints)
    const geometry = new THREE.ShapeGeometry(shape)
    const elementPolyMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xFF0000 }))
    elementPolyMesh.name = `${wallElement.wallId}[${wallElement.class}]`

    elementPolyMesh.position.copy(this.wallElementPosToWorldSpace(wallMesh, elemPos))
    elementPolyMesh.quaternion.copy(wallMesh.quaternion)
    elementPolyMesh.userData = {
      class: wallElement.class,
      wallElementId: wallElement.id,
    }
    elementPolyMesh.visible = false
    this.rootObject.add(elementPolyMesh)
    this.wallElementPolygons.set(wallElement.id, elementPolyMesh)
  }

  public syncWallElementPolygonSize(polygon: THREE.Mesh, wallElement: WallElement) {
    const positions = [
      [-0.5 * wallElement.size.x - WALL_ELEMENT_POLY_MARGIN, -0.5 * wallElement.size.y],
      [-0.5 * wallElement.size.x - WALL_ELEMENT_POLY_MARGIN, 0.5 * wallElement.size.y],
      [0.5 * wallElement.size.x + WALL_ELEMENT_POLY_MARGIN, 0.5 * wallElement.size.y],
      [0.5 * wallElement.size.x + WALL_ELEMENT_POLY_MARGIN, -0.5 * wallElement.size.y],
    ]
    const posAttirbute = polygon.geometry.getAttribute('position')
    for (let i = 0; i < posAttirbute.count; i += 1) {
      posAttirbute.setXY(i, positions[i][0], positions[i][1])
    }
    posAttirbute.needsUpdate = true
  }

  public getFloorCentroid(): THREE.Vector3 {
    const centroid2d = this.wallsGraph.getFloorCentroid()
    return planeToWorld(this.floorPlane, centroid2d)
  }

  private computeWallVertexPositions(graphVertexId: string): WallVertexPositionsPair {
    const ret: WallVertexPositionsPair = {
      floor: undefined,
      ceiling: undefined,
    }
    const graphVertexPosition = this.wallsGraph.getVertexPosition(graphVertexId)
    if (!graphVertexPosition) {
      return ret
    }
    const floorWorldPoint = planeToWorld(this.floorPlane, graphVertexPosition)
    const ray: Ray = { origin: floorWorldPoint, dir: { dx: 0.0, dy: 1.0, dz: 0.0} }
    const intersect = rayCastToPlane(ray, this.ceilingPlane)
    const ceilingWorldPoint = intersect ? new THREE.Vector3(intersect.x, intersect.y, intersect.z) : undefined

    ret.floor = floorWorldPoint
    ret.ceiling = ceilingWorldPoint
    return ret
  }

  private computeWallBasisAndPosition(floorPoint1: THREE.Vector3, floorPoint2: THREE.Vector3,
    ceilingPoint1: THREE.Vector3) {
    const v1 = new THREE.Vector3().subVectors(floorPoint2, floorPoint1).normalize()
    const v2 = new THREE.Vector3().subVectors(ceilingPoint1, floorPoint1).normalize()
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize()
    // V1 and V2 are not necessarily perpendicular to one another.
    // We define basis as the floor line (v1) and normal, complimenting it with Y axis.
    const xAxis = v1.clone()
    const yAxis = new THREE.Vector3().crossVectors(normal, xAxis)
    const zAxis = normal
    const d = floorPoint1.dot(normal)
    const position = new THREE.Vector3().copy(normal).multiplyScalar(d)

    return { position, xAxis, yAxis, zAxis }
  }

  // Function receives wall's vertices in its plane space, assuming that wall origin is at a floor vertex0 point.
  private computeWallElementBounds(wallVerticesInPlaneSpace: THREE.Vector2[]) {
    // For correct triangulation, we must ensure that all the holes lay strictly within the corresponding wall mesh.
    const padding = 0.01

    const minX = Math.min(...wallVerticesInPlaneSpace.map(p => p.x)) + padding
    const maxX = Math.max(...wallVerticesInPlaneSpace.map(p => p.x)) - padding
    const minY = Math.min(...wallVerticesInPlaneSpace.map(p => p.y)) + padding
    const maxY = Math.max(...wallVerticesInPlaneSpace.map(p => p.y)) - padding
    const min = new THREE.Vector2(minX, minY)
    const max = new THREE.Vector2(maxX, maxY)

    return { min, max }
  }

  private generateWallElementsHoles(wallsGraph: WallsGraph, wall: Wall, wallSpaceVertices: THREE.Vector2[]) {
    // All wall elements are positioned in wall space, with v0 as origin.
    const origin = wallSpaceVertices[0]
    const { min, max } = this.computeWallElementBounds(wallSpaceVertices)

    // Map element id => its shape hole index.
    const elementsMapping: WallElementToVertexMap = new Map()
    const holes: THREE.Vector2[][] = []
    wall.elements.forEach(el => {
      const elPosition = wallsGraph.getWallElementPosition(el.id)
      if (!elPosition) {
        return
      }
      const center = origin.clone().add(elPosition)
      const holePoint1 = center.clone().add(new THREE.Vector2(-0.5 * el.size.x, -0.5 * el.size.y))
      const holePoint2 = center.clone().add(new THREE.Vector2(-0.5 * el.size.x, 0.5 * el.size.y))
      const holePoint3 = center.clone().add(new THREE.Vector2(0.5 * el.size.x, 0.5 * el.size.y))
      const holePoint4 = center.clone().add(new THREE.Vector2(0.5 * el.size.x, -0.5 * el.size.y))
      const holePoints = [holePoint1, holePoint2, holePoint3, holePoint4]
      holePoints.forEach((p) => p.clamp(min, max))

      // Element id => its shape hole index:
      elementsMapping.set(el.id, holes.length)
      holes.push(holePoints)
    })
    return {
      elementsMapping,
      holes,
    }
  }

  private syncWallTransform(wall: Wall, wallMesh: THREE.Object3D) {
    const { floor: floor1, ceiling: ceiling1 } = this.computeWallVertexPositions(wall.vertexIds[0])
    const { floor: floor2 } = this.computeWallVertexPositions(wall.vertexIds[1])
    if (!floor1 || !floor2 || !ceiling1) {
      return
    }
    const basisInfo = this.computeWallBasisAndPosition(floor1, floor2, ceiling1)
    const position = basisInfo.position
    const rot: Matrix3x3 = [
      [basisInfo.xAxis.x, basisInfo.xAxis.y, basisInfo.xAxis.z],
      [basisInfo.yAxis.x, basisInfo.yAxis.y, basisInfo.yAxis.z],
      [basisInfo.zAxis.x, basisInfo.zAxis.y, basisInfo.zAxis.z],
    ]
    createThreeMatrix4(rot, position, wallMesh.matrix)
    wallMesh.matrix.decompose(wallMesh.position, wallMesh.quaternion, wallMesh.scale)

    const originInPlaneSpace = new THREE.Vector2(basisInfo.xAxis.dot(floor1), basisInfo.yAxis.dot(floor1))
    wallMesh.userData.originX = originInPlaneSpace.x
    wallMesh.userData.originY = originInPlaneSpace.y
  }

  private syncWallVertexPairWithGraph(graphVertexId: string, wallMesh: THREE.Mesh, indices: number[]) {
    const ret: { floor: THREE.Vector2, ceiling: THREE.Vector2 } = 
      { floor: new THREE.Vector2(), ceiling: new THREE.Vector2() }
    if (indices.length !== 2) {
      return ret
    }
    const positionAttribute = wallMesh.geometry.getAttribute('position')
    const { floor: floorP2, ceiling: ceilingP2 } = this.computeWallVertexPositions(graphVertexId)
    if (floorP2) {
      const localFloorP2 = wallMesh.worldToLocal(floorP2)
      positionAttribute.setXYZ(indices[0], localFloorP2.x, localFloorP2.y, 0.0)
      positionAttribute.needsUpdate = true
      ret.floor.set(localFloorP2.x, localFloorP2.y)
    }
    if (ceilingP2) {
      const localCeilingP2 = wallMesh.worldToLocal(ceilingP2)
      positionAttribute.setXYZ(indices[1], localCeilingP2.x, localCeilingP2.y, 0.0)
      positionAttribute.needsUpdate = true
      ret.ceiling.set(localCeilingP2.x, localCeilingP2.y)
    }
    return ret
  }

  private syncWallElementVertices(wallsGraph: WallsGraph, wall: Wall, wallVertices: THREE.Vector2[], 
                                  wallMesh: THREE.Mesh, wallElementId: string, wallOrigin: THREE.Vector2, 
                                  startIndex: number) {
    const element = wall.elements.get(wallElementId)
    if (!element) {
      return
    }

    const { min, max } = this.computeWallElementBounds(wallVertices)
    const positionAttribute = wallMesh.geometry.getAttribute('position')

    const elemPos = wallsGraph.getWallElementPosition(element.id)
    if (!elemPos) {
        return
    }
    const center = wallOrigin.clone().add(elemPos)
    const vert1 = center.clone().add(new THREE.Vector2(-0.5 * element.size.x, -0.5 * element.size.y)).clamp(min, max)
    const vert2 = center.clone().add(new THREE.Vector2(-0.5 * element.size.x, 0.5 * element.size.y)).clamp(min, max)
    const vert3 = center.clone().add(new THREE.Vector2(0.5 * element.size.x, 0.5 * element.size.y)).clamp(min, max)
    const vert4 = center.clone().add(new THREE.Vector2(0.5 * element.size.x, -0.5 * element.size.y)).clamp(min, max)
    positionAttribute.setXYZ(startIndex + 3, vert1.x, vert1.y, 0.0)
    positionAttribute.setXYZ(startIndex + 2, vert2.x, vert2.y, 0.0)
    positionAttribute.setXYZ(startIndex + 1, vert3.x, vert3.y, 0.0)
    positionAttribute.setXYZ(startIndex + 0, vert4.x, vert4.y, 0.0)
    positionAttribute.needsUpdate = true
  }

  private syncWallElementObjects(wall: Wall, wallMesh: THREE.Mesh) {
    const present = new Map<string, THREE.Object3D>()
    wallMesh.children.forEach((child) => {
      const elementId = child.userData?.wallElementId
      if (elementId) {
        present.set(elementId, child)
      }
    })

    const toDelete = new Set<THREE.Object3D>()
    wall.elements.forEach((element, elementId) => {
      const elementObj = this.wallElementObjects.get(element.id)
      const latestThreeObject = elementObj?.getRootObject()
      const currentThreeObject = present.get(elementId)
      let resolvedObject = currentThreeObject
      if (latestThreeObject && latestThreeObject !== currentThreeObject) {
        if (currentThreeObject) {
          toDelete.add(currentThreeObject)
        }
        wallMesh.add(latestThreeObject)
        resolvedObject = latestThreeObject
        if (!this.wallElementPolygons.has(elementId)) {
          this.createWallElementPolygon(this.wallsGraph, element, wallMesh)
        }
      }
      const position = this.wallsGraph.getWallElementPosition(element.id)
      if (resolvedObject && position) {
        resolvedObject.position.copy(this.wallElementPosToPlaneSpace(wallMesh, position))
      }
      if (elementObj) {
        elementObj.setSize(element.size.x, element.size.y)
      }

      const wallElementPolyObject = this.wallElementPolygons.get(element.id)
      if (wallElementPolyObject && position) {
        wallElementPolyObject.position.copy(this.wallElementPosToWorldSpace(wallMesh, position))
        wallElementPolyObject.quaternion.copy(wallMesh.quaternion)
        wallElementPolyObject.name = `${element.wallId}[${element.class}][${element.id}]`
        this.syncWallElementPolygonSize(wallElementPolyObject, element)
      }
    })

    present.forEach((object, elementId) => {
      if (!wall.elements.has(elementId)) {
        toDelete.add(object)
      }
    })

    toDelete.forEach((object) => {
      const elementId = object.userData.wallElementId
      wallMesh.remove(object)
      const polygon = this.wallElementPolygons.get(elementId)
      if (polygon) {
        this.wallElementPolygons.delete(elementId)
        this.rootObject.remove(polygon)
      }
    })
  }

  // Convert wall element's Wall Graph - space position (which uses V0 vertex as origin),
  // to wall plane space (which uses (0,0,0) to normal intersection point as origin).
  private wallElementPosToPlaneSpace(wallMesh: THREE.Mesh, wallElementPos: THREE.Vector2) {
    const wallOriginVertexIdx = 3
    const planeV0Pos = new THREE.Vector3().fromBufferAttribute(wallMesh.geometry.getAttribute('position'),
      wallOriginVertexIdx)
    return planeV0Pos.add(new THREE.Vector3(wallElementPos.x, wallElementPos.y, 0.0))
  }

  private wallElementPosToWorldSpace(wallMesh: THREE.Mesh, wallElementPos: THREE.Vector2) {
    return wallMesh.localToWorld(this.wallElementPosToPlaneSpace(wallMesh, wallElementPos))
  }

  private retriangluateWallMesh(wallMesh: THREE.Mesh) {
    const positionAttribute = wallMesh.geometry.getAttribute('position')
    // Each vertex "group" in the wall mesh consists of 4 vertices: the wall itself, and each wall element.
    const groupsCount = positionAttribute.count / 4
    const wallCountour: THREE.Vector2[] = []
    const wallHoles: THREE.Vector2[][] = []
    for(let groupIdx = 0; groupIdx < groupsCount; groupIdx += 1) {
      if (groupIdx === 0) {
        for (let vertIdx = 0; vertIdx < 4; vertIdx += 1) {
          wallCountour.push(new THREE.Vector2(positionAttribute.getX(groupIdx * 4 + vertIdx),
            positionAttribute.getY(groupIdx * 4 + vertIdx)))
        }
      } else {
        const holeContour = []
        for (let vertIdx = 0; vertIdx < 4; vertIdx += 1) {
          holeContour.push(new THREE.Vector2(positionAttribute.getX(groupIdx * 4 + vertIdx),
            positionAttribute.getY(groupIdx * 4 + vertIdx)))
        }
        wallHoles.push(holeContour)
      }
    }
    const indices = THREE.ShapeUtils.triangulateShape(wallCountour, wallHoles).flat()
    wallMesh.geometry.setIndex(indices)
  }

  private syncWallMeshUVs(wallMesh: THREE.Mesh) {
    const positionAttribute = wallMesh.geometry.getAttribute('position')
    const uvAttribute = wallMesh.geometry.getAttribute('uv')
    // Update world space uvs.
    for (let i = 0; i < positionAttribute.count; i += 1) {
      uvAttribute.setXY(i, positionAttribute.getX(i), positionAttribute.getY(i))
    }
    uvAttribute.needsUpdate = true
  }

  private syncPlaneMeshVertex(positionAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    uvAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, vertexMapping: MeshVertex,
    newPosition: THREE.Vector2 | THREE.Vector3) {
    const vertexIdx = vertexMapping.vertexIdx
    const dx = newPosition.x - positionAttribute.getX(vertexIdx)
    const dy = newPosition.y - positionAttribute.getY(vertexIdx)
    positionAttribute.setXYZ(vertexIdx, newPosition.x, newPosition.y, 0.0)
    vertexMapping.pos.set(newPosition.x, newPosition.y)
    positionAttribute.needsUpdate = true

    // World scale uvs.
    const du = dx
    const dv = dy
    const u = uvAttribute.getX(vertexIdx)
    const v = uvAttribute.getY(vertexIdx)
    uvAttribute.setXY(vertexIdx, u + du, v + dv)
    uvAttribute.needsUpdate = true
  }

  private syncVAOattribute(geometry: THREE.BufferGeometry) {
    // Adjust the passed flat shape geometry's additional UVs within a [0, 1] range.
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const b3 = new THREE.Box3().setFromBufferAttribute(pos)
    const b3size = b3.getSize(new THREE.Vector3())
    const uv = []
    for (let i = 0; i < pos.count; i += 1){
      const x = pos.getX(i)
      const y = pos.getY(i)
      const u = (x - b3.min.x) / b3size.x
      const v = (y - b3.min.y) / b3size.y
      uv.push(u, v)
    }
  
    const vAOCoordsAttrib = geometry.getAttribute('vAOCoords')
    if (vAOCoordsAttrib) {
      for (let i = 0; i < vAOCoordsAttrib.count; i += 1) {
        vAOCoordsAttrib.setXY(i, uv[i * 2], uv[i * 2 + 1])
      }
      vAOCoordsAttrib.needsUpdate = true
    } else {
      geometry.setAttribute('vAOCoords', new THREE.Float32BufferAttribute(uv, 2))
    }
  }

  private refreshWallVignetteAO(wall: Wall) {
    const adjacentWalls = this.wallsGraph.getAdjacentWalls(wall.id)
    const currentWallDirection = this.wallsGraph.getWallDirection(wall).normalize()
    const formerWallDirection = this.wallsGraph.getWallDirection(adjacentWalls[0]).normalize()
    const latterWallDirection = this.wallsGraph.getWallDirection(adjacentWalls[1]).normalize()
    // AO vignette shader expects "corner angle", i.e. fully "open book" is 180, "closed book" is 0,
    // it clamps negative angles to 0. Walls graph winding is clockwise.
    const former = 180 - clamp(0, 180)(-signedAngleDeg(formerWallDirection, currentWallDirection))
    const latter = 180 - clamp(0, 180)(-signedAngleDeg(currentWallDirection, latterWallDirection))

    const wallMesh = this.getWallMesh(wall.id)
    if (!wallMesh || !wallMesh.material) {
      return
    }
    wallMesh.material.uniforms.vAOleft.value = former
    wallMesh.material.uniforms.vAOright.value = latter
  }

  public getMeshSurfaceId(surfaceMesh: THREE.Object3D) {
    const surfaceIdx = surfaceMesh.userData.geomagicalSurface
    if (surfaceIdx === undefined) {
      return undefined
    }
    const geomagialExtras = this.rootObject.userData as (GeomagicalExtras | undefined)
    if (!geomagialExtras) {
      return undefined
    }
    const surfaceInfo = geomagialExtras.geomagical.geomagicalSurfaces[surfaceIdx]
    if (!surfaceInfo) {
      return undefined
    }
    return surfaceInfo.id
  }

  private geomSurfaceIndexFromId(id: string | number) {
    const geomagialExtras = this.rootObject.userData as (GeomagicalExtras | undefined)
    if (!geomagialExtras) {
      return -1
    }
    return geomagialExtras.geomagical.geomagicalSurfaces.findIndex(geomSurface => geomSurface.id === +id)
  }

  private syncGeomagicalSurfaces() {
    if (this.floorMesh) {
      const geomagicalSurface = this.geomSurfaceIndexFromId(this.floorPlane.id)
      if (geomagicalSurface >= 0) {
        this.floorMesh.userData.geomagicalSurface = geomagicalSurface
      }
    }
    if (this.ceilingMesh) {
      const geomagicalSurface = this.geomSurfaceIndexFromId(this.ceilingPlane.id)
      if (geomagicalSurface >= 0) {
        this.ceilingMesh.userData.geomagicalSurface = geomagicalSurface
      }
    }
    this.walls.forEach((wallMesh, id) => {
      const geomagicalSurface = this.geomSurfaceIndexFromId(id)
      if (geomagicalSurface >= 0) {
        wallMesh.userData.geomagicalSurface = geomagicalSurface
      }
    })
    this.wallElementPolygons.forEach((polygonMesh, id) => {
      const extrasSurfaceId = this.wallElementsExtrasIndices.get(id)
      if (extrasSurfaceId) {
        polygonMesh.userData.geomagicalSurface = this.geomSurfaceIndexFromId(extrasSurfaceId)
      }
    })
  }

  private syncKreativPolys() {
    this.kreativPolysCache.length = 0
    if (this.floorMesh && this.floorPlane) {
      this.kreativPolysCache.push(buildPolygonFromMesh(this.floorMesh, this.floorPlane.id, `floor`))
    }
    if (this.ceilingMesh && this.ceilingPlane) {
      this.kreativPolysCache.push(buildPolygonFromMesh(this.ceilingMesh, this.ceilingPlane.id, `ceiling`))
    }
    this.walls.forEach((wallMesh, id) => {
      this.kreativPolysCache.push(buildPolygonFromMesh(wallMesh, +id, `wall`))
    })
  }

  public setWallColor(wallId: string, srgb255: [number, number, number]) {
    const wallMesh = this.getWallMesh(wallId)
    if (!wallMesh) {
      return
    }
    const color = new THREE.Color(srgb255[0] / 255.0, srgb255[1] / 255.0, srgb255[2] / 255.0)
      .convertSRGBToLinear()
    const map = new THREE.DataTexture(new Uint8Array([
      color.r * 255,
      color.g * 255,
      color.b * 255,
      255,
    ]), 1, 1)
    map.colorSpace = THREE.SRGBColorSpace
    map.needsUpdate = true
    wallMesh.material.map = map
  }

  public setAllWallsColor(srgb255: [number, number, number]) {
    this.getWallMeshes()
      .map(wallMesh => wallMesh.userData.wallId)
      .forEach(id => this.setWallColor(id, srgb255))
  }

  public setFloorMaterial(material: THREE.MeshStandardMaterial) {
    const floorMesh = this.getFloorMesh()
    if (!floorMesh) {
      return
    }
    const materialProps = { vignetteAO: true, reduceLightingEffects: true, useSofterShadows: true }
    const customMaterial = new CustomStandardMaterial(materialProps).copy(material)
    customMaterial.setToneMapType(ToneMapType.ACESFilmic)
    floorMesh.material = customMaterial
  }
}
